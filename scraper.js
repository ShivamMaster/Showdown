/**
 * scraper.js — DOM Scraper for Pokémon Showdown
 * Monitors the battle interface using MutationObserver to extract:
 *   Battle log events (moves, switches, damage, status, weather, hazards)
 *   HP percentages from stat bars
 *   Pokémon names and status from stat bars
 *   Tooltip data (moves, items, abilities, stats) when hovering
 *   Team icons and faint status
 *   Move menu and switch menu options
 *
 * Maintains 12 slots: 6 for player, 6 for opponent.
 * Opponent slots are revealed incrementally as Pokémon appear.
 * Handles regional variants (Alola, Galar, Hisui, Paldea) as distinct species.
 *
 * === KEY FIX: SIDE DETECTION ===
 * The scraper now uses a multi-layered approach to determine which Pokémon
 * belongs to which player:
 *
 * 1. PROTOCOL PARSING (most reliable): Intercepts the battle protocol
 *    messages that contain explicit "p1a:" and "p2a:" prefixes.
 * 2. DOM CLASS-BASED: Uses .lstatbar (near/player) vs .rstatbar (far/opponent)
 *    and .trainer-near vs .trainer-far containers.
 * 3. CONTROL OWNERSHIP: The move menu and switch menu ONLY exist for the
 *    local player's Pokémon, so anything in those menus is definitively ours.
 * 4. LOG PARSING: "Go! X!" is always ours; "The opposing X" is always theirs.
 *
 * === KEY FIX: REGIONAL VARIANT HANDLING ===
 * Regional variants (Alola, Galar, Hisui, Paldea) are treated as entirely
 * separate Pokémon species. "Raichu" and "Raichu-Alola" will NEVER be merged.
 * Only cosmetic forms (Vivillon patterns, Gastrodon colors, etc.) are merged.
 */
