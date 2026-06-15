/* ═══════════════════════════════════════════
   CUSTOM HUD — Main Controller
════════════════════════════════════════════ */

'use strict';

// ── Speedometer arc constants ──────────────────────
const ARC_CIRCUMFERENCE = 2 * Math.PI * 52; // r=52
const ARC_START_OFFSET  = ARC_CIRCUMFERENCE * 0.25; // start at 7 o'clock (270°-ish)
const MAX_SPEED_KMH     = 320;
const MAX_SPEED_MPH     = 200;

// ── Cached DOM refs ────────────────────────────────
const dom = {
    // Status bars
    healthFill:  document.getElementById('health-fill'),
    healthGlow:  document.getElementById('health-glow'),
    healthVal:   document.getElementById('health-val'),
    armourFill:  document.getElementById('armour-fill'),
    armourGlow:  document.getElementById('armour-glow'),
    armourVal:   document.getElementById('armour-val'),
    hungerFill:  document.getElementById('hunger-fill'),
    hungerGlow:  document.getElementById('hunger-glow'),
    hungerVal:   document.getElementById('hunger-val'),
    thirstFill:  document.getElementById('thirst-fill'),
    thirstGlow:  document.getElementById('thirst-glow'),
    thirstVal:   document.getElementById('thirst-val'),
    stressRow:   document.getElementById('stat-stress'),
    stressFill:  document.getElementById('stress-fill'),
    stressGlow:  document.getElementById('stress-glow'),
    stressVal:   document.getElementById('stress-val'),

    statHealth:  document.getElementById('stat-health'),
    statArmour:  document.getElementById('stat-armour'),
    statHunger:  document.getElementById('stat-hunger'),
    statThirst:  document.getElementById('stat-thirst'),

    // Speedo
    hudSpeed:   document.getElementById('hud-speed'),
    speedArc:   document.getElementById('speed-arc'),
    speedVal:   document.getElementById('speed-val'),
    speedUnit:  document.getElementById('speed-unit'),
    gearVal:    document.getElementById('gear-val'),
    fuelFill:   document.getElementById('fuel-fill'),
    fuelVal:    document.getElementById('fuel-val'),
    engineDot:  document.getElementById('engine-dot'),
    engineLabel:document.getElementById('engine-label'),

    // Player
    playerName:  document.getElementById('player-name'),
    playerJob:   document.getElementById('player-job'),
    playerId:    document.getElementById('player-id'),
    playerMoney: document.getElementById('player-money'),

    // Cinematic
    cinTop:    document.getElementById('cin-top'),
    cinBottom: document.getElementById('cin-bottom'),
};

// ── State ──────────────────────────────────────────
let useMetric = true;
let inVehicle = false;

// ── Helpers ───────────────────────────────────────
function setBar(fill, glow, val, percentage, row) {
    const pct = Math.max(0, Math.min(100, percentage));
    fill.style.width = pct + '%';
    glow.style.right = (100 - pct) + '%'; // track glow to bar tip
    if (val) val.textContent = Math.round(pct);

    // Low warning pulse
    if (row) {
        if (pct <= 20) {
            row.classList.add('low-pulse');
        } else {
            row.classList.remove('low-pulse');
        }
    }
}

function setSpeedArc(speed) {
    const maxSpd = useMetric ? MAX_SPEED_KMH : MAX_SPEED_MPH;
    const ratio  = Math.min(speed / maxSpd, 1);
    const filled = ARC_CIRCUMFERENCE * 0.75 * ratio; // 270° sweep
    dom.speedArc.style.strokeDasharray = `${filled} ${ARC_CIRCUMFERENCE - filled}`;
    dom.speedArc.style.strokeDashoffset = ARC_START_OFFSET;
}

function formatMoney(amount) {
    if (amount >= 1_000_000) return '$' + (amount / 1_000_000).toFixed(1) + 'M';
    if (amount >= 1_000)     return '$' + (amount / 1_000).toFixed(1) + 'K';
    return '$' + amount.toLocaleString();
}

function setVehicleHUD(visible) {
    inVehicle = visible;
    if (visible) {
        dom.hudSpeed.classList.remove('hud-hidden');
        dom.hudSpeed.classList.add('hud-visible');
    } else {
        dom.hudSpeed.classList.remove('hud-visible');
        dom.hudSpeed.classList.add('hud-hidden');
    }
}

