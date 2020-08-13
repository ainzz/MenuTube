const _newListener = document.addEventListener;

// Hijack event listener to prevent YouTube from stopping on blue window (lose focus)
document.addEventListener = () => {
    _newListener.apply(document, arguments);
};

function CCSStylesheetRuleStyle(stylesheet, selectorText, style, value) {
    /* returns the value of the element style of the rule in the stylesheet
     *  If no value is given, reads the value
     *  If value is given, the value is changed and returned
     *  If '' (empty string) is given, erases the value.
     *  The browser will apply the default one
     *
     * string stylesheet: part of the .css name to be recognized, e.g. 'default'
     * string selectorText: css selector, e.g. '#myId', '.myClass', 'thead td'
     * string style: camelCase element style, e.g. 'fontSize'
     * string value optionnal : the new value
     */
    var CCSstyle = undefined,
        rules;
    for (var ssheet of document.styleSheets) {
        if (
            ssheet.href != null &&
            (Array.isArray(stylesheet)
                ? stylesheet.some((s) => ssheet.href.indexOf(s) != -1)
                : ssheet.href.indexOf(stylesheet) != -1)
        ) {
            rules = ssheet[document.all ? 'rules' : 'cssRules'];
            for (var n in rules) {
                if (rules[n].selectorText == selectorText) {
                    CCSstyle = rules[n].style;
                    break;
                }
            }
            break;
        }
    }
    if (value == undefined) return CCSstyle[style];
    else return (CCSstyle[style] = value);
}

(function () {
    var AppConfig = require('./../config.js');
    var config = AppConfig.store.userPreferences;

    if (!!config.adBlock) {
        var observeDOM = (function () {
            var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

            return function (obj, callback) {
                if (!obj || !obj.nodeType === 1) {
                    return;
                } // validation

                if (MutationObserver) {
                    // define a new observer
                    var obs = new MutationObserver(function (mutations, observer) {
                        callback(mutations);
                    });
                    // have the observer observe foo for changes in children
                    obs.observe(obj, { childList: true, subtree: true });
                } else if (window.addEventListener) {
                    obj.addEventListener('DOMNodeInserted', callback, false);
                    obj.addEventListener('DOMNodeRemoved', callback, false);
                }
            };
        })();

        _newListener('DOMContentLoaded', () => {
            observeDOM(document.body, function (m) {
                const _check = (v) => v !== null && v !== undefined;
                const ad = [...document.querySelectorAll('.ad-showing')][0];
                if (_check(ad)) {
                    const video = document.querySelector('video');
                    if (_check(video) && !isNaN(video.duration)) {
                        video.currentTime = video.duration;
                    }
                }
            });
        });
    }

    var ipcRenderer = require('electron').ipcRenderer;
    var attempts = 1000;

    var setStream = function (video) {
        var id = video.id.replace('player_', '');
        var stream =
            '<iframe src="https://www.youtube.com/embed/' +
            id +
            '" style="width: 100%; height: 100%;" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>';
        document.body.innerHTML = stream;
    };

    ipcRenderer.on('playPause', function () {
        var video = document.querySelector('video');

        if (video == null) {
            return;
        }

        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    });

    ipcRenderer.on('pause', function () {
        var video = document.querySelector('video');

        if (video == null) {
            return;
        }

        if (!video.paused) {
            video.pause();
        }
    });

    ipcRenderer.on('changeTime', function (event, time) {
        var video = document.querySelector('video');

        if (video == null) {
            return;
        }

        video.currentTime += time;
    });

    ipcRenderer.on('gotolikes', function (event) {
        window.location.href = 'https://www.youtube.com/playlist?list=LLty4aAueRnLtXTG6K74SGcg';
    });

    ipcRenderer.on('setVideoLoop', function (event, status) {
        var video = document.querySelector('video');

        if (video == null) {
            return;
        }

        video.loop = status;
    });

    ipcRenderer.on('setOverlay', function (event, status) {
        var transparent = 'rgb(0 0 0 / 0%)';
        var original = 'rgba(0,0,0,0.6)';

        var overlay = document.querySelector('#player-control-overlay');
        if (!overlay) return false;

        CCSStylesheetRuleStyle(
            ['cssbin', 'ytmweb'],
            '#player-control-overlay.fadein',
            'background-color',
            status ? transparent : original
        );
    });

    ipcRenderer.on('enterPIPMode', function _retry() {
        var video = document.querySelector('video');

        if (video == null) {
            if (attempts > 0) {
                setTimeout(_retry, 100);
                attempts--;
            } else {
                attempts = 1000;
            }
            return;
        }

        if (typeof video !== 'undefined') {
            document.body.innerHTML = '';
            document.body.style.backgroundColor = 'black';
            document.body.className = '';
            video.style.width = '100%';
            video.style.height = '100%';
            video.style.position = 'absolute';
            video.style.top = 0;
            video.style.left = 0;
            video.style.zIndex = 9999;

            document.body.appendChild(video);

            setTimeout(function () {
                video.play();
            }, 100);
        }
    });

    ipcRenderer.on('onDidNavigateVideoPage', function _retry(event, url) {
        var video = document.querySelector('video');

        if (video == null) {
            if (attempts > 0) {
                setTimeout(_retry, 100);
                attempts--;
            } else {
                attempts = 1000;
            }
            return;
        }

        if (video == null) {
            return;
        }

        if (video.src.indexOf('m3u8') > -1) {
            setStream(video);
        }
    });
})();
