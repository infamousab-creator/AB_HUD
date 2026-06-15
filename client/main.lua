-- ═══════════════════════════════════════════
-- CUSTOM HUD — Client Main
-- Polls game state and pushes updates to NUI
-- ════════════════════════════════════════════

local fw = Framework   -- loaded from framework.lua (same resource, share globals)

-- ── Config ─────────────────────────────────────────
local Config = {
    updateInterval   = 250,   -- ms between status updates
    vehicleInterval  = 100,   -- ms between vehicle updates
    playerInterval   = 5000,  -- ms between player-info updates
    mapInterval      = 500,   -- ms between minimap updates
    metric           = true,  -- true = km/h, false = mph
    enableStress     = true,
    enableCinematic  = true,
}

-- ── State ──────────────────────────────────────────
local lastHealth  = -1
local lastArmour  = -1
local lastInVeh   = false
local playerDataSent = false

-- ── Utility ───────────────────────────────────────

local function SendNUI(data)
    SendNUIMessage(data)
end

local function GetHealth()
    local ped    = PlayerPedId()
    local health = GetEntityHealth(ped) - 100  -- GTA: 100=dead, 200=full
    return math.max(0, math.min(100, health))
end

local function GetArmour()
    return math.floor(GetPedArmour(PlayerPedId()))
end

local function GetZoneName(x, y, z)
    -- Try to get zone label (GTA native)
    local zone = GetNameOfZone(x, y, z)
    return zone or 'Unknown'
end

local function GetCardinalHeading(h)
    -- h is 0-360 north=0, clockwise
    return math.floor(h)
end

-- ── Push settings once ────────────────────────────
CreateThread(function()
    Wait(500) -- wait for NUI to be ready
    SendNUI({ type = 'settings', metric = Config.metric })
end)

-- ── Status bar loop ───────────────────────────────
CreateThread(function()
    while true do
        Wait(Config.updateInterval)

        local ped     = PlayerPedId()
        local health  = GetHealth()
        local armour  = GetArmour()
        local hunger, thirst = 100, 100

        if fw and fw.GetNeeds then
            hunger, thirst = fw.GetNeeds()
        end

        local stress = nil
        if Config.enableStress and fw and fw.GetStress then
            stress = fw.GetStress()
        end

        local payload = {
            type   = 'updateStatus',
            health = health,
            armour = armour,
            hunger = hunger,
            thirst = thirst,
        }
        if stress ~= nil then payload.stress = stress end

        SendNUI(payload)
    end
end)

-- ── Vehicle loop ──────────────────────────────────
CreateThread(function()
    while true do
        Wait(Config.vehicleInterval)

        local ped = PlayerPedId()
        local veh = GetVehiclePedIsIn(ped, false)

        if veh ~= 0 and IsPedInAnyVehicle(ped, false) then
            if not lastInVeh then
                lastInVeh = true
            end

            local speed = GetEntitySpeed(veh) * 3.6  -- m/s → km/h
            local gear  = GetVehicleCurrentGear(veh)
            local fuel  = GetVehicleFuelLevel(veh)
            local engineHealth = GetVehicleEngineHealth(veh)  -- 0-1000

            SendNUI({
                type   = 'updateVehicle',
                speed  = math.floor(speed),
                gear   = gear,
                fuel   = math.floor(fuel),
                engine = math.floor(engineHealth),
            })
        else
            if lastInVeh then
                lastInVeh = false
                SendNUI({ type = 'exitVehicle' })
            end
        end
    end
end)

-- ── Player info loop ──────────────────────────────
CreateThread(function()
    while true do
        if fw and fw.GetPlayerData then
            local data = fw.GetPlayerData()
            if data then
                SendNUI({
                    type  = 'updatePlayer',
                    name  = data.name,
                    job   = data.job,
                    id    = data.id,
                    money = data.money,
                })
                playerDataSent = true
            end
        else
            -- Standalone fallback
            if not playerDataSent then
                SendNUI({
                    type  = 'updatePlayer',
                    name  = 'Player',
                    job   = 'Civilian',
                    id    = GetPlayerServerId(PlayerId()),
                    money = 0,
                })
                playerDataSent = true
            end
        end
        Wait(Config.playerInterval)
    end
end)

