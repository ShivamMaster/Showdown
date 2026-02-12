
const fs = require('fs');

let content = fs.readFileSync('data/pokemon_data.js', 'utf8');

// Fix commonSets missing closing ] }
// This regex matches a commonSets that is followed by the next pokemon entry without a closing ]
content = content.replace(/commonSets: \[\s*({[^}]*?)\s*^(\s+)},/gm, (match, p1, p2) => {
    return `commonSets: [\n            ${p1.trim()} }\n        ]\n    },`;
});

fs.writeFileSync('data/pokemon_data.js', content);
console.log('Fixed pokemon_data.js with regex');
