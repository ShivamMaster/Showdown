/**
 * scraper.js — DOM Scraper for Pokémon Showdown
 *
 * Monitors the battle interface using MutationObserver to extract:
 * - Battle log events (moves, switches, damage, status, weather, hazards)
 * - HP percentages from stat bars
 * - Pokémon names and status from stat bars
 * - Tooltip data (moves, items, abilities, stats) when hovering
 * - Team icons and faint status
 * - Move menu and switch menu options
 */

const ShowdownScraper = (() => {
    // ─── Game State ───
    const state = {
        myTeam: {},         // { name: { hp: 100, status: '', moves: [], item: '', ability: '', types: [], baseStats: {}, revealed: false } }
        opponentTeam: {},   // same structure
        myActive: null,     // name of active Pokémon
        opponentActive: null,
        myName: null,       // Player's name
        opponentName: null, // Opponent's name
        field: {
            weather: null,      // 'Sun', 'Rain', 'Sand', 'Snow', 'Hail', null
            terrain: null,      // 'Electric', 'Grassy', 'Psychic', 'Misty', null
            myHazards: { stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false },
            opponentHazards: { stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false },
            trickRoom: false,
            tailwind: { my: false, opponent: false }
        },
        turnNumber: 0,
        myMoves: [],        // available moves this turn [{ name, type, disabled }]
        mySwitches: [],     // available switches [{ name, hp }]
        lastLog: '',
        battleActive: false,
        myPlayerIndex: null, // 'p1' or 'p2'
        forceSwitch: false   // true if player MUST switch (fainted mon)
    };

    // ─── Battle Log Parser ───

    /**
     * Parse a battle log line and update state
     */
    /**
     * Parse a battle log line and update state
     */
    function parseBattleLogLine(text) {
        if (!text || text.trim() === '') return;
        const line = text.trim();

        // 1. Determine side using player names if known
        let isOpposingAction = line.includes('The opposing');
        
        // If we know player names, use them as primary source of truth
        if (state.myName && state.opponentName) {
            // Case-insensitive match for player names in log
            const myNameLower = state.myName.toLowerCase();
            const oppNameLower = state.opponentName.toLowerCase();
            const lineLower = line.toLowerCase();
            
            if (lineLower.startsWith(oppNameLower)) isOpposingAction = true;
            else if (lineLower.startsWith(myNameLower)) isOpposingAction = false;
        }

        // Turn number
        const turnMatch = line.match(/^Turn (\d+)/);
        if (turnMatch) {
            state.turnNumber = parseInt(turnMatch[1]);
            return;
        }

        // Move usage: "PlayerName's Pokémon used Move!" or "The opposing Pokémon used Move!"
        const moveMatch = line.match(/(?:The opposing )?(.+?) used (.+?)!/);
        if (moveMatch) {
            let rawName = moveMatch[1];
            
            // AGGRESSIVE: If it starts with "The opposing", it is 100% the opponent.
            if (line.startsWith('The opposing ')) isOpposingAction = true;

            // Handle "PlayerName's Pokemon" format
            if (rawName.includes("'s ")) {
                const parts = rawName.split("'s ");
                const playerName = parts[0].trim();
                rawName = parts[1];
                if (state.opponentName && playerName === state.opponentName) isOpposingAction = true;
                if (state.myName && playerName === state.myName) isOpposingAction = false;
            }

            const pokemonName = cleanPokemonName(rawName);
            if (!pokemonName || pokemonName === 'Tera Type') return;

            const moveName = moveMatch[2].trim();
            
            if (isOpposingAction) {
                if (state.opponentTeam[pokemonName]) {
                    addMoveToTeam(state.opponentTeam, pokemonName, moveName);
                } else {
                    // Log says opponent, but we don't have it visually yet. 
                    // Should we add it? 
                    // If we are strict "Visual First", we wait.
                    // But maybe it just switched in and visual hasn't run yet?
                    // Let's rely on scrapeHP to catch it in < 100ms.
                    // BUT, we might lose the move info if we ignore it now.
                    // Solution: Queue it? Or just add to a 'pending' list?
                    // Actually, if we add it via ensureTeamMember with 'log', it will be rejected if !team[name].
                    // So we must NOT call ensureTeamMember inside addMoveToTeam blindly.
                }
            } else {
                if (state.myTeam[pokemonName]) {
                    addMoveToTeam(state.myTeam, pokemonName, moveName);
                }
            }
            return;
        }

        // Switch Logic:
        // "Go! X!" -> User
        // "PlayerName sent out X!"
        // "The opposing X came out!"

        // 1. User Switch: "Go! [Pokemon]!"
        const goMatch = line.match(/^Go! (.+?)!/);
        if (goMatch) {
            const name = cleanPokemonName(goMatch[1]);
            state.myActive = name;
            ensureTeamMember(state.myTeam, name);
            return;
        }

        // 2. Named Switch: "PlayerName sent out [Pokemon]!"
        const sentOutMatch = line.match(/(.+?) sent out (.+?)!/);
        if (sentOutMatch) {
            const playerName = sentOutMatch[1].trim();
            const pokemonName = cleanPokemonName(sentOutMatch[2]);
            const isOpp = (state.opponentName && playerName === state.opponentName) || 
                         (state.myName && playerName !== state.myName);
            
            if (isOpp) {
                state.opponentActive = pokemonName;
                ensureTeamMember(state.opponentTeam, pokemonName);
            } else {
                state.myActive = pokemonName;
                ensureTeamMember(state.myTeam, pokemonName);
            }
            return;
        }

        // 3. Generic Opponent Switch: "The opposing [Pokemon] came out!"
        const cameOutMatch = line.match(/The opposing (.+?) (?:came out|appeared)/);
        if (cameOutMatch) {
            const name = cleanPokemonName(cameOutMatch[1]);
            state.opponentActive = name;
            ensureTeamMember(state.opponentTeam, name);
            return;
        }

        // Damage: "Pokémon lost X% of its health!"
        const dmgMatch = line.match(/(?:The opposing )?(.+?) lost ([\d.]+)% of its health/);
        if (dmgMatch) {
            const name = cleanPokemonName(dmgMatch[1]);
            const pct = parseFloat(dmgMatch[2]);
            const team = isOpposingAction ? state.opponentTeam : state.myTeam;
            if (team[name]) {
                team[name].hp = Math.max(0, team[name].hp - pct);
            }
        }

        // Terastalization: "[Pokemon] terastallized to the [Type] type!"
        const teraMatch = line.match(/(?:The opposing )?(.+?) terastallized to the (.+?) type!/);
        if (teraMatch) {
            const name = cleanPokemonName(teraMatch[1]);
            const type = teraMatch[2].trim();
            const team = isOpposingAction ? state.opponentTeam : state.myTeam;
            if (team[name]) {
                team[name].teraType = type;
                team[name].isTerastallized = true;
                console.log(`[ShowdownPredictor] Scraper: Recorded Terastalization for ${name} to ${type}`);
            }
        }

        // Fainted
        const faintMatch = line.match(/(?:The opposing )?(.+?) fainted!/);
        if (faintMatch) {
            const name = cleanPokemonName(faintMatch[1]);
            const team = isOpposingAction ? state.opponentTeam : state.myTeam;
            if (team[name]) {
                team[name].hp = 0;
                team[name].status = 'fnt';
            }
        }

        // Status conditions
        const statusPatterns = [
            { regex: /(?:The opposing )?(.+?) was burned/, status: 'brn' },
            { regex: /(?:The opposing )?(.+?) was poisoned/, status: 'psn' },
            { regex: /(?:The opposing )?(.+?) was badly poisoned/, status: 'tox' },
            { regex: /(?:The opposing )?(.+?) is paralyzed/, status: 'par' },
            { regex: /(?:The opposing )?(.+?) fell asleep/, status: 'slp' },
            { regex: /(?:The opposing )?(.+?) was frozen/, status: 'frz' }
        ];

        for (const pattern of statusPatterns) {
            const match = line.match(pattern.regex);
            if (match) {
                const name = cleanPokemonName(match[1]);
                const team = isOpposingAction ? state.opponentTeam : state.myTeam;
                if (team[name]) team[name].status = pattern.status;
            }
        }

        // Weather
        const weatherPatterns = [
            { regex: /sunlight turned harsh|Drought/, weather: 'Sun' },
            { regex: /started to rain|Drizzle/, weather: 'Rain' },
            { regex: /sandstorm (kicked|brew)|Sand Stream/, weather: 'Sand' },
            { regex: /started to hail|Snow Warning/, weather: 'Snow' },
            { regex: /started to snow/, weather: 'Snow' },
            { regex: /weather became clear|The sunlight faded|The rain stopped|The sandstorm subsided|The hail stopped/, weather: null }
        ];

        for (const pattern of weatherPatterns) {
            if (pattern.regex.test(line)) {
                state.field.weather = pattern.weather;
            }
        }

        // Terrain
        const terrainPatterns = [
            { regex: /Electric Terrain|electric current ran/, terrain: 'Electric' },
            { regex: /Grassy Terrain|grass grew/, terrain: 'Grassy' },
            { regex: /Psychic Terrain|became weird/, terrain: 'Psychic' },
            { regex: /Misty Terrain|mist swirled/, terrain: 'Misty' },
            { regex: /terrain returned to normal/, terrain: null }
        ];

        for (const pattern of terrainPatterns) {
            if (pattern.regex.test(line)) {
                state.field.terrain = pattern.terrain;
            }
        }

        // Hazards
        if (/Pointed stones float/.test(line)) {
            if (line.includes('opposing')) {
                state.field.opponentHazards.stealthRock = true;
            } else {
                state.field.myHazards.stealthRock = true;
            }
        }
        if (/Spikes were scattered/.test(line)) {
            if (line.includes('opposing')) {
                state.field.opponentHazards.spikes = Math.min(3, state.field.opponentHazards.spikes + 1);
            } else {
                state.field.myHazards.spikes = Math.min(3, state.field.myHazards.spikes + 1);
            }
        }
        if (/Poison spikes were scattered/.test(line)) {
            if (line.includes('opposing')) {
                state.field.opponentHazards.toxicSpikes = Math.min(2, state.field.opponentHazards.toxicSpikes + 1);
            } else {
                state.field.myHazards.toxicSpikes = Math.min(2, state.field.myHazards.toxicSpikes + 1);
            }
        }

        // Trick Room
        if (/Trick Room/.test(line)) {
            if (/twisted the dimensions/.test(line)) {
                state.field.trickRoom = true;
            } else if (/wore off/.test(line)) {
                state.field.trickRoom = false;
            }
        }

        // Item revealed
        const itemPatterns = [
            { regex: /(?:The opposing )?(.+?)'s (.+?) restored/, item_group: 2 },
            { regex: /(?:The opposing )?(.+?) is holding (.+?)/, item_group: 2 },
            { regex: /(?:The opposing )?(.+?)'s (.+?) activated/, item_group: 2 },
            { regex: /(?:The opposing )?(.+?) ate its (.+?)/, item_group: 2 }
        ];

        for (const pattern of itemPatterns) {
            const match = line.match(pattern.regex);
            if (match) {
                const name = cleanPokemonName(match[1]);
                const item = match[pattern.item_group];
                const team = isOpposingAction ? state.opponentTeam : state.myTeam;
                if (team[name] && item) team[name].item = item.trim();
            }
        }

        // Ability revealed
        const abilityMatch = line.match(/\[(.+?)\] of (?:The opposing )?(.+)/);
        if (abilityMatch) {
            const ability = abilityMatch[1];
            const name = cleanPokemonName(abilityMatch[2]);
            const team = isOpposingAction ? state.opponentTeam : state.myTeam;
            if (team[name]) team[name].ability = ability;
        }

        // Ability trigger patterns
        const abilityTriggerPatterns = [
            { regex: /(?:The opposing )?(.+?)'s Intimidate/, ability: 'Intimidate' },
            { regex: /(?:The opposing )?(.+?)'s Regenerator/, ability: 'Regenerator' },
            { regex: /(?:The opposing )?(.+?)'s Protosynthesis/, ability: 'Protosynthesis' },
            { regex: /(?:The opposing )?(.+?)'s Quark Drive/, ability: 'Quark Drive' },
            { regex: /(?:The opposing )?(.+?)'s Flash Fire/, ability: 'Flash Fire' },
            { regex: /(?:The opposing )?(.+?)'s Levitate/, ability: 'Levitate' },
            { regex: /(?:The opposing )?(.+?)'s Multiscale/, ability: 'Multiscale' },
            { regex: /(?:The opposing )?(.+?)'s Unaware/, ability: 'Unaware' },
            { regex: /(?:The opposing )?(.+?)'s Magic Guard/, ability: 'Magic Guard' }
        ];

        for (const pattern of abilityTriggerPatterns) {
            const match = line.match(pattern.regex);
            if (match) {
                const name = cleanPokemonName(match[1]);
                const team = isOpposingAction ? state.opponentTeam : state.myTeam;
                if (team[name]) team[name].ability = pattern.ability;
            }
        }
    }

    // ─── Helper Functions ───

    function cleanPokemonName(name) {
        if (!name) return '';
        
        // AGGRESSIVE: If the name contains UI markers, it's NOT a Pokemon name
        const blocked = [
            'Tera Type', 'Ability:', 'Item:', 'Stats:', 
            'active', 'Not revealed', 'tox', 'brn', 'par', 'slp', 'frz', 'fnt',
            'move', 'Switch', 'Turn', 'Team', 'Opponent'
        ];
        
        // Exact match blocking
        if (blocked.includes(name.trim())) return '';

        // If the name is literally one of the status conditions or common UI words
        if (['active', 'fainted', 'tox', 'psn', 'brn', 'par', 'slp', 'frz'].includes(name.toLowerCase())) return '';

        if (blocked.some(b => name.includes(b) && name.length < b.length + 5)) {
            // If it contains a blocked word and is short, it's probably just that word garbage
            return '';
        }

        // 1. Remove common Showdown prefixes/suffixes from tooltips/logs
        let cleaned = name.trim();
        cleaned = cleaned.replace(/^[Tt]he opposing /, '');
        cleaned = cleaned.replace(/^[Pp]layer\s\d+'s\s/, '');
        
        // 2. Strip Level (e.g., "Cobalion L80" -> "Cobalion")
        // Match space followed by L and digits at the end of a word or string
        cleaned = cleaned.replace(/\sL\d+\b/g, '');
        
        // 3. Strip Gender icons (♂, ♀)
        cleaned = cleaned.replace(/[♂♀]/g, '');

        // 4. Handle nicknames in log like "Gengar (Gengar)" or "MyNick (Gengar)"
        // In tooltips, the name is usually just "PokemonName"
        // In logs, it can be "Nickname (PokemonName)"
        if (cleaned.includes('(')) {
            const match = cleaned.match(/\((.+?)\)/);
            if (match) cleaned = match[1];
            else cleaned = cleaned.split('(')[0];
        }

        cleaned = cleaned.trim();

        // 5. Forme normalization (e.g., Oricorio-Sensu -> Oricorio)
        // We want to keep the base name for lookups
        const baseFormes = ['Oricorio', 'Gourgeist', 'Pumpkaboo', 'Vivillon', 'Urshifu'];
        for (const base of baseFormes) {
            if (cleaned.startsWith(base + '-')) {
                cleaned = base;
                break;
            }
        }

        // Strip any remaining ":" or "!" which shouldn't be in a name
        cleaned = cleaned.replace(/[:!]/g, '').trim();

        return cleaned;
    }

    function isOpponentPokemon(name) {
        return state.opponentTeam.hasOwnProperty(name);
    }

    function ensureTeamMember(team, name, source = 'visual') {
        if (!name) return;
        
        // Final sanity check: Is this name a valid Pokemon or at least looks like one?
        if (name.length < 3 || name.includes(' lost ') || name.includes(' health')) return;

        // VISUAL FIRST POLICY:
        // 'visual' source (HP, Tooltip, Icons) can CREATE new members.
        // 'log' source (Battle Log) can ONLY update existing members.
        if (source === 'log' && !team[name]) {
            // If the log mentions a mon we don't have, it might be a nickname we missed or it hasn't switched in yet.
            // But we should NOT create it blindly to avoid duplicates/confusion.
            // Exception: If we have < 6 members and we are VERY sure? 
            // No, safer to wait for visual confirmation.
            return;
        }

        // Anti-duplication: If adding to myTeam, remove from opponentTeam and vice-versa
        if (team === state.myTeam) {
            if (state.opponentTeam[name]) {
                // Only move if source is VISUAL (Absolute Truth)
                if (source === 'visual') {
                    console.log(`[ShowdownPredictor] Side-Switch: Moving ${name} from OPPONENT to PLAYER (Visual Confirmation)`);
                    delete state.opponentTeam[name];
                } else {
                    // If log says it's mine but visual says it's theirs... Visual wins.
                    // Ignore this log update for team assignment.
                    return; 
                }
            }
        } else {
            if (state.myTeam[name]) {
                if (source === 'visual') {
                    console.log(`[ShowdownPredictor] Side-Switch: Moving ${name} from PLAYER to OPPONENT (Visual Confirmation)`);
                    delete state.myTeam[name];
                } else {
                    return;
                }
            }
        }

        if (!team[name]) {
            // Check if we already have 6 mons to prevent ghosting/overwriting
            const teamSize = Object.keys(team).length;
            if (teamSize >= 6) {
                console.log(`[ShowdownPredictor] Team Full: Not adding ${name} to ${team === state.myTeam ? 'PLAYER' : 'OPPONENT'} team (already has 6)`);
                return;
            }

            console.log(`[ShowdownPredictor] New Mon: Adding ${name} to ${team === state.myTeam ? 'PLAYER' : 'OPPONENT'} team (Source: ${source})`);
            
            // Try to get base data for typing/stats
            const baseData = typeof lookupPokemon === 'function' ? lookupPokemon(name) : null;
            
            team[name] = {
                name: name,
                hp: 100,
                ability: baseData ? baseData.abilities[0] : '',
                item: '',
                teraType: '',
                moves: [],
                stats: baseData ? baseData.baseStats : {},
                types: baseData ? baseData.types : ['???'],
                status: '',
                revealed: true,
                boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
            };
        }
    }

    function addMoveToTeam(team, pokemonName, moveName) {
        if (!team[pokemonName]) {
            // If it's a log-based addition, we reject it if the pokemon isn't already there.
            // This prevents "hallucinating" team members from text.
            return; 
        }

        const mon = team[pokemonName];
        if (!mon.moves.includes(moveName)) {
            console.log(`[ShowdownPredictor] New Move: ${pokemonName} used ${moveName}`);
            mon.moves.push(moveName);
        }
    }

    // ─── DOM Scraping Functions ───

    /**
     * Scrape HP from stat bars
     * Showdown uses .statbar with an inner .hpbar .hp element
     * whose width% represents HP
     */
    function scrapeHP() {
        const statbars = document.querySelectorAll('.statbar');
        
        statbars.forEach(bar => {
            const nameEl = bar.querySelector('strong');
            const hpEl = bar.querySelector('.hpbar .hp');
            if (nameEl && hpEl) {
                const rawName = nameEl.textContent;
                const name = cleanPokemonName(rawName);
                if (!name) return;

                const width = hpEl.style.width;
                const hp = width ? parseFloat(width) : 100;

                // ABSOLUTE GEOMETRIC TRUTH: 
                // Top half of screen = Opponent
                // Bottom half of screen = Player
                const rect = bar.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const isTopHalf = rect.top < (windowHeight / 2);
                
                let team = null;
                
                // Override CSS classes with geometry
                if (isTopHalf) {
                    team = state.opponentTeam;
                    state.opponentActive = name;
                } else {
                    team = state.myTeam;
                    state.myActive = name;
                }

                if (team) {
                    ensureTeamMember(team, name, 'visual');
                    if (team[name]) team[name].hp = hp;
                }
                
                // Status (poison, burn, etc)
                const statusEl = bar.querySelector('.status');
                if (statusEl && team && team[name]) {
                    const statusText = statusEl.textContent.toLowerCase().trim();
                    const statusMap = { 'brn': 'brn', 'psn': 'tox', 'tox': 'tox', 'par': 'par', 'slp': 'slp', 'frz': 'frz' };
                    for (const [key, val] of Object.entries(statusMap)) {
                        if (statusText.includes(key)) {
                            team[name].status = val;
                            break;
                        }
                    }
                }
            }
        });
    }

    /**
   * Scrape the move menu to get available moves
   */
    function scrapeMoveMenu() {
        const oldMoves = JSON.stringify(state.myMoves);
        state.myMoves = [];

        // Check for both desktop and mobile layouts
        const moveButtons = document.querySelectorAll('.movemenu button, .move-menu button, .movebuttons-container button');
        
        if (moveButtons.length > 0) {
            console.log(`[ShowdownPredictor] Scraper: Found ${moveButtons.length} move buttons`);
        }

        moveButtons.forEach(btn => {
            // Try data-move attribute first, then text content
            let moveName = btn.getAttribute('data-move');
            if (!moveName) {
                // Text content might be "MoveName\nType\nPP"
                const text = btn.textContent.trim();
                moveName = text.split('\n')[0].trim();
                // Remove Z-move prefix if present
                moveName = moveName.replace(/^Z-/, '');
            }

            const moveType = btn.getAttribute('data-type');
            const disabled = btn.disabled || btn.classList.contains('disabled');

            if (moveName && moveName !== 'Struggle') {
                state.myMoves.push({
                    name: moveName.trim(),
                    type: moveType ? moveType.trim() : '',
                    disabled: disabled
                });
            }
        });

        if (state.myMoves.length > 0 && JSON.stringify(state.myMoves) !== oldMoves) {
            console.log('[ShowdownPredictor] Scraper: Moves found:', state.myMoves);
        }
    }
    /**
     * Scrape the switch menu for available switches
     */
    function scrapeSwitchMenu() {
        state.mySwitches = [];
        const switchMenu = document.querySelector('.switchmenu');
        
        // Always try to find switch buttons even if the menu container isn't obvious
        // The user mentioned icons "next to the Switch tab", which implies the switch menu buttons
        const switchButtons = document.querySelectorAll('.switchmenu button, button[name="chooseSwitch"], button[name="chooseTeamPreview"]');
        
        switchButtons.forEach(btn => {
            const text = btn.textContent.trim().split('\n')[0];
            const name = cleanPokemonName(text);
            
            if (name) {
                // If it's in the switch menu, it is DEFINITELY on my team.
                // This answers the user's "next to the Switch tab" requirement.
                ensureTeamMember(state.myTeam, name, 'visual');
                
                // If it's a valid switch choice (not active, not fainted usually, but Showdown handles that)
                if (!btn.disabled) {
                    state.mySwitches.push({ name: name });
                }
            }
        });

        // Check visibility for forced switch logic
        if (!switchMenu || switchMenu.offsetParent === null) {
            state.forceSwitch = false;
            return;
        }

        // Detect forced switch
        // If switch menu is visible and there is NO "Cancel" button, it's a forced switch
        const cancelButton = switchMenu.querySelector('button[name="closeSwitch"]');
        const hasSwitchOptions = state.mySwitches.length > 0;

        // Also check prompt text for "Switch" to be sure
        const prompt = document.querySelector('.whatdo');
        const isSwitchPrompt = prompt && (prompt.textContent.includes('Switch') || prompt.textContent.includes('send out'));

        if (hasSwitchOptions && !cancelButton) {
            state.forceSwitch = true;
        } else {
            state.forceSwitch = false;
        }
    }

    /**
     * Scrape team icons to detect fainted Pokémon
     * Showdown uses .trainer with .teamicons containing .picon elements
     */
    function scrapeTeamIcons() {
        // 1. Try Specific Selectors First (Most Reliable)
        const myIcons = document.querySelectorAll('.trainer-near .teamicons span');
        const oppIcons = document.querySelectorAll('.trainer-far .teamicons span');

        if (myIcons.length > 0) {
            myIcons.forEach(icon => processIcon(icon, state.myTeam));
        }

        if (oppIcons.length > 0) {
            oppIcons.forEach(icon => processIcon(icon, state.opponentTeam));
        }

        // 2. Scrape Controls Area (The "Switch" tab area the user mentioned)
        // Any icons found in .battle-controls are definitely the player's
        const controlIcons = document.querySelectorAll('.battle-controls .teamicons span, .battle-controls .picon');
        if (controlIcons.length > 0) {
             controlIcons.forEach(icon => processIcon(icon, state.myTeam));
        }

        // 3. Fallback to Geometric Truth if selectors fail
        if (myIcons.length === 0 && oppIcons.length === 0 && controlIcons.length === 0) {
            const allIcons = document.querySelectorAll('.teamicons span');
            allIcons.forEach(icon => {
                const rect = icon.getBoundingClientRect();
                const windowHeight = window.innerHeight;
                const isTopHalf = rect.top < (windowHeight / 2);
                const team = isTopHalf ? state.opponentTeam : state.myTeam;
                processIcon(icon, team);
            });
        }
    }

    function processIcon(icon, team) {
        const label = icon.getAttribute('aria-label') || icon.getAttribute('title');
        if (label) {
            // Clean the label
            // "Cobalion (active)" -> "Cobalion"
            // "Not revealed" -> "Not revealed" (blocked later)
            // "Cobalion (tox)" -> "Cobalion"
            
            let name = label;
            if (name.includes('(')) {
                name = name.split('(')[0].trim();
            }
            
            // Remove status conditions from name if present
            const statuses = ['brn', 'par', 'slp', 'frz', 'tox', 'psn', 'fnt'];
                        statuses.forEach(s => {
                const re = new RegExp(`\\s${s}$`, 'i');
                name = name.replace(re, '');
            });

            name = cleanPokemonName(name);
            
            if (name) {
                ensureTeamMember(team, name, 'visual');
                // Check for fainted status via opacity or class
                if (icon.style.opacity === '0.4' || icon.classList.contains('fainted')) {
                    if (team[name]) {
                        team[name].hp = 0;
                        team[name].status = 'fnt';
                    }
                }
            }
        }
    }

    /**
     * Scrape Tooltip for detailed info
     */
    function scrapeTooltip() {
        const tooltip = document.querySelector('#tooltipwrapper .tooltip, .tooltip');
        if (!tooltip) return;

        const result = {
            pokemon: '', hp: null, ability: '', item: '', teraType: '', moves: [], stats: {}
        };

        const h2 = tooltip.querySelector('h2');
        if (h2) {
            const nameText = h2.textContent.trim();
            if (nameText.includes('Tera Type:') || nameText.includes('Ability:') || nameText.includes('Item:')) {
                const firstH2 = tooltip.querySelector('h2');
                if (firstH2 && firstH2 === h2) return null;
            }
            result.pokemon = cleanPokemonName(nameText);
            if (!result.pokemon) return null;
            if (typeof lookupMove === 'function' && lookupMove(result.pokemon)) return null;
        }

        const hpBar = tooltip.querySelector('.hpbar .hp');
        if (hpBar) result.hp = hpBar.style.width ? parseFloat(hpBar.style.width) : 100;

        const statElements = tooltip.querySelectorAll('p');
        statElements.forEach(p => {
            const text = p.textContent;
            if (text.includes('Ability:')) result.ability = text.split('Ability:')[1].trim();
            if (text.includes('Item:')) result.item = text.split('Item:')[1].trim();
            if (text.includes('Tera Type:')) result.teraType = text.split('Tera Type:')[1].trim();
            const statMatch = text.match(/(Atk|Def|SpA|SpD|Spe):\s*(\d+)/g);
            if (statMatch) {
                statMatch.forEach(s => {
                    const [key, val] = s.split(':').map(x => x.trim());
                    const statMap = { 'Atk': 'atk', 'Def': 'def', 'SpA': 'spa', 'SpD': 'spd', 'Spe': 'spe' };
                    if (statMap[key]) result.stats[statMap[key]] = parseInt(val);
                });
            }
        });

        const moveElements = tooltip.querySelectorAll('.section ul li');
        moveElements.forEach(li => {
            const moveName = li.textContent.replace('•', '').trim();
            if (moveName && !result.moves.includes(moveName)) result.moves.push(moveName);
        });

        if (result.pokemon) {
            result.pokemon = cleanPokemonName(result.pokemon);
            if (!result.pokemon) return;

            const rect = tooltip.getBoundingClientRect();
            const isTopHalf = rect.top < (window.innerHeight / 2);
            let team = isTopHalf ? state.opponentTeam : state.myTeam;

            ensureTeamMember(team, result.pokemon, 'visual');
            const mon = team[result.pokemon];

            if (mon) {
                if (result.hp !== null) mon.hp = result.hp;
                if (result.ability) mon.ability = result.ability;
                if (result.item) mon.item = result.item;
                if (result.teraType) mon.teraType = result.teraType;
                if (result.stats && Object.keys(result.stats).length > 0) mon.stats = result.stats;
                if (result.moves.length > 0) {
                    result.moves.forEach(m => {
                        if (!mon.moves.includes(m)) mon.moves.push(m);
                    });
                }
            }
        }
        return result;
    }

    // ─── Observer & Loop ───

    function startObserving() {
        const targetNode = document.body;
        const config = { childList: true, subtree: true, attributes: true, characterData: true };

        const observer = new MutationObserver((mutations) => {
            let logUpdated = false;
            let visualUpdated = false;

            mutations.forEach(mutation => {
                if (mutation.target.classList && mutation.target.classList.contains('battle-log')) {
                    logUpdated = true;
                }
                if (mutation.target.classList && (mutation.target.classList.contains('statbar') || mutation.target.classList.contains('hpbar'))) {
                    visualUpdated = true;
                }
                if (mutation.target.id === 'tooltipwrapper') {
                    scrapeTooltip();
                }
            });

            if (logUpdated) {
                const logWindow = document.querySelector('.battle-log');
                if (logWindow) {
                    const history = logWindow.querySelectorAll('.battle-history');
                    // Just grab the last 5 messages to be safe
                    const recent = Array.from(history).slice(-5);
                    recent.forEach(el => parseBattleLogLine(el.textContent));
                }
            }

            if (document.querySelector('.statbar')) {
                scrapeHP();
                scrapeTeamIcons();
                scrapeMoveMenu();
                scrapeSwitchMenu();
                
                chrome.runtime.sendMessage({
                    type: 'UPDATE_STATE',
                    payload: state
                });
            }
        });

        observer.observe(targetNode, config);
        console.log('[ShowdownPredictor] Observer started');
    }

    function initialScan() {
        console.log('[ShowdownPredictor] Performing initial scan...');
        
        const p1Node = document.querySelector('.trainer-near strong');
        const p2Node = document.querySelector('.trainer-far strong');
        if (p1Node) state.myName = p1Node.textContent.trim();
        if (p2Node) state.opponentName = p2Node.textContent.trim();
        
        console.log(`[ShowdownPredictor] Player: ${state.myName}, Opponent: ${state.opponentName}`);

        scrapeHP();
        scrapeTeamIcons();
        scrapeMoveMenu();
        scrapeSwitchMenu();

        const logWindow = document.querySelector('.battle-log');
        if (logWindow) {
            const history = logWindow.querySelectorAll('.battle-history');
            history.forEach(el => parseBattleLogLine(el.textContent));
        }
    }

    // ─── Initialization ───

    function init() {
        const checkForBattle = setInterval(() => {
            if (document.querySelector('.statbar')) {
                clearInterval(checkForBattle);
                state.battleActive = true;
                initialScan();
                startObserving();
            }
        }, 1000);
    }

    return {
        init: init,
        getState: () => state
    };

})();

ShowdownScraper.init();
 