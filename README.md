# Custom HUD System

Fully animated player HUD built with pure NUI — compatible with **ESX** and **QBCore**.

## Features

| Feature | Details |
|---|---|
| Status Bars | Health · Armour · Hunger · Thirst · Stress (QBCore) |
| Speedometer | Circular arc ring, gear display, fuel bar, engine health |
| Minimap Overlay | Canvas radar with player arrow, blips, compass, zone name |
| Player Card | Name · Job · Server ID · Cash balance |
| Notification Stack | 4 types (success / error / warning / info), progress timer, auto-dismiss |
| Cinematic Bars | Toggle top/bottom letterbox bars |
| Metric/Imperial | Toggle km/h ↔ mph in-game |

## Installation

1. Drop `custom_hud` into your `resources` folder.
2. Add `ensure custom_hud` to your `server.cfg`.
3. **No config file needed** — framework is auto-detected.

## Dependencies

- **ESX** — requires `es_extended`. Hunger/thirst requires `esx_status`.
- **QBCore** — requires `qb-core`. Hunger/thirst/stress read from player metadata.
- **Standalone** — works without either framework (no player data).

## In-Game Commands

| Command | Description |
|---|---|
| `/hudnotif [type]` | Test notification (info / success / warning / error) |
| `/hudunit` | Toggle km/h ↔ mph |
| `/hudcinema` | Toggle cinematic letterbox bars |

## Server Commands (RCON / admin)

```
hudbroadcast [type] [message]
# e.g.: hudbroadcast warning Server restart in 5 minutes
```

## NUI Message API

Send from any other resource:

```lua
-- Trigger a notification
SendNUIMessage({
    type  = 'notification',
    ntype = 'success',       -- success | error | warning | info
    title = 'Payment',
    msg   = 'You received $500',
    duration = 5000,         -- ms
})

-- Add a minimap blip
SendNUIMessage({
    type = 'updateMap',
    addBlip = {
        id    = 'myblip1',
        x     = 123.4,
        y     = -456.7,
        color = '#ff3b5c',
        size  = 5,
        label = 'Job',
    }
})

-- Remove a minimap blip
SendNUIMessage({ type = 'updateMap', removeBlip = 'myblip1' })

-- Cinematic bars
SendNUIMessage({ type = 'cinematic', active = true })
```

## File Structure

```
custom_hud/
├── fxmanifest.lua
├── README.md
├── client/
│   ├── framework.lua     ← ESX / QBCore bridge
│   └── main.lua          ← Game loops + event hooks
├── server/
│   └── main.lua          ← Server notifications
└── html/
    ├── index.html
    ├── css/hud.css
    └── js/
        ├── hud.js          ← Main NUI controller
        ├── minimap.js      ← Canvas radar
        └── notifications.js
```
