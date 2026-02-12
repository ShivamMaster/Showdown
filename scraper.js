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

        // Strict textual check for opponent actions
        // Showdown consistently prefixes opponent actions with "The opposing "
        const isOpposingAction = line.includes('The opposing');

        // Turn number
        const turnMatch = line.match(/^Turn (\d+)/);
        if (turnMatch) {
            state.turnNumber = parseInt(turnMatch[1]);
            return;
        }

        // Move usage: "PlayerName's Pokémon used Move!"
        // Or in Showdown format: "The opposing Pokémon used Move!" / "Pokémon used Move!"
        const moveMatch = line.match(/(?:The opposing )?(.+?) used (.+?)!/);
        if (moveMatch) {
            const pokemonName = cleanPokemonName(moveMatch[1]);
            const moveName = moveMatch[2].trim();
            // Strict logic: If line says 'The opposing', it is opponent. Otherwise, it is mine.
            const isOpponent = isOpposingAction;

            if (isOpponent) {
                addMoveToTeam(state.opponentTeam, pokemonName, moveName);
            } else {
                addMoveToTeam(state.myTeam, pokemonName, moveName);
            }
            return;
        }

        // Switch Logic:
        // "Go! X!" -> User (Live Battle Standard)
        // "PlayerName sent out X!" -> Opponent (Usually, unless Replay)
        // "The opposing X came out!" -> Opponent

        // 1. User Switch: "Go! [Pokemon]!"
        const goMatch = line.match(/^Go! (.+?)!/);
        if (goMatch) {
            const name = cleanPokemonName(goMatch[1]);
            state.myActive = name;
            ensureTeamMember(state.myTeam, name);
            // If we found a "Go!" match, we stop processing this line for switches
            return;
        }

        // 2. Opponent Switch: "The opposing [Pokemon] came out!" or "PlayerName sent out [Pokemon]!"
        // Note: We treat "sent out" as opponent because User sees "Go!".
        // Exception: "User sent out X!" in some niche formats? Unlikely in standard live play.
        const oppSentMatch = line.match(/.*?sent out (.+?)!/);
        const cameOutMatch = line.match(/(?:The opposing )(.+?)(?:\scame out| appeared)/);

        if (oppSentMatch || cameOutMatch) {
            const name = cleanPokemonName(oppSentMatch ? oppSentMatch[1] : cameOutMatch[1]);
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
        // 1. Normalize whitespace (tabs, newlines, non-breaking spaces) to single space
        let cleaned = name.replace(/[\n\t\r\u00a0]/g, ' ').trim();

        // 2. Remove gender symbols
        cleaned = cleaned.replace(/[♂♀]/g, '');

        // 3. Remove nickname formatting (parentheses) BEFORE level suffix
        // This is critical because "Mon (M) L50" ends with L50 only if (M) is gone first,
        // or if regex handles skipped content. Better to strip parens first.
        cleaned = cleaned.replace(/\s*\(.*?\)\s*/g, '');

        // 4. Remove level suffix (e.g. " L50", " L100", "L100")
        // Be very aggressive: Optional space + L + Digits at the end
        cleaned = cleaned.replace(/\s*L\d+$/, '');

        return cleaned.trim();
    }

    function isOpponentPokemon(name) {
        return state.opponentTeam.hasOwnProperty(name);
    }

    function ensureTeamMember(team, name) {
        if (!team[name]) {
            const data = lookupPokemon(name);
            team[name] = {
                hp: 100,
                status: '',
                moves: [],
                item: '',
                ability: data ? data.abilities[0] : '',
                types: data ? data.types : [],
                baseStats: data ? data.baseStats : null,
                stats: null, // Actual stats from tooltip
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
        // Player's side (bottom/left statbars)
        const statbars = document.querySelectorAll('.statbar');
        statbars.forEach(bar => {
            const nameEl = bar.querySelector('strong');
            const hpEl = bar.querySelector('.hpbar .hp');
            if (nameEl && hpEl) {
                const name = cleanPokemonName(nameEl.textContent);
                const width = hpEl.style.width;
                const hp = width ? parseFloat(width) : 100;

                // Determine if this is opponent or player based on bar position
                const isRightSide = bar.classList.contains('rstatbar');
                const isLeftSide = bar.classList.contains('lstatbar');

                if (isRightSide) {
                    // Right side = opponent (typically)
                    // Strict Isolation: Ensure it's not in myTeam
                    if (state.myTeam[name]) {
                        console.warn(`[ShowdownPredictor] Corruption fixed: Removing ${name} from myTeam (found on opponent side)`);
                        delete state.myTeam[name];
                    }

                    ensureTeamMember(state.opponentTeam, name);
                    state.opponentTeam[name].hp = hp;
                    state.opponentActive = name;
                } else if (isLeftSide) {
                    // Left side = player
                    // Strict Isolation: Ensure it's not in opponentTeam
                    if (state.opponentTeam[name]) {
                        console.warn(`[ShowdownPredictor] Corruption fixed: Removing ${name} from opponentTeam (found on my side)`);
                        delete state.opponentTeam[name];
                    }

                    ensureTeamMember(state.myTeam, name);
                    state.myTeam[name].hp = hp;
                    state.myActive = name;
                }

                // Check for status icons
                const statusEl = bar.querySelector('.status');
                if (statusEl) {
                    const statusText = statusEl.textContent.toLowerCase().trim();
                    const team = isRightSide ? state.opponentTeam : state.myTeam;
                    if (team[name]) {
                        if (statusText.includes('brn')) team[name].status = 'brn';
                        else if (statusText.includes('psn') || statusText.includes('tox')) team[name].status = 'tox';
                        else if (statusText.includes('par')) team[name].status = 'par';
                        else if (statusText.includes('slp')) team[name].status = 'slp';
                        else if (statusText.includes('frz')) team[name].status = 'frz';
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
        const moveButtons = document.querySelectorAll('.movemenu button, .move-menu button');

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
        const teamIconContainers = document.querySelectorAll('.trainer');
        teamIconContainers.forEach(container => {
            const icons = container.querySelectorAll('.picon');
            icons.forEach(icon => {
                // Check for aria-label or title which contain Pokémon name
                const label = icon.getAttribute('aria-label') || icon.getAttribute('title') || '';
                if (label) {
                    const name = cleanPokemonName(label.split('(')[0]);
                    // Fainted Pokémon have specific styling changes
                    const isFainted = icon.style.opacity === '0.3' || icon.style.filter?.includes('grayscale');
                    if (name && isFainted) {
                        // Determine which team
                        const isOpp = container.closest('.rightbar') || container.classList.contains('trainer-far');
                        const team = isOpp ? state.opponentTeam : state.myTeam;
                        if (team[name]) team[name].hp = 0;
                    }
                }
            });
        });
    }

    /**
     * Scrape tooltip content when a tooltip appears
     * Showdown tooltips contain detailed info about moves, Pokémon, items, abilities
     */
    function scrapeTooltip() {
        const tooltip = document.querySelector('#tooltipwrapper .tooltip');
        if (!tooltip) return null;

        const text = tooltip.innerText || tooltip.textContent;
        if (!text) return null;

        const result = {
            raw: text,
            pokemon: null,
            moves: [],
            item: null,
            ability: null,
            hp: null,
            types: [],
            stats: {}
        };

        // Extract Pokémon name from h2
        const h2 = tooltip.querySelector('h2');
        if (h2) {
            const nameText = h2.textContent.trim();
            result.pokemon = cleanPokemonName(nameText);

            // Check if this is actually a Move tooltip
            // If the name matches a known move, ignore it
            // We can check if lookupMove exists (it should be loaded)
            if (typeof lookupMove === 'function') {
                const moveCheck = lookupMove(result.pokemon);
                if (moveCheck && !moveCheck.isUnknown) {
                    // It's a move, ignore
                    return null;
                }
            }
        }

        // Parse tooltip sections
        const sections = tooltip.querySelectorAll('p');
        sections.forEach(p => {
            const pText = p.textContent.trim();

            // HP extraction
            const hpMatch = pText.match(/HP:\s*([\d.]+)%|HP:\s*(\d+)\/(\d+)/);
            if (hpMatch) {
                result.hp = hpMatch[1] ? parseFloat(hpMatch[1]) : (parseInt(hpMatch[2]) / parseInt(hpMatch[3]) * 100);
            }

            // Ability
            const abilityMatch = pText.match(/Ability:\s*(.+?)(?:\s*\/|\s*$)/);
            if (abilityMatch) result.ability = abilityMatch[1].trim();

            // Item
            const itemMatch = pText.match(/Item:\s*(.+?)(?:\s*$)/);
            if (itemMatch) result.item = itemMatch[1].trim();

            // Moves (bullet points)
            if (pText.includes('•')) {
                const moveLines = pText.split('\n');
                moveLines.forEach(ml => {
                    const mm = ml.match(/•\s*(.+)/);
                    if (mm) result.moves.push(mm[1].trim().split('(')[0].trim());
                });
            }
        });

        // ─── Stats extraction ───
        // Tooltips typically list stats like: "Atk 166 / Def 146 / SpA 226 / SpD 206 / Spe 186"
        const textContent = tooltip.textContent;
        // Pattern 1: Explicit labels
        const statMatch = textContent.match(/Atk\D*(\d+)\D*Def\D*(\d+)\D*SpA\D*(\d+)\D*SpD\D*(\d+)\D*Spe\D*(\d+)/i);
        if (statMatch) {
            result.stats = {
                atk: parseInt(statMatch[1]),
                def: parseInt(statMatch[2]),
                spa: parseInt(statMatch[3]),
                spd: parseInt(statMatch[4]),
                spe: parseInt(statMatch[5])
            };
        } else {
            // Pattern 2: Raw numbers "Stats: 100 / 100 / 100 / 100 / 100" (skipping HP)
            const rawStatMatch = textContent.match(/Stats:\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/i);
            if (rawStatMatch) {
                result.stats = {
                    atk: parseInt(rawStatMatch[1]),
                    def: parseInt(rawStatMatch[2]),
                    spa: parseInt(rawStatMatch[3]),
                    spd: parseInt(rawStatMatch[4]),
                    spe: parseInt(rawStatMatch[5])
                };
            }
        }


        // Update state with tooltip data
        if (result.pokemon) {
            // STRICT CHECK: Only update if we know whose Pokémon it is.
            // Do NOT guess. Rely on scrapeHP to populate teams first.
            let isOpp = false;
            let found = false;

            if (state.myTeam[result.pokemon]) {
                isOpp = false;
                found = true;
            } else if (state.opponentTeam[result.pokemon]) {
                isOpp = true;
                found = true;
            }

            if (found) {
                const team = isOpp ? state.opponentTeam : state.myTeam;
                const mon = team[result.pokemon];

                if (result.hp !== null) mon.hp = result.hp;
                if (result.ability) mon.ability = result.ability;
                if (result.item) mon.item = result.item;
                if (result.stats && Object.keys(result.stats).length > 0) mon.stats = result.stats; // Update actual stats
                if (result.moves.length > 0) {
                    result.moves.forEach(m => {
                        if (!mon.moves.includes(m)) mon.moves.push(m);
                    });
                }
            } else {
                // Formatting mismatch or unknown mon. Log warning.
                console.warn(`[ShowdownPredictor] Tooltip ignored for '${result.pokemon}'. Not in myTeam or opponentTeam.`,
                    'My:', Object.keys(state.myTeam),
                    'Opp:', Object.keys(state.opponentTeam));
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
        const battleLog = document.querySelector('.battle-log .inner') ||
            document.querySelector('.battle-log');

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
            const tooltip = document.querySelector('#tooltipwrapper .tooltip');
            if (tooltip) {
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
        // Try to determine player side
        const userEl = document.querySelector('.trainer-near strong');
        if (userEl) {
            // We're the near trainer
            state.myPlayerIndex = 'p1';
        }

        // Parse existing battle log
        const logLines = document.querySelectorAll('.battle-log .inner div, .battle-log .inner h2');
        logLines.forEach(el => {
            const text = el.textContent || '';
            text.split('\n').forEach(line => parseBattleLogLine(line));
        });

        // Scrape current state
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
