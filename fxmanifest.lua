fx_version 'cerulean'
game 'gta5'

author 'CustomHUD'
description 'Fully Animated Custom HUD System - ESX & QBCore Compatible'
version '1.0.0'

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/css/hud.css',
    'html/js/hud.js',
    'html/js/minimap.js',
    'html/js/notifications.js'
}

client_scripts {
    'client/main.lua',
    'client/framework.lua'
}

server_scripts {
    'server/main.lua'
}

dependencies {
    '/onesync'
}
