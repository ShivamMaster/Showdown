
const fs = require('fs');

const content = fs.readFileSync('data/pokemon_data.js', 'utf8');
const lines = content.split('\n');
const newLines = [];

let inCommonSets = false;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.includes('commonSets: [')) {
        inCommonSets = true;
    }
    
    if (inCommonSets && line.trim() === '},') {
        // Check if the previous line ended the set correctly
        const prevLine = newLines[newLines.length - 1];
        if (!prevLine.trim().endsWith(']')) {
            // Fix: close the set and then the object
            // The previous line might be missing a closing brace too
            if (!prevLine.trim().endsWith('}')) {
                newLines[newLines.length - 1] = prevLine + ' }';
            }
            newLines.push('        ]');
        }
        inCommonSets = false;
    } else if (inCommonSets && line.includes('],')) {
        inCommonSets = false;
    }
    
    newLines.push(line);
}

fs.writeFileSync('data/pokemon_data.js', newLines.join('\n'));
console.log('Fixed pokemon_data.js with line-by-line check');
