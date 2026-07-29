/* ============================================================
   features/weapons/weaponArt.js
   Small hand-drawn "mini skin" for the AK-47, used instead of a
   plain line when the player is holding that weapon. No
   dependencies — pure canvas drawing given an already-positioned
   and already-rotated context.
   ============================================================ */

export const WeaponArt = {
  // Assumes the canvas is already translated to the weapon's shoulder
  // origin and rotated to the aim angle, and that +x is "forward" (the
  // caller mirrors this via ctx.scale(-1,1) for players facing left).
  drawAK47(ctx) {
    ctx.save();
    // Wooden stock (angled back)
    ctx.fillStyle = '#6b4423';
    ctx.beginPath();
    ctx.moveTo(-14, 3);
    ctx.lineTo(-2, 6);
    ctx.lineTo(-2, 1);
    ctx.lineTo(-14, -2);
    ctx.closePath();
    ctx.fill();

    // Receiver / body
    ctx.fillStyle = '#2b2b2b';
    ctx.fillRect(-3, -4, 20, 7);

    // Front sight post
    ctx.fillStyle = '#111';
    ctx.fillRect(24, -7, 2, 5);

    // Barrel
    ctx.fillStyle = '#151515';
    ctx.fillRect(11, -2, 18, 3);

    // Curved magazine (the AK's signature banana shape)
    ctx.strokeStyle = '#3a3a3a';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(4, 2);
    ctx.quadraticCurveTo(8, 16, 14, 22);
    ctx.stroke();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#4a4a4a';
    ctx.stroke();

    // Pistol grip
    ctx.fillStyle = '#1c1c1c';
    ctx.beginPath();
    ctx.moveTo(-1, 3);
    ctx.lineTo(3, 3);
    ctx.lineTo(1, 12);
    ctx.lineTo(-2, 11);
    ctx.closePath();
    ctx.fill();

    // Wooden handguard highlight
    ctx.fillStyle = '#8a5a2f';
    ctx.fillRect(6, -3, 8, 2);

    ctx.restore();
  }
};
