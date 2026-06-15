/* ═══════════════════════════════════════════
   CUSTOM HUD — Minimap Overlay
   Draws a styled radar/minimap on a canvas.
   Uses GTA world coords → local 2D projection.
════════════════════════════════════════════ */

'use strict';

const canvas  = document.getElementById('minimap-canvas');
const ctx     = canvas.getContext('2d');
const compassEl = document.getElementById('compass-dir');
const coordsEl  = document.getElementById('map-coords');
const zoneEl    = document.getElementById('map-zone');

const MAP = {
    // GTA V map bounds (approximate world coords)
    minX: -4000, maxX: 4500,
    minY: -4300, maxY: 8000,
    width: 200, height: 200,
    radius: 100,
};

// Blip registry: { id: { x, y, type, color, label } }
const blips = new Map();

// Player state
let state = {
    x: 0, y: 0,
    heading: 0,
    mapRange: 150,  // world-units visible in each direction
};

const COMPASS_DIRS = ['N','NE','E','SE','S','SW','W','NW'];
function headingToDir(h) {
    const idx = Math.round(h / 45) % 8;
    return COMPASS_DIRS[idx];
}

// ── World → canvas projection ──────────────────────
function worldToCanvas(wx, wy) {
    const dx = wx - state.x;
    const dy = wy - state.y;

    // Rotate to player heading
    const rad  = (state.heading * Math.PI) / 180;
    const cosH = Math.cos(rad);
    const sinH = Math.sin(rad);

    const rx = dx * cosH - dy * sinH;
    const ry = dx * sinH + dy * cosH;

    // Scale into canvas pixels
    const scale = MAP.radius / state.mapRange;
    const cx = MAP.radius + rx * scale;
    const cy = MAP.radius - ry * scale;  // y-axis flip

    return { cx, cy };
}

// ── Draw ──────────────────────────────────────────
function draw() {
    ctx.clearRect(0, 0, MAP.width, MAP.height);

    // Circular clip
    ctx.save();
    ctx.beginPath();
    ctx.arc(MAP.radius, MAP.radius, MAP.radius, 0, Math.PI * 2);
    ctx.clip();

    // Background
    ctx.fillStyle = 'rgba(8, 10, 16, 0.88)';
    ctx.fillRect(0, 0, MAP.width, MAP.height);

    // Grid lines (faint)
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.04)';
    ctx.lineWidth = 1;
    const gridStep = 30;
    for (let i = 0; i < MAP.width; i += gridStep) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, MAP.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(MAP.width, i); ctx.stroke();
    }

    // Range rings
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.07)';
    ctx.lineWidth = 1;
    [40, 70, 100].forEach(r => {
        ctx.beginPath();
        ctx.arc(MAP.radius, MAP.radius, r, 0, Math.PI * 2);
        ctx.stroke();
    });

    // Blips
    blips.forEach(blip => {
        const { cx, cy } = worldToCanvas(blip.x, blip.y);
        if (cx < 0 || cx > MAP.width || cy < 0 || cy > MAP.height) return;

        ctx.beginPath();
        ctx.arc(cx, cy, blip.size || 4, 0, Math.PI * 2);
        ctx.fillStyle = blip.color || '#ff3b5c';
        ctx.fill();

        // Glow
        ctx.shadowColor  = blip.color || '#ff3b5c';
        ctx.shadowBlur   = 6;
        ctx.fill();
        ctx.shadowBlur   = 0;

        if (blip.label) {
            ctx.font = '8px "Share Tech Mono", monospace';
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.textAlign = 'center';
            ctx.fillText(blip.label, cx, cy - 7);
        }
    });

    // Player marker (triangle pointing up = north relative to heading=0)
    ctx.save();
    ctx.translate(MAP.radius, MAP.radius);
    // Arrow
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(5.5, 7);
    ctx.lineTo(0, 4);
    ctx.lineTo(-5.5, 7);
    ctx.closePath();
    ctx.fillStyle = '#00e5ff';
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur  = 10;
    ctx.fill();
    ctx.shadowBlur  = 0;
    ctx.restore();

    ctx.restore(); // end clip

    // Outer vignette
    const vig = ctx.createRadialGradient(MAP.radius, MAP.radius, MAP.radius * 0.5, MAP.radius, MAP.radius, MAP.radius);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.save();
    ctx.beginPath();
    ctx.arc(MAP.radius, MAP.radius, MAP.radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, MAP.width, MAP.height);
    ctx.restore();
}

// ── Public update function ─────────────────────────
window.minimapUpdate = function(data) {
    if (data.x       !== undefined) state.x = data.x;
    if (data.y       !== undefined) state.y = data.y;
    if (data.heading !== undefined) {
        state.heading = data.heading;
        compassEl.textContent = headingToDir(data.heading);
    }
    if (data.zone    !== undefined) zoneEl.textContent   = data.zone;
    if (data.coords  !== undefined) coordsEl.textContent = data.coords;

    if (data.blips !== undefined) {
        blips.clear();
        data.blips.forEach(b => blips.set(b.id, b));
    }
    if (data.addBlip)    blips.set(data.addBlip.id, data.addBlip);
    if (data.removeBlip) blips.delete(data.removeBlip);

    draw();
};

// ── Loop (smooth idle redraw) ─────────────────────
(function loop() {
    draw();
    requestAnimationFrame(loop);
})();
