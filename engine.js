/**
 * engine.js — Prediction & Recommendation Engine
 *
 * Takes the game state from the scraper and produces:
 * 1. Damage estimates for all moves
 * 2. Opponent switch probability (High/Med/Low)
 * 3. Predicted opponent move
 * 4. Recommended move for the user
 * 5. Speed tier analysis
 * 6. Archetype detection (HO / Stall / Balance)
 */

const PredictionEngine = (() => {

    // ─── Utility Helpers ───

    function calcStat(base, ev, iv, nature, level, isHP) {
        if (isHP) {
            return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
        }
        return Math.floor((Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5) * nature);
    }

    function getEffectiveness(moveType, targetTypes) {
        let effectiveness = 1;
        targetTypes.forEach(type => {
            const chart = TYPE_CHART[moveType];
            if (chart) {
                if (chart.double?.includes(type)) effectiveness *= 2;
                if (chart.half?.includes(type)) effectiveness *= 0.5;
                if (chart.zero?.includes(type)) effectiveness *= 0;
            }
        });
        return effectiveness;
    }

    function isWeakToSTAB(defenderTypes, attackerTypes) {
        if (!defenderTypes || !attackerTypes) return false;
        return attackerTypes.some(aType => getEffectiveness(aType, defenderTypes) >= 2);
    }

    function resistsSTAB(defenderTypes, attackerTypes) {
        if (!defenderTypes || !attackerTypes) return false;
        return attackerTypes.every(aType => getEffectiveness(aType, defenderTypes) <= 0.5);
    }

    function getSpeedRange(pokemonName) {
        const data = lookupPokemon(pokemonName);
        if (!data) return { min: 100, max: 100 };
        const base = data.baseStats.spe;
        return {
            min: calcStat(base, 0, 0, 0.9, 100, false),
            max: calcStat(base, 252, 31, 1.1, 100, false)
        };
    }

    // Move classification helpers
    function isSetupMove(moveName) {
        const setupMoves = [
            'Swords Dance', 'Dragon Dance', 'Quiver Dance', 'Calm Mind', 'Nasty Plot',
            'Shell Smash', 'Bulk Up', 'Shift Gear', 'Victory Dance', 'Agility',
            'Iron Defense', 'Amnesia', 'Autotomize', 'Coil', 'Growth', 'Hone Claws',
            'Tail Glow', 'Work Up', 'Clangorous Soul', 'No Retreat', 'Tidy Up'
        ];
        return setupMoves.includes(moveName);
    }

    function isRecoveryMove(moveName) {
        const recoveryMoves = [
            'Recover', 'Roost', 'Soft-Boiled', 'Milk Drink', 'Slack Off',
            'Shore Up', 'Synthesis', 'Morning Sun', 'Moonlight', 'Wish', 'Life Dew'
        ];
        return recoveryMoves.includes(moveName);
    }

    function isPivotMove(moveName) {
        const pivotMoves = ['U-turn', 'Volt Switch', 'Flip Turn', 'Parting Shot', 'Chilly Reception', 'Baton Pass', 'Teleport'];
        return pivotMoves.includes(moveName);
    }

    function isPriorityMove(moveName) {
        const move = lookupMove(moveName);
        return move && move.priority > 0;
    }

    function isHazardMove(moveName) {
        const hazardMoves = ['Stealth Rock', 'Spikes', 'Toxic Spikes', 'Sticky Web', 'Ceaseless Edge', 'Stone Axe'];
        return hazardMoves.includes(moveName);
    }

    // ─── Damage Calculation ───

    /**
     * Simplified damage calculation (Gen 5+ formula)
     * Assumes Level 100, 252/252 EV spreads, 31 IVs
     * Returns damage as % of defender's max HP
     *
     * @param {object} attacker - { baseStats, types, boosts, ability, item }
     * @param {object} defender - { baseStats, types, boosts, ability, item, hp (max) }
     * @param {object} move - { bp, type, cat, priority }
     * @param {object} field - { weather, terrain }
     * @returns {{ min: number, max: number }} damage range as % of defender HP
     */
    function calculateDamage(attacker, defender, move, field) {
        if (!move || !move.bp || move.bp === 0 || move.cat === 'Status') {
            return { min: 0, max: 0 };
        }

        const level = 100;
        let bp = move.bp;

        // Special cases
        if (move.name === 'Knock Off' && defender.item) bp = 97; // 1.5x with item
        if (move.name === 'Facade' && attacker.status) bp = 140;
        if (move.name === 'Hex' && defender.status) bp = 130;
        if (move.name === 'Acrobatics' && !attacker.item) bp = 110;
        if (move.name === 'Dragon Darts') bp = 100; // 50 * 2 hits
        if (move.name === 'Dual Wingbeat') bp = 80; // 40 * 2
        if (move.name === 'Surging Strikes') bp = 75; // 25 * 3
        if (move.name === 'Triple Axel') bp = 120; // 40+60 effective avg per hit

        // Determine if physical or special
        const isPhysical = move.cat === 'Physical';

        // Get relevant stats (using 252 EV, 31 IV, neutral nature as default)
        let atkStat, defStat;

        if (attacker.stats) {
            atkStat = isPhysical ? attacker.stats.atk : attacker.stats.spa;
        } else if (attacker.baseStats) {
            const baseAtk = isPhysical ? attacker.baseStats.atk : attacker.baseStats.spa;
            // Assume 252 EVs, 31 IVs, neutral nature (1.0)
            atkStat = calcStat(baseAtk, 252, 31, 1.0, level, false);
        } else {
            atkStat = 200; // fallback
        }

        if (defender.stats) {
            const statKey = isPhysical ? 'def' : 'spd';
            // Psyshock check
            const actualKey = move.name === 'Psyshock' ? 'def' : statKey;
            defStat = defender.stats[actualKey];
        } else if (defender.baseStats) {
            const baseDef = isPhysical ? defender.baseStats.def : defender.baseStats.spd;
            // Psyshock uses physical def
            const actualBaseDef = move.name === 'Psyshock' ? defender.baseStats.def : baseDef;
            defStat = calcStat(actualBaseDef, 252, 31, 1.0, level, false);
        } else {
            defStat = 200; // fallback
        }

        // Apply stat boosts
        if (attacker.boosts) {
            const boostKey = isPhysical ? 'atk' : 'spa';
            const boost = attacker.boosts[boostKey] || 0;
            if (boost > 0) atkStat = Math.floor(atkStat * (2 + boost) / 2);
            else if (boost < 0) atkStat = Math.floor(atkStat * 2 / (2 - boost));
        }
        if (defender.boosts) {
            const boostKey = isPhysical ? 'def' : 'spd';
            const boost = defender.boosts[boostKey] || 0;
            if (boost > 0) defStat = Math.floor(defStat * (2 + boost) / 2);
            else if (boost < 0) defStat = Math.floor(defStat * 2 / (2 - boost));
        }

        // Body Press uses Def instead of Atk
        if (move.name === 'Body Press') {
            atkStat = defender.baseStats ?
                calcStat(attacker.baseStats.def, 252, 31, 1.0, level, false) : 200;
        }

        // Seismic Toss = level damage
        if (move.name === 'Seismic Toss') {
            const maxHP = defender.baseStats ?
                calcStat(defender.baseStats.hp, 252, 31, 1.0, level, true) : 400;
            const pct = (level / maxHP) * 100;
            return { min: pct, max: pct };
        }

        // Core damage formula
        let baseDmg = Math.floor(Math.floor(Math.floor(2 * level / 5 + 2) * bp * atkStat / defStat) / 50 + 2);

        // STAB
        let stab = 1;
        let attackerTypes = attacker.types;
        
        // Handle Terastallization STAB
        if (attacker.isTerastallized && attacker.teraType) {
            attackerTypes = [attacker.teraType];
            if (attacker.types.includes(move.type)) {
                // Tera STAB boost: 2x if Tera matches original type, else 1.5x
                stab = (attacker.teraType === move.type) ? 2.0 : 1.5;
            } else if (attacker.teraType === move.type) {
                stab = 1.5;
            }
        } else if (attacker.types && attacker.types.includes(move.type)) {
            stab = 1.5;
        }

        // Adaptability
        if (attacker.ability === 'Adaptability' && stab > 1) {
            stab = 2.0;
        }

        // Type effectiveness (handle Tera)
        let defTypes = defender.types || ['Normal'];
        if (defender.isTerastallized && defender.teraType) {
            defTypes = [defender.teraType];
        }
        let effectiveness = getEffectiveness(move.type, defTypes);

        // Tera Blast Special Case
        if (move.name === 'Tera Blast' && attacker.isTerastallized) {
            // Tera Blast becomes the Tera type and uses higher of Atk/SpA
            effectiveness = getEffectiveness(attacker.teraType, defTypes);
        }

        // Freeze-Dry is SE on Water
        if (move.name === 'Freeze-Dry' && defTypes.includes('Water')) {
            effectiveness *= 2;
        }

        // Weather modifiers
        let weatherMod = 1;
        if (field && field.weather) {
            if (field.weather === 'Sun' && move.type === 'Fire') weatherMod = 1.5;
            if (field.weather === 'Sun' && move.type === 'Water') weatherMod = 0.5;
            if (field.weather === 'Rain' && move.type === 'Water') weatherMod = 1.5;
            if (field.weather === 'Rain' && move.type === 'Fire') weatherMod = 0.5;
        }

        // Terrain modifiers
        let terrainMod = 1;
        if (field && field.terrain) {
            if (field.terrain === 'Electric' && move.type === 'Electric') terrainMod = 1.3;
            if (field.terrain === 'Grassy' && move.type === 'Grass') terrainMod = 1.3;
            if (field.terrain === 'Psychic' && move.type === 'Psychic') terrainMod = 1.3;
            if (field.terrain === 'Misty' && move.type === 'Dragon') terrainMod = 0.5;
        }

        // Ability modifiers
        let abilityMod = 1;
        if (attacker.ability === 'Beads of Ruin' && !isPhysical) abilityMod = 1.33;
        if (attacker.ability === 'Sword of Ruin' && isPhysical) abilityMod = 1.33;
        if (attacker.ability === 'Tablets of Ruin' && isPhysical) abilityMod = 0.75; // opponent
        if (attacker.ability === 'Vessel of Ruin' && !isPhysical) abilityMod = 0.75;
        if (attacker.ability === 'Huge Power' && isPhysical) abilityMod = 2;
        if (attacker.ability === 'Technician' && bp <= 60) abilityMod = 1.5;
        if (attacker.ability === 'Sharpness' && move.flags?.includes('slicing')) abilityMod = 1.5;
        if (attacker.ability === 'Iron Fist' && move.flags?.includes('fist')) abilityMod = 1.2;
        if (attacker.ability === 'Punk Rock' && move.flags?.includes('sound')) abilityMod = 1.3;

        // Item modifiers
        let itemMod = 1;
        if (attacker.item === 'Choice Band' && isPhysical) itemMod = 1.5;
        if (attacker.item === 'Choice Specs' && !isPhysical) itemMod = 1.5;
        if (attacker.item === 'Life Orb') itemMod = 1.3;
        if (attacker.item === 'Expert Belt' && effectiveness >= 2) itemMod = 1.2;
        if (attacker.item === 'Black Glasses' && move.type === 'Dark') itemMod = 1.2;

        // Defender item/ability modifiers
        let defMod = 1;
        if (defender.ability === 'Multiscale' && defender.hp >= 99) defMod = 0.5;
        if (defender.item === 'Eviolite') defMod = 0.667;
        if (defender.item === 'Assault Vest' && !isPhysical) defMod = 0.667;

        // Calculate final damage
        const totalMod = stab * effectiveness * weatherMod * terrainMod * abilityMod * itemMod * defMod;
        const finalDmg = Math.floor(baseDmg * totalMod);

        // Get defender max HP
        const maxHP = defender.baseStats ?
            calcStat(defender.baseStats.hp, 252, 31, 1.0, level, true) : 400;

        // Random roll range: 85% to 100%
        const minPct = Math.floor((finalDmg * 85 / 100) / maxHP * 100);
        const maxPct = Math.floor(finalDmg / maxHP * 100);

        return {
            min: Math.max(0, minPct),
            max: Math.max(0, maxPct),
            effectiveness
        };
    }

    // ─── Archetype Detection ───

    /**
     * Detect team archetype based on visible Pokémon
     * @returns {'HO' | 'STALL' | 'BALANCE'}
     */
    function detectArchetype(team) {
        const members = Object.entries(team);
        if (members.length === 0) return 'BALANCE';

        let fastCount = 0;
        let setupMovesSeen = 0;
        let recoveryCount = 0;
        let bulkScore = 0;

        members.forEach(([name, mon]) => {
            const data = lookupPokemon(name);
            if (data) {
                if (data.baseStats.spe > 100) fastCount++;
                const totalBulk = data.baseStats.hp + data.baseStats.def + data.baseStats.spd;
                if (totalBulk > 280) bulkScore++;
            }

            mon.moves.forEach(move => {
                if (isSetupMove(move)) setupMovesSeen++;
                if (isRecoveryMove(move)) recoveryCount++;
            });
        });

        if (fastCount >= 3 || setupMovesSeen >= 2) return 'HO';
        if (recoveryCount >= 3 || bulkScore >= 3) return 'STALL';
        return 'BALANCE';
    }

    // ─── Switch Prediction ───

    /**
     * Predict probability opponent will switch
     * @returns {{ probability: 'HIGH'|'MEDIUM'|'LOW', score: number, reason: string }}
     */
    function predictSwitch(state) {
        let score = 0;
        let reasons = [];

        const oppActive = state.opponentActive;
        const myActive = state.myActive;

        if (!oppActive || !myActive) {
            return { probability: 'LOW', score: 0, reason: 'Insufficient data' };
        }

        const oppData = lookupPokemon(oppActive);
        const myData = lookupPokemon(myActive);
        const oppMon = state.opponentTeam[oppActive];
        const myMon = state.myTeam[myActive];

        if (!oppData || !myData) {
            return { probability: 'LOW', score: 0, reason: 'Unknown Pokémon' };
        }

        // 1. Type disadvantage check
        if (isWeakToSTAB(myData.types, oppData.types)) {
            score += 40;
            reasons.push('Weak to our STAB');
        }

        // 2. Low HP
        if (oppMon && oppMon.hp < 30 && oppMon.hp > 0) {
            score += 25;
            reasons.push('Low HP');

            // Check if they have a better matchup on bench
            const benchMembers = Object.entries(state.opponentTeam)
                .filter(([name, mon]) => name !== oppActive && mon.hp > 0);
            const hasResist = benchMembers.some(([name]) => {
                const data = lookupPokemon(name);
                return data && resistsSTAB(myData.types, data.types);
            });
            if (hasResist) {
                score += 15;
                reasons.push('Has resist on bench');
            }
        }

        // 3. We just KO'd their last Pokémon (they're forced to switch)
        // This is counted by the battle log

        // 4. Our Pokémon is a known wallbreaker / threat
        if (myData.baseStats.atk > 120 || myData.baseStats.spa > 120) {
            if (isWeakToSTAB(myData.types, oppData.types)) {
                score += 15;
                reasons.push('Our mon is threatening');
            }
        }

        // 5. They resist us → less likely to switch
        if (resistsSTAB(myData.types, oppData.types)) {
            score -= 20;
            reasons.push('Resists our STAB (less likely)');
        }

        // 6. Check for no Pokémon that resist us on bench
        const hasAnyResist = Object.entries(state.opponentTeam)
            .filter(([name, mon]) => name !== oppActive && mon.hp > 0)
            .some(([name]) => {
                const data = lookupPokemon(name);
                return data && resistsSTAB(myData.types, data.types);
            });
        if (!hasAnyResist) {
            score -= 15;
            reasons.push('No resists on bench');
        }

        // 7. Archetype modifier
        const archetype = detectArchetype(state.opponentTeam);
        if (archetype === 'STALL') {
            score += 10; // Stall teams switch more
            reasons.push('Stall archetype (switches more)');
        } else if (archetype === 'HO') {
            score -= 5; // HO prefers to stay in and attack
        }

        // Clamp and classify
        score = Math.max(0, Math.min(100, score));

        let probability;
        if (score >= 40) probability = 'HIGH';
        else if (score >= 20) probability = 'MEDIUM';
        else probability = 'LOW';

        return { probability, score, reason: reasons.join('; ') };
    }

    // ─── Opponent Move Prediction ───

    /**
     * Predict what move the opponent is likely to use
     * @returns {Array<{ name: string, probability: number, damage: { min, max }, reason: string }>}
     */
    function predictOpponentMoves(state) {
        const oppActive = state.opponentActive;
        const myActive = state.myActive;
        if (!oppActive || !myActive) return [];

        const oppMon = state.opponentTeam[oppActive];
        const myMon = state.myTeam[myActive];
        const oppData = lookupPokemon(oppActive);
        const myData = lookupPokemon(myActive);

        if (!oppData) return [];

        // Get known moves + assume common set moves
        let possibleMoves = [...(oppMon?.moves || [])];

        // Fill from common sets if we haven't seen 4 moves
        if (possibleMoves.length < 4 && oppData.commonSets) {
            for (const set of oppData.commonSets) {
                for (const moveName of set.moves) {
                    if (!possibleMoves.includes(moveName) && possibleMoves.length < 4) {
                        possibleMoves.push(moveName);
                    }
                }
                if (possibleMoves.length >= 4) break;
            }
        }

        // Score each move
        const predictions = possibleMoves.map(moveName => {
            let moveData = lookupMove(moveName);
            if (!moveData || moveData.isUnknown) {
                console.warn(`[ShowdownPredictor] Engine: Unknown move '${moveName}' encountered in predictOpponentMoves.`);
                if (!moveData) moveData = { name: moveName, bp: 0, type: 'Normal', cat: 'Status', isUnknown: true };
            }
            // Calculate damage to us
            const oppAttacker = {
                baseStats: oppData.baseStats,
                stats: oppMon?.stats, // Pass actual stats if available
                types: oppMon?.types || oppData.types,
                boosts: oppMon?.boosts || {},
                ability: oppMon?.ability || oppData.abilities[0],
                item: oppMon?.item || ''
            };

            const myDefender = {
                baseStats: myData ? myData.baseStats : null,
                stats: myMon?.stats,
                types: myMon?.types || (myData ? myData.types : []),
                boosts: myMon?.boosts || {},
                ability: myMon?.ability || '',
                item: myMon?.item || '',
                hp: myMon?.hp || 100,
                status: myMon?.status || ''
            };

            const dmg = calculateDamage(oppAttacker, myDefender, moveData, state.field);

            let score = 25; // base probability
            let reason = '';

            // Higher damage = more likely
            if (dmg.max >= 70) { score += 30; reason = 'Heavy hitter'; }
            else if (dmg.max >= 40) { score += 15; reason = 'Solid damage'; }

            // STAB bonus
            if (oppData.types.includes(moveData.type)) {
                score += 10;
                reason += ', STAB';
            }

            // Type effectiveness
            if (dmg.effectiveness >= 2) {
                score += 20;
                reason += ', Super effective';
            } else if (dmg.effectiveness <= 0.5) {
                score -= 20;
                reason += ', Resisted';
            } else if (dmg.effectiveness === 0) {
                score -= 50;
                reason += ', Immune';
            }

            // Recovery moves when low HP
            if (isRecoveryMove(moveName) && oppMon && oppMon.hp < 50) {
                score += 25;
                reason = 'Low HP recovery';
            }

            // Setup moves at good matchup
            if (isSetupMove(moveName)) {
                if (!isWeakToSTAB(myData ? myData.types : [], oppData.types)) {
                    score += 15;
                    reason = 'Setup opportunity';
                } else {
                    score -= 10;
                    reason = 'Unlikely to setup when threatened';
                }
            }

            // Status moves
            if (moveData.flags?.includes('status')) {
                if (!myMon?.status) { // can't status already statused
                    score += 5;
                } else {
                    score -= 15;
                }
            }

            return {
                name: moveName,
                probability: Math.max(5, Math.min(95, score)),
                damage: dmg,
                reason: reason.replace(/^, /, '')
            };
        });

        // Normalize probabilities
        const totalScore = predictions.reduce((sum, p) => sum + p.probability, 0);
        predictions.forEach(p => {
            p.probability = totalScore > 0 ? Math.round(p.probability / totalScore * 100) : 25;
        });

        // Sort by probability descending
        predictions.sort((a, b) => b.probability - a.probability);

        return predictions;
    }

    // ─── Move Recommendation ───

    /**
     * Recommend the best move for the user
     * Uses 1-step minimax: maximize our damage while considering switch risk
     */
    function recommendMove(state) {
        const myActive = state.myActive;
        const oppActive = state.opponentActive;

        // Ensure we always return something even if state is incomplete
        if (!myActive || !oppActive) {
            console.log('[ShowdownPredictor] Engine: Waiting for active mons', { myActive, oppActive });
            // If we have available moves in the UI, return the first one as a fallback
            if (state.myMoves && state.myMoves.length > 0) {
                const firstMove = state.myMoves.find(m => !m.disabled) || state.myMoves[0];
                return [{
                    name: firstMove.name,
                    score: 0,
                    damage: { min: 0, max: 0 },
                    reason: '⚠️ Waiting for active mon data...'
                }];
            }
            return null;
        }

        const myMon = state.myTeam[myActive];
        const oppMon = state.opponentTeam[oppActive];

        // Fallbacks for data lookup failures
        const myData = lookupPokemon(myActive) || { baseStats: { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 80 }, types: ['Normal'], abilities: [] };
        const oppData = lookupPokemon(oppActive) || { baseStats: { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 80 }, types: ['Normal'], abilities: [] };

        const switchPrediction = predictSwitch(state);
        const oppMovePredictions = predictOpponentMoves(state);

        // Get our available moves (from move menu or known moves)
        let availableMoves = [];
        if (state.myMoves && state.myMoves.length > 0) {
            availableMoves = state.myMoves.filter(m => !m.disabled).map(m => m.name);
        } else if (myMon && myMon.moves && myMon.moves.length > 0) {
            availableMoves = myMon.moves;
        }

        if (availableMoves.length === 0) {
            console.log('[ShowdownPredictor] Engine: No moves found for recommendation');
            return null;
        }

        const recommendations = availableMoves.map(moveName => {
            let moveData = lookupMove(moveName);
            if (!moveData || moveData.isUnknown) {
                console.warn(`[ShowdownPredictor] Engine: Unknown move '${moveName}' encountered in recommendMove.`);
                if (!moveData) moveData = { name: moveName, bp: 0, type: 'Normal', cat: 'Status', isUnknown: true };
            }

            // Calculate our damage to their active
            const myAttacker = {
                baseStats: myData.baseStats,
                stats: myMon?.stats,
                types: myMon?.types || myData.types,
                boosts: myMon?.boosts || {},
                ability: myMon?.ability || myData.abilities[0],
                item: myMon?.item || ''
            };

            const oppDefender = {
                baseStats: oppData.baseStats,
                stats: oppMon?.stats,
                types: oppMon?.types || oppData.types,
                boosts: oppMon?.boosts || {},
                ability: oppMon?.ability || oppData.abilities[0],
                item: oppMon?.item || '',
                hp: oppMon?.hp || 100,
                status: oppMon?.status || ''
            };

            const dmg = calculateDamage(myAttacker, oppDefender, moveData, state.field);

            let score = dmg.max; // base score = damage output
            let reason = '';

            // OHKO bonus
            if (dmg.min >= oppMon?.hp) {
                score += 50;
                reason = '💀 Guaranteed KO!';
            } else if (dmg.max >= oppMon?.hp) {
                score += 30;
                reason = '⚠️ Possible KO (roll)';
            }

            // Pivot move bonus when switch predicted
            if (isPivotMove(moveName) && switchPrediction.probability === 'HIGH') {
                score += 25;
                reason = '🔄 Pivot (switch predicted)';
            }

            // Coverage move bonus when switch predicted
            if (switchPrediction.probability === 'HIGH') {
                // Check if this hits common switch-ins super effectively
                const potentialSwitchIns = Object.entries(state.opponentTeam)
                    .filter(([name, mon]) => name !== oppActive && mon.hp > 0);

                for (const [name] of potentialSwitchIns) {
                    const switchData = lookupPokemon(name);
                    if (switchData) {
                        const switchDmg = calculateDamage(myAttacker,
                            { baseStats: switchData.baseStats, types: switchData.types, boosts: {}, ability: '', item: '' },
                            moveData, state.field);
                        if (switchDmg.effectiveness >= 2) {
                            score += 10;
                            reason = `🎯 Hits ${name} on switch`;
                            break;
                        }
                    }
                }
            }

            // Priority move bonus when we're outsped and their move could KO
            if (isPriorityMove(moveName)) {
                const mySpeed = getSpeedRange(myActive);
                const oppSpeed = getSpeedRange(oppActive);
                if (mySpeed.max < oppSpeed.min) {
                    // We're outsped — priority is valuable
                    if (dmg.max >= oppMon?.hp) {
                        score += 40;
                        reason = '⚡ Priority KO while outsped!';
                    } else {
                        score += 10;
                        reason = '⚡ Priority move (outsped)';
                    }
                }
            }

            // Setup move bonus when safe
            if (isSetupMove(moveName)) {
                // Only recommend if opponent can't threaten us heavily
                const theirBestDmg = oppMovePredictions[0]?.damage?.max || 0;
                if (theirBestDmg < 35) {
                    score += 20;
                    reason = '📈 Safe setup opportunity';
                } else {
                    score -= 10;
                    reason = '❌ Too dangerous to setup';
                }
            }

            // Recovery bonus when low
            if (isRecoveryMove(moveName) && myMon && myMon.hp < 50) {
                const theirBestDmg = oppMovePredictions[0]?.damage?.max || 0;
                if (theirBestDmg < 40) {
                    score += 15;
                    reason = '💚 Recover at low HP';
                }
            }

            // Hazard moves early game
            if (isHazardMove(moveName) && state.turnNumber <= 3) {
                if (!state.field.opponentHazards.stealthRock || moveName !== 'Stealth Rock') {
                    score += 10;
                    reason = '🪨 Early hazards';
                }
            }

            // Penalty for immune moves
            if (dmg.effectiveness === 0) {
                score = -50;
                reason = '❌ Opponent is IMMUNE';
            }

            return {
                name: moveName,
                score: Math.round(score),
                damage: dmg,
                reason
            };
        });

        // Sort by score descending
        recommendations.sort((a, b) => b.score - a.score);

        return recommendations;
    }

    // ─── Speed Tier Analysis ───

    /**
     * Analyze speed matchup between active Pokémon
     */
    function analyzeSpeed(state) {
        const myActive = state.myActive;
        const oppActive = state.opponentActive;
        if (!myActive || !oppActive) return null;

        const mySpeed = getSpeedRange(myActive);
        const oppSpeed = getSpeedRange(oppActive);

        // Use "likely" speed: max invested speed for competitive play
        // This gives more actionable predictions than full min/max range
        const myLikely = mySpeed.max;   // Assume positive nature, 252 EVs
        const oppLikely = oppSpeed.max;

        let verdict, detail;

        if (myLikely > oppLikely) {
            verdict = 'FASTER';
            detail = `Likely faster (${myLikely} vs ${oppLikely})`;
        } else if (myLikely < oppLikely) {
            verdict = 'OUTSPED';
            detail = `OUTSPED! (${myLikely} vs ${oppLikely})`;
        } else {
            verdict = 'SPEED_TIE';
            detail = `Speed tie! (${myLikely} vs ${oppLikely})`;
        }

        // Full ranges for context
        detail += ` [ranges: ${mySpeed.min}-${mySpeed.max} vs ${oppSpeed.min}-${oppSpeed.max}]`;

        // Check for Trick Room
        if (state.field.trickRoom) {
            if (verdict === 'FASTER') verdict = 'OUTSPED';
            else if (verdict === 'OUTSPED') verdict = 'FASTER';
            detail += ' [Trick Room active!]';
        }

        // Check for priority moves
        const myMon = state.myTeam[myActive];
        const oppMon = state.opponentTeam[oppActive];
        const myPriority = myMon?.moves.some(m => isPriorityMove(m));
        const oppPriority = oppMon?.moves.some(m => isPriorityMove(m));

        return {
            verdict,
            detail,
            mySpeed,
            oppSpeed,
            myPriority,
            oppPriority,
            trickRoom: state.field.trickRoom
        };
    }

    // ─── Switch Recommendation ───

    /**
     * Recommend the best switch-in candidates
     * @param {object} state
     * @param {boolean} isForced - If true, active fainted (revenge kill scenario)
     */
    function recommendSwitch(state, isForced) {
        const oppActive = state.opponentActive;
        if (!oppActive) return [];

        const oppMon = state.opponentTeam[oppActive];
        const oppData = lookupPokemon(oppActive);
        if (!oppData) return [];

        // Candidates: team members that are NOT active and NOT fainted
        const candidates = Object.entries(state.myTeam)
            .filter(([name, mon]) => {
                // In forced switch, active is fainted, so we filter it out by name or HP
                // In normal switch, active is alive, so filter by name
                if (name === state.myActive) return false;
                return mon.hp > 0 && !mon.fainted;
            });

        const recommendations = candidates.map(([name, mon]) => {
            const myData = lookupPokemon(name);
            if (!myData) return null;

            let score = 50; // Base score
            let reasons = [];

            // 1. Offense Score (Our damage to them)
            const myAttacker = {
                baseStats: myData.baseStats,
                stats: mon.stats,
                types: myData.types,
                boosts: {}, // assume neutral boosts on switch-in
                ability: myData.abilities[0], // assume base ability
                item: mon.item || ''
            };
            const oppDefender = {
                baseStats: oppData.baseStats,
                stats: oppMon?.stats,
                types: oppMon?.types || oppData.types,
                boosts: oppMon?.boosts || {},
                ability: oppMon?.ability || oppData.abilities[0],
                item: oppMon?.item || '',
                hp: oppMon?.hp || 100
            };

            // Find our best move against them
            let bestDmg = 0;
            let bestMoveName = '';

            // Use common moves if we don't know moves, or known moves
            const movesToCheck = mon.moves.length > 0 ? mon.moves : (myData.commonSets?.[0]?.moves || ['Tackle']);

            for (const moveName of movesToCheck) {
                const moveData = lookupMove(moveName);
                if (moveData && !moveData.isUnknown) {
                    const dmg = calculateDamage(myAttacker, oppDefender, moveData, state.field);
                    if (dmg.max > bestDmg) {
                        bestDmg = dmg.max;
                        bestMoveName = moveName;
                    }
                }
            }

            if (bestDmg >= oppMon?.hp) {
                score += 40;
                reasons.push('Likely OHKO');
            } else if (bestDmg >= 50) {
                score += 25;
                reasons.push('Significant damage');
            } else if (bestDmg >= 30) {
                score += 10;
                reasons.push('Decent damage');
            } else {
                score -= 10;
            }

            // 2. Defense Score (Incoming damage)
            // If forced switch (revenge kill), we come in safely, so defense is less critical but still important for next turn
            // If normal switch, we TAKE A HIT, so defense is CRITICAL.

            // Simulate opponent's best move against us
            const oppAttacker = {
                baseStats: oppData.baseStats,
                types: oppMon?.types || oppData.types,
                boosts: oppMon?.boosts || {},
                ability: oppMon?.ability || oppData.abilities[0],
                item: oppMon?.item || ''
            };
            const myDefender = {
                baseStats: myData.baseStats,
                types: myData.types,
                boosts: {},
                ability: myData.abilities[0],
                item: mon.item || '',
                hp: mon.hp || 100
            };

            // Predict their moves (or use all known)
            let maxIncomingDmg = 0;
            const oppMovesToCheck = oppMon?.moves?.length > 0 ? oppMon.moves :
                (oppData.commonSets?.[0]?.moves || ['Tackle']);

            for (const moveName of oppMovesToCheck) {
                const moveData = lookupMove(moveName);
                if (moveData && !moveData.isUnknown) {
                    const dmg = calculateDamage(oppAttacker, myDefender, moveData, state.field);
                    if (dmg.max > maxIncomingDmg) maxIncomingDmg = dmg.max;
                }
            }

            if (isForced) {
                // Revenge Kill Scenario
                // We enter safely. Speed is KING.
                const mySpeed = getSpeedRange(name).max;
                const oppSpeed = getSpeedRange(oppActive).max;

                if (mySpeed > oppSpeed) {
                    score += 30;
                    reasons.push('Faster');
                } else if (mySpeed < oppSpeed) {
                    score -= 15;
                    reasons.push('Slower');
                    // If slower and they hit hard, risk of getting KO'd before attacking
                    if (maxIncomingDmg >= 80) {
                        score -= 30;
                        reasons.push('Risk of OHKO');
                    }
                }

                // If we wall them, good
                if (maxIncomingDmg < 30) {
                    score += 15;
                    reasons.push('Walls opponent');
                }

            } else {
                // Normal Switch Scenario (Pivot)
                // We take a hit on entry. Valid only if we resist well.
                if (maxIncomingDmg < 25) {
                    score += 40;
                    reasons.push('Resists incoming');
                } else if (maxIncomingDmg < 50) {
                    score += 10;
                } else {
                    score -= 30; // Taking too much damage on switch
                    reasons.push('Takes heavy damage');
                }

                // Speed still matters for subsequent turns
                const mySpeed = getSpeedRange(name).max;
                const oppSpeed = getSpeedRange(oppActive).max;
                if (mySpeed > oppSpeed) {
                    score += 10;
                    reasons.push('Faster');
                }
            }

            // Type Synergy
            if (isWeakToSTAB(myData.types, oppData.types)) {
                score -= 20;
                reasons.push('Weak to STAB');
            } else if (resistsSTAB(myData.types, oppData.types)) {
                score += 15;
                reasons.push('Resists STAB');
            }

            return {
                name,
                score,
                reasons,
                maxIncomingDmg,
                bestDmg
            };
        }).filter(r => r !== null);

        // Sort by score
        recommendations.sort((a, b) => b.score - a.score);
        return recommendations;
    }

    // ─── Full Analysis ───

    /**
     * Run complete analysis on current game state
     * @returns {object} Full analysis results
     */
    function analyze(state) {
        const switchPrediction = predictSwitch(state);
        const oppMoves = predictOpponentMoves(state);
        const oppArchetype = detectArchetype(state.opponentTeam);
        const myArchetype = detectArchetype(state.myTeam);

        // Determine if we are likely in a forced switch state (active fainted)
        const myActiveMon = state.myTeam[state.myActive];
        // Use scraper's forceSwitch flag first, then fallback to HP check
        const isForcedSwitch = state.forceSwitch || (myActiveMon && myActiveMon.hp <= 0);

        const recommendations = recommendMove(state);
        const speedAnalysis = analyzeSpeed(state);
        const switchRecommendations = recommendSwitch(state, isForcedSwitch);

        return {
            switchPrediction,
            oppMoves,
            recommendations,
            switchRecommendations,
            speedAnalysis,
            oppArchetype,
            myArchetype,
            isForcedSwitch,
            turnNumber: state.turnNumber,
            myActive: state.myActive,
            opponentActive: state.opponentActive,
            field: state.field
        };
    }

    return {
        calculateDamage,
        detectArchetype,
        predictSwitch,
        predictOpponentMoves,
        recommendMove,
        recommendSwitch,
        analyzeSpeed,
        analyze
    };
})();
