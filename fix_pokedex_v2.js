
const fs = require('fs');

let content = fs.readFileSync('data/pokemon_data.js', 'utf8');

// Regex to find commonSets that are not properly closed
// It looks for commonSets: [ followed by anything that isn't ] and then the end of the pokemon object
content = content.replace(/commonSets: \[\s*({[\s\S]*?})\s*(?="\w+": {|\s*})/g, (match, p1) => {
    // Check if it already ends with ]
    if (match.trim().endsWith(']')) return match;
    
    // If not, it's likely the one we need to fix
    // p1 is the set object. We need to wrap it in []
    return `commonSets: [\n            ${p1.trim()}\n        ]`;
});

// Another pass for cases where multiple sets might be there or formatting is different
// We'll use a more aggressive approach: find "commonSets: [" and then find the next "}," 
// and ensure there is a "]" before it.

const lines = content.split('\n');
let inCommonSets = false;
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('commonSets: [')) {
        inCommonSets = true;
    }
    if (inCommonSets && lines[i].trim() === '},' && !lines[i-1].trim().endsWith(']')) {
        // We found the end of a pokemon object but commonSets wasn't closed
        lines[i-1] = lines[i-1] + '\n        ]';
        inCommonSets = false;
    } else if (inCommonSets && lines[i].includes('],')) {
        inCommonSets = false;
    }
}

fs.writeFileSync('data/pokemon_data.js', lines.join('\n'));
console.log('Processed and fixed pokemon_data.js');
