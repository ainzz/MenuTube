var electron = require('electron');
var { screen } = require('electron');
const { menubar } = require('menubar');
var ipcMain = require('electron').ipcMain;

var AppConfig = require('./config.js');
var config = AppConfig.store.all;

var mb = menubar(Object.assign(AppConfig.store.defaults));

var accelerators = [
    { accelerator: config.hotkeys.skipShortBwd, unregisterOnHide: true },
    { accelerator: config.hotkeys.skipShortFwd, unregisterOnHide: true },
    { accelerator: config.hotkeys.skipLongFwd, unregisterOnHide: true },
    { accelerator: config.hotkeys.skipLongBwd, unregisterOnHide: true },
    { accelerator: config.hotkeys.toggle, unregisterOnHide: false },
    { accelerator: config.hotkeys.playPause, unregisterOnHide: true },
];

var defaultMenu = [
    {
        label: 'Edit',
        submenu: [
            {
                label: 'Undo',
                accelerator: 'CmdOrCtrl+Z',
                role: 'undo',
            },
            {
                label: 'Redo',
                accelerator: 'Shift+CmdOrCtrl+Z',
                role: 'redo',
            },
            {
                type: 'separator',
            },
            {
                label: 'Cut',
                accelerator: 'CmdOrCtrl+X',
                role: 'cut',
            },
            {
                label: 'Copy',
                accelerator: 'CmdOrCtrl+C',
                role: 'copy',
            },
            {
                label: 'Paste',
                accelerator: 'CmdOrCtrl+V',
                role: 'paste',
            },
            {
                label: 'Select All',
                accelerator: 'CmdOrCtrl+A',
                role: 'selectall',
            },
        ],
    },
    {
        label: 'View',
        submenu: [
            {
                label: 'Reload',
                accelerator: 'CmdOrCtrl+R',
                click: function (item, focusedWindow) {
                    if (focusedWindow) focusedWindow.reload();
                },
            },
            {
                label: 'Toggle Developer Tools',
                accelerator: (function () {
                    if (process.platform === 'darwin') return 'Alt+Command+I';
                    else return 'Ctrl+Shift+I';
                })(),
                click: function (item, focusedWindow) {
                    if (focusedWindow) focusedWindow.toggleDevTools();
                },
            },
            {
                label: 'Quit',
                accelerator: 'Command+Q',
                click: function () {
                    mb && mb.app && mb.app.quit();
                },
            },
        ],
    },
];

var globalShortcut = electron.globalShortcut;

var registerGlobalShortcuts = function (mb) {
    var shortcutsHandler = function (accelerator) {
        mb.window.webContents.send('global-shortcut', { accelerator: accelerator });
    };

    for (var i = 0; i < accelerators.length; i++) {
        var a = accelerators[i];
        if (!globalShortcut.isRegistered(a.accelerator)) {
            globalShortcut.register(a.accelerator, shortcutsHandler.bind(globalShortcut, a.accelerator));
        }
    }
};

var unregisterShortcuts = function () {
    for (var i = 0; i < accelerators.length; i++) {
        var a = accelerators[i];
        if (globalShortcut.isRegistered(a.accelerator) && a.unregisterOnHide) {
            globalShortcut.unregister(a.accelerator);
        }
    }
};

mb.on('ready', function ready() {
    console.info('Main process is ready, continue...');
    console.info('Debug:', !!process.env.npm_config_debug);

    /*
     *   Set app menu to be able to use copy and paste shortcuts
     * */
    var Menu = electron.Menu;
    Menu.setApplicationMenu(Menu.buildFromTemplate(defaultMenu));

    //*
    //  Hide from dock and finder
    // */
    if (!process.env.npm_config_debug) {
        mb.app.dock.hide();
    }
    var toggleWindow = function () {
        var windowPosition = mb.window.getPosition();
        var { x, y } = screen.getCursorScreenPoint();
        var displays = screen.getAllDisplays();
        var currentDisplay = screen.getDisplayNearestPoint({ x, y });

        var windowDisplay = displays.find(function (display) {
            return (
                +display.workArea.x + +display.workAreaSize.width >= windowPosition[0] &&
                windowPosition[0] > display.workArea.x
            );
        });

        if (currentDisplay && windowDisplay && currentDisplay.id != windowDisplay.id && mb.window.isVisible()) {
            mb.window.setPosition(currentDisplay.workArea.x, currentDisplay.workArea.y);
            mb.window.center();
            mb.window.focus();
            return false;
        }

        if (mb.window.isVisible()) {
            mb.hideWindow();
            unregisterShortcuts();
        } else {
            mb.showWindow();
            mb.window.setPosition(currentDisplay.workArea.x, currentDisplay.workArea.y);
            mb.window.center();
            mb.window.focus();
            registerGlobalShortcuts(mb);
        }
    };

    ipcMain.on('updatePreferences', function (e, config) {
        for (var key in config) {
            if (config.hasOwnProperty(key)) {
                mb.setOption(key, config[key]);
            }
        }

        mb.window.webContents.send('on-preference-change', { theme: config.theme });

        AppConfig.update(config);
    });

    ipcMain.on('toggleWindow', function () {
        toggleWindow();
    });

    mb.tray.on('right-click', toggleWindow);

    mb.on('focus-lost', unregisterShortcuts);

    mb.window.on('focus', () => registerGlobalShortcuts.call(null, mb));

    registerGlobalShortcuts(mb);
});

mb.on('after-create-window', function () {
    mb.window.setResizable(config.windowResize);
    mb.window.setMinimumSize(config.browserWindow.width, config.browserWindow.height);
});

var bounds;
mb.on('after-show', function () {
    /* Skip first show */
    if (typeof bounds !== 'undefined') {
        mb.window.setBounds(bounds);
    } else {
        if (config.rememberBounds && typeof config.bounds !== 'undefined') {
            mb.window.setBounds(config.bounds);
        }
    }

    if (config.highlightTray) {
        mb.tray.setImage(AppConfig.store.defaults.iconPressed);
    } else {
        mb.tray.setHighlightMode('never');
    }

    registerGlobalShortcuts(mb);
});

mb.on('after-hide', function () {
    bounds = mb.window.getBounds();
    mb.tray.setImage(AppConfig.store.defaults.icon);
});
