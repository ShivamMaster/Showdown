
const fs = require('fs');

const content = fs.readFileSync('data/pokemon_data.js', 'utf8');
const lines = content.split('\n');
const fixedLines = [];

let openBrackets = 0;
let openBraces = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Count brackets and braces in this line
    const matches = line.match(/[\[\]\{\}]/g) || [];
    let lineBrackets = 0;
    let lineBraces = 0;
    
    matches.forEach(m => {
        if (m === '[') lineBrackets++;
        if (m === ']') lineBrackets--;
        if (m === '{') lineBraces++;
        if (m === '}') lineBraces--;
    });
    
    // If we are about to close a pokemon object but we have unclosed brackets/braces
    if (line.trim() === '},' && (openBrackets > 0 || openBraces > 1)) {
        // Fix the previous line
        let lastLine = fixedLines[fixedLines.length - 1];
        if (openBraces > 1) {
            lastLine += ' }';
            openBraces--;
        }
        if (openBrackets > 0) {
            fixedLines.push('        ]');
            openBrackets--;
        }
        fixedLines[fixedLines.length - 1] = lastLine;
    }
    
    openBrackets += lineBrackets;
    openBraces += lineBraces;
    fixedLines.push(line);
}

// Final check for the end of the object
if (openBrackets < 0) {
    // Remove extra brackets at the end
    for (let i = fixedLines.length - 1; i >= 0; i--) {
        if (fixedLines[i].includes(']};')) {
            fixedLines[i] = fixedLines[i].replace(']', '');
            break;
        }
    }
}

fs.writeFileSync('data/pokemon_data.js', fixedLines.join('\n'));
console.log('Fixed pokemon_data.js with brace counting');
