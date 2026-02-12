/**
 * type_chart.js — Complete Gen 9 type effectiveness matrix
 *
 * TYPE_CHART[attackingType][defendingType] = multiplier
 * 0 = immune, 0.5 = resisted, 1 = neutral, 2 = super effective
 */

const TYPES = [
  'Normal','Fire','Water','Electric','Grass','Ice',
  'Fighting','Poison','Ground','Flying','Psychic',
  'Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'
];

// Row = attacking type, Col = defending type (same order as TYPES)
const TYPE_CHART_MATRIX = [
//          Nor  Fir  Wat  Ele  Gra  Ice  Fig  Poi  Gro  Fly  Psy  Bug  Roc  Gho  Dra  Dar  Ste  Fai
/*Nor*/  [  1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,  0.5,  0,   1,   1,  0.5,  1  ],
/*Fir*/  [  1,  0.5, 0.5,  1,   2,   2,   1,   1,   1,   1,   1,   2,  0.5,  1,  0.5,  1,   2,   1  ],
/*Wat*/  [  1,   2,  0.5,  1,  0.5,  1,   1,   1,   2,   1,   1,   1,   2,   1,  0.5,  1,   1,   1  ],
/*Ele*/  [  1,   1,   2,  0.5, 0.5,  1,   1,   1,   0,   2,   1,   1,   1,   1,  0.5,  1,   1,   1  ],
/*Gra*/  [  1,  0.5,  2,   1,  0.5,  1,   1,  0.5,  2,  0.5,  1,  0.5,  2,   1,  0.5,  1,  0.5,  1  ],
/*Ice*/  [  1,  0.5, 0.5,  1,   2,  0.5,  1,   1,   2,   2,   1,   1,   1,   1,   2,   1,  0.5,  1  ],
/*Fig*/  [  2,   1,   1,   1,   1,   2,   1,  0.5,  1,  0.5, 0.5, 0.5,  2,   0,   1,   2,   2,  0.5 ],
/*Poi*/  [  1,   1,   1,   1,   2,   1,   1,  0.5, 0.5,  1,   1,   1,  0.5, 0.5,  1,   1,   0,   2  ],
/*Gro*/  [  1,   2,   1,   2,  0.5,  1,   1,   2,   1,   0,   1,  0.5,  2,   1,   1,   1,   2,   1  ],
/*Fly*/  [  1,   1,   1,  0.5,  2,   1,   2,   1,   1,   1,   1,   2,  0.5,  1,   1,   1,  0.5,  1  ],
/*Psy*/  [  1,   1,   1,   1,   1,   1,   2,   2,   1,   1,  0.5,  1,   1,   1,   1,   0,  0.5,  1  ],
/*Bug*/  [  1,  0.5,  1,   1,   2,   1,  0.5, 0.5,  1,  0.5,  2,   1,   1,  0.5,  1,   2,  0.5, 0.5 ],
/*Roc*/  [  1,   2,   1,   1,   1,   2,  0.5,  1,  0.5,  2,   1,   2,   1,   1,   1,   1,  0.5,  1  ],
/*Gho*/  [  0,   1,   1,   1,   1,   1,   1,   1,   1,   1,   2,   1,   1,   2,   1,  0.5,  1,   1  ],
/*Dra*/  [  1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   1,   2,   1,  0.5,  0  ],
/*Dar*/  [  1,   1,   1,   1,   1,   1,  0.5,  1,   1,   1,   2,   1,   1,   2,   1,  0.5,  1,  0.5 ],
/*Ste*/  [  1,  0.5, 0.5, 0.5,  1,   2,   1,   1,   1,   1,   1,   1,   2,   1,   1,   1,  0.5,  2  ],
/*Fai*/  [  1,  0.5,  1,   1,   1,   1,   2,  0.5,  1,   1,   1,   1,   1,   1,   2,   2,  0.5,  1  ]
];

// Build lookup object for fast access
const TYPE_CHART = {};
for (let i = 0; i < TYPES.length; i++) {
  TYPE_CHART[TYPES[i]] = {};
  for (let j = 0; j < TYPES.length; j++) {
    TYPE_CHART[TYPES[i]][TYPES[j]] = TYPE_CHART_MATRIX[i][j];
  }
}

/**
 * Get combined type effectiveness multiplier
 * @param {string} atkType - Attacking move type
 * @param {string[]} defTypes - Defending Pokémon types (1 or 2)
 * @returns {number} Combined multiplier (0, 0.25, 0.5, 1, 2, 4)
 */
function getEffectiveness(atkType, defTypes) {
  let mult = 1;
  for (const defType of defTypes) {
    const chart = TYPE_CHART[atkType];
    if (chart && chart[defType] !== undefined) {
      mult *= chart[defType];
    }
  }
  return mult;
}

/**
 * Get all offensive effectiveness for a Pokémon's STAB types against defender
 * @param {string[]} atkTypes - Attacker's types
 * @param {string[]} defTypes - Defender's types
 * @returns {number} Best STAB effectiveness
 */
function getBestSTABEffectiveness(atkTypes, defTypes) {
  let best = 0;
  for (const atkType of atkTypes) {
    const eff = getEffectiveness(atkType, defTypes);
    if (eff > best) best = eff;
  }
  return best;
}

/**
 * Check if defender is weak to any of attacker's STAB types
 */
function isWeakToSTAB(atkTypes, defTypes) {
  return getBestSTABEffectiveness(atkTypes, defTypes) >= 2;
}

/**
 * Check if defender resists all of attacker's STAB types
 */
function resistsSTAB(atkTypes, defTypes) {
  return getBestSTABEffectiveness(atkTypes, defTypes) <= 0.5;
}
