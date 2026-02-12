
const fs = require('fs');

const content = fs.readFileSync('pokedex_raw.ts', 'utf8');
const pokemonRegex = /([a-z0-9]+):\s*{([\s\S]*?^(\t|\s{2})},)/gm;
const POKEMON_DATA = {};

let match;
while ((match = pokemonRegex.exec(content)) !== null) {
    const pokeKey = match[1];
    const pokeBody = match[2];

    const getName = () => {
        const m = pokeBody.match(/name:\s*"([^"]+)"/);
        return m ? m[1] : null;
    };

    const getTypes = () => {
        const m = pokeBody.match(/types:\s*\[([^\]]+)\]/);
        if (!m) return ["Normal"];
        return m[1].split(',').map(t => t.trim().replace(/"/g, ''));
    };

    const getBaseStats = () => {
        const m = pokeBody.match(/baseStats:\s*{([^}]+)}/);
        if (!m) return { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
        const statsStr = m[1];
        const stats = {};
        statsStr.split(',').forEach(s => {
            const parts = s.split(':').map(x => x.trim());
            if (parts.length === 2) stats[parts[0]] = parseInt(parts[1]);
        });
        return stats;
    };

    const getAbilities = () => {
        const m = pokeBody.match(/abilities:\s*{([^}]+)}/);
        if (!m) return [];
        const abStr = m[1];
        const abilities = [];
        const abMatches = abStr.match(/"([^"]+)"/g);
        if (abMatches) abMatches.forEach(am => abilities.push(am.replace(/"/g, '')));
        return abilities;
    };

    const name = getName();
    if (name) {
        POKEMON_DATA[name] = {
            types: getTypes(),
            baseStats: getBaseStats(),
            abilities: getAbilities()
        };
    }
}

fs.writeFileSync('pokemon_data_new.json', JSON.stringify(POKEMON_DATA, null, 4));
console.log('Processed ' + Object.keys(POKEMON_DATA).length + ' pokemon.');
