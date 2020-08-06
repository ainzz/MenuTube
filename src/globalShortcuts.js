var AppConfig = require('./../config.js');

exports.init = function (wv) {
    var ipcRenderer = require('electron').ipcRenderer;
    var config = AppConfig.store;

    ipcRenderer.on('global-shortcut', function (e, data) {
        var accelerator = data.accelerator;
        switch (accelerator) {
            case config.userPreferences.hotkeys.skipShortBwd:
                wv.send('changeTime', -5);
                break;
            case config.userPreferences.hotkeys.skipShortFwd:
                wv.send('changeTime', 5);
                break;
            case config.userPreferences.hotkeys.skipLongFwd:
                wv.send('changeTime', 15);
                break;
            case config.userPreferences.hotkeys.skipLongBwd:
                wv.send('changeTime', -15);
                break;
            case config.userPreferences.hotkeys.toggle:
                ipcRenderer.send('toggleWindow');
                break;
            case config.userPreferences.hotkeys.playPause:
                wv.send('playPause');
                break;
        }
    });
};
