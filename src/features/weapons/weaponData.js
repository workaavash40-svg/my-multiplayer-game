/* ============================================================
   features/weapons/weaponData.js
   Weapon stats + special-ability tuning. Pure data/config, no
   rendering or behavior logic — see weaponArt.js for the AK-47
   visual, and entities/Player.js for how these values are used.
   ============================================================ */

export const WEAPONS = {
  ak47: {
    id: 'ak47', name: 'AK-47', type: 'auto',
    damage: 9, fireRate: 7,        // frames between shots
    bulletSpeed: 16, spread: 0.06,
    ammo: Infinity, reloadTime: 0,
    color: '#3b3b3b'
  },
  bow: {
    id: 'bow', name: 'Bow & Arrow', type: 'charge',
    damage: 26, minDamage: 10, fireRate: 45,
    bulletSpeed: 13, chargeSpeedBonus: 8,
    maxCharge: 40, spread: 0.01,
    ammo: Infinity, reloadTime: 0,
    color: '#7a4b21'
  },
  shield: {
    id: 'shield', name: 'Shield', type: 'block',
    duration: 90, cooldown: 10 * 60,
    color: '#3fa7ff'
  },
  spear: {
    id: 'spear', name: 'Spear', type: 'throw',
    damage: 34, fireRate: 60, cooldown: 60,
    bulletSpeed: 15,
    color: '#c9a24b'
  },
  laser: {
    id: 'laser', name: 'Laser Gun', type: 'beam',
    damage: 30, fireRate: 55,
    beamSpeed: 22, spread: 0.14, // hard to aim = wider spread
    color: '#ff3b6f'
  }
};

// Order players cycle through with the "switch weapon" key.
export const WEAPON_ORDER = ['ak47', 'bow', 'spear', 'laser'];
// Shield is a separate action bound to its own key, not part of the cycle.

// Special-ability tuning (bound to the "special" key; which one is active
// depends on the current map's `specialType`, see features/maps).
export const SPECIALS = {
  fly: { duration: 4 * 60, cooldown: 20 * 60 },
  dash: { cooldown: 7 * 60, damage: 3, frames: 14 } // damage = 3% of 100 max HP
};