function setEngineStatus(health) {
    // health 0-1000 (GTA native)
    const pct = health / 10;
    if (pct > 60) {
        dom.engineDot.className  = 'engine-dot';
        dom.engineLabel.textContent = 'ENGINE OK';
    } else if (pct > 30) {
        dom.engineDot.className  = 'engine-dot warn';
        dom.engineLabel.textContent = 'ENGINE DMG';
    } else {
        dom.engineDot.className  = 'engine-dot crit';
        dom.engineLabel.textContent = 'CRITICAL!';
    }
}

function gearDisplay(gear) {
    if (gear === 0) return 'R';
    if (gear === 1) return 'N';
    return String(gear - 1);
}

// ── NUI Message Handler ────────────────────────────
window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || !data.type) return;

    switch (data.type) {

        // ─── Status bars ───────────────────────────
        case 'updateStatus':
            if (data.health  !== undefined) setBar(dom.healthFill, dom.healthGlow, dom.healthVal, data.health, dom.statHealth);
            if (data.armour  !== undefined) setBar(dom.armourFill, dom.armourGlow, dom.armourVal, data.armour, dom.statArmour);
            if (data.hunger  !== undefined) setBar(dom.hungerFill, dom.hungerGlow, dom.hungerVal, data.hunger, dom.statHunger);
            if (data.thirst  !== undefined) setBar(dom.thirstFill, dom.thirstGlow, dom.thirstVal, data.thirst, dom.statThirst);
            if (data.stress  !== undefined) {
                dom.stressRow.style.display = 'flex';
                setBar(dom.stressFill, dom.stressGlow, dom.stressVal, data.stress, null);
            }
            break;

        // ─── Vehicle ──────────────────────────────
        case 'updateVehicle':
            setVehicleHUD(true);
            if (data.speed !== undefined) {
                const spd = useMetric ? data.speed : data.speed * 0.621371;
                dom.speedVal.textContent = Math.round(spd);
                dom.speedUnit.textContent = useMetric ? 'KM/H' : 'MPH';
                setSpeedArc(Math.round(spd));
            }
            if (data.gear    !== undefined) dom.gearVal.textContent  = gearDisplay(data.gear);
            if (data.fuel    !== undefined) {
                const f = Math.round(data.fuel);
                dom.fuelFill.style.width = f + '%';
                dom.fuelVal.textContent  = f + '%';
            }
            if (data.engine  !== undefined) setEngineStatus(data.engine);
            break;

        case 'exitVehicle':
            setVehicleHUD(false);
            dom.speedVal.textContent = '0';
            setSpeedArc(0);
            break;

        // ─── Player info ──────────────────────────
        case 'updatePlayer':
            if (data.name   !== undefined) dom.playerName.textContent  = data.name;
            if (data.job    !== undefined) dom.playerJob.textContent   = data.job.toUpperCase();
            if (data.id     !== undefined) dom.playerId.textContent    = data.id;
            if (data.money  !== undefined) dom.playerMoney.textContent = formatMoney(data.money);
            break;

        // ─── Minimap ──────────────────────────────
        case 'updateMap':
            if (window.minimapUpdate) window.minimapUpdate(data);
            break;

        // ─── Notifications ────────────────────────
        case 'notification':
            if (window.showNotification) {
                window.showNotification(data.ntype || 'info', data.title || '', data.msg || '', data.duration);
            }
            break;

        // ─── Cinematic bars ───────────────────────
        case 'cinematic':
            if (data.active) {
                dom.cinTop.classList.add('active');
                dom.cinBottom.classList.add('active');
            } else {
                dom.cinTop.classList.remove('active');
                dom.cinBottom.classList.remove('active');
            }
            break;

        // ─── Settings ─────────────────────────────
        case 'settings':
            if (data.metric !== undefined) useMetric = data.metric;
            break;

        // ─── Toggle HUD visibility ────────────────
        case 'toggleHUD':
            const els = document.querySelectorAll('#hud-status, #hud-player, #hud-minimap');
            els.forEach(el => {
                if (data.visible) { el.classList.remove('fade-out'); el.classList.add('fade-in'); }
                else              { el.classList.remove('fade-in');  el.classList.add('fade-out'); }
            });
            break;
    }
});

// ── Initial arc draw ──────────────────────────────
setSpeedArc(0);
