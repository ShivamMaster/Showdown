
const fs = require('fs');

const content = fs.readFileSync('moves_raw.ts', 'utf8');
const moveRegex = /([a-z0-9]+):\s*{([\s\S]*?^(\t|\s{2})},)/gm;
const MOVE_DATA = {};

let match;
while ((match = moveRegex.exec(content)) !== null) {
    const moveKey = match[1];
    const moveBody = match[2];

    const getName = () => {
        const m = moveBody.match(/name:\s*"([^"]+)"/);
        return m ? m[1] : null;
    };

    const getBP = () => {
        const m = moveBody.match(/basePower:\s*(\d+)/);
        return m ? parseInt(m[1]) : 0;
    };

    const getType = () => {
        const m = moveBody.match(/type:\s*"([^"]+)"/);
        return m ? m[1] : "Normal";
    };

    const getCat = () => {
        const m = moveBody.match(/category:\s*"([^"]+)"/);
        return m ? m[1] : "Status";
    };

    const getPriority = () => {
        const m = moveBody.match(/priority:\s*(-?\d+)/);
        return m ? parseInt(m[1]) : 0;
    };

    const getAcc = () => {
        const m = moveBody.match(/accuracy:\s*(\d+|true)/);
        if (!m) return 100;
        if (m[1] === 'true') return 100;
        return parseInt(m[1]);
    };

    const getFlags = () => {
        const flags = [];
        if (moveBody.includes('contact: 1')) flags.push('contact');
        if (moveBody.includes('heal:') || moveBody.includes('drain:')) flags.push('recovery');
        if (moveBody.includes('sideCondition:') && (moveBody.includes('spikes') || moveBody.includes('stealthrock') || moveBody.includes('stickyweb') || moveBody.includes('toxicspikes'))) flags.push('hazard');
        if (moveBody.includes('selfSwitch:')) flags.push('pivot');
        if (moveBody.includes('boosts:') && getCat() === 'Status') flags.push('setup');
        if (getPriority() > 0) flags.push('priority');
        if (getCat() === 'Status') flags.push('status');
        if (moveBody.includes('weather:')) flags.push('weather');
        if (moveBody.includes('terrain:')) flags.push('terrain');
        if (moveBody.includes('sound: 1')) flags.push('sound');
        return flags;
    };

    const name = getName();
    if (name) {
        MOVE_DATA[name] = {
            bp: getBP(),
            type: getType(),
            cat: getCat(),
            priority: getPriority(),
            acc: getAcc(),
            flags: getFlags()
        };
    }
}

fs.writeFileSync('move_data_new.json', JSON.stringify(MOVE_DATA, null, 4));
console.log('Processed ' + Object.keys(MOVE_DATA).length + ' moves.');
