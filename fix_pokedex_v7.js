
const fs = require('fs');

let content = fs.readFileSync('data/pokemon_data.js', 'utf8');

// 1. Remove the extra braces/brackets I added in previous attempts
content = content.replace(/\] }\n    },/g, '}\n    },');
content = content.replace(/abilities: \[.*?\] }\n    },/g, (m) => m.replace(' }', ''));
content = content.replace(/abilities: \[.*?\]\n        \]\n    },/g, (m) => m.replace('\n        ]', ''));

// 2. Fix the actual missing brackets in commonSets
// Pattern: commonSets: [\n            { item: "...", moves: [...] }\n    },
content = content.replace(/commonSets: \[\s*({ item: ".*?", moves: \[.*?\] })\n\s*},/g, 'commonSets: [\n            $1\n        ]\n    },');

// 3. Fix the end of the file
content = content.replace(/\n\s*\]\s*\]\s*};/, '\n};');
content = content.replace(/\n\s*\]\s*};/, '\n};');

fs.writeFileSync('data/pokemon_data.js', content);
console.log('Cleaned up and fixed pokemon_data.js');
