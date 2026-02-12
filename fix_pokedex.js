
const fs = require('fs');

let content = fs.readFileSync('data/pokemon_data.js', 'utf8');

// Fix the specific Alakazam issue
content = content.replace(
    /commonSets: \[\s*{\s*item: "Focus Sash",\s*moves: \["Psychic", "Focus Blast", "Shadow Ball", "Nasty Plot"\]\s*}/g,
    'commonSets: [\n            { item: "Focus Sash", moves: ["Psychic", "Focus Blast", "Shadow Ball", "Nasty Plot"] }\n        ]'
);

// Look for other potentially unclosed commonSets
// The regex in merge_pokedex.js was: /"([^"]+)":\s*{[\s\S]*?commonSets:\s*(\[[\s\S]*?\]),/g;
// It seems it might have missed the closing ] if there was no comma or something.

// Actually, I'll just re-run the merge with a better script.
// But first, let's see if there are other errors.
fs.writeFileSync('data/pokemon_data.js', content);
console.log('Fixed Alakazam entry in data/pokemon_data.js');
