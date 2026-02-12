/**
 * move_data.js — Competitive move database
 *
 * Key moves with base power, type, category, priority, accuracy,
 * and flags for the prediction engine.
 *
 * Flags: contact, recovery, hazard, pivot, setup, priority, status, weather, terrain
 */

const MOVE_DATA = {
    // ─── Physical Attacking Moves ───
    "Earthquake": { bp: 100, type: "Ground", cat: "Physical", priority: 0, acc: 100, flags: [] },
    "Close Combat": { bp: 120, type: "Fighting", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Lowers user Def/SpD" },
    "Knock Off": { bp: 65, type: "Dark", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Removes item (97.5 BP if holding)" },
    "U-turn": { bp: 70, type: "Bug", cat: "Physical", priority: 0, acc: 100, flags: ["contact", "pivot"] },
    "Flip Turn": { bp: 60, type: "Water", cat: "Physical", priority: 0, acc: 100, flags: ["contact", "pivot"] },
    "Stone Edge": { bp: 100, type: "Rock", cat: "Physical", priority: 0, acc: 80, flags: ["contact"], effect: "High crit" },
    "Iron Head": { bp: 80, type: "Steel", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "30% flinch" },
    "Dragon Claw": { bp: 80, type: "Dragon", cat: "Physical", priority: 0, acc: 100, flags: ["contact"] },
    "Outrage": { bp: 120, type: "Dragon", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Locks 2-3 turns, confuses" },
    "Play Rough": { bp: 90, type: "Fairy", cat: "Physical", priority: 0, acc: 90, flags: ["contact"], effect: "10% lower Atk" },
    "Crunch": { bp: 80, type: "Dark", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "20% lower Def" },
    "Brave Bird": { bp: 120, type: "Flying", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "33% recoil" },
    "Flare Blitz": { bp: 120, type: "Fire", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "33% recoil, 10% burn" },
    "Waterfall": { bp: 80, type: "Water", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "20% flinch" },
    "Liquidation": { bp: 85, type: "Water", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "20% lower Def" },
    "Power Whip": { bp: 120, type: "Grass", cat: "Physical", priority: 0, acc: 85, flags: ["contact"] },
    "Ice Spinner": { bp: 80, type: "Ice", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Removes terrain" },
    "Triple Axel": { bp: 40, type: "Ice", cat: "Physical", priority: 0, acc: 90, flags: ["contact"], effect: "Hits 3 times, escalating" },
    "Wicked Blow": { bp: 75, type: "Dark", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Always crit" },
    "Surging Strikes": { bp: 25, type: "Water", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Hits 3x, always crits" },
    "Kowtow Cleave": { bp: 85, type: "Dark", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Never misses" },
    "Dragon Darts": { bp: 50, type: "Dragon", cat: "Physical", priority: 0, acc: 100, flags: [], effect: "Hits twice" },
    "Fire Punch": { bp: 75, type: "Fire", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "10% burn" },
    "Ice Punch": { bp: 75, type: "Ice", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "10% freeze" },
    "Thunder Punch": { bp: 75, type: "Electric", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "10% paralyze" },
    "Drain Punch": { bp: 75, type: "Fighting", cat: "Physical", priority: 0, acc: 100, flags: ["contact", "recovery"] },
    "Superpower": { bp: 120, type: "Fighting", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Lowers Atk/Def" },
    "Low Kick": { bp: 0, type: "Fighting", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Weight-based" },
    "Body Press": { bp: 80, type: "Fighting", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Uses Def for damage" },
    "Sacred Sword": { bp: 90, type: "Fighting", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Ignores stat changes" },
    "Facade": { bp: 70, type: "Normal", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "140 BP if statused" },
    "Headlong Rush": { bp: 120, type: "Ground", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Lowers Def/SpD" },
    "Rage Fist": { bp: 50, type: "Ghost", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "+50 BP per hit taken" },
    "Bitter Blade": { bp: 90, type: "Fire", cat: "Physical", priority: 0, acc: 100, flags: ["contact", "recovery"], effect: "Heals 50% of damage" },
    "Shadow Claw": { bp: 70, type: "Ghost", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "High crit" },
    "Phantom Force": { bp: 90, type: "Ghost", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Two-turn move" },
    "Grassy Glide": { bp: 55, type: "Grass", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "+1 priority in Grassy Terrain" },
    "Wood Hammer": { bp: 120, type: "Grass", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "33% recoil" },
    "Horn Leech": { bp: 75, type: "Grass", cat: "Physical", priority: 0, acc: 100, flags: ["contact", "recovery"] },
    "Flower Trick": { bp: 70, type: "Grass", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Always crits, never misses" },
    "Pyro Ball": { bp: 120, type: "Fire", cat: "Physical", priority: 0, acc: 90, flags: [], effect: "10% burn" },
    "High Jump Kick": { bp: 130, type: "Fighting", cat: "Physical", priority: 0, acc: 90, flags: ["contact"], effect: "Crash damage on miss" },
    "Aqua Step": { bp: 80, type: "Water", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "+1 Speed" },
    "Ivy Cudgel": { bp: 100, type: "Grass", cat: "Physical", priority: 0, acc: 100, flags: [], effect: "Type changes with form" },
    "Gigaton Hammer": { bp: 160, type: "Steel", cat: "Physical", priority: 0, acc: 100, flags: [], effect: "Can't be used consecutively" },
    "Wave Crash": { bp: 120, type: "Water", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "33% recoil" },
    "Ceaseless Edge": { bp: 65, type: "Dark", cat: "Physical", priority: 0, acc: 90, flags: ["contact"], effect: "Sets Spikes" },
    "Salt Cure": { bp: 40, type: "Rock", cat: "Physical", priority: 0, acc: 100, flags: [], effect: "Traps, 1/8 HP per turn" },
    "Dual Wingbeat": { bp: 40, type: "Flying", cat: "Physical", priority: 0, acc: 90, flags: ["contact"], effect: "Hits twice" },
    "Acrobatics": { bp: 55, type: "Flying", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "110 BP without item" },
    "Razor Shell": { bp: 75, type: "Water", cat: "Physical", priority: 0, acc: 95, flags: ["contact"], effect: "50% lower Def" },
    "Psychic Fangs": { bp: 85, type: "Psychic", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Breaks screens" },
    "Bounce": { bp: 85, type: "Flying", cat: "Physical", priority: 0, acc: 85, flags: ["contact"], effect: "Two-turn, 30% paralyze" },

    // ─── Special Attacking Moves ───
    "Shadow Ball": { bp: 80, type: "Ghost", cat: "Special", priority: 0, acc: 100, flags: [], effect: "20% lower SpD" },
    "Draco Meteor": { bp: 130, type: "Dragon", cat: "Special", priority: 0, acc: 90, flags: [], effect: "Lowers user SpA -2" },
    "Moonblast": { bp: 95, type: "Fairy", cat: "Special", priority: 0, acc: 100, flags: [], effect: "30% lower SpA" },
    "Flamethrower": { bp: 90, type: "Fire", cat: "Special", priority: 0, acc: 100, flags: [], effect: "10% burn" },
    "Overheat": { bp: 130, type: "Fire", cat: "Special", priority: 0, acc: 90, flags: [], effect: "Lowers user SpA -2" },
    "Thunderbolt": { bp: 90, type: "Electric", cat: "Special", priority: 0, acc: 100, flags: [], effect: "10% paralyze" },
    "Volt Switch": { bp: 70, type: "Electric", cat: "Special", priority: 0, acc: 100, flags: ["pivot"] },
    "Ice Beam": { bp: 90, type: "Ice", cat: "Special", priority: 0, acc: 100, flags: [], effect: "10% freeze" },
    "Hydro Pump": { bp: 110, type: "Water", cat: "Special", priority: 0, acc: 80, flags: [] },
    "Scald": { bp: 80, type: "Water", cat: "Special", priority: 0, acc: 100, flags: [], effect: "30% burn" },
    "Focus Blast": { bp: 120, type: "Fighting", cat: "Special", priority: 0, acc: 70, flags: [] },
    "Psychic": { bp: 90, type: "Psychic", cat: "Special", priority: 0, acc: 100, flags: [], effect: "10% lower SpD" },
    "Psyshock": { bp: 80, type: "Psychic", cat: "Special", priority: 0, acc: 100, flags: [], effect: "Hits physical Def" },
    "Dark Pulse": { bp: 80, type: "Dark", cat: "Special", priority: 0, acc: 100, flags: [], effect: "20% flinch" },
    "Sludge Bomb": { bp: 90, type: "Poison", cat: "Special", priority: 0, acc: 100, flags: [], effect: "30% poison" },
    "Sludge Wave": { bp: 95, type: "Poison", cat: "Special", priority: 0, acc: 100, flags: [], effect: "10% poison" },
    "Flash Cannon": { bp: 80, type: "Steel", cat: "Special", priority: 0, acc: 100, flags: [], effect: "10% lower SpD" },
    "Energy Ball": { bp: 90, type: "Grass", cat: "Special", priority: 0, acc: 100, flags: [], effect: "10% lower SpD" },
    "Giga Drain": { bp: 75, type: "Grass", cat: "Special", priority: 0, acc: 100, flags: ["recovery"], effect: "Heals 50% damage" },
    "Earth Power": { bp: 90, type: "Ground", cat: "Special", priority: 0, acc: 100, flags: [], effect: "10% lower SpD" },
    "Air Slash": { bp: 75, type: "Flying", cat: "Special", priority: 0, acc: 95, flags: [], effect: "30% flinch" },
    "Hurricane": { bp: 110, type: "Flying", cat: "Special", priority: 0, acc: 70, flags: [], effect: "30% confuse, perfect in rain" },
    "Make It Rain": { bp: 120, type: "Steel", cat: "Special", priority: 0, acc: 100, flags: [], effect: "Lowers user SpA -1" },
    "Bug Buzz": { bp: 90, type: "Bug", cat: "Special", priority: 0, acc: 100, flags: [], effect: "10% lower SpD" },
    "Magma Storm": { bp: 100, type: "Fire", cat: "Special", priority: 0, acc: 75, flags: [], effect: "Traps target" },
    "Fiery Dance": { bp: 80, type: "Fire", cat: "Special", priority: 0, acc: 100, flags: [], effect: "50% +1 SpA" },
    "Torch Song": { bp: 80, type: "Fire", cat: "Special", priority: 0, acc: 100, flags: [], effect: "+1 SpA" },
    "Freeze-Dry": { bp: 70, type: "Ice", cat: "Special", priority: 0, acc: 100, flags: [], effect: "Super effective on Water" },
    "Overdrive": { bp: 80, type: "Electric", cat: "Special", priority: 0, acc: 100, flags: ["sound"] },
    "Boomburst": { bp: 140, type: "Normal", cat: "Special", priority: 0, acc: 100, flags: ["sound"] },
    "Scorching Sands": { bp: 70, type: "Ground", cat: "Special", priority: 0, acc: 100, flags: [], effect: "30% burn" },
    "Future Sight": { bp: 120, type: "Psychic", cat: "Special", priority: 0, acc: 100, flags: [], effect: "Hits 2 turns later" },
    "Ruination": { bp: 0, type: "Dark", cat: "Special", priority: 0, acc: 90, flags: [], effect: "Halves HP" },
    "Mystical Fire": { bp: 75, type: "Fire", cat: "Special", priority: 0, acc: 100, flags: [], effect: "-1 SpA" },
    "Hex": { bp: 65, type: "Ghost", cat: "Special", priority: 0, acc: 100, flags: [], effect: "130 BP if statused" },

    // ─── Priority Moves ───
    "Bullet Punch": { bp: 40, type: "Steel", cat: "Physical", priority: 1, acc: 100, flags: ["contact", "priority"] },
    "Mach Punch": { bp: 40, type: "Fighting", cat: "Physical", priority: 1, acc: 100, flags: ["contact", "priority"] },
    "Aqua Jet": { bp: 40, type: "Water", cat: "Physical", priority: 1, acc: 100, flags: ["contact", "priority"] },
    "Ice Shard": { bp: 40, type: "Ice", cat: "Physical", priority: 1, acc: 100, flags: ["contact", "priority"] },
    "Shadow Sneak": { bp: 40, type: "Ghost", cat: "Physical", priority: 1, acc: 100, flags: ["contact", "priority"] },
    "Sucker Punch": { bp: 70, type: "Dark", cat: "Physical", priority: 1, acc: 100, flags: ["contact", "priority"], effect: "Fails if foe doesn't attack" },
    "Extreme Speed": { bp: 80, type: "Normal", cat: "Physical", priority: 2, acc: 100, flags: ["contact", "priority"] },

    // ─── Status Moves ───
    "Swords Dance": { bp: 0, type: "Normal", cat: "Status", priority: 0, acc: 100, flags: ["setup"], effect: "+2 Atk" },
    "Dragon Dance": { bp: 0, type: "Dragon", cat: "Status", priority: 0, acc: 100, flags: ["setup"], effect: "+1 Atk, +1 Spe" },
    "Nasty Plot": { bp: 0, type: "Dark", cat: "Status", priority: 0, acc: 100, flags: ["setup"], effect: "+2 SpA" },
    "Calm Mind": { bp: 0, type: "Psychic", cat: "Status", priority: 0, acc: 100, flags: ["setup"], effect: "+1 SpA, +1 SpD" },
    "Quiver Dance": { bp: 0, type: "Bug", cat: "Status", priority: 0, acc: 100, flags: ["setup"], effect: "+1 SpA, +1 SpD, +1 Spe" },
    "Iron Defense": { bp: 0, type: "Steel", cat: "Status", priority: 0, acc: 100, flags: ["setup"], effect: "+2 Def" },
    "Bulk Up": { bp: 0, type: "Fighting", cat: "Status", priority: 0, acc: 100, flags: ["setup"], effect: "+1 Atk, +1 Def" },
    "Curse": { bp: 0, type: "Ghost", cat: "Status", priority: 0, acc: 100, flags: ["setup"], effect: "+1 Atk, +1 Def, -1 Spe" },
    "Belly Drum": { bp: 0, type: "Normal", cat: "Status", priority: 0, acc: 100, flags: ["setup"], effect: "Max Atk, halves HP" },
    "Howl": { bp: 0, type: "Normal", cat: "Status", priority: 0, acc: 100, flags: ["setup"], effect: "+1 Atk" },

    "Recover": { bp: 0, type: "Normal", cat: "Status", priority: 0, acc: 100, flags: ["recovery"], effect: "Heals 50% HP" },
    "Roost": { bp: 0, type: "Flying", cat: "Status", priority: 0, acc: 100, flags: ["recovery"], effect: "Heals 50% HP, loses Flying" },
    "Soft-Boiled": { bp: 0, type: "Normal", cat: "Status", priority: 0, acc: 100, flags: ["recovery"], effect: "Heals 50% HP" },
    "Slack Off": { bp: 0, type: "Normal", cat: "Status", priority: 0, acc: 100, flags: ["recovery"], effect: "Heals 50% HP" },
    "Rest": { bp: 0, type: "Psychic", cat: "Status", priority: 0, acc: 100, flags: ["recovery"], effect: "Full heal, sleep 2 turns" },
    "Wish": { bp: 0, type: "Normal", cat: "Status", priority: 0, acc: 100, flags: ["recovery"], effect: "Heals next turn" },
    "Pain Split": { bp: 0, type: "Normal", cat: "Status", priority: 0, acc: 100, flags: ["recovery"], effect: "Averages HP" },

    "Stealth Rock": { bp: 0, type: "Rock", cat: "Status", priority: 0, acc: 100, flags: ["hazard"], effect: "Entry hazard" },
    "Spikes": { bp: 0, type: "Ground", cat: "Status", priority: 0, acc: 100, flags: ["hazard"], effect: "Entry hazard (layers)" },
    "Toxic Spikes": { bp: 0, type: "Poison", cat: "Status", priority: 0, acc: 100, flags: ["hazard"], effect: "Poison entry hazard" },

    "Rapid Spin": { bp: 50, type: "Normal", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Removes hazards, +1 Spe" },
    "Defog": { bp: 0, type: "Flying", cat: "Status", priority: 0, acc: 100, flags: [], effect: "Removes hazards + screens" },

    "Toxic": { bp: 0, type: "Poison", cat: "Status", priority: 0, acc: 90, flags: ["status"], effect: "Badly poisons" },
    "Will-O-Wisp": { bp: 0, type: "Fire", cat: "Status", priority: 0, acc: 85, flags: ["status"], effect: "Burns target" },
    "Thunder Wave": { bp: 0, type: "Electric", cat: "Status", priority: 0, acc: 90, flags: ["status"], effect: "Paralyzes target" },
    "Spore": { bp: 0, type: "Grass", cat: "Status", priority: 0, acc: 100, flags: ["status"], effect: "Puts to sleep" },
    "Dark Void": { bp: 0, type: "Dark", cat: "Status", priority: 0, acc: 50, flags: ["status"], effect: "Puts to sleep (Darkrai only)" },

    "Taunt": { bp: 0, type: "Dark", cat: "Status", priority: 0, acc: 100, flags: [], effect: "Blocks status moves 3 turns" },
    "Encore": { bp: 0, type: "Normal", cat: "Status", priority: 0, acc: 100, flags: [], effect: "Locks move 3 turns" },
    "Protect": { bp: 0, type: "Normal", cat: "Status", priority: 4, acc: 100, flags: ["priority"], effect: "Blocks moves this turn" },
    "Haze": { bp: 0, type: "Ice", cat: "Status", priority: 0, acc: 100, flags: [], effect: "Resets all stat changes" },
    "Clear Smog": { bp: 50, type: "Poison", cat: "Special", priority: 0, acc: 100, flags: [], effect: "Resets target stat changes" },
    "Whirlwind": { bp: 0, type: "Normal", cat: "Status", priority: -6, acc: 100, flags: [], effect: "Forces switch" },
    "Leech Seed": { bp: 0, type: "Grass", cat: "Status", priority: 0, acc: 90, flags: [], effect: "Drains 1/8 HP per turn" },
    "Teleport": { bp: 0, type: "Psychic", cat: "Status", priority: -6, acc: 100, flags: ["pivot"], effect: "Switches out (last)" },
    "Trick": { bp: 0, type: "Psychic", cat: "Status", priority: 0, acc: 100, flags: [], effect: "Swaps items" },
    "Seismic Toss": { bp: 0, type: "Fighting", cat: "Physical", priority: 0, acc: 100, flags: ["contact"], effect: "Deals damage = level" },
    "Transform": { bp: 0, type: "Normal", cat: "Status", priority: 0, acc: 100, flags: [], effect: "Copies target" },
    "Meteor Beam": { bp: 120, type: "Rock", cat: "Special", priority: 0, acc: 90, flags: ["setup"], effect: "Charges turn 1, +1 SpA" },
    "Leech Life": { bp: 80, type: "Bug", cat: "Physical", priority: 0, acc: 100, flags: ["contact", "recovery"], effect: "Heals 50% damage" },
    "Leaf Storm": { bp: 130, type: "Grass", cat: "Special", priority: 0, acc: 90, flags: [], effect: "Lowers user SpA -2" },
    "Gunk Shot": { bp: 120, type: "Poison", cat: "Physical", priority: 0, acc: 80, flags: [], effect: "30% poison" },
    "Tera Blast": { bp: 80, type: "Normal", cat: "Special", priority: 0, acc: 100, flags: [], effect: "Changes type to Tera Type" },
    "Substitute": { bp: 0, type: "Normal", cat: "Status", priority: 0, acc: 100, flags: ["setup"], effect: "Create substitute using 25% HP" },

    // ─── Added Common Moves ───
    "Fire Blast": { bp: 110, type: "Fire", cat: "Special", priority: 0, acc: 85, flags: [], effect: "10% burn" },
    "Hurricane": { bp: 110, type: "Flying", cat: "Special", priority: 0, acc: 70, flags: [], effect: "30% confuse, perfect in rain" },
    "Focus Blast": { bp: 120, type: "Fighting", cat: "Special", priority: 0, acc: 70, flags: [], effect: "10% lower SpD" },
    "Blizzard": { bp: 110, type: "Ice", cat: "Special", priority: 0, acc: 70, flags: [], effect: "10% freeze, perfect in hail/snow" },
    "Thunder": { bp: 110, type: "Electric", cat: "Special", priority: 0, acc: 70, flags: [], effect: "30% paralyze, perfect in rain" },
    "Hydro Pump": { bp: 110, type: "Water", cat: "Special", priority: 0, acc: 80, flags: [] },

    "Morning Sun": { bp: 0, type: "Normal", cat: "Status", priority: 0, acc: 100, flags: ["recovery"], effect: "Heals based on weather" },
    "Synthesis": { bp: 0, type: "Grass", cat: "Status", priority: 0, acc: 100, flags: ["recovery"], effect: "Heals based on weather" },
    "Moonlight": { bp: 0, type: "Fairy", cat: "Status", priority: 0, acc: 100, flags: ["recovery"], effect: "Heals based on weather" },
    "Shore Up": { bp: 0, type: "Ground", cat: "Status", priority: 0, acc: 100, flags: ["recovery"], effect: "Heals more in sand" },
    "Strength Sap": { bp: 0, type: "Grass", cat: "Status", priority: 0, acc: 100, flags: ["recovery"], effect: "Heals = target Atk, lowers Atk" },

    "Reflect": { bp: 0, type: "Psychic", cat: "Status", priority: 0, acc: 100, flags: ["setup"], effect: "Halves physical damage 5 turns" },
    "Light Screen": { bp: 0, type: "Psychic", cat: "Status", priority: 0, acc: 100, flags: ["setup"], effect: "Halves special damage 5 turns" },
    "Aurora Veil": { bp: 0, type: "Ice", cat: "Status", priority: 0, acc: 100, flags: ["setup"], effect: "Halves all damage 5 turns (Hail/Snow only)" }
};

/**
 * Lookup a move by name (case-insensitive, fuzzy)
 */
function lookupMove(name) {
    if (!name) return null;
    const cleaned = name.trim();
    if (MOVE_DATA[cleaned]) return { name: cleaned, ...MOVE_DATA[cleaned] };

    const lower = cleaned.toLowerCase();
    for (const key of Object.keys(MOVE_DATA)) {
        if (key.toLowerCase() === lower) return { name: key, ...MOVE_DATA[key] };
    }

    // Return a dummy object if not found
    return {
        name: cleaned,
        bp: 0,
        type: 'Normal',
        cat: 'Status',
        priority: 0,
        acc: 100,
        flags: [],
        isUnknown: true
    };
}

/**
 * Check if a move is a pivot move (U-turn, Volt Switch, etc.)
 */
function isPivotMove(moveName) {
    const move = lookupMove(moveName);
    return move && move.flags && move.flags.includes('pivot');
}

/**
 * Check if a move is a recovery move
 */
function isRecoveryMove(moveName) {
    const move = lookupMove(moveName);
    return move && move.flags && move.flags.includes('recovery');
}

/**
 * Check if a move is a setup move
 */
function isSetupMove(moveName) {
    const move = lookupMove(moveName);
    return move && move.flags && move.flags.includes('setup');
}

/**
 * Check if a move is a hazard
 */
function isHazardMove(moveName) {
    const move = lookupMove(moveName);
    return move && move.flags && move.flags.includes('hazard');
}

/**
 * Check if a move has priority
 */
function isPriorityMove(moveName) {
    const move = lookupMove(moveName);
    return move && move.priority > 0;
}