-- ── Minimap loop ──────────────────────────────────
CreateThread(function()
    while true do
        Wait(Config.mapInterval)

        local ped = PlayerPedId()
        local x, y, z = table.unpack(GetEntityCoords(ped))
        local heading  = GetEntityHeading(ped)
        local zone     = GetZoneName(x, y, z)

        SendNUI({
            type    = 'updateMap',
            x       = x,
            y       = y,
            heading = GetCardinalHeading(heading),
            coords  = string.format('%d / %d', math.floor(x), math.floor(y)),
            zone    = zone,
        })
    end
end)

-- ── ESX event hooks ───────────────────────────────
if GetResourceState('es_extended') == 'started' then
    AddEventHandler('esx:playerLoaded', function(xPlayer)
        playerDataSent = false -- force refresh
    end)

    AddEventHandler('esx:setJob', function(job)
        SendNUI({
            type = 'updatePlayer',
            job  = job.label or job.name,
        })
        SendNUI({
            type  = 'notification',
            ntype = 'info',
            title = 'Job Changed',
            msg   = 'You are now a ' .. (job.label or job.name),
        })
    end)

    -- Money update via ESX account change
    RegisterNetEvent('esx:addInventoryItem')
    RegisterNetEvent('esx:removeInventoryItem')
end

-- ── QBCore event hooks ────────────────────────────
if GetResourceState('qb-core') == 'started' then
    RegisterNetEvent('QBCore:Client:OnPlayerLoaded', function()
        playerDataSent = false -- force refresh
        Wait(500)
        if fw then
            local data = fw.GetPlayerData()
            if data then
                SendNUI({
                    type  = 'updatePlayer',
                    name  = data.name,
                    job   = data.job,
                    id    = data.id,
                    money = data.money,
                })
            end
        end
    end)

    RegisterNetEvent('QBCore:Client:OnJobUpdate', function(jobInfo)
        SendNUI({
            type = 'updatePlayer',
            job  = jobInfo.label or jobInfo.name,
        })
        SendNUI({
            type  = 'notification',
            ntype = 'info',
            title = 'Job Changed',
            msg   = 'You are now a ' .. (jobInfo.label or jobInfo.name),
        })
    end)

    RegisterNetEvent('QBCore:Client:OnMoneyChange', function(moneyType, amount, operation)
        if moneyType == 'cash' then
            local sign  = operation == 'add' and '+' or '-'
            local ntype = operation == 'add' and 'success' or 'warning'
            SendNUI({
                type  = 'notification',
                ntype = ntype,
                title = 'Cash ' .. (operation == 'add' and 'Received' or 'Spent'),
                msg   = sign .. '$' .. tostring(amount),
            })
        end
    end)
end

-- ── Commands ──────────────────────────────────────

-- Test notification
RegisterCommand('hudnotif', function(src, args)
    local ntype = args[1] or 'info'
    SendNUI({
        type  = 'notification',
        ntype = ntype,
        title = 'Test Notification',
        msg   = 'This is a ' .. ntype .. ' notification.',
    })
end, false)

-- Toggle metric/imperial
RegisterCommand('hudunit', function()
    Config.metric = not Config.metric
    SendNUI({ type = 'settings', metric = Config.metric })
    local unit = Config.metric and 'KM/H' or 'MPH'
    SendNUI({
        type  = 'notification',
        ntype = 'info',
        title = 'Speed Unit',
        msg   = 'Switched to ' .. unit,
    })
end, false)

-- Toggle cinematic bars
RegisterCommand('hudcinema', function()
    local active = Config.enableCinematic
    Config.enableCinematic = not active
    SendNUI({ type = 'cinematic', active = Config.enableCinematic })
end, false)

-- ── Server → Client notification ─────────────────
RegisterNetEvent('customhud:clientNotify', function(ntype, title, msg, duration)
    SendNUI({
        type     = 'notification',
        ntype    = ntype    or 'info',
        title    = title    or '',
        msg      = msg      or '',
        duration = duration or 5000,
    })
end)

-- ── NUI Callbacks ─────────────────────────────────
RegisterNUICallback('closeHUD', function(data, cb)
    cb({})
end)
