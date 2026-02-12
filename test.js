/**
 * test.js — Validation tests for the Battle Predictor engine
 * Run with: node test.js
 */
const fs = require('fs');
const vm = require('vm');

// Create shared context simulating browser globals
const ctx = vm.createContext({
  console, Math, Object, Array, parseInt, parseFloat, JSON,
  Number, String, Boolean, RegExp, Error, Map, Set, process,
  document: null, window: null, chrome: null,
  Node: { ELEMENT_NODE: 1, TEXT_NODE: 3 },
  setTimeout: setTimeout, clearTimeout: clearTimeout,
  setInterval: setInterval, clearInterval: clearInterval
});

// Load all modules in order (same as manifest content_scripts)
const files = [
  'data/type_chart.js',
  'data/pokemon_data.js',
  'data/move_data.js',
  'engine.js'
];

for (const f of files) {
  const code = fs.readFileSync(f, 'utf8');
  vm.runInContext(code, ctx);
}

// Run tests
const testCode = `
let passed = 0;
let failed = 0;

function assert(condition, msg) {
  if (condition) { passed++; console.log('  ✅ ' + msg); }
  else { failed++; console.log('  ❌ FAIL: ' + msg); }
}

// ─── Test 1: Type Chart ───
console.log('\\n🔥 Type Effectiveness');
assert(getEffectiveness('Fire', ['Grass']) === 2, 'Fire vs Grass = 2x');
assert(getEffectiveness('Water', ['Fire', 'Steel']) === 2, 'Water vs Fire/Steel = 2x');
assert(getEffectiveness('Normal', ['Ghost']) === 0, 'Normal vs Ghost = 0x (immune)');
assert(getEffectiveness('Fairy', ['Dragon', 'Dark']) === 4, 'Fairy vs Dragon/Dark = 4x');
assert(getEffectiveness('Electric', ['Ground']) === 0, 'Electric vs Ground = 0x');
assert(getEffectiveness('Ice', ['Dragon', 'Flying']) === 4, 'Ice vs Dragon/Flying = 4x');
assert(getEffectiveness('Ground', ['Fire', 'Steel']) === 4, 'Ground vs Fire/Steel = 4x');
assert(isWeakToSTAB(['Ground'], ['Fire', 'Steel']), 'Ground STAB weak check');
assert(resistsSTAB(['Normal'], ['Rock', 'Steel']), 'Normal resisted by Rock/Steel');

// ─── Test 2: Pokemon Lookup ───
console.log('\\n🐉 Pokemon Lookup');
const lando = lookupPokemon('Landorus-Therian');
assert(lando !== null, 'Found Landorus-Therian');
assert(lando.types[0] === 'Ground', 'Lando type = Ground');
assert(lando.baseStats.atk === 145, 'Lando base Atk = 145');
assert(lando.abilities[0] === 'Intimidate', 'Lando ability = Intimidate');

const kingambit = lookupPokemon('Kingambit');
assert(kingambit.types.includes('Dark'), 'Kingambit is Dark type');
assert(kingambit.baseStats.atk === 135, 'Kingambit base Atk = 135');

const fuzzy = lookupPokemon('dragapult');
assert(fuzzy !== null, 'Case-insensitive lookup works');
assert(fuzzy.baseStats.spe === 142, 'Dragapult speed = 142');

// ─── Test 3: Move Lookup ───
console.log('\\n⚔️ Move Lookup');
const eq = lookupMove('Earthquake');
assert(eq.bp === 100, 'EQ bp = 100');
assert(eq.type === 'Ground', 'EQ type = Ground');
assert(eq.cat === 'Physical', 'EQ category = Physical');

assert(isPivotMove('U-turn'), 'U-turn is pivot');
assert(isPivotMove('Volt Switch'), 'Volt Switch is pivot');
assert(!isPivotMove('Earthquake'), 'EQ is not pivot');
assert(isRecoveryMove('Recover'), 'Recover is recovery');
assert(isRecoveryMove('Roost'), 'Roost is recovery');
assert(isSetupMove('Swords Dance'), 'SD is setup');
assert(isSetupMove('Dragon Dance'), 'DD is setup');
assert(isHazardMove('Stealth Rock'), 'SR is hazard');
assert(isPriorityMove('Bullet Punch'), 'BP is priority');
assert(!isPriorityMove('Earthquake'), 'EQ is not priority');

// ─── Test 4: Speed Range ───
console.log('\\n⚡ Speed Tiers');
const dragaSpeed = getSpeedRange('Dragapult');
assert(dragaSpeed.max > 400, 'Dragapult max speed > 400');
assert(dragaSpeed.min < 300, 'Dragapult min speed < 300');

const kingSpeed = getSpeedRange('Kingambit');
assert(kingSpeed.max < dragaSpeed.min, 'Kingambit always slower than Dragapult');

// ─── Test 5: Damage Calculation ───
console.log('\\n💥 Damage Calculation');
const att1 = { baseStats: POKEMON_DATA['Garchomp'].baseStats, types: ['Dragon', 'Ground'], boosts: {}, ability: 'Rough Skin', item: '' };
const def1 = { baseStats: POKEMON_DATA['Heatran'].baseStats, types: ['Fire', 'Steel'], boosts: {}, ability: 'Flash Fire', item: '', hp: 100 };
const eqMove = { name: 'Earthquake', bp: 100, type: 'Ground', cat: 'Physical', priority: 0, flags: [] };
const dmg1 = PredictionEngine.calculateDamage(att1, def1, eqMove, {});
assert(dmg1.max > 80, 'Garchomp EQ vs Heatran (4x SE, STAB) does heavy damage: ' + dmg1.min + '-' + dmg1.max + '%');
assert(dmg1.effectiveness === 4, 'Ground vs Fire/Steel = 4x effectiveness');

const att2 = { baseStats: POKEMON_DATA['Gholdengo'].baseStats, types: ['Steel', 'Ghost'], boosts: {}, ability: 'Good as Gold', item: 'Choice Specs' };
const def2 = { baseStats: POKEMON_DATA['Dragapult'].baseStats, types: ['Dragon', 'Ghost'], boosts: {}, ability: 'Clear Body', item: '', hp: 100 };
const sbMove = { name: 'Shadow Ball', bp: 80, type: 'Ghost', cat: 'Special', priority: 0, flags: [] };
const dmg2 = PredictionEngine.calculateDamage(att2, def2, sbMove, {});
assert(dmg2.max > 0, 'Gholdengo Specs SB does damage: ' + dmg2.min + '-' + dmg2.max + '%');
assert(dmg2.effectiveness === 2, 'Ghost vs Ghost = 2x');

// Status move
const statusMove = { name: 'Swords Dance', bp: 0, type: 'Normal', cat: 'Status', priority: 0, flags: ['setup'] };
const dmg3 = PredictionEngine.calculateDamage(att1, def1, statusMove, {});
assert(dmg3.min === 0 && dmg3.max === 0, 'Status moves do 0 damage');

// ─── Test 6: Archetype Detection ───
console.log('\\n🏗️ Archetype Detection');
const hoTeam = {
  'Dragapult': { moves: ['Dragon Dance'], hp: 100 },
  'Weavile': { moves: ['Swords Dance'], hp: 100 },
  'Iron Valiant': { moves: [], hp: 100 }
};
assert(PredictionEngine.detectArchetype(hoTeam) === 'HO', 'Offensive team detected as HO');

const stallTeam = {
  'Toxapex': { moves: ['Recover'], hp: 100 },
  'Blissey': { moves: ['Soft-Boiled'], hp: 100 },
  'Corviknight': { moves: ['Roost'], hp: 100 }
};
assert(PredictionEngine.detectArchetype(stallTeam) === 'STALL', 'Defensive team detected as STALL');

const balanceTeam = {
  'Garchomp': { moves: ['Stealth Rock'], hp: 100 },
  'Rotom-Wash': { moves: ['Volt Switch'], hp: 100 }
};
assert(PredictionEngine.detectArchetype(balanceTeam) === 'BALANCE', 'Balanced team detected');

// ─── Test 7: Switch Prediction ───
console.log('\\n🔄 Switch Prediction');
const state1 = {
  myActive: 'Garchomp', opponentActive: 'Heatran',
  myTeam: { 'Garchomp': { types: ['Dragon', 'Ground'], moves: ['Earthquake'], hp: 100, status: '', boosts: {} } },
  opponentTeam: {
    'Heatran': { types: ['Fire', 'Steel'], moves: ['Magma Storm'], hp: 100, status: '', boosts: {} },
    'Toxapex': { types: ['Poison', 'Water'], moves: ['Recover'], hp: 100, status: '', boosts: {} }
  },
  field: { weather: null, terrain: null, trickRoom: false, tailwind: { my: false, opponent: false }, myHazards: {}, opponentHazards: {} },
  turnNumber: 3, myMoves: [], mySwitches: []
};
const sw1 = PredictionEngine.predictSwitch(state1);
assert(sw1.probability === 'HIGH', 'Heatran should HIGH switch vs Garchomp (4x weak): ' + sw1.probability + ' score=' + sw1.score);

// ─── Test 8: Speed Analysis ───
console.log('\\n⚡ Speed Analysis');
const spd1 = PredictionEngine.analyzeSpeed(state1);
assert(spd1.verdict === 'FASTER', 'Garchomp faster than Heatran: ' + spd1.verdict);

const state2 = { ...state1, myActive: 'Kingambit', opponentActive: 'Dragapult',
  myTeam: { 'Kingambit': { types: ['Dark', 'Steel'], moves: [], hp: 100, status: '', boosts: {} } },
  opponentTeam: { 'Dragapult': { types: ['Dragon', 'Ghost'], moves: [], hp: 100, status: '', boosts: {} } }
};
const spd2 = PredictionEngine.analyzeSpeed(state2);
assert(spd2.verdict === 'OUTSPED', 'Kingambit outsped by Dragapult: ' + spd2.verdict);

// ─── Test 9: Opponent Move Prediction ───
console.log('\\n🎯 Opponent Move Prediction');
const oppMoves = PredictionEngine.predictOpponentMoves(state1);
assert(oppMoves.length > 0, 'Got opponent move predictions: ' + oppMoves.length + ' moves');
assert(oppMoves[0].name !== undefined, 'Top prediction has a name: ' + oppMoves[0].name);
console.log('  Predictions: ' + oppMoves.map(m => m.name + '(' + m.probability + '%)').join(', '));

// ─── Test 10: Full Analysis ───
console.log('\\n📊 Full Analysis');
const analysis = PredictionEngine.analyze(state1);
assert(analysis.switchPrediction !== undefined, 'Has switch prediction');
assert(analysis.oppMoves !== undefined, 'Has opp moves');
assert(analysis.speedAnalysis !== undefined, 'Has speed analysis');
assert(analysis.oppArchetype !== undefined, 'Has archetype: ' + analysis.oppArchetype);
assert(analysis.turnNumber === 3, 'Turn number correct');

// ─── Summary ───
console.log('\\n' + '═'.repeat(40));
console.log('Results: ' + passed + ' passed, ' + failed + ' failed');
console.log('═'.repeat(40));
if (failed > 0) process.exitCode = 1;
`;

vm.runInContext(testCode, ctx);
