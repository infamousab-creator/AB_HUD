-- ═══════════════════════════════════════════
-- CUSTOM HUD — Framework Bridge
-- Auto-detects ESX or QBCore and normalises
-- data into the same shape for main.lua
-- ════════════════════════════════════════════

local Framework = {}
Framework.Type = 'standalone'
Framework.Object = nil

-- ── Detection ──────────────────────────────────────
CreateThread(function()
    Wait(100) -- give other resources a moment

    if GetResourceState('es_extended') == 'started' then
        Framework.Type   = 'esx'
        Framework.Object = exports['es_extended']:getSharedObject()
        print('^2[CustomHUD] ^7Framework detected: ^3ESX')

    elseif GetResourceState('qb-core') == 'started' then
        Framework.Type   = 'qbcore'
        Framework.Object = exports['qb-core']:GetCoreObject()
        print('^2[CustomHUD] ^7Framework detected: ^3QBCore')

    else
        print('^3[CustomHUD] ^7No framework found – running in standalone mode')
    end
end)

-- ── Player data getters (normalised) ──────────────

function Framework.GetPlayerData()
    if Framework.Type == 'esx' then
        local player = Framework.Object.GetPlayerData()
        if not player then return nil end

        local job    = player.job and player.job.label or 'Civilian'
        local money  = 0
        if player.accounts then
            for _, acc in ipairs(player.accounts) do
                if acc.name == 'money' then money = acc.money; break end
            end
        end

        return {
            name   = (player.firstName or '') .. ' ' .. (player.lastName or ''),
            job    = job,
            id     = player.serverId or GetPlayerServerId(PlayerId()),
            money  = money,
        }

    elseif Framework.Type == 'qbcore' then
        local player = Framework.Object.Functions.GetPlayerData()
        if not player then return nil end

        local jobLabel = (player.job and player.job.label) or 'Civilian'
        local money    = (player.money and player.money.cash) or 0

        return {
            name   = (player.charinfo and (player.charinfo.firstname .. ' ' .. player.charinfo.lastname)) or 'Player',
            job    = jobLabel,
            id     = GetPlayerServerId(PlayerId()),
            money  = money,
        }

    else
        return {
            name  = 'Player',
            job   = 'Civilian',
            id    = GetPlayerServerId(PlayerId()),
            money = 0,
        }
    end
end

-- ── Hunger / Thirst (normalised 0-100) ────────────

function Framework.GetNeeds()
    local hunger, thirst = 100, 100

    if Framework.Type == 'esx' then
        -- ESX uses esx_status (if installed)
        if GetResourceState('esx_status') == 'started' then
            local status = exports['esx_status']:getStatus('hunger')
            if status then hunger = status.val / 10000 * 100 end
            status = exports['esx_status']:getStatus('thirst')
            if status then thirst = status.val / 10000 * 100 end
        end

    elseif Framework.Type == 'qbcore' then
        local player = Framework.Object.Functions.GetPlayerData()
        if player and player.metadata then
            hunger = player.metadata['hunger'] or 100
            thirst = player.metadata['thirst'] or 100
        end
    end

    return hunger, thirst
end

-- ── Stress (QBCore only for now) ──────────────────

function Framework.GetStress()
    if Framework.Type == 'qbcore' then
        local player = Framework.Object.Functions.GetPlayerData()
        if player and player.metadata then
            return player.metadata['stress'] or 0
        end
    end
    return nil  -- nil = hide the bar
end

return Framework
