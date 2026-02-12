/**
 * pokemon_data.js — Competitive Pokémon database
 *
 * Top ~100 OU / common competitive Pokémon with base stats,
 * types, common abilities, items, and typical movesets.
 * Assumes 252/252 spreads and standard competitive usage.
 */

const POKEMON_DATA = {
    // ─── OU Staples ───
    "Dragapult": {
        types: ["Dragon", "Ghost"], baseStats: { hp: 88, atk: 120, def: 75, spa: 100, spd: 75, spe: 142 },
        abilities: ["Clear Body", "Infiltrator", "Cursed Body"],
        commonSets: [
            { item: "Choice Specs", moves: ["Shadow Ball", "Draco Meteor", "Flamethrower", "U-turn"], nature: "Timid", evs: { spa: 252, spe: 252 } },
            { item: "Choice Band", moves: ["Dragon Darts", "Phantom Force", "U-turn", "Sucker Punch"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Gholdengo": {
        types: ["Steel", "Ghost"], baseStats: { hp: 87, atk: 60, def: 95, spa: 133, spd: 91, spe: 84 },
        abilities: ["Good as Gold"],
        commonSets: [
            { item: "Air Balloon", moves: ["Make It Rain", "Shadow Ball", "Nasty Plot", "Recover"], nature: "Timid", evs: { spa: 252, spe: 252 } },
            { item: "Choice Scarf", moves: ["Make It Rain", "Shadow Ball", "Trick", "Thunderbolt"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Great Tusk": {
        types: ["Ground", "Fighting"], baseStats: { hp: 115, atk: 131, def: 131, spa: 53, spd: 53, spe: 87 },
        abilities: ["Protosynthesis"],
        commonSets: [
            { item: "Booster Energy", moves: ["Headlong Rush", "Close Combat", "Ice Spinner", "Rapid Spin"], nature: "Jolly", evs: { atk: 252, spe: 252 } },
            { item: "Leftovers", moves: ["Stealth Rock", "Earthquake", "Rapid Spin", "Ice Spinner"], nature: "Impish", evs: { hp: 252, def: 252 } }
        ]
    },
    "Iron Valiant": {
        types: ["Fairy", "Fighting"], baseStats: { hp: 74, atk: 130, def: 90, spa: 120, spd: 60, spe: 116 },
        abilities: ["Quark Drive"],
        commonSets: [
            { item: "Booster Energy", moves: ["Moonblast", "Close Combat", "Knock Off", "Swords Dance"], nature: "Naive", evs: { atk: 252, spe: 252 } },
            { item: "Choice Specs", moves: ["Moonblast", "Focus Blast", "Thunderbolt", "Psyshock"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Kingambit": {
        types: ["Dark", "Steel"], baseStats: { hp: 100, atk: 135, def: 120, spa: 60, spd: 85, spe: 50 },
        abilities: ["Supreme Overlord", "Defiant"],
        commonSets: [
            { item: "Leftovers", moves: ["Kowtow Cleave", "Iron Head", "Sucker Punch", "Swords Dance"], nature: "Adamant", evs: { hp: 252, atk: 252 } },
            { item: "Black Glasses", moves: ["Kowtow Cleave", "Sucker Punch", "Iron Head", "Low Kick"], nature: "Adamant", evs: { atk: 252, hp: 252 } }
        ]
    },
    "Darkrai": {
        types: ["Dark"], baseStats: { hp: 70, atk: 90, def: 90, spa: 135, spd: 90, spe: 125 },
        abilities: ["Bad Dreams"],
        commonSets: [
            { item: "Focus Sash", moves: ["Dark Void", "Dark Pulse", "Nasty Plot", "Sludge Bomb"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Landorus-Therian": {
        types: ["Ground", "Flying"], baseStats: { hp: 89, atk: 145, def: 90, spa: 105, spd: 80, spe: 91 },
        abilities: ["Intimidate"],
        commonSets: [
            { item: "Rocky Helmet", moves: ["Earthquake", "U-turn", "Stealth Rock", "Toxic"], nature: "Impish", evs: { hp: 252, def: 252 } },
            { item: "Choice Scarf", moves: ["Earthquake", "U-turn", "Stone Edge", "Superpower"], nature: "Jolly", evs: { atk: 252, spe: 252 } },
            { item: "Leftovers", moves: ["Earthquake", "U-turn", "Stealth Rock", "Knock Off"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Heatran": {
        types: ["Fire", "Steel"], baseStats: { hp: 91, atk: 90, def: 106, spa: 130, spd: 106, spe: 77 },
        abilities: ["Flash Fire", "Flame Body"],
        commonSets: [
            { item: "Leftovers", moves: ["Magma Storm", "Earth Power", "Stealth Rock", "Toxic"], nature: "Calm", evs: { hp: 252, spd: 252 } },
            { item: "Choice Specs", moves: ["Magma Storm", "Flash Cannon", "Earth Power", "Flamethrower"], nature: "Modest", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Toxapex": {
        types: ["Poison", "Water"], baseStats: { hp: 50, atk: 63, def: 152, spa: 53, spd: 142, spe: 35 },
        abilities: ["Regenerator", "Merciless"],
        commonSets: [
            { item: "Rocky Helmet", moves: ["Scald", "Recover", "Toxic Spikes", "Haze"], nature: "Bold", evs: { hp: 252, def: 252 } }
        ]
    },
    "Clefable": {
        types: ["Fairy"], baseStats: { hp: 95, atk: 70, def: 73, spa: 95, spd: 90, spe: 60 },
        abilities: ["Magic Guard", "Unaware"],
        commonSets: [
            { item: "Leftovers", moves: ["Moonblast", "Soft-Boiled", "Calm Mind", "Flamethrower"], nature: "Bold", evs: { hp: 252, def: 252 } },
            { item: "Life Orb", moves: ["Moonblast", "Focus Blast", "Thunderbolt", "Soft-Boiled"], nature: "Modest", evs: { hp: 252, spa: 252 } }
        ]
    },
    "Garchomp": {
        types: ["Dragon", "Ground"], baseStats: { hp: 108, atk: 130, def: 95, spa: 80, spd: 85, spe: 102 },
        abilities: ["Rough Skin", "Sand Veil"],
        commonSets: [
            { item: "Rocky Helmet", moves: ["Earthquake", "Dragon Claw", "Stealth Rock", "Toxic"], nature: "Jolly", evs: { hp: 252, spe: 252 } },
            { item: "Choice Scarf", moves: ["Earthquake", "Outrage", "Stone Edge", "Fire Fang"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Ferrothorn": {
        types: ["Grass", "Steel"], baseStats: { hp: 74, atk: 94, def: 131, spa: 54, spd: 116, spe: 20 },
        abilities: ["Iron Barbs"],
        commonSets: [
            { item: "Leftovers", moves: ["Stealth Rock", "Leech Seed", "Power Whip", "Knock Off"], nature: "Relaxed", evs: { hp: 252, def: 252 } },
            { item: "Rocky Helmet", moves: ["Spikes", "Leech Seed", "Power Whip", "Protect"], nature: "Impish", evs: { hp: 252, def: 252 } }
        ]
    },
    "Corviknight": {
        types: ["Flying", "Steel"], baseStats: { hp: 98, atk: 87, def: 105, spa: 53, spd: 85, spe: 67 },
        abilities: ["Pressure", "Mirror Armor"],
        commonSets: [
            { item: "Leftovers", moves: ["Roost", "Defog", "Brave Bird", "U-turn"], nature: "Impish", evs: { hp: 252, def: 252 } },
            { item: "Rocky Helmet", moves: ["Roost", "Body Press", "Iron Defense", "Brave Bird"], nature: "Impish", evs: { hp: 252, def: 252 } }
        ]
    },
    "Rotom-Wash": {
        types: ["Electric", "Water"], baseStats: { hp: 50, atk: 65, def: 107, spa: 105, spd: 107, spe: 86 },
        abilities: ["Levitate"],
        commonSets: [
            { item: "Leftovers", moves: ["Volt Switch", "Hydro Pump", "Will-O-Wisp", "Pain Split"], nature: "Bold", evs: { hp: 252, def: 252 } }
        ]
    },
    "Weavile": {
        types: ["Dark", "Ice"], baseStats: { hp: 70, atk: 120, def: 65, spa: 45, spd: 85, spe: 125 },
        abilities: ["Pressure", "Pickpocket"],
        commonSets: [
            { item: "Choice Band", moves: ["Triple Axel", "Knock Off", "Ice Shard", "Low Kick"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Dragonite": {
        types: ["Dragon", "Flying"], baseStats: { hp: 91, atk: 134, def: 95, spa: 100, spd: 100, spe: 80 },
        abilities: ["Multiscale", "Inner Focus"],
        commonSets: [
            { item: "Heavy-Duty Boots", moves: ["Dragon Dance", "Dual Wingbeat", "Earthquake", "Roost"], nature: "Adamant", evs: { atk: 252, spe: 252 } },
            { item: "Choice Band", moves: ["Outrage", "Extreme Speed", "Earthquake", "Fire Punch"], nature: "Adamant", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Volcarona": {
        types: ["Bug", "Fire"], baseStats: { hp: 85, atk: 60, def: 65, spa: 135, spd: 105, spe: 100 },
        abilities: ["Flame Body", "Swarm"],
        commonSets: [
            { item: "Heavy-Duty Boots", moves: ["Quiver Dance", "Flamethrower", "Bug Buzz", "Giga Drain"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Tyranitar": {
        types: ["Rock", "Dark"], baseStats: { hp: 100, atk: 134, def: 110, spa: 95, spd: 100, spe: 61 },
        abilities: ["Sand Stream", "Unnerve"],
        commonSets: [
            { item: "Leftovers", moves: ["Stealth Rock", "Stone Edge", "Crunch", "Ice Punch"], nature: "Careful", evs: { hp: 252, spd: 252 } },
            { item: "Choice Band", moves: ["Stone Edge", "Crunch", "Earthquake", "Ice Punch"], nature: "Adamant", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Skeledirge": {
        types: ["Fire", "Ghost"], baseStats: { hp: 104, atk: 75, def: 100, spa: 110, spd: 75, spe: 66 },
        abilities: ["Unaware", "Blaze"],
        commonSets: [
            { item: "Heavy-Duty Boots", moves: ["Torch Song", "Hex", "Will-O-Wisp", "Slack Off"], nature: "Bold", evs: { hp: 252, def: 252 } }
        ]
    },
    "Cinderace": {
        types: ["Fire"], baseStats: { hp: 80, atk: 116, def: 75, spa: 65, spd: 75, spe: 119 },
        abilities: ["Libero", "Blaze"],
        commonSets: [
            { item: "Heavy-Duty Boots", moves: ["Pyro Ball", "High Jump Kick", "U-turn", "Sucker Punch"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Iron Moth": {
        types: ["Fire", "Poison"], baseStats: { hp: 80, atk: 70, def: 60, spa: 140, spd: 110, spe: 110 },
        abilities: ["Quark Drive"],
        commonSets: [
            { item: "Booster Energy", moves: ["Fiery Dance", "Sludge Wave", "Energy Ball", "Psychic"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Iron Treads": {
        types: ["Ground", "Steel"], baseStats: { hp: 90, atk: 112, def: 120, spa: 72, spd: 70, spe: 106 },
        abilities: ["Quark Drive"],
        commonSets: [
            { item: "Booster Energy", moves: ["Earthquake", "Iron Head", "Rapid Spin", "Stealth Rock"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Meowscarada": {
        types: ["Grass", "Dark"], baseStats: { hp: 76, atk: 110, def: 70, spa: 81, spd: 70, spe: 123 },
        abilities: ["Overgrow", "Protean"],
        commonSets: [
            { item: "Choice Band", moves: ["Flower Trick", "Knock Off", "U-turn", "Triple Axel"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Zamazenta": {
        types: ["Fighting"], baseStats: { hp: 92, atk: 130, def: 115, spa: 80, spd: 115, spe: 138 },
        abilities: ["Dauntless Shield"],
        commonSets: [
            { item: "Leftovers", moves: ["Close Combat", "Crunch", "Psychic Fangs", "Howl"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Rillaboom": {
        types: ["Grass"], baseStats: { hp: 100, atk: 125, def: 90, spa: 60, spd: 70, spe: 85 },
        abilities: ["Grassy Surge", "Overgrow"],
        commonSets: [
            { item: "Choice Band", moves: ["Grassy Glide", "Wood Hammer", "Knock Off", "U-turn"], nature: "Adamant", evs: { atk: 252, spe: 252 } },
            { item: "Leftovers", moves: ["Grassy Glide", "Knock Off", "Swords Dance", "Drain Punch"], nature: "Adamant", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Slowking-Galar": {
        types: ["Poison", "Psychic"], baseStats: { hp: 95, atk: 65, def: 80, spa: 110, spd: 110, spe: 30 },
        abilities: ["Regenerator", "Curious Medicine"],
        commonSets: [
            { item: "Assault Vest", moves: ["Future Sight", "Sludge Bomb", "Flamethrower", "Scald"], nature: "Quiet", evs: { hp: 252, spa: 252 } }
        ]
    },
    "Tapu Lele": {
        types: ["Psychic", "Fairy"], baseStats: { hp: 70, atk: 85, def: 75, spa: 130, spd: 115, spe: 95 },
        abilities: ["Psychic Surge"],
        commonSets: [
            { item: "Choice Scarf", moves: ["Psychic", "Moonblast", "Focus Blast", "Psyshock"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Tapu Koko": {
        types: ["Electric", "Fairy"], baseStats: { hp: 70, atk: 115, def: 85, spa: 95, spd: 75, spe: 130 },
        abilities: ["Electric Surge"],
        commonSets: [
            { item: "Heavy-Duty Boots", moves: ["Thunderbolt", "Dazzling Gleam", "U-turn", "Roost"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Blissey": {
        types: ["Normal"], baseStats: { hp: 255, atk: 10, def: 10, spa: 75, spd: 135, spe: 55 },
        abilities: ["Natural Cure", "Serene Grace"],
        commonSets: [
            { item: "Heavy-Duty Boots", moves: ["Soft-Boiled", "Seismic Toss", "Stealth Rock", "Toxic"], nature: "Bold", evs: { hp: 252, def: 252 } }
        ]
    },
    "Chansey": {
        types: ["Normal"], baseStats: { hp: 250, atk: 5, def: 5, spa: 35, spd: 105, spe: 50 },
        abilities: ["Natural Cure", "Serene Grace"],
        commonSets: [
            { item: "Eviolite", moves: ["Soft-Boiled", "Seismic Toss", "Stealth Rock", "Thunder Wave"], nature: "Bold", evs: { hp: 252, def: 252 } }
        ]
    },
    "Gliscor": {
        types: ["Ground", "Flying"], baseStats: { hp: 75, atk: 95, def: 125, spa: 45, spd: 75, spe: 95 },
        abilities: ["Poison Heal", "Hyper Cutter"],
        commonSets: [
            { item: "Toxic Orb", moves: ["Earthquake", "Facade", "Swords Dance", "Roost"], nature: "Jolly", evs: { hp: 252, spe: 252 } }
        ]
    },
    "Scizor": {
        types: ["Bug", "Steel"], baseStats: { hp: 70, atk: 130, def: 100, spa: 55, spd: 80, spe: 65 },
        abilities: ["Technician", "Light Metal"],
        commonSets: [
            { item: "Choice Band", moves: ["Bullet Punch", "U-turn", "Close Combat", "Knock Off"], nature: "Adamant", evs: { hp: 252, atk: 252 } },
            { item: "Leftovers", moves: ["Bullet Punch", "U-turn", "Swords Dance", "Roost"], nature: "Adamant", evs: { hp: 252, atk: 252 } }
        ]
    },
    "Magnezone": {
        types: ["Electric", "Steel"], baseStats: { hp: 70, atk: 70, def: 115, spa: 130, spd: 90, spe: 60 },
        abilities: ["Magnet Pull", "Sturdy", "Analytic"],
        commonSets: [
            { item: "Choice Specs", moves: ["Thunderbolt", "Flash Cannon", "Volt Switch", "Body Press"], nature: "Modest", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Pelipper": {
        types: ["Water", "Flying"], baseStats: { hp: 60, atk: 50, def: 100, spa: 95, spd: 70, spe: 65 },
        abilities: ["Drizzle", "Keen Eye"],
        commonSets: [
            { item: "Damp Rock", moves: ["Scald", "Hurricane", "U-turn", "Roost"], nature: "Bold", evs: { hp: 252, def: 252 } }
        ]
    },
    "Barraskewda": {
        types: ["Water"], baseStats: { hp: 61, atk: 123, def: 60, spa: 60, spd: 50, spe: 136 },
        abilities: ["Swift Swim", "Propeller Tail"],
        commonSets: [
            { item: "Choice Band", moves: ["Liquidation", "Flip Turn", "Close Combat", "Psychic Fangs"], nature: "Adamant", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Tornadus-Therian": {
        types: ["Flying"], baseStats: { hp: 79, atk: 100, def: 80, spa: 110, spd: 90, spe: 121 },
        abilities: ["Regenerator"],
        commonSets: [
            { item: "Heavy-Duty Boots", moves: ["Hurricane", "Knock Off", "U-turn", "Nasty Plot"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Urshifu-Rapid-Strike": {
        types: ["Fighting", "Water"], baseStats: { hp: 100, atk: 130, def: 100, spa: 63, spd: 60, spe: 97 },
        abilities: ["Unseen Fist"],
        commonSets: [
            { item: "Choice Band", moves: ["Surging Strikes", "Close Combat", "Aqua Jet", "U-turn"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Urshifu": {
        types: ["Fighting", "Dark"], baseStats: { hp: 100, atk: 130, def: 100, spa: 63, spd: 60, spe: 97 },
        abilities: ["Unseen Fist"],
        commonSets: [
            { item: "Choice Band", moves: ["Wicked Blow", "Close Combat", "Sucker Punch", "U-turn"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Annihilape": {
        types: ["Fighting", "Ghost"], baseStats: { hp: 110, atk: 115, def: 80, spa: 50, spd: 90, spe: 90 },
        abilities: ["Vital Spirit", "Defiant"],
        commonSets: [
            { item: "Leftovers", moves: ["Rage Fist", "Drain Punch", "Bulk Up", "Taunt"], nature: "Careful", evs: { hp: 252, spd: 252 } }
        ]
    },
    "Ceruledge": {
        types: ["Fire", "Ghost"], baseStats: { hp: 75, atk: 125, def: 80, spa: 60, spd: 100, spe: 85 },
        abilities: ["Flash Fire", "Weak Armor"],
        commonSets: [
            { item: "Heavy-Duty Boots", moves: ["Bitter Blade", "Shadow Claw", "Swords Dance", "Close Combat"], nature: "Adamant", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Chi-Yu": {
        types: ["Dark", "Fire"], baseStats: { hp: 55, atk: 80, def: 80, spa: 135, spd: 120, spe: 100 },
        abilities: ["Beads of Ruin"],
        commonSets: [
            { item: "Choice Specs", moves: ["Dark Pulse", "Overheat", "Flamethrower", "Psychic"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Ting-Lu": {
        types: ["Dark", "Ground"], baseStats: { hp: 155, atk: 110, def: 125, spa: 55, spd: 80, spe: 45 },
        abilities: ["Vessel of Ruin"],
        commonSets: [
            { item: "Leftovers", moves: ["Earthquake", "Stealth Rock", "Whirlwind", "Ruination"], nature: "Impish", evs: { hp: 252, def: 252 } }
        ]
    },
    "Chien-Pao": {
        types: ["Dark", "Ice"], baseStats: { hp: 80, atk: 120, def: 80, spa: 90, spd: 65, spe: 135 },
        abilities: ["Sword of Ruin"],
        commonSets: [
            { item: "Heavy-Duty Boots", moves: ["Ice Spinner", "Crunch", "Sacred Sword", "Sucker Punch"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Wo-Chien": {
        types: ["Dark", "Grass"], baseStats: { hp: 85, atk: 85, def: 100, spa: 95, spd: 135, spe: 70 },
        abilities: ["Tablets of Ruin"],
        commonSets: [
            { item: "Leftovers", moves: ["Giga Drain", "Dark Pulse", "Leech Seed", "Protect"], nature: "Calm", evs: { hp: 252, spd: 252 } }
        ]
    },
    "Quaquaval": {
        types: ["Water", "Fighting"], baseStats: { hp: 85, atk: 120, def: 80, spa: 85, spd: 75, spe: 85 },
        abilities: ["Moxie", "Torrent"],
        commonSets: [
            { item: "Life Orb", moves: ["Aqua Step", "Close Combat", "Swords Dance", "Ice Spinner"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Garganacl": {
        types: ["Rock"], baseStats: { hp: 100, atk: 100, def: 130, spa: 45, spd: 90, spe: 35 },
        abilities: ["Purifying Salt"],
        commonSets: [
            { item: "Leftovers", moves: ["Salt Cure", "Recover", "Stealth Rock", "Body Press"], nature: "Impish", evs: { hp: 252, def: 252 } }
        ]
    },
    "Tinkaton": {
        types: ["Fairy", "Steel"], baseStats: { hp: 85, atk: 75, def: 77, spa: 70, spd: 105, spe: 94 },
        abilities: ["Mold Breaker", "Own Tempo"],
        commonSets: [
            { item: "Leftovers", moves: ["Stealth Rock", "Knock Off", "Gigaton Hammer", "Encore"], nature: "Careful", evs: { hp: 252, spd: 252 } }
        ]
    },
    "Roaring Moon": {
        types: ["Dragon", "Dark"], baseStats: { hp: 105, atk: 139, def: 71, spa: 55, spd: 101, spe: 119 },
        abilities: ["Protosynthesis"],
        commonSets: [
            { item: "Booster Energy", moves: ["Dragon Dance", "Acrobatics", "Crunch", "Earthquake"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Flutter Mane": {
        types: ["Ghost", "Fairy"], baseStats: { hp: 55, atk: 55, def: 55, spa: 135, spd: 135, spe: 135 },
        abilities: ["Protosynthesis"],
        commonSets: [
            { item: "Choice Specs", moves: ["Shadow Ball", "Moonblast", "Mystical Fire", "Thunderbolt"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Iron Bundle": {
        types: ["Ice", "Water"], baseStats: { hp: 56, atk: 80, def: 114, spa: 124, spd: 60, spe: 136 },
        abilities: ["Quark Drive"],
        commonSets: [
            { item: "Heavy-Duty Boots", moves: ["Freeze-Dry", "Hydro Pump", "Flip Turn", "Ice Beam"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Samurott-Hisui": {
        types: ["Water", "Dark"], baseStats: { hp: 90, atk: 108, def: 80, spa: 100, spd: 65, spe: 85 },
        abilities: ["Sharpness"],
        commonSets: [
            { item: "Focus Sash", moves: ["Ceaseless Edge", "Razor Shell", "Aqua Jet", "Sacred Sword"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Blaziken": {
        types: ["Fire", "Fighting"], baseStats: { hp: 80, atk: 120, def: 70, spa: 110, spd: 70, spe: 80 },
        abilities: ["Speed Boost", "Blaze"],
        commonSets: [
            { item: "Life Orb", moves: ["Flare Blitz", "Close Combat", "Swords Dance", "Protect"], nature: "Adamant", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Greninja": {
        types: ["Water", "Dark"], baseStats: { hp: 72, atk: 95, def: 67, spa: 103, spd: 71, spe: 122 },
        abilities: ["Protean", "Battle Bond", "Torrent"],
        commonSets: [
            { item: "Choice Specs", moves: ["Hydro Pump", "Dark Pulse", "Ice Beam", "Spikes"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Excadrill": {
        types: ["Ground", "Steel"], baseStats: { hp: 110, atk: 135, def: 60, spa: 50, spd: 65, spe: 88 },
        abilities: ["Sand Rush", "Mold Breaker", "Sand Force"],
        commonSets: [
            { item: "Air Balloon", moves: ["Earthquake", "Iron Head", "Rapid Spin", "Swords Dance"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Amoonguss": {
        types: ["Grass", "Poison"], baseStats: { hp: 114, atk: 85, def: 70, spa: 85, spd: 80, spe: 30 },
        abilities: ["Regenerator", "Effect Spore"],
        commonSets: [
            { item: "Rocky Helmet", moves: ["Spore", "Giga Drain", "Sludge Bomb", "Clear Smog"], nature: "Bold", evs: { hp: 252, def: 252 } }
        ]
    },
    "Gengar": {
        types: ["Ghost", "Poison"], baseStats: { hp: 60, atk: 65, def: 60, spa: 130, spd: 75, spe: 110 },
        abilities: ["Cursed Body"],
        commonSets: [
            { item: "Choice Specs", moves: ["Shadow Ball", "Sludge Wave", "Focus Blast", "Trick"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Mimikyu": {
        types: ["Ghost", "Fairy"], baseStats: { hp: 55, atk: 90, def: 80, spa: 50, spd: 105, spe: 96 },
        abilities: ["Disguise"],
        commonSets: [
            { item: "Life Orb", moves: ["Play Rough", "Shadow Sneak", "Swords Dance", "Shadow Claw"], nature: "Adamant", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Gyarados": {
        types: ["Water", "Flying"], baseStats: { hp: 95, atk: 125, def: 79, spa: 60, spd: 100, spe: 81 },
        abilities: ["Intimidate", "Moxie"],
        commonSets: [
            { item: "Leftovers", moves: ["Dragon Dance", "Waterfall", "Bounce", "Earthquake"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Lucario": {
        types: ["Fighting", "Steel"], baseStats: { hp: 70, atk: 110, def: 70, spa: 115, spd: 70, spe: 90 },
        abilities: ["Inner Focus", "Justified"],
        commonSets: [
            { item: "Life Orb", moves: ["Swords Dance", "Close Combat", "Bullet Punch", "Extreme Speed"], nature: "Adamant", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Infernape": {
        types: ["Fire", "Fighting"], baseStats: { hp: 76, atk: 104, def: 71, spa: 104, spd: 71, spe: 108 },
        abilities: ["Iron Fist", "Blaze"],
        commonSets: [
            { item: "Life Orb", moves: ["Close Combat", "Flare Blitz", "U-turn", "Mach Punch"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Alakazam": {
        types: ["Psychic"], baseStats: { hp: 55, atk: 50, def: 45, spa: 135, spd: 95, spe: 120 },
        abilities: ["Magic Guard", "Inner Focus"],
        commonSets: [
            { item: "Focus Sash", moves: ["Psychic", "Focus Blast", "Shadow Ball", "Nasty Plot"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Azumarill": {
        types: ["Water", "Fairy"], baseStats: { hp: 100, atk: 50, def: 80, spa: 60, spd: 80, spe: 50 },
        abilities: ["Huge Power", "Thick Fat"],
        commonSets: [
            { item: "Sitrus Berry", moves: ["Belly Drum", "Aqua Jet", "Play Rough", "Knock Off"], nature: "Adamant", evs: { hp: 252, atk: 252 } }
        ]
    },
    "Bisharp": {
        types: ["Dark", "Steel"], baseStats: { hp: 65, atk: 125, def: 100, spa: 60, spd: 70, spe: 70 },
        abilities: ["Defiant", "Inner Focus"],
        commonSets: [
            { item: "Eviolite", moves: ["Swords Dance", "Knock Off", "Iron Head", "Sucker Punch"], nature: "Adamant", evs: { atk: 252, spe: 252 } }
        ]
    },
    "Swampert": {
        types: ["Water", "Ground"], baseStats: { hp: 100, atk: 110, def: 90, spa: 85, spd: 90, spe: 60 },
        abilities: ["Torrent", "Damp"],
        commonSets: [
            { item: "Leftovers", moves: ["Stealth Rock", "Earthquake", "Scald", "Flip Turn"], nature: "Relaxed", evs: { hp: 252, def: 252 } }
        ]
    },
    "Toxtricity": {
        types: ["Electric", "Poison"], baseStats: { hp: 75, atk: 98, def: 70, spa: 114, spd: 70, spe: 75 },
        abilities: ["Punk Rock", "Technician"],
        commonSets: [
            { item: "Choice Specs", moves: ["Overdrive", "Boomburst", "Volt Switch", "Sludge Wave"], nature: "Modest", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Ditto": {
        types: ["Normal"], baseStats: { hp: 48, atk: 48, def: 48, spa: 48, spd: 48, spe: 48 },
        abilities: ["Imposter", "Limber"],
        commonSets: [
            { item: "Choice Scarf", moves: ["Transform"], nature: "Relaxed", evs: { hp: 252, def: 252 } }
        ]
    },
    "Slowbro": {
        types: ["Water", "Psychic"], baseStats: { hp: 95, atk: 75, def: 110, spa: 100, spd: 80, spe: 30 },
        abilities: ["Regenerator", "Own Tempo", "Oblivious"],
        commonSets: [
            { item: "Heavy-Duty Boots", moves: ["Scald", "Psyshock", "Slack Off", "Teleport"], nature: "Bold", evs: { hp: 252, def: 252 } }
        ]
    },
    "Hippowdon": {
        types: ["Ground"], baseStats: { hp: 108, atk: 112, def: 118, spa: 68, spd: 72, spe: 47 },
        abilities: ["Sand Stream", "Sand Force"],
        commonSets: [
            { item: "Leftovers", moves: ["Earthquake", "Stealth Rock", "Slack Off", "Whirlwind"], nature: "Impish", evs: { hp: 252, def: 252 } }
        ]
    },
    "Zapdos": {
        types: ["Electric", "Flying"], baseStats: { hp: 90, atk: 90, def: 85, spa: 125, spd: 90, spe: 100 },
        abilities: ["Pressure", "Static"],
        commonSets: [
            { item: "Heavy-Duty Boots", moves: ["Thunderbolt", "Hurricane", "Roost", "Volt Switch"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Moltres": {
        types: ["Fire", "Flying"], baseStats: { hp: 90, atk: 100, def: 90, spa: 125, spd: 85, spe: 90 },
        abilities: ["Pressure", "Flame Body"],
        commonSets: [
            { item: "Heavy-Duty Boots", moves: ["Flamethrower", "Scorching Sands", "Roost", "Will-O-Wisp"], nature: "Timid", evs: { spa: 252, spe: 252 } }
        ]
    },
    "Skarmory": {
        types: ["Steel", "Flying"], baseStats: { hp: 65, atk: 80, def: 140, spa: 40, spd: 70, spe: 70 },
        abilities: ["Sturdy", "Keen Eye"],
        commonSets: [
            { item: "Rocky Helmet", moves: ["Spikes", "Roost", "Body Press", "Iron Defense"], nature: "Impish", evs: { hp: 252, def: 252 } }
        ]
    },
    "Clodsire": {
        types: ["Poison", "Ground"], baseStats: { hp: 130, atk: 75, def: 60, spa: 45, spd: 100, spe: 20 },
        abilities: ["Unaware", "Water Absorb", "Poison Point"],
        commonSets: [
            { item: "Leftovers", moves: ["Earthquake", "Recover", "Toxic", "Stealth Rock"], nature: "Careful", evs: { hp: 252, spd: 252 } }
        ]
    },
    "Dondozo": {
        types: ["Water"], baseStats: { hp: 150, atk: 100, def: 115, spa: 65, spd: 65, spe: 35 },
        abilities: ["Unaware", "Oblivious"],
        commonSets: [
            { item: "Leftovers", moves: ["Wave Crash", "Earthquake", "Curse", "Rest"], nature: "Impish", evs: { hp: 252, def: 252 } }
        ]
    },
    "Ogerpon": {
        types: ["Grass"], baseStats: { hp: 80, atk: 120, def: 84, spa: 60, spd: 96, spe: 110 },
        abilities: ["Defiant"],
        commonSets: [
            { item: "Leftovers", moves: ["Ivy Cudgel", "Horn Leech", "Knock Off", "Swords Dance"], nature: "Jolly", evs: { atk: 252, spe: 252 } }
        ]
    }
};

/**
 * Look up a Pokémon by name (case-insensitive, fuzzy match)
 * Handles forms like "Landorus-Therian", "Rotom-Wash", etc.
 */
function lookupPokemon(name) {
    if (!name) return null;
    const cleaned = name.trim();

    // Direct match
    if (POKEMON_DATA[cleaned]) return POKEMON_DATA[cleaned];

    // Case-insensitive match
    const lower = cleaned.toLowerCase();
    for (const key of Object.keys(POKEMON_DATA)) {
        if (key.toLowerCase() === lower) return POKEMON_DATA[key];
    }

    // Partial match (e.g. "Landorus" matches "Landorus-Therian")
    for (const key of Object.keys(POKEMON_DATA)) {
        if (key.toLowerCase().startsWith(lower) || lower.startsWith(key.toLowerCase())) {
            return POKEMON_DATA[key];
        }
    }

    return null;
}

/**
 * Calculate a stat value given base stat, EVs, IVs, nature, and level
 * Uses standard Pokémon stat formula
 */
function calcStat(base, ev, iv, nature, level, isHP) {
    iv = iv || 31;
    ev = ev || 0;
    level = level || 100;
    nature = nature || 1.0;

    if (isHP) {
        if (base === 1) return 1; // Shedinja
        return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
    }
    return Math.floor((Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5) * nature);
}

/**
 * Get speed range for a Pokémon (min neutral / max positive nature)
 */
function getSpeedRange(pokemonName, level) {
    const data = lookupPokemon(pokemonName);
    if (!data) return { min: 0, max: 999 };
    level = level || 100;
    const baseSpe = data.baseStats.spe;
    const minSpeed = calcStat(baseSpe, 0, 31, 0.9, level, false);   // Hindering nature, 0 EVs
    const maxSpeed = calcStat(baseSpe, 252, 31, 1.1, level, false);  // Boosting nature, 252 EVs
    return { min: minSpeed, max: maxSpeed };
}