const ShowdownScraper = (() => {
    // ─── Constants ───
    const MAX_TEAM_SIZE = 6;

    // Regional and form suffixes that represent competitively distinct Pokémon
    // These must NEVER be stripped or merged with the base form
    const DISTINCT_FORM_SUFFIXES = [
        '-Alola', '-Alolan',
        '-Galar', '-Galarian',
        '-Hisui', '-Hisuian',
        '-Paldea', '-Paldean',
        '-Mega', '-Mega-X', '-Mega-Y',
        '-Primal',
        '-Origin',
        '-Therian',
        '-Incarnate',
        '-Black', '-White',
        '-Resolute',
        '-Pirouette', '-Aria',
        '-Ash',
        '-Unbound',
        '-Midnight', '-Dusk',
        '-School',
        '-Starter',
        '-Rapid-Strike', '-Single-Strike',
        '-Ice', '-Shadow',
        '-Crowned',
        '-Eternamax',
        '-Bloodmoon',
        '-Cornerstone', '-Hearthflame', '-Wellspring',
        '-Teal', '-Teal-Tera',
        '-Stellar',
        '-Low-Key', '-Amped',
        '-Sensu', '-Baile', '-Pau', '-Pom-Pom',
        '-Sandy', '-Trash', '-Heat', '-Wash', '-Frost', '-Mow', '-Fan',
        '-Attack', '-Defense', '-Speed',
        '-Dusk-Mane', '-Dawn-Wings', '-Ultra',
        '-Blade', '-Shield',
        '-Hangry',
        '-Noice', '-Gorging',
        '-Roaming',
        '-Terastal', '-Stellar',
        '-Four', '-Three', '-Family'
    ];

    // Regional suffixes specifically — used by isSamePokemon to prevent merging
    const REGIONAL_SUFFIXES = [
        '-Alola', '-Alolan',
        '-Galar', '-Galarian',
        '-Hisui', '-Hisuian',
        '-Paldea', '-Paldean'
    ];

    // Pokémon that are ONLY cosmetically different (safe to merge)
    const COSMETIC_FORMS = [
        'Vivillon', 'Flabébé', 'Floette', 'Florges',
        'Furfrou', 'Minior', 'Alcremie', 'Sinistea',
        'Polteageist', 'Tatsugiri', 'Maushold', 'Dudunsparce',
        'Squawkabilly', 'Poltchageist', 'Sinistcha',
        'Gastrodon', 'Shellos', 'Deerling', 'Sawsbuck',
        'Unown'
    ];

    // ─── Game State ───
    const state = {
        myTeam: {},
        opponentTeam: {},
        myActive: null,
        opponentActive: null,
        myName: null,
        opponentName: null,
        myPlayerSide: null, // 'p1' or 'p2' — determined from protocol/DOM
        field: {
            weather: null,
            terrain: null,
            myHazards: { stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false },
            opponentHazards: { stealthRock: false, spikes: 0, toxicSpikes: 0, stickyWeb: false },
            trickRoom: false,
            tailwind: { my: false, opponent: false }
        },
        turnNumber: 0,
        myMoves: [],
        mySwitches: [],
        lastLog: '',
        battleActive: false,
        forceSwitch: false,
        // Display state for the 12 boxes
        displaySlots: {
            mySlots: [null, null, null, null, null, null],
            opponentSlots: [null, null, null, null, null, null]
        }
    };

    // ─── Side Detection ───

    /**
     * Determine which side (p1 or p2) the local player is on.
     * This is the MOST CRITICAL piece — everything else depends on it.
     *
     * Strategy (in priority order):
     * 1. Check Showdown's room object (if accessible via page context)
     * 2. Check DOM data attributes on battle elements
     * 3. Check the battle log for "|player|" protocol lines
     * 4. Check which side the controls/move menu belong to
     * 5. Fall back to .trainer-near = player assumption
     */
    function detectPlayerSide() {
        // Method 1: Check for data attributes on the battle wrapper
        const battleEl = document.querySelector('.battle');
        if (battleEl) {
            const side = battleEl.getAttribute('data-myside');
            if (side === 'p1' || side === 'p2') {
                state.myPlayerSide = side;
                console.log(`[ShowdownScraper] Side detected via data-myside: ${side}`);
                return;
            }
        }

        // Method 2: Try to access the Showdown room object
        // In some contexts, window.room or app.curRoom is available
        try {
            /* eslint-disable no-undef */
            if (typeof app !== 'undefined' && app.curRoom && app.curRoom.battle) {
                const battle = app.curRoom.battle;
                if (battle.mySide && battle.mySide.sideid) {
                    state.myPlayerSide = battle.mySide.sideid;
                    console.log(`[ShowdownScraper] Side detected via app.curRoom: ${state.myPlayerSide}`);
                    return;
                }
            }
            /* eslint-enable no-undef */
        } catch (e) {
            // Not available — continue
        }

        // Method 3: Parse battle log for protocol messages
        // The raw battle protocol contains lines like:
        //   |player|p1|Username|avatar
        // We can match our username to determine side
        const logWindow = document.querySelector('.battle-log .inner.message-log, .battle-log .inner');
        if (logWindow) {
            const rawText = logWindow.innerHTML;
            // Look for player assignment in protocol
            const playerMatches = rawText.match(/\|player\|(p[12])\|([^|]+)\|/g);
            if (playerMatches) {
                // We need to know our username to match
                // Try getting it from the page header or login area
                const usernameEl = document.querySelector('button[name="login"] span, .username');
                const myUsername = usernameEl ? usernameEl.textContent.trim() : null;

                if (myUsername) {
                    for (const match of playerMatches) {
                        const parts = match.split('|').filter(Boolean);
                        if (parts[1] && parts[2]) {
                            if (parts[2].trim().toLowerCase() === myUsername.toLowerCase()) {
                                state.myPlayerSide = parts[1];
                                console.log(`[ShowdownScraper] Side detected via protocol player line: ${state.myPlayerSide}`);
                                return;
                            }
                        }
                    }
                }
            }
        }

        // Method 4: The controls area is ALWAYS for the local player.
        // Check if move buttons exist — they only appear for our side.
        // Cross-reference the active Pokémon name in the move menu with statbar sides.
        const moveMenu = document.querySelector('.movemenu, .move-menu');
        if (moveMenu) {
            // The active Pokémon using the move menu is on OUR side
            // Check which statbar name matches the controls
            const controlsName = document.querySelector('.controls .pokemon-info, .whatdo');
            if (controlsName) {
                const controlText = controlsName.textContent;
                const lstatName = document.querySelector('.lstatbar strong');
                const rstatName = document.querySelector('.rstatbar strong');
                if (lstatName && controlText.includes(cleanPokemonName(lstatName.textContent))) {
                    state.myPlayerSide = 'p1'; // lstatbar = near = p1
                    console.log('[ShowdownScraper] Side detected via controls matching lstatbar');
                    return;
                }
                if (rstatName && controlText.includes(cleanPokemonName(rstatName.textContent))) {
                    state.myPlayerSide = 'p2'; // rstatbar = far = p2
                    console.log('[ShowdownScraper] Side detected via controls matching rstatbar');
                    return;
                }
            }
        }

        // Method 5: Check .trainer-near for our name
        // .trainer-near is the local player in standard (non-spectator) battles
        const trainerNear = document.querySelector('.trainer-near strong');
        const trainerFar = document.querySelector('.trainer-far strong');

        if (trainerNear) {
            state.myName = trainerNear.textContent.trim();
        }
        if (trainerFar) {
            state.opponentName = trainerFar.textContent.trim();
        }

        // Default assumption: near = p1 = us. This is correct for standard battles.
        if (!state.myPlayerSide) {
            state.myPlayerSide = 'p1';
            console.log('[ShowdownScraper] Side defaulting to p1 (trainer-near assumption)');
        }
    }

    /**
     * Determine if a statbar belongs to our side or opponent's side.
     * Uses CSS class rather than screen geometry.
     */
    function getStatbarSide(statbarEl) {
        if (!statbarEl) return null;

        // Showdown uses these classes:
        // .lstatbar = left/near side (usually player in standard view)
        // .rstatbar = right/far side (usually opponent in standard view)
        if (statbarEl.classList.contains('lstatbar')) return 'mine';
        if (statbarEl.classList.contains('rstatbar')) return 'opponent';

        // Fallback: check parent/ancestor for side markers
        const ancestor = statbarEl.closest('[class*="p1"], [class*="p2"]');
        if (ancestor) {
            const isP1 = ancestor.classList.contains('p1') || ancestor.className.includes('p1');
            const isP2 = ancestor.classList.contains('p2') || ancestor.className.includes('p2');
            if (isP1) return state.myPlayerSide === 'p2' ? 'opponent' : 'mine';
            if (isP2) return state.myPlayerSide === 'p2' ? 'mine' : 'opponent';
        }

        // Last resort: geometry
        const rect = statbarEl.getBoundingClientRect();
        const battleBox = document.querySelector('.battle')?.getBoundingClientRect();
        if (battleBox) {
            const midY = battleBox.top + battleBox.height / 2;
            return rect.top < midY ? 'opponent' : 'mine';
        }

        return rect.top < (window.innerHeight / 2) ? 'opponent' : 'mine';
    }

    // ─── Pokémon Name Handling ───

    /**
     * Normalize a form suffix to a canonical version.
     * e.g., '-Alolan' -> '-Alola', '-Galarian' -> '-Galar'
     * This ensures "Raichu-Alola" and "Raichu-Alolan" are treated as the same Pokémon.
     */
    function normalizeFormSuffix(name) {
        if (!name) return name;
        return name
            .replace(/-Alolan\b/g, '-Alola')
            .replace(/-Galarian\b/g, '-Galar')
            .replace(/-Hisuian\b/g, '-Hisui')
            .replace(/-Paldean\b/g, '-Paldea');
    }

    /**
     * Clean and normalize a Pokémon name from DOM text.
     * Preserves regional variants and competitively distinct forms.
     * Only merges purely cosmetic differences.
     */
    function cleanPokemonName(name) {
        if (!name) return '';

        let cleaned = name.trim();

        // Block obvious non-Pokémon strings
        const blocked = [
            'Tera Type', 'Ability:', 'Item:', 'Stats:',
            'Not revealed', 'move', 'Turn', 'Team', 'Opponent',
            'Switch', 'Mega Evolution', 'Dynamax', 'Terastallize'
        ];
        for (const b of blocked) {
            if (cleaned === b || cleaned.startsWith(b + ':')) return '';
        }

        // If it's a pure status string
        const pureStatus = ['active', 'fainted', 'tox', 'psn', 'brn', 'par', 'slp', 'frz', 'fnt'];
        if (pureStatus.includes(cleaned.toLowerCase())) return '';

        // Remove "The opposing" prefix
        cleaned = cleaned.replace(/^[Tt]he opposing\s+/i, '');

        // Remove "Player N's" prefix
        cleaned = cleaned.replace(/^[Pp]layer\s\d+'s\s+/, '');

        // Remove player name prefix: "PlayerName's Pokemon" -> "Pokemon"
        if (state.myName && cleaned.startsWith(state.myName + "'s ")) {
            cleaned = cleaned.substring(state.myName.length + 3);
        }
        if (state.opponentName && cleaned.startsWith(state.opponentName + "'s ")) {
            cleaned = cleaned.substring(state.opponentName.length + 3);
        }

        // Strip Level indicator (e.g., "Cobalion L80" -> "Cobalion")
        cleaned = cleaned.replace(/\s+L\d+\b/g, '');

        // Strip Gender icons
        cleaned = cleaned.replace(/[♂♀]/g, '');

        // Remove known status/state markers in parentheses
        const statusMarkers = ['active', 'fainted', 'brn', 'par', 'slp', 'frz', 'tox', 'psn', 'fnt'];
        statusMarkers.forEach(marker => {
            const re = new RegExp(`\\s*\\(${marker}\\)\\s*`, 'gi');
            cleaned = cleaned.replace(re, '');
        });

        // Handle nicknames: "Nickname (RealName)" -> "RealName"
        // But be careful: "(Alola Form)" or "(M)" or "(F)" are NOT real names
        const parenMatch = cleaned.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
        if (parenMatch) {
            const outer = parenMatch[1].trim();
            const inner = parenMatch[2].trim();

            // If inner is a gender marker, keep outer
            if (inner === 'M' || inner === 'F') {
                cleaned = outer;
            }
            // If inner looks like a Pokémon name (starts with uppercase, no special chars)
            else if (/^[A-Z][a-zA-Zéè\-':\s.]+$/.test(inner) && !pureStatus.includes(inner.toLowerCase())) {
                // This is likely "Nickname (RealName)"
                cleaned = inner;
            }
            // Otherwise keep outer
            else {
                cleaned = outer;
            }
        }

        cleaned = cleaned.trim();

        // Normalize regional suffix variants to canonical form
        // "Raichu-Alolan" -> "Raichu-Alola"
        cleaned = normalizeFormSuffix(cleaned);

        // Cosmetic form normalization — ONLY for forms that are purely visual
        for (const base of COSMETIC_FORMS) {
            if (cleaned.startsWith(base + '-') && cleaned !== base) {
                // Check that the suffix is NOT a distinct form
                const suffix = cleaned.substring(base.length);
                const isDistinct = DISTINCT_FORM_SUFFIXES.some(ds =>
                    suffix === ds || suffix.startsWith(ds)
                );
                if (!isDistinct) {
                    cleaned = base;
                }
                break;
            }
        }

        // Strip stray colons/exclamation marks, except for "Type: Null"
        if (cleaned !== 'Type: Null') {
            cleaned = cleaned.replace(/[:!]/g, '').trim();
        }

        // Final length check
        if (cleaned.length < 2) return '';
        if (cleaned.includes(' lost ') || cleaned.includes(' health')) return '';

        return cleaned;
    }

    /**
     * Check if two Pokémon names refer to the same species.
     * Handles form changes mid-battle (Mega, Terastal form changes, etc.)
     * Does NOT merge regional variants.
     */
    function isSamePokemon(name1, name2) {
        if (!name1 || !name2) return false;
        if (name1 === name2) return true;

        // Normalize both names first
        const n1 = normalizeFormSuffix(name1);
        const n2 = normalizeFormSuffix(name2);
        if (n1 === n2) return true;

        const base1 = getBaseName(n1);
        const base2 = getBaseName(n2);

        if (base1 !== base2) return false;

        // Same base — check if the form difference is regional
        const suffix1 = n1.substring(base1.length);
        const suffix2 = n2.substring(base2.length);

        // Check if EITHER suffix is a regional variant
        const isRegional1 = REGIONAL_SUFFIXES.some(r => suffix1 === r || suffix1.startsWith(r));
        const isRegional2 = REGIONAL_SUFFIXES.some(r => suffix2 === r || suffix2.startsWith(r));

        // If one has a regional suffix and the other doesn't, they are DIFFERENT Pokémon
        // e.g., "Raichu" vs "Raichu-Alola" = DIFFERENT
        if (isRegional1 !== isRegional2) return false;

        // If both have regional suffixes but they differ, they are DIFFERENT Pokémon
        // e.g., "Meowth-Alola" vs "Meowth-Galar" = DIFFERENT
        if (isRegional1 && isRegional2 && suffix1 !== suffix2) return false;

        // Same base, not a regional conflict = likely form change (Mega, Terastal, etc.)
        // e.g., "Charizard" and "Charizard-Mega-X" = SAME (form change in battle)
        return true;
    }

    /**
     * Get the base species name, stripping form suffixes.
     * "Charizard-Mega-X" -> "Charizard"
     * "Raichu-Alola" -> "Raichu" (but isSamePokemon will catch regional)
     *
     * IMPORTANT: This function strips ALL suffixes. The regional distinction
     * is handled by isSamePokemon which checks suffixes BEFORE comparing bases.
     */
    function getBaseName(name) {
        if (!name) return '';
        const hyphenIndex = name.indexOf('-');
        if (hyphenIndex === -1) return name;

        // Special cases: Pokémon with hyphens in their base name
        const hyphenatedBases = [
            'Ho-Oh', 'Porygon-Z', 'Jangmo-o', 'Hakamo-o', 'Kommo-o',
            'Tapu Koko', 'Tapu Lele', 'Tapu Bulu', 'Tapu Fini',
            'Type: Null', 'Mr. Mime', 'Mime Jr.', 'Mr. Rime',
            'Nidoran-F', 'Nidoran-M',
            'Wo-Chien', 'Chien-Pao', 'Ting-Lu', 'Chi-Yu',
            'Iron Treads', 'Iron Bundle', 'Iron Hands', 'Iron Jugulis',
            'Iron Moth', 'Iron Thorns', 'Iron Valiant', 'Iron Leaves',
            'Iron Boulder', 'Iron Crown',
            'Great Tusk', 'Scream Tail', 'Brute Bonnet', 'Flutter Mane',
            'Slither Wing', 'Sandy Shocks', 'Roaring Moon', 'Walking Wake',
            'Gouging Fire', 'Raging Bolt'
        ];

        for (const hb of hyphenatedBases) {
            if (name === hb || name.startsWith(hb + '-')) {
                return hb;
            }
        }

        return name.substring(0, hyphenIndex);
    }

    // ─── Team Management ───

    /**
     * Find a Pokémon in a team, accounting for form variations.
     * Returns the key in the team object, or null if not found.
     */
    function findInTeam(team, name) {
        if (!name) return null;

        // Exact match first (fastest)
        if (team[name]) return name;

        // Check with normalized form suffix
        const normalized = normalizeFormSuffix(name);
        if (normalized !== name && team[normalized]) return normalized;

        // Check if any existing member is the same Pokémon (form change)
        for (const key of Object.keys(team)) {
            if (isSamePokemon(key, name)) return key;
        }

        return null;
    }

    /**
     * Ensure a Pokémon exists in the given team.
     * source: 'visual' (HP bars, icons, menus) — can CREATE new entries
     *         'log' (battle log text) — can only UPDATE existing entries
     *
     * CRITICAL: This function checks the OTHER team before adding,
     * and uses the source authority to resolve conflicts.
     */
    function ensureTeamMember(team, name, source = 'visual') {
        if (!name) return null;

        // Sanity checks
        if (name.length < 2) return null;
        if (name.includes(' lost ') || name.includes(' health')) return null;

        const otherTeam = (team === state.myTeam) ? state.opponentTeam : state.myTeam;
        const teamLabel = (team === state.myTeam) ? 'PLAYER' : 'OPPONENT';

        // Check if this Pokémon already exists in THIS team (possibly under a different form)
        const existingKey = findInTeam(team, name);
        if (existingKey) {
            // If the name is more specific (has a form suffix the existing one lacks),
            // upgrade the entry — but ONLY if it's a valid form change (not regional swap)
            if (name !== existingKey && name.length > existingKey.length && isSamePokemon(existingKey, name)) {
                console.log(`[ShowdownScraper] Upgrading ${existingKey} -> ${name} in ${teamLabel}`);
                const oldData = team[existingKey];
                delete team[existingKey];

                const baseData = typeof lookupPokemon === 'function' ? lookupPokemon(name) : null;
                team[name] = {
                    ...oldData,
                    name: name,
                    types: baseData ? baseData.types : oldData.types,
                    stats: baseData ? baseData.baseStats : oldData.stats,
                    ability: oldData.ability || (baseData ? baseData.abilities[0] : '')
                };

                // Update active references
                if (state.myActive === existingKey) state.myActive = name;
                if (state.opponentActive === existingKey) state.opponentActive = name;

                updateDisplaySlots();
                return name;
            }
            return existingKey;
        }

        // Check if this Pokémon exists in the OTHER team
        const existingInOther = findInTeam(otherTeam, name);
        if (existingInOther) {
            if (source === 'visual') {
                // Visual sources tied to a specific side container are authoritative.
                // However, we should NOT move a Pokémon just because we see its name
                // in a log line. Only move if the visual evidence is from a side-specific
                // DOM element (statbar, team icon container).
                console.log(`[ShowdownScraper] WARNING: ${name} found in ${teamLabel === 'PLAYER' ? 'OPPONENT' : 'PLAYER'} team but visual source says ${teamLabel}. Moving.`);
                const data = otherTeam[existingInOther];
                delete otherTeam[existingInOther];
                team[name] = { ...data, name: name };
                updateDisplaySlots();
                return name;
            } else {
                // Log source — don't move, just reference the existing one
                return null;
            }
        }

        // New Pokémon — only visual sources can create
        if (source !== 'visual') return null;

        // Check team size limit
        if (Object.keys(team).length >= MAX_TEAM_SIZE) {
            console.log(`[ShowdownScraper] ${teamLabel} team full (6), not adding ${name}`);
            return null;
        }

        console.log(`[ShowdownScraper] Adding ${name} to ${teamLabel} (Source: ${source})`);

        const baseData = typeof lookupPokemon === 'function' ? lookupPokemon(name) : null;
        team[name] = {
            name: name,
            hp: 100,
            ability: baseData ? baseData.abilities[0] : '',
            item: '',
            teraType: '',
            isTerastallized: false,
            moves: [],
            stats: baseData ? baseData.baseStats : {},
            types: baseData ? baseData.types : ['???'],
            status: '',
            revealed: true,
            boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
        };

        updateDisplaySlots();
        return name;
    }

    /**
     * Add a move to a Pokémon's known moveset.
     */
    function addMoveToTeam(team, pokemonName, moveName) {
        const key = findInTeam(team, pokemonName);
        if (!key || !team[key]) return;

        const mon = team[key];
        if (!mon.moves.includes(moveName)) {
            console.log(`[ShowdownScraper] New Move: ${key} used ${moveName}`);
            mon.moves.push(moveName);
        }
    }

    /**
     * Update the 12-slot display representation.
     * Player slots are always fully visible.
     * Opponent slots are revealed as Pokémon appear.
     */
    function updateDisplaySlots() {
        // Player slots — fill with known team members
        const myNames = Object.keys(state.myTeam);
        for (let i = 0; i < MAX_TEAM_SIZE; i++) {
            if (i < myNames.length) {
                const mon = state.myTeam[myNames[i]];
                state.displaySlots.mySlots[i] = {
                    name: mon.name,
                    hp: mon.hp,
                    status: mon.status,
                    types: mon.types,
                    revealed: true,
                    isActive: (state.myActive === mon.name),
                    ability: mon.ability,
                    item: mon.item,
                    moves: mon.moves,
                    teraType: mon.teraType,
                    isTerastallized: mon.isTerastallized,
                    boosts: mon.boosts
                };
            } else {
                state.displaySlots.mySlots[i] = {
                    name: '???',
                    hp: 100,
                    status: '',
                    types: ['???'],
                    revealed: false,
                    isActive: false,
                    ability: '',
                    item: '',
                    moves: [],
                    teraType: '',
                    isTerastallized: false,
                    boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
                };
            }
        }

        // Opponent slots — only show revealed Pokémon
        const oppNames = Object.keys(state.opponentTeam);
        for (let i = 0; i < MAX_TEAM_SIZE; i++) {
            if (i < oppNames.length) {
                const mon = state.opponentTeam[oppNames[i]];
                state.displaySlots.opponentSlots[i] = {
                    name: mon.name,
                    hp: mon.hp,
                    status: mon.status,
                    types: mon.types,
                    revealed: true,
                    isActive: (state.opponentActive === mon.name),
                    ability: mon.ability,
                    item: mon.item,
                    moves: mon.moves,
                    teraType: mon.teraType,
                    isTerastallized: mon.isTerastallized,
                    boosts: mon.boosts
                };
            } else {
                state.displaySlots.opponentSlots[i] = {
                    name: '???',
                    hp: 100,
                    status: '',
                    types: ['???'],
                    revealed: false,
                    isActive: false,
                    ability: '',
                    item: '',
                    moves: [],
                    teraType: '',
                    isTerastallized: false,
                    boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 }
                };
            }
        }
    }

    // ─── Battle Log Parser ───

    /**
     * Determine which side an action belongs to based on the log line.
     * Returns 'mine', 'opponent', or null if indeterminate.
     */
    function determineSide(line) {
        // "The opposing X" is always the opponent
        if (/^The opposing /i.test(line)) {
            return 'opponent';
        }

        // "Go! X!" is always us
        if (line.startsWith('Go! ')) return 'mine';

        // "PlayerName sent out X!" or "PlayerName's X used Y!"
        if (state.myName && state.opponentName) {
            if (line.startsWith(state.opponentName + "'s ") || line.startsWith(state.opponentName + ' sent out')) {
                return 'opponent';
            }
            if (line.startsWith(state.myName + "'s ") || line.startsWith(state.myName + ' sent out')) {
                return 'mine';
            }
        }

        return null;
    }

    /**
     * Given a Pokémon name mentioned in a log, figure out which team it belongs to.
     * First checks the explicit side indicator, then checks existing team membership.
     */
    function resolveTeamForPokemon(name, explicitSide) {
        if (explicitSide === 'mine') return state.myTeam;
        if (explicitSide === 'opponent') return state.opponentTeam;

        // Check existing membership
        if (findInTeam(state.myTeam, name)) return state.myTeam;
        if (findInTeam(state.opponentTeam, name)) return state.opponentTeam;

        return null;
    }

    /**
     * Parse a battle log line and update state.
     */
    function parseBattleLogLine(text) {
        if (!text || text.trim() === '') return;
        const line = text.trim();

        // Update player names
        updatePlayerNames();

        const side = determineSide(line);

        // Turn number
        const turnMatch = line.match(/^Turn (\d+)/);
        if (turnMatch) {
            state.turnNumber = parseInt(turnMatch[1]);

            // Reset boosts on new turn? No — boosts persist across turns.
            return;
        }

        // ── Switch/Send Out ──

        // "Go! [Pokemon]!" — always our Pokémon
        const goMatch = line.match(/^Go! (.+?)!/);
        if (goMatch) {
            const name = cleanPokemonName(goMatch[1]);
            if (name) {
                state.myActive = name;
                ensureTeamMember(state.myTeam, name, 'visual');
            }
            return;
        }

        // "[PlayerName] sent out [Pokemon]!" with possible nickname handling
        // Format: "PlayerName sent out Nickname (Species)!" or "PlayerName sent out Species!"
        const sentOutMatch = line.match(/^(.+?) sent out (.+?)!/);
        if (sentOutMatch) {
            const playerName = sentOutMatch[1].trim();
            let rawPokemon = sentOutMatch[2].trim();

            // Handle "Nickname (Species)" format in sent out
            const nicknameMatch = rawPokemon.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
            if (nicknameMatch) {
                const inner = nicknameMatch[2].trim();
                if (/^[A-Z]/.test(inner) && inner !== 'M' && inner !== 'F') {
                    rawPokemon = inner;
                }
            }

            const pokemonName = cleanPokemonName(rawPokemon);
            if (!pokemonName) return;

            const isOpp = (state.opponentName && playerName === state.opponentName) ||
                          (state.myName && playerName !== state.myName);

            if (isOpp) {
                state.opponentActive = pokemonName;
                ensureTeamMember(state.opponentTeam, pokemonName, 'visual');
            } else {
                state.myActive = pokemonName;
                ensureTeamMember(state.myTeam, pokemonName, 'visual');
            }
            return;
        }

        // "The opposing [Pokemon] came out!" / "appeared"
        const cameOutMatch = line.match(/^The opposing (.+?) (?:came out|appeared)/i);
        if (cameOutMatch) {
            const name = cleanPokemonName(cameOutMatch[1]);
            if (name) {
                state.opponentActive = name;
                ensureTeamMember(state.opponentTeam, name, 'visual');
            }
            return;
        }

        // ── Move Usage ──
        const moveMatch = line.match(/^(?:The opposing )?(.+?) used (.+?)!/);
        if (moveMatch) {
            let rawName = moveMatch[1];

            let moveSide = side;

            // Handle "PlayerName's Pokemon" format
            if (rawName.includes("'s ")) {
                const parts = rawName.split("'s ");
                const playerName = parts[0].trim();
                rawName = parts.slice(1).join("'s ");
                if (state.opponentName && playerName === state.opponentName) moveSide = 'opponent';
                else if (state.myName && playerName === state.myName) moveSide = 'mine';
            }

            const pokemonName = cleanPokemonName(rawName);
            if (!pokemonName) return;

            const moveName = moveMatch[2].trim();

            const team = resolveTeamForPokemon(pokemonName, moveSide);
            if (team) {
                addMoveToTeam(team, pokemonName, moveName);
            }
            return;
        }

        // ── Damage ──
        const dmgMatch = line.match(/^(?:The opposing )?(.+?) lost ([\d.]+)% of its health/);
        if (dmgMatch) {
            let rawName = dmgMatch[1];
            if (rawName.includes("'s ")) {
                rawName = rawName.split("'s ").slice(1).join("'s ");
            }
            const name = cleanPokemonName(rawName);
            const pct = parseFloat(dmgMatch[2]);

            const team = resolveTeamForPokemon(name, side);
            if (team) {
                const key = findInTeam(team, name);
                if (key && team[key]) {
                    team[key].hp = Math.max(0, team[key].hp - pct);
                }
            }
        }

        // ── Terastallization ──
        const teraMatch = line.match(/^(?:The opposing )?(.+?) terastallized to the (.+?) type!/i);
        if (teraMatch) {
            const name = cleanPokemonName(teraMatch[1]);
            const type = teraMatch[2].trim();
            const team = resolveTeamForPokemon(name, side);
            if (team) {
                const key = findInTeam(team, name);
                if (key && team[key]) {
                    team[key].teraType = type;
                    team[key].isTerastallized = true;
                    console.log(`[ShowdownScraper] Terastallization: ${key} -> ${type}`);
                }
            }
        }

        // ── Fainted ──
        const faintMatch = line.match(/^(?:The opposing )?(.+?) fainted!/);
        if (faintMatch) {
            const name = cleanPokemonName(faintMatch[1]);
            const team = resolveTeamForPokemon(name, side);
            if (team) {
                const key = findInTeam(team, name);
                if (key && team[key]) {
                    team[key].hp = 0;
                    team[key].status = 'fnt';
                    updateDisplaySlots();
                }
            }
        }

        // ── Status Conditions ──
        const statusPatterns = [
            { regex: /^(?:The opposing )?(.+?) was burned/i, status: 'brn' },
            { regex: /^(?:The opposing )?(.+?) was poisoned/i, status: 'psn' },
            { regex: /^(?:The opposing )?(.+?) was badly poisoned/i, status: 'tox' },
            { regex: /^(?:The opposing )?(.+?) is paralyzed/i, status: 'par' },
            { regex: /^(?:The opposing )?(.+?) fell asleep/i, status: 'slp' },
            { regex: /^(?:The opposing )?(.+?) was frozen/i, status: 'frz' }
        ];

        for (const pattern of statusPatterns) {
            const match = line.match(pattern.regex);
            if (match) {
                const name = cleanPokemonName(match[1]);
                const team = resolveTeamForPokemon(name, side);
                if (team) {
                    const key = findInTeam(team, name);
                    if (key && team[key]) team[key].status = pattern.status;
                }
                break;
            }
        }

        // ── Weather ──
        const weatherPatterns = [
            { regex: /sunlight turned harsh|Drought/i, weather: 'Sun' },
            { regex: /started to rain|Drizzle/i, weather: 'Rain' },
            { regex: /sandstorm (?:kicked|brew)|Sand Stream/i, weather: 'Sand' },
            { regex: /started to hail|Snow Warning/i, weather: 'Snow' },
            { regex: /started to snow/i, weather: 'Snow' },
            { regex: /weather became clear|sunlight faded|rain stopped|sandstorm subsided|hail stopped|snow stopped/i, weather: null }
        ];

        for (const pattern of weatherPatterns) {
            if (pattern.regex.test(line)) {
                state.field.weather = pattern.weather;
                break;
            }
        }

        // ── Terrain ──
        const terrainPatterns = [
            { regex: /Electric Terrain|electric current ran/i, terrain: 'Electric' },
            { regex: /Grassy Terrain|grass grew/i, terrain: 'Grassy' },
            { regex: /Psychic Terrain|became weird/i, terrain: 'Psychic' },
            { regex: /Misty Terrain|mist swirled/i, terrain: 'Misty' },
            { regex: /terrain returned to normal/i, terrain: null }
        ];

        for (const pattern of terrainPatterns) {
            if (pattern.regex.test(line)) {
                state.field.terrain = pattern.terrain;
                break;
            }
        }

        // ── Hazards ──
        // NOTE: Hazards are SET on the OPPONENT's side when YOUR Pokémon uses them
        // "Pointed stones float in the air around [opposing team/your team]!"
        if (/Pointed stones float/i.test(line)) {
            if (side === 'opponent' || line.toLowerCase().includes('opposing')) {
                state.field.opponentHazards.stealthRock = true;
            } else {
                state.field.myHazards.stealthRock = true;
            }
        }
        if (/Spikes were scattered/i.test(line)) {
            if (side === 'opponent' || line.toLowerCase().includes('opposing')) {
                state.field.opponentHazards.spikes = Math.min(3, state.field.opponentHazards.spikes + 1);
            } else {
                state.field.myHazards.spikes = Math.min(3, state.field.myHazards.spikes + 1);
            }
        }
        if (/Poison spikes were scattered/i.test(line)) {
            if (side === 'opponent' || line.toLowerCase().includes('opposing')) {
                state.field.opponentHazards.toxicSpikes = Math.min(2, state.field.opponentHazards.toxicSpikes + 1);
            } else {
                state.field.myHazards.toxicSpikes = Math.min(2, state.field.myHazards.toxicSpikes + 1);
            }
        }
        if (/Sticky Web has been set/i.test(line)) {
            if (side === 'opponent' || line.toLowerCase().includes('opposing')) {
                state.field.opponentHazards.stickyWeb = true;
            } else {
                state.field.myHazards.stickyWeb = true;
            }
        }

        // ── Hazard Removal ──
        if (/The pointed stones disappeared/i.test(line)) {
            if (side === 'mine' || (state.myName && line.includes(state.myName))) {
                state.field.myHazards.stealthRock = false;
            } else {
                state.field.opponentHazards.stealthRock = false;
            }
        }
        if (/The spikes disappeared/i.test(line)) {
            if (side === 'mine' || (state.myName && line.includes(state.myName))) {
                state.field.myHazards.spikes = 0;
            } else {
                state.field.opponentHazards.spikes = 0;
            }
        }
        if (/The poison spikes disappeared/i.test(line)) {
            if (side === 'mine' || (state.myName && line.includes(state.myName))) {
                state.field.myHazards.toxicSpikes = 0;
            } else {
                state.field.opponentHazards.toxicSpikes = 0;
            }
        }
        if (/The sticky web has disappeared/i.test(line)) {
            if (side === 'mine' || (state.myName && line.includes(state.myName))) {
                state.field.myHazards.stickyWeb = false;
            } else {
                state.field.opponentHazards.stickyWeb = false;
            }
        }

        // ── Trick Room ──
        if (/Trick Room/i.test(line)) {
            if (/twisted the dimensions/i.test(line)) {
                state.field.trickRoom = true;
            } else if (/wore off/i.test(line)) {
                state.field.trickRoom = false;
            }
        }

        // ── Tailwind ──
        if (/Tailwind/i.test(line)) {
            if (/blew from behind/i.test(line)) {
                if (side === 'opponent') state.field.tailwind.opponent = true;
                else state.field.tailwind.my = true;
            } else if (/petered out|wore off/i.test(line)) {
                if (side === 'opponent') state.field.tailwind.opponent = false;
                else state.field.tailwind.my = false;
            }
        }

        // ── Item Revealed ──
        const itemPatterns = [
            { regex: /^(?:The opposing )?(.+?)'s (.+?) restored/i, item_group: 2 },
            { regex: /^(?:The opposing )?(.+?) is holding (.+?)(?:!|\.)/i, item_group: 2 },
            { regex: /^(?:The opposing )?(.+?)'s (.+?) activated/i, item_group: 2 },
            { regex: /^(?:The opposing )?(.+?) ate its (.+?)(?:!|\.)/i, item_group: 2 }
        ];

        for (const pattern of itemPatterns) {
            const match = line.match(pattern.regex);
            if (match) {
                const name = cleanPokemonName(match[1]);
                const item = match[pattern.item_group]?.trim();
                if (!name || !item) continue;
                const team = resolveTeamForPokemon(name, side);
                if (team) {
                    const key = findInTeam(team, name);
                    if (key && team[key]) team[key].item = item;
                }
                break;
            }
        }

        // ── Ability Revealed ──
        const abilityMatch = line.match(/\[(.+?)\] of (?:The opposing )?(.+)/);
        if (abilityMatch) {
            const ability = abilityMatch[1].trim();
            const name = cleanPokemonName(abilityMatch[2]);
            if (name && ability) {
                const team = resolveTeamForPokemon(name, side);
                if (team) {
                    const key = findInTeam(team, name);
                    if (key && team[key]) team[key].ability = ability;
                }
            }
        }

        // Ability trigger patterns
        const abilityTriggerPatterns = [
            { regex: /^(?:The opposing )?(.+?)'s (Intimidate|Regenerator|Protosynthesis|Quark Drive|Flash Fire|Levitate|Multiscale|Unaware|Magic Guard|Mold Breaker|Turboblaze|Teravolt|Drizzle|Drought|Sand Stream|Snow Warning|Electric Surge|Grassy Surge|Psychic Surge|Misty Surge|Natural Cure|Pressure|Download|Adaptability|Technician|Huge Power|Pure Power|Speed Boost|Sturdy|Magic Bounce|Contrary|Prankster|Guts|Marvel Scale|Thick Fat|Water Absorb|Volt Absorb|Lightning Rod|Storm Drain|Motor Drive|Sap Sipper|Dry Skin|Iron Fist|Sheer Force|Tough Claws|Strong Jaw|Mega Launcher|Pixilate|Refrigerate|Aerilate|Galvanize|Libero|Protean|Intrepid Sword|Dauntless Shield|Ice Scales|Poison Heal|Tinted Lens|Scrappy|Moxie|Beast Boost|Soul-Heart|Battery|Receiver|Power Construct|Schooling|Shields Down|Disguise|Battle Bond|Power of Alchemy|Dancer|Fluffy|Dazzling|Queenly Majesty|Tangling Hair|Water Bubble|Steelworker|Berserk|Innards Out|Wimp Out|Emergency Exit|Stakeout|Merciless|Stamina|Water Compaction|Corrosion|Comatose|Triage|Neuroforce|Full Metal Body|Shadow Shield|Prism Armor|Neutralizing Gas|Pastel Veil|Hunger Switch|Gulp Missile|Ice Face|Stalwart|Steam Engine|Sand Spit|Cotton Down|Mirror Armor|Ball Fetch|Gorilla Tactics|Propeller Tail|Ripen|Wandering Spirit|Punk Rock|Perish Body|Screen Cleaner|Unseen Fist|Curious Medicine|Transistor|Dragon's Maw|Chilling Neigh|Grim Neigh|As One|Quick Draw|Lingering Aroma|Seed Sower|Thermal Exchange|Anger Shell|Purifying Salt|Well-Baked Body|Wind Rider|Guard Dog|Rocky Payload|Wind Power|Zero to Hero|Commander|Electromorphosis|Orichalcum Pulse|Hadron Engine|Good as Gold|Vessel of Ruin|Sword of Ruin|Tablets of Ruin|Beads of Ruin|Toxic Debris|Armor Tail|Earth Eater|Mycelium Might|Hospitality|Mind's Eye|Embody Aspect|Toxic Chain|Supersweet Syrup|Tera Shift|Tera Shell|Teraform Zero|Poison Puppeteer)/i }
        ];

        for (const pattern of abilityTriggerPatterns) {
            const match = line.match(pattern.regex);
            if (match) {
                const name = cleanPokemonName(match[1]);
                const ability = match[2];
                if (name && ability) {
                    const team = resolveTeamForPokemon(name, side);
                    if (team) {
                        const key = findInTeam(team, name);
                        if (key && team[key]) team[key].ability = ability;
                    }
                }
                break;
            }
        }

        // ── Boost Changes ──
        const boostMatch = line.match(/^(?:The opposing )?(.+?)'s (.+?) (?:rose|fell|sharply rose|sharply fell|drastically rose|drastically fell|severely fell)/i);
        if (boostMatch) {
            const name = cleanPokemonName(boostMatch[1]);
            const statName = boostMatch[2].trim().toLowerCase();
            const isRise = /rose/i.test(line);
            const isSharp = /sharply/i.test(line);
            const isDrastic = /drastically/i.test(line);
            const isSevere = /severely/i.test(line);

            let amount = 1;
            if (isSharp) amount = 2;
            if (isDrastic || isSevere) amount = 3;
            if (!isRise) amount = -amount;

            const statMap = {
                'attack': 'atk', 'defense': 'def', 'special attack': 'spa',
                'special defense': 'spd', 'speed': 'spe', 'sp. atk': 'spa',
                'sp. def': 'spd'
            };
            const stat = statMap[statName];
            if (stat && name) {
                const team = resolveTeamForPokemon(name, side);
                if (team) {
                    const key = findInTeam(team, name);
                    if (key && team[key] && team[key].boosts) {
                        team[key].boosts[stat] = Math.max(-6, Math.min(6, team[key].boosts[stat] + amount));
                    }
                }
            }
        }
    }

    // ─── Player Name Detection ───

    function updatePlayerNames() {
        const p1Node = document.querySelector('.trainer-near strong');
        const p2Node = document.querySelector('.trainer-far strong');
        if (p1Node && !state.myName) state.myName = p1Node.textContent.trim();
        if (p2Node && !state.opponentName) state.opponentName = p2Node.textContent.trim();
    }

    // ─── DOM Scraping Functions ───

    /**
     * Scrape HP from stat bars.
     * Uses CSS class (lstatbar/rstatbar) as the PRIMARY side indicator.
     */
    function scrapeHP() {
        // Scrape lstatbar (near/player side)
        const lstatbars = document.querySelectorAll('.lstatbar');
        lstatbars.forEach(bar => processStatbar(bar, state.myTeam, 'mine'));

        // Scrape rstatbar (far/opponent side)
        const rstatbars = document.querySelectorAll('.rstatbar');
        rstatbars.forEach(bar => processStatbar(bar, state.opponentTeam, 'opponent'));

        // Fallback: generic .statbar without l/r prefix
        const genericStatbars = document.querySelectorAll('.statbar:not(.lstatbar):not(.rstatbar)');
        genericStatbars.forEach(bar => {
            const detectedSide = getStatbarSide(bar);
            if (detectedSide === 'mine') {
                processStatbar(bar, state.myTeam, 'mine');
            } else {
                processStatbar(bar, state.opponentTeam, 'opponent');
            }
        });

        updateDisplaySlots();
    }

    function processStatbar(bar, team, side) {
        const nameEl = bar.querySelector('strong');
        const hpEl = bar.querySelector('.hpbar .hp');
        if (!nameEl) return;

        const rawName = nameEl.textContent;
        let name = cleanPokemonName(rawName);
        if (!name) return;

        const hp = hpEl && hpEl.style.width ? parseFloat(hpEl.style.width) : 100;

        // Check if a more specific form exists in the team
        const existingKey = findInTeam(team, name);
        const actualName = existingKey || name;

        // Update active Pokémon
        if (side === 'mine') {
            state.myActive = actualName;
        } else {
            state.opponentActive = actualName;
        }

        ensureTeamMember(team, actualName, 'visual');
        const key = findInTeam(team, actualName);
        if (key && team[key]) {
            team[key].hp = hp;
        }

        // Status from statbar
        const statusEl = bar.querySelector('.status');
        if (statusEl && key && team[key]) {
            const statusText = statusEl.textContent.toLowerCase().trim();
            const statusMap = { 'brn': 'brn', 'psn': 'tox', 'tox': 'tox', 'par': 'par', 'slp': 'slp', 'frz': 'frz' };
            for (const [statusKey, val] of Object.entries(statusMap)) {
                if (statusText.includes(statusKey)) {
                    team[key].status = val;
                    break;
                }
            }
        }
    }

    /**
     * Scrape the move menu to get available moves.
     * IMPORTANT: The move menu ONLY shows OUR Pokémon's moves.
     * This is the most reliable way to confirm ownership.
     */
    function scrapeMoveMenu() {
        const oldMoves = JSON.stringify(state.myMoves);
        state.myMoves = [];

        const moveButtons = document.querySelectorAll('.movemenu button, .move-menu button, .movebuttons-container button');

        moveButtons.forEach(btn => {
            let moveName = btn.getAttribute('data-move');
            if (!moveName) {
                const text = btn.textContent.trim();
                moveName = text.split('\n')[0].trim();
                moveName = moveName.replace(/^Z-/, '');
            }

            const moveType = btn.getAttribute('data-type');
            const disabled = btn.disabled || btn.classList.contains('disabled');

            if (moveName && moveName !== 'Struggle' && moveName.length > 0) {
                state.myMoves.push({
                    name: moveName.trim(),
                    type: moveType ? moveType.trim() : '',
                    disabled: disabled
                });
            }
        });

        // If we have moves, add them to the active Pokémon on OUR team
        if (state.myMoves.length > 0 && state.myActive) {
            const key = findInTeam(state.myTeam, state.myActive);
            if (key && state.myTeam[key]) {
                state.myMoves.forEach(m => {
                    if (!state.myTeam[key].moves.includes(m.name)) {
                        state.myTeam[key].moves.push(m.name);
                    }
                });
            }
        }

        if (state.myMoves.length > 0 && JSON.stringify(state.myMoves) !== oldMoves) {
            console.log('[ShowdownScraper] Moves found:', state.myMoves);
        }
    }

    /**
     * Scrape the switch menu for available switches.
     * IMPORTANT: The switch menu ONLY shows OUR Pokémon.
     * Any Pokémon appearing here is DEFINITIVELY on our team.
     */
    function scrapeSwitchMenu() {
        state.mySwitches = [];
        const switchMenu = document.querySelector('.switchmenu');

        const switchButtons = document.querySelectorAll(
            '.switchmenu button, button[name="chooseSwitch"], button[name="chooseTeamPreview"]'
        );

        switchButtons.forEach(btn => {
            const text = btn.textContent.trim().split('\n')[0];
            const name = cleanPokemonName(text);

            if (name) {
                // Switch menu items are DEFINITIVELY on our team
                ensureTeamMember(state.myTeam, name, 'visual');

                if (!btn.disabled) {
                    state.mySwitches.push({ name: name });
                }
            }
        });

        // Detect forced switch
        if (!switchMenu || switchMenu.offsetParent === null) {
            state.forceSwitch = false;
            return;
        }

        const cancelButton = switchMenu.querySelector('button[name="closeSwitch"]');
        const hasSwitchOptions = state.mySwitches.length > 0;

        if (hasSwitchOptions && !cancelButton) {
            state.forceSwitch = true;
        } else {
            state.forceSwitch = false;
        }
    }

    /**
     * Scrape team icons to detect all team members and fainted status.
     * Uses DOM structure to definitively assign sides.
     *
     * CRITICAL: The icon containers are nested inside .trainer-near (player)
     * and .trainer-far (opponent) elements. This is the MOST RELIABLE
     * way to determine side ownership for icons.
     */
    function scrapeTeamIcons() {
        // Primary: use trainer-near/far containers
        const myIconContainer = document.querySelector('.trainer-near .teamicons');
        const oppIconContainer = document.querySelector('.trainer-far .teamicons');

        if (myIconContainer) {
            const icons = myIconContainer.querySelectorAll('span, .picon');
            icons.forEach(icon => processIcon(icon, state.myTeam));
        }

        if (oppIconContainer) {
            const icons = oppIconContainer.querySelectorAll('span, .picon');
            icons.forEach(icon => processIcon(icon, state.opponentTeam));
        }

        // Also check battle-controls area (always player's side)
        const controlIcons = document.querySelectorAll(
            '.battle-controls .teamicons span, .battle-controls .picon, .switchmenu .picon'
        );
        controlIcons.forEach(icon => processIcon(icon, state.myTeam));

        // Fallback if trainer containers not found: use sidebar icons
        if (!myIconContainer && !oppIconContainer) {
            const allTeamIcons = document.querySelectorAll('.teamicons');
            allTeamIcons.forEach(container => {
                const trainer = container.closest('.trainer, .trainer-near, .trainer-far');
                if (!trainer) {
                    // No trainer parent — use geometric fallback
                    const rect = container.getBoundingClientRect();
                    const battleBox = document.querySelector('.battle')?.getBoundingClientRect();
                    let team = state.opponentTeam;
                    if (battleBox) {
                        const midY = battleBox.top + battleBox.height / 2;
                        team = rect.top > midY ? state.myTeam : state.opponentTeam;
                    } else {
                        team = rect.top > (window.innerHeight / 2) ? state.myTeam : state.opponentTeam;
                    }
                    const icons = container.querySelectorAll('span, .picon');
                    icons.forEach(icon => processIcon(icon, team));
                    return;
                }

                if (trainer.classList.contains('trainer-near')) {
                    const icons = container.querySelectorAll('span, .picon');
                    icons.forEach(icon => processIcon(icon, state.myTeam));
                } else if (trainer.classList.contains('trainer-far')) {
                    const icons = container.querySelectorAll('span, .picon');
                    icons.forEach(icon => processIcon(icon, state.opponentTeam));
                }
            });
        }

        updateDisplaySlots();
    }

    function processIcon(icon, team) {
        let label = icon.getAttribute('aria-label') || icon.getAttribute('title');

        if (!label && icon.getAttribute('data-tooltip')) {
            label = icon.getAttribute('data-tooltip');
        }

        if (!label) return;

        const name = cleanPokemonName(label);
        if (!name) return;

        ensureTeamMember(team, name, 'visual');

        // Check fainted status
        const isFainted = icon.classList.contains('fainted') ||
            icon.style.opacity === '0' ||
            icon.style.opacity === '0.3' ||
            icon.style.opacity === '0.4' ||
            parseFloat(icon.style.opacity) < 0.5;

        const key = findInTeam(team, name);
        if (isFainted && key && team[key]) {
            team[key].hp = 0;
            team[key].status = 'fnt';
        }
    }

    /**
     * Scrape Tooltip for detailed info.
     * Tooltip position relative to the battle field indicates which side.
     */
    function scrapeTooltip() {
        const tooltip = document.querySelector('#tooltipwrapper .tooltip, .tooltip');
        if (!tooltip || tooltip.offsetParent === null) return null;

        const result = {
            pokemon: '', hp: null, ability: '', item: '', teraType: '', moves: [], stats: {}
        };

        const h2 = tooltip.querySelector('h2');
        if (h2) {
            const nameText = h2.textContent.trim();
            if (nameText.includes('Ability:') || nameText.includes('Item:') || nameText.includes('Stats:')) {
                return null;
            }
            result.pokemon = cleanPokemonName(nameText);
            if (!result.pokemon) return null;
            if (typeof lookupMove === 'function' && lookupMove(result.pokemon)) return null;
        } else {
            return null;
        }

        const hpBar = tooltip.querySelector('.hpbar .hp');
        if (hpBar && hpBar.style.width) {
            result.hp = parseFloat(hpBar.style.width);
        }

        const statElements = tooltip.querySelectorAll('p');
        statElements.forEach(p => {
            const text = p.textContent;
            if (text.includes('Ability:')) {
                const abilityText = text.split('Ability:')[1];
                if (abilityText) result.ability = abilityText.split('/')[0].trim();
            }
            if (text.includes('Item:')) {
                const itemText = text.split('Item:')[1];
                if (itemText) result.item = itemText.trim();
            }
            if (text.includes('Tera Type:')) {
                const teraText = text.split('Tera Type:')[1];
                if (teraText) result.teraType = teraText.trim();
            }
            const statMatch = text.match(/(Atk|Def|SpA|SpD|Spe|HP):\s*(\d+)/g);
            if (statMatch) {
                statMatch.forEach(s => {
                    const [key, val] = s.split(':').map(x => x.trim());
                    const statMap = { 'HP': 'hp', 'Atk': 'atk', 'Def': 'def', 'SpA': 'spa', 'SpD': 'spd', 'Spe': 'spe' };
                    if (statMap[key]) result.stats[statMap[key]] = parseInt(val);
                });
            }
        });

        const moveElements = tooltip.querySelectorAll('.section ul li, ul li');
        moveElements.forEach(li => {
            const moveName = li.textContent.replace(/•/g, '').trim();
            if (moveName && moveName.length > 1 && !result.moves.includes(moveName)) {
                result.moves.push(moveName);
            }
        });

        if (result.pokemon) {
            // Determine which side the tooltip target belongs to
            let team = null;

            // Check if hovering over a lstatbar (player) or rstatbar (opponent)
            const hoveredLstat = document.querySelector('.lstatbar:hover, .lstatbar *:hover');
            const hoveredRstat = document.querySelector('.rstatbar:hover, .rstatbar *:hover');

            if (hoveredLstat) {
                team = state.myTeam;
            } else if (hoveredRstat) {
                team = state.opponentTeam;
            } else {
                // Check trainer icons
                const hoveredNear = document.querySelector('.trainer-near:hover, .trainer-near *:hover');
                const hoveredFar = document.querySelector('.trainer-far:hover, .trainer-far *:hover');
                if (hoveredNear) team = state.myTeam;
                else if (hoveredFar) team = state.opponentTeam;
                else {
                    // Check existing team membership
                    if (findInTeam(state.myTeam, result.pokemon)) team = state.myTeam;
                    else if (findInTeam(state.opponentTeam, result.pokemon)) team = state.opponentTeam;
                    else {
                        // Geometric fallback based on tooltip position
                        const rect = tooltip.getBoundingClientRect();
                        const battleBox = document.querySelector('.battle')?.getBoundingClientRect();
                        if (battleBox) {
                            const midY = battleBox.top + battleBox.height / 2;
                            team = rect.top < midY ? state.opponentTeam : state.myTeam;
                        } else {
                            team = rect.top < (window.innerHeight / 2) ? state.opponentTeam : state.myTeam;
                        }
                    }
                }
            }

            if (!team) return null;

            const key = ensureTeamMember(team, result.pokemon, 'visual');
            const actualKey = key || findInTeam(team, result.pokemon);

            if (actualKey && team[actualKey]) {
                const mon = team[actualKey];
                if (result.hp !== null) mon.hp = result.hp;
                if (result.ability) mon.ability = result.ability;
                if (result.item) mon.item = result.item;
                if (result.teraType) mon.teraType = result.teraType;
                if (result.stats && Object.keys(result.stats).length > 0) {
                    mon.stats = { ...mon.stats, ...result.stats };
                }
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

    // Track which log lines we've already processed
    let processedLogCount = 0;

    function startObserving() {
        const targetNode = document.body;
        const config = { childList: true, subtree: true, attributes: true, characterData: true };

        const observer = new MutationObserver((mutations) => {
            let logUpdated = false;
            let hpUpdated = false;
            let tooltipUpdated = false;

            for (const mutation of mutations) {
                const target = mutation.target;
                if (!target.classList) continue;

                if (target.classList.contains('battle-log') ||
                    target.classList.contains('inner') ||
                    target.classList.contains('message-log') ||
                    target.closest?.('.battle-log')) {
                    logUpdated = true;
                }

                if (target.classList.contains('statbar') ||
                    target.classList.contains('hpbar') ||
                    target.classList.contains('hp') ||
                    target.closest?.('.statbar')) {
                    hpUpdated = true;
                }

                if (target.id === 'tooltipwrapper' || target.closest?.('#tooltipwrapper')) {
                    tooltipUpdated = true;
                }
            }

            if (logUpdated) {
                processNewLogLines();
            }

            if (hpUpdated || logUpdated) {
                scrapeHP();
            }

            if (tooltipUpdated) {
                scrapeTooltip();
            }

            // Always update these on any mutation
            scrapeTeamIcons();
            scrapeMoveMenu();
            scrapeSwitchMenu();

            // Send state update
            try {
                chrome.runtime.sendMessage({
                    type: 'UPDATE_STATE',
                    payload: JSON.parse(JSON.stringify(state))
                });
            } catch (e) {
                // Extension context might be invalidated
            }
        });

        observer.observe(targetNode, config);
        console.log('[ShowdownScraper] Observer started');

        // Also run a periodic scan as safety net (every 2 seconds)
        setInterval(() => {
            scrapeHP();
            scrapeTeamIcons();
            scrapeMoveMenu();
            scrapeSwitchMenu();
            updateDisplaySlots();
        }, 2000);
    }

    /**
     * Process only new log lines since last check.
     * Prevents re-parsing old lines and double-counting.
     */
    function processNewLogLines() {
        const logWindow = document.querySelector('.battle-log .inner.message-log, .battle-log');
        if (!logWindow) return;

        const history = logWindow.querySelectorAll('.battle-history');
        const totalLines = history.length;

        // Only process lines we haven't seen
        for (let i = processedLogCount; i < totalLines; i++) {
            const el = history[i];
            if (el && el.textContent) {
                // Split multi-line entries
                const lines = el.textContent.split('\n');
                lines.forEach(line => {
                    const trimmed = line.trim();
                    if (trimmed) parseBattleLogLine(trimmed);
                });
            }
        }

        processedLogCount = totalLines;
    }

    function initialScan() {
        console.log('[ShowdownScraper] Performing initial scan...');

        // Detect which side we're on
        detectPlayerSide();
        updatePlayerNames();

        console.log(`[ShowdownScraper] Player: ${state.myName}, Opponent: ${state.opponentName}`);
        console.log(`[ShowdownScraper] Detected side: ${state.myPlayerSide}`);

        // Scrape everything
        scrapeHP();
        scrapeTeamIcons();
        scrapeMoveMenu();
        scrapeSwitchMenu();

        // Process all existing log lines
        processNewLogLines();

        // Initial display slots update
        updateDisplaySlots();
    }

    // ─── Initialization ───

    function init() {
        console.log('[ShowdownScraper] Waiting for battle...');

        const checkForBattle = setInterval(() => {
            const hasBattle = document.querySelector('.battle') ||
                              document.querySelector('.statbar') ||
                              document.querySelector('.battle-log');
            if (hasBattle) {
                clearInterval(checkForBattle);
                state.battleActive = true;
                console.log('[ShowdownScraper] Battle detected!');

                // Small delay to let the DOM settle
                setTimeout(() => {
                    initialScan();
                    startObserving();
                }, 500);
            }
        }, 1000);
    }

    // ─── Public API ───

    return {
        init: init,
        getState: () => JSON.parse(JSON.stringify(state)),
        getDisplaySlots: () => JSON.parse(JSON.stringify(state.displaySlots)),
        // Expose for debugging
        _cleanPokemonName: cleanPokemonName,
        _isSamePokemon: isSamePokemon,
        _getBaseName: getBaseName,
        _findInTeam: findInTeam,
        _normalizeFormSuffix: normalizeFormSuffix,
        _state: state
    };
})();

ShowdownScraper.init();
