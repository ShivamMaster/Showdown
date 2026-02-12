
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
    
    // Check if we are about to close a pokemon object but commonSets is still open
    if (inCommonSets && line.trim() === '},') {
        const lastLine = newLines[newLines.length - 1];
        if (!lastLine.trim().endsWith(']')) {
            // It's not closed. Fix the last line and add closing bracket.
            if (!lastLine.trim().endsWith('}')) {
                newLines[newLines.length - 1] = lastLine + ' }';
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
console.log('Fixed pokemon_data.js');
