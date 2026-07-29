/* ============================================================
   features/maps/space.js
   Deep Space — zero gravity, free-floating arena bounded by
   `bounds` (no platforms array — see entities/Player.js's
   zero-gravity handling and the hard-bounds clamp).
   ============================================================ */

export const spaceMap = {
  id: 'space', name: 'Deep Space', gravityMultiplier: 0, zeroGravity: true, specialType: 'dash',
  platforms: [], // no floor — free-floating arena, contained by bounds
  bounds: { left: 30, right: 1250, top: 36, bottom: 660 },
  stars: Array.from({ length: 140 }, () => ({
    x: Math.random() * 1280, y: Math.random() * 720, r: Math.random() * 1.8 + 0.3
  })),
  asteroids: Array.from({ length: 6 }, () => ({
    x: Math.random() * 1280, y: 80 + Math.random() * 500, r: 10 + Math.random() * 18, spin: Math.random() * Math.PI * 2
  })),
  draw(ctx, w, h, t) {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, 800);
    grad.addColorStop(0, '#141433'); grad.addColorStop(1, '#020208');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff';
    for (const s of this.stars) {
      ctx.globalAlpha = 0.4 + Math.sin(t / 25 + s.x) * 0.4;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#8a7f74';
    for (const a of this.asteroids) {
      a.spin += 0.004;
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.spin);
      ctx.beginPath();
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2;
        const r = a.r * (0.8 + Math.sin(i * 2.1) * 0.2);
        ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Faint energy-field boundary so players can see the play area edges.
    const b = this.bounds;
    ctx.strokeStyle = 'rgba(120,180,255,0.25)';
    ctx.lineWidth = 3;
    ctx.strokeRect(b.left, b.top, b.right - b.left, b.bottom - b.top);
  }
};
