-- ═══════════════════════════════════════════
-- CUSTOM HUD — Server Side
-- Handles server-side notifications and
-- admin broadcast events
-- ════════════════════════════════════════════

-- ── Send notification to a specific player ────────
RegisterNetEvent('customhud:notify', function(ntype, title, msg, duration)
    local src = source
    TriggerClientEvent('customhud:clientNotify', src, ntype, title, msg, duration)
end)

-- ── Broadcast to all players ──────────────────────
RegisterNetEvent('customhud:broadcastNotify', function(ntype, title, msg, duration)
    -- Only allow admins (ace permission check)
    local src = source
    if not IsPlayerAceAllowed(src, 'command') then return end
    TriggerClientEvent('customhud:clientNotify', -1, ntype, title, msg, duration)
end)

-- ── Admin command: send global notification ───────
RegisterCommand('hudbroadcast', function(src, args)
    if src ~= 0 and not IsPlayerAceAllowed(tostring(src), 'command') then
        return
    end

    local ntype = args[1] or 'info'
    table.remove(args, 1)
    local msg = table.concat(args, ' ')

    TriggerClientEvent('customhud:clientNotify', -1, ntype, 'Server Announcement', msg, 8000)
    print('[CustomHUD] Broadcast sent: ' .. msg)
end, true)
