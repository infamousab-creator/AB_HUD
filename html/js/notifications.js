/* ═══════════════════════════════════════════
   CUSTOM HUD — Notification System
════════════════════════════════════════════ */

'use strict';

const NOTIF_ICONS = {
    success: `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
    error:   `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
    warning: `<svg viewBox="0 0 24 24"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
    info:    `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,
};

const container = document.getElementById('hud-notifications');
const MAX_NOTIFS = 5;

/**
 * showNotification(type, title, message, duration)
 * type: 'success' | 'error' | 'warning' | 'info'
 */
window.showNotification = function(type = 'info', title = '', msg = '', duration = 5000) {
    // Cap stack
    const existing = container.querySelectorAll('.notif:not(.removing)');
    if (existing.length >= MAX_NOTIFS) {
        removeNotif(existing[0]);
    }

    const el = document.createElement('div');
    el.className = `notif ${type}`;
    el.innerHTML = `
        <div class="notif-icon">${NOTIF_ICONS[type] || NOTIF_ICONS.info}</div>
        <div class="notif-body">
            ${title ? `<div class="notif-title">${escHtml(title)}</div>` : ''}
            ${msg   ? `<div class="notif-msg">${escHtml(msg)}</div>` : ''}
        </div>
        <div class="notif-progress" style="width:100%"></div>
    `;
    container.appendChild(el);

    // Animate progress bar
    const bar = el.querySelector('.notif-progress');
    requestAnimationFrame(() => {
        bar.style.transition = `width ${duration}ms linear`;
        bar.style.width = '0%';
    });

    // Auto-remove
    const timer = setTimeout(() => removeNotif(el), duration);
    el.dataset.timer = timer;
};

function removeNotif(el) {
    if (!el || el.classList.contains('removing')) return;
    clearTimeout(parseInt(el.dataset.timer));
    el.classList.add('removing');
    el.addEventListener('animationend', () => el.remove(), { once: true });
}

function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}
