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
                addMoveToTeam(state.opponentTeam, pokemonName, moveName);
            } else {
                addMoveToTeam(state.myTeam, pokemonName, moveName);
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
        if (name.includes('Tera Type') || name.includes('Ability:') || name.includes('Item:') || name.includes('Stats:')) {
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

    function ensureTeamMember(team, name) {
        if (!name) return;
        
        // Final sanity check: Is this name a valid Pokemon or at least looks like one?
        if (name.length < 3 || name.includes(' lost ') || name.includes(' health')) return;

        // Anti-duplication: If adding to myTeam, remove from opponentTeam and vice-versa
        if (team === state.myTeam) {
            if (state.opponentTeam[name]) {
                console.log(`[ShowdownPredictor] Side-Switch: Moving ${name} from OPPONENT to PLAYER`);
                delete state.opponentTeam[name];
            }
        } else {
            if (state.myTeam[name]) {
                console.log(`[ShowdownPredictor] Side-Switch: Moving ${name} from PLAYER to OPPONENT`);
                delete state.myTeam[name];
            }
        }

        if (!team[name]) {
            // Check if we already have 6 mons to prevent ghosting/overwriting
            const teamSize = Object.keys(team).length;
            if (teamSize >= 6 && !team[name]) {
                console.log(`[ShowdownPredictor] Team Full: Not adding ${name} to ${team === state.myTeam ? 'PLAYER' : 'OPPONENT'} team (already has 6)`);
                // Find a mon with 0 HP or least info to replace? 
                // For now, let's just log it. In Randoms, sometimes illusions or nicknames cause > 6.
            }

            console.log(`[ShowdownPredictor] New Mon: Adding ${name} to ${team === state.myTeam ? 'PLAYER' : 'OPPONENT'} team`);
            
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
        ensureTeamMember(team, pokemonName);
        const mon = team[pokemonName];
        if (!mon.moves.includes(moveName)) {
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

                const isOpponentSide = bar.closest('.side-1') !== null || bar.classList.contains('rstatbar');
                const isPlayerSide = bar.closest('.side-0') !== null || bar.classList.contains('lstatbar');
                
                let team = null;
                if (isOpponentSide) {
                    team = state.opponentTeam;
                    state.opponentActive = name;
                } else if (isPlayerSide) {
                    team = state.myTeam;
                    state.myActive = name;
                } else {
                    // Final fallback
                    const rect = bar.getBoundingClientRect();
                    const isTop = rect.top < window.innerHeight / 2;
                    team = isTop ? state.opponentTeam : state.myTeam;
                    if (isTop) state.opponentActive = name;
                    else state.myActive = name;
                }

                if (team) {
                    ensureTeamMember(team, name);
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
        // Check visibility. Usually offsetParent is good enough for 'display: none'
        if (!switchMenu || switchMenu.offsetParent === null) {
            state.forceSwitch = false;
            return;
        }

        const switchButtons = switchMenu.querySelectorAll('button');
        switchButtons.forEach(btn => {
            if (btn.name === 'chooseSwitch' || btn.name === 'chooseTeamPreview') {
                // Valid switch choice
                const nameText = btn.textContent.trim().split('\n')[0];
                const name = cleanPokemonName(nameText);
                if (name) {
                    state.mySwitches.push({ name: name });
                }
            }
        });

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
        // Opponent icons: .side-1 (Top)
        const oppIcons = document.querySelectorAll('.side-1 .teamicons span, .trainer-far .teamicons span');
        oppIcons.forEach(icon => {
            const label = icon.getAttribute('aria-label') || icon.getAttribute('title');
            if (label) {
                const name = cleanPokemonName(label);
                if (name) ensureTeamMember(state.opponentTeam, name);
            }
        });

        // My icons: .side-0 (Bottom)
        const myIcons = document.querySelectorAll('.side-0 .teamicons span, .trainer-near .teamicons span');
        myIcons.forEach(icon => {
            const label = icon.getAttribute('aria-label') || icon.getAttribute('title');
            if (label) {
                const name = cleanPokemonName(label);
                if (name) ensureTeamMember(state.myTeam, name);
            }
        });
    }

    /**
     * Scrape tooltip content when a tooltip appears
     * Showdown tooltips contain detailed info about moves, Pokémon, items, abilities
     */
    function scrapeTooltip() {
        const tooltip = document.querySelector('#tooltipwrapper .tooltip, .tooltip');
        if (!tooltip) return;

        const result = {
            pokemon: '',
            hp: null,
            ability: '',
            item: '',
            teraType: '',
            moves: [],
            stats: {}
        };

        // Extract Pokémon name from h2
        const h2 = tooltip.querySelector('h2');
        if (h2) {
            const nameText = h2.textContent.trim();
            
            // AGGRESSIVE: Reject non-Pokemon names immediately
            if (nameText.includes('Tera Type:') || nameText.includes('Ability:') || nameText.includes('Item:')) {
                // If this is a sub-header, the Pokemon name is usually the FIRST h2 in the tooltip
                const firstH2 = tooltip.querySelector('h2');
                if (firstH2 && firstH2 === h2) return null; // It IS the first h2, so it's not a mon
            }

            result.pokemon = cleanPokemonName(nameText);
            if (!result.pokemon) return null;

            // Check if this is actually a Move tooltip
            if (typeof lookupMove === 'function' && lookupMove(result.pokemon)) return null;
        }

        // HP
        const hpBar = tooltip.querySelector('.hpbar .hp');
        if (hpBar) {
            const width = hpBar.style.width;
            result.hp = width ? parseFloat(width) : 100;
        }

        // Stats (Atk, Def, etc)
        const statElements = tooltip.querySelectorAll('p');
        statElements.forEach(p => {
            const text = p.textContent;
            
            // Ability
            if (text.includes('Ability:')) {
                result.ability = text.split('Ability:')[1].trim();
            }
            // Item
            if (text.includes('Item:')) {
                result.item = text.split('Item:')[1].trim();
            }
            // Tera Type
            if (text.includes('Tera Type:')) {
                result.teraType = text.split('Tera Type:')[1].trim();
            }

            // Actual Stats (Base Stats section)
            // Example: "Atk: 100 / Def: 80 / SpA: 60"
            const statMatch = text.match(/(Atk|Def|SpA|SpD|Spe):\s*(\d+)/g);
            if (statMatch) {
                statMatch.forEach(s => {
                    const [key, val] = s.split(':').map(x => x.trim());
                    const statMap = { 'Atk': 'atk', 'Def': 'def', 'SpA': 'spa', 'SpD': 'spd', 'Spe': 'spe' };
                    if (statMap[key]) result.stats[statMap[key]] = parseInt(val);
                });
            }
        });

        // Moves
        const moveElements = tooltip.querySelectorAll('.section ul li');
        moveElements.forEach(li => {
            const moveName = li.textContent.replace('•', '').trim();
            if (moveName && !result.moves.includes(moveName)) {
                result.moves.push(moveName);
            }
        });

        // Update state with tooltip data
        if (result.pokemon) {
            // 1. CLEAN THE NAME AGAIN (Just in case)
            result.pokemon = cleanPokemonName(result.pokemon);
            if (!result.pokemon) return;

            // 2. DETERMINE SIDE (Aggressive)
            let team = null;
            
            // Check if we are hovering a statbar or trainer side
            const isOppTooltip = tooltip.closest('.rightbar') || 
                               tooltip.closest('.trainer-far') || 
                               tooltip.closest('.side-1') ||
                               tooltip.classList.contains('opposing-tooltip') ||
                               (tooltip.offsetLeft > window.innerWidth / 2);

            // If it's the opponent's tooltip area, use opponent team
            if (isOppTooltip) {
                team = state.opponentTeam;
            } else {
                team = state.myTeam;
            }

            ensureTeamMember(team, result.pokemon);
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

    // ─── MutationObserver Setup ───

    let battleLogObserver = null;
    let tooltipObserver = null;
    let controlsObserver = null;

    /**
     * Start observing the battle DOM for changes
     */
    function startObserving(onUpdate) {
        // Observe battle log for new lines
        const battleContainer = document.querySelector('.battle') || document.body;
        const battleLog = document.querySelector('.battle-log .inner') ||
            document.querySelector('.battle-log');
        
        console.log('[ShowdownPredictor] Scraper: Looking for battle log...', battleLog ? 'Found' : 'Not found');

        if (battleLog) {
            battleLogObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                            const text = node.textContent || '';
                            // Each new div in the battle log is a new event
                            text.split('\n').forEach(line => {
                                parseBattleLogLine(line);
                            });
                        }
                    });
                });
                // Scrape supplementary data
                scrapeHP();
                scrapeTeamIcons();
                state.battleActive = true;
                if (onUpdate) onUpdate(state);
            });

            battleLogObserver.observe(battleLog, {
                childList: true,
                subtree: true,
                characterData: true
            });
        }

        // Observe tooltips appearing/disappearing
        const tooltipWrapper = document.querySelector('#tooltipwrapper') || document.body;
        tooltipObserver = new MutationObserver((mutations) => {
            const tooltip = document.querySelector('#tooltipwrapper .tooltip, .tooltip');
            if (tooltip) {
                console.log('[ShowdownPredictor] Scraper: Tooltip detected');
                scrapeTooltip();
                if (onUpdate) onUpdate(state);
            }
        });

        tooltipObserver.observe(tooltipWrapper, {
            childList: true,
            subtree: true,
            attributes: true
        });

        // Observe move/switch menu changes
        const controls = document.querySelector('.battle-controls') || document.body;
        controlsObserver = new MutationObserver(() => {
            scrapeMoveMenu();
            scrapeSwitchMenu();
            if (onUpdate) onUpdate(state);
        });

        controlsObserver.observe(controls, {
            childList: true,
            subtree: true
        });

        console.log('[ShowdownPredictor] Scraper: Observers started');
    }

    /**
     * Stop all observers
     */
    function stopObserving() {
        if (battleLogObserver) battleLogObserver.disconnect();
        if (tooltipObserver) tooltipObserver.disconnect();
        if (controlsObserver) controlsObserver.disconnect();
    }

    /**
     * Initial scan of the current battle state
     */
    function initialScan() {
        console.log('[ShowdownPredictor] Scraper: Starting initial scan');
        
        // 1. Definitive source of truth for "Me": trainer-near
        const nearTrainer = document.querySelector('.trainer-near strong');
        if (nearTrainer) {
            state.myName = nearTrainer.textContent.trim().replace(/^☆/, '').replace(/^[^a-zA-Z0-9]+/, '');
        }

        // 2. Detect opponent from header
        const header = document.querySelector('.battle-log .inner h2');
        if (header && header.textContent.includes(' vs. ')) {
            const parts = header.textContent.split(' vs. ');
            const p1 = parts[0].trim().replace(/^☆/, '').replace(/^[^a-zA-Z0-9]+/, '');
            const p2 = parts[1].trim().replace(/^☆/, '').replace(/^[^a-zA-Z0-9]+/, '');
            
            if (state.myName) {
                // If we know who we are, the other one is the opponent
                if (state.myName.toLowerCase() === p1.toLowerCase()) {
                    state.opponentName = p2;
                } else {
                    state.opponentName = p1;
                }
            } else {
                // Fallback if nearTrainer failed
                state.opponentName = p1;
                state.myName = p2;
            }
        }

        // 3. Fallback for opponent name
        if (!state.opponentName) {
            const farTrainer = document.querySelector('.trainer-far strong');
            if (farTrainer) state.opponentName = farTrainer.textContent.trim().replace(/^☆/, '').replace(/^[^a-zA-Z0-9]+/, '');
        }

        console.log(`[ShowdownPredictor] Scraper: Detected players - Me: ${state.myName}, Opponent: ${state.opponentName}`);

        // 2. Parse existing battle log
        const logLines = document.querySelectorAll('.battle-log .inner div, .battle-log .inner h2, .battle-log .battle-history');
        console.log(`[ShowdownPredictor] Scraper: Found ${logLines.length} log lines for initial scan`);
        logLines.forEach(el => {
            const text = el.textContent || '';
            text.split('\n').forEach(line => parseBattleLogLine(line));
        });

        // 3. Scrape current state
        scrapeHP();
        scrapeMoveMenu();
        scrapeSwitchMenu();
        scrapeTeamIcons();

        console.log('[ShowdownPredictor] Scraper: Initial scan complete', state);
    }

    /**
     * Reset state for a new battle
     */
    function reset() {
        state.myTeam = {};
        state.opponentTeam = {};
        state.myActive = null;
        state.opponentActive = null;
        state.myName = null;
        state.opponentName = null;
        state.field = {
            weather: null, terrain: null,
            myHazards: { stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false },
            opponentHazards: { stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false },
            trickRoom: false,
            tailwind: { my: false, opponent: false }
        };
        state.turnNumber = 0;
        state.myMoves = [];
        state.mySwitches = [];
        state.mySwitches = [];
        state.battleActive = false;
        state.forceSwitch = false;
    }

    // Public API
    return {
        state,
        startObserving,
        stopObserving,
        initialScan,
        scrapeHP,
        scrapeMoveMenu,
        scrapeSwitchMenu,
        scrapeTooltip,
        scrapeTeamIcons,
        parseBattleLogLine,
        reset
    };
})();
