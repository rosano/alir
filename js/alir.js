/*jshint browser: true, devel: true */
/*global remoteStorage: true, RemoteStorage: true, Gesture: true, tiles: true, utils: true, Event: true, scrap: true, saveScraped: true, $:true, $$: true, Showdown: true */
/*exported: alir */
/**
    Alir
    Copyright (C) 2013  Clochix

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.
*/

/**
 * @TODO use notifications
 * https://developer.mozilla.org/en-US/docs/WebAPI/Using_Web_Notifications
 */

var config,
    _;
config = {
  gesture: false,
  vibrate: false,
  rs: {
    login: '',
    syncIntervalOn: 60,
    syncIntervalOff: 300
  },
  dropBox: {
    apiKey: ''
  },
  google: {
    clientId: '',
    apiKey: ''
  },
  lang: 'en-US',
  menu: true,
  alarmInterval: 60,
  logLevel: 'info',
  proxy: 'http://',
  bookmarks: {},
  alarms: {},
  style: {
    fontSize: 1,
    'font-size': 'sans-serif'
  },
  first: true,
  theme: '',
  logs: ''
};
function displayItem(item) {
  "use strict";
  if (typeof item !== 'object') {
    utils.log("Trying to display undefined item", "error");
  }
  switch (item.type) {
  case 'article':
    window.articles.addToList(item);
    break;
  case 'feed':
    window.feeds.display(item);
    break;
  default:
    utils.log(utils.format("Unable to display item %s of type %s", item.id, item.type), "error");
  }
}
function Alir() {
  "use strict";
  var self = this,
      dynamicSheet = document.getElementById('userCss').sheet,
      slider = document.getElementById('styleFontSize'),
      family = document.getElementById('styleFontFamily');
  RemoteStorage.eventHandling(this, "configLoaded", "statusUpdated");
  // style {{
  (function () {
    function updateStyle(conf) {
      while (dynamicSheet.cssRules[0]) {
        dynamicSheet.deleteRule(0);
      }
      slider.value = conf.fontSize;
      family.value = conf.fontFamily;
      dynamicSheet.insertRule("#articleShowTile .content .html, #styleFontSizeSample { font-size: " + conf.fontSize + "rem; font-family: " + conf.fontFamily  + " }", 0);
    }
    function onSizeChanged(event) {
      window.config.style.fontSize = slider.value;
      updateStyle(window.config.style);
    }
    function onFamilyChanged(event) {
      window.config.style.fontFamily = family.value;
      updateStyle(window.config.style);
    }
    self.on('configLoaded', function (conf) {
      updateStyle(conf.style);
    });
    slider.addEventListener('change', onSizeChanged);
    slider.addEventListener('input',  onSizeChanged);
    family.addEventListener('change', onFamilyChanged);
    self.styleReset = function () {
      window.config.style.fontSize = 1;
      window.config.style.fontFamily = 'sans-serif';
      updateStyle(window.config.style);
    };
  }());
  // }}
  // status {{
  (function () {
    //jshint maxstatements: 21
    var status;
    status = {
      installed: false,
      online: navigator.onLine,
      user: true,
      visible: !document.hidden,
      rs: remoteStorage.connected
    };
    if (status.online) {
      document.body.classList.add('net');
    } else {
      document.body.classList.remove('net');
    }
    // when navigator goes online / offline
    function windowOnline(e) {
      status.online = navigator.onLine;
      if (status.online) {
        document.body.classList.add('net');
      } else {
        document.body.classList.remove('net');
      }
      self._emit('statusUpdated', status);
    }
    // when visibility of application change
    function documentVisibility() {
      status.visible = !document.hidden;
      self._emit('statusUpdated', status);
    }
    // when user toggle online / offline state
    function userOnline(online) {
      if (online) {
        remoteStorage.alir.goOnline();
        document.body.classList.add('online');
        status.user = true;
      } else {
        remoteStorage.alir.goOffline();
        document.body.classList.remove('online');
        document.body.classList.remove('sync');
        status.user = false;
      }
      self._emit('statusUpdated', status);
    }
    window.addEventListener("offline", windowOnline, false);
    window.addEventListener("online", windowOnline, false);
    document.addEventListener("visibilitychange", documentVisibility, false);
    if (!remoteStorage.connected) {
      document.body.classList.remove('online');
    }
    remoteStorage.on("disconnected", function (e) {
      document.body.classList.remove('online');
      status.rs = false;
      self._emit('statusUpdated', status);
    });
    remoteStorage.remote.on("connected", function (e) {
      document.getElementById('prefToken').value = remoteStorage.remote.token;
      document.body.classList.add('online');
      status.rs = true;
      self._emit('statusUpdated', status);
    });
    // check if application is installed {
    if (window.navigator.mozApps) {
      (function () {
        var request = window.navigator.mozApps.getSelf();
        request.onsuccess = function () {
          if (request.result) {
            status.installed = true;
            document.body.classList.remove('hosted');
            document.body.classList.add('installed');
          }
        };
      }());
    } else {
      status.installed = false;
    }
    // }
    // Toggle user online state {
    self.onoff = function () {
      if (document.body.classList.contains('online')) {
        userOnline(false);
      } else {
        if (remoteStorage.connected) {
          userOnline(true);
        } else {
          if (document.getElementById('rsLogin').value !== '') {
            remoteStorage.widget.view.events.connect(new Event(""));
          } else {
            window.alir.ui.message(_('notConnected'), 'error');
          }
        }
      }
    };
    // }
    self.getStatus = function () {
      return status;
    };
  }());
  // }}
  this.install = function () {
    (function () {
      var host, request;
      host = window.location.protocol + '//' + window.location.host;
      // @FIXME dirty hack to detect Firefox OS
      if (typeof window.MozActivity === 'undefined') {
        request = window.navigator.mozApps.install(host + '/hosted.webapp');
      } else {
        request = window.navigator.mozApps.installPackage(host + "/package.manifest");
      }
      request.onerror = function () {
        utils.log("Install Error : " + this.error.name, "error");
        utils.log(this.error, 'error');
        window.alir.ui.message('_installKo', "info");
      };
      request.onsuccess = function () {
        window.alir.ui.message('_installOk', "info");
        tiles.show('list');
      };
    }());
  };
  this.update = function () {
    (function () {
      var request = window.navigator.mozApps.getSelf();
      request.onsuccess = function () {
        if (request.result) {
          request.result.checkForUpdate();
        } else {
          alert("Called from outside of an app");
        }
      };
      request.onerror = function () {
        utils.log("Error: " + request.error.name, "error");
      };
    }());
  };
  this.getAll = function () {
    var startTime = {};

    ['article', 'feed'].forEach(function (type) {
      startTime[type] = window.performance.now();
      remoteStorage.alir.private.getAll(type + '/').then(function (objects) {
        utils.log(utils.format("All %s got in %s", type, Math.round((window.performance.now() - startTime[type]))), "debug");
        if (objects) {
          Object.keys(objects).forEach(function (key) {
            try {
              objects[key].id   = key;
              objects[key].type = type;
              if (type === 'article' && (objects[key].loaded === false || objects[key].title === '???')) {
                self.reload(key);
              }
              displayItem(objects[key]);
            } catch (e) {
              utils.log(utils.format("Error on %s for key %s : %s / %s", type, key, objects[key], e.toString(), "error"));
            }
          });
        }
        utils.log(utils.format("All %s displayed in %s", type, Math.round((window.performance.now() - startTime[type]))), "debug");
      });
    });
  };
  this.rs = {
    "setView": function () {
      if (typeof remoteStorage.widget.view === 'undefined') {
        remoteStorage.widget.display();
      }
    },
    "connect": function () {
      remoteStorage.widget.view.form.userAddress.value = $('#rsLogin').value;
      remoteStorage.widget.view.events.connect(new Event(""));
    },
    "connectDropbox": function () {
      remoteStorage.widget.view.connectDropbox();
    },
    "connectDrive": function () {
      remoteStorage.widget.view.connectGdrive();
    },
    "sync": function () {
      remoteStorage.widget.view.events.sync(new Event(""));
    },
    "reset": function () {
      remoteStorage.widget.view.events.reset(new Event(""));
    },
    "disconnect": function () {
      remoteStorage.widget.view.events.disconnect(new Event(""));
    },
    "cacheReset": function () {
      remoteStorage.caching.reset();
    },
    "status": ""
  };
  this.reset = function () {
    config.testMode = true;
    localStorage.clear();
    this.rs.setView();
    remoteStorage.widget.view.events.reset(new Event(""));
  };
  this.ui = {
    clearLogs: function () {
      document.getElementById('debugLog').innerHTML =  "";
    },
    inspect: function () {
      remoteStorage.inspect();
    },
    message: function (msg, level) {
      self.ui.messagebar.classList.remove('info');
      self.ui.messagebar.classList.remove('error');
      if (typeof msg !== 'undefined') {
        level = level || 'info';
        self.ui.messagebar.classList.add(level);
        self.ui.messagebar.textContent = msg;
        if (level === 'info') {
          window.setTimeout(function () {
            self.ui.message();
          }, 5000);
        }
      } else {
        self.ui.messagebar.textContent = '';
      }
    },
    widgetShow: function () {
      $('#rsWidget').classList.toggle("hidden");
    },
    setTheme: function (theme) {
      var cl = document.body.classList;
      [].slice.call(document.body.classList).forEach(function (c) {
        if (c.substr(0, 5) === 'theme') {
          cl.remove(c);
        }
      });
      if (theme !== '') {
        cl.add(theme);
      }
    }
  };
  this.ui.messagebar = document.getElementById('messagebar');
  this.ui.messagebar.addEventListener('click', function () {
    self.ui.message();
  });
}
window.alir = new Alir();
window.alir.on('statusUpdated', function (status) {
  "use strict";
  //console.log(status);
});
// network depends on alir
// @FIXME move creation of all global objects elsewhere
window.network = new window.Network();

window.link = {
  // Open link in external browser
  open: function (site) {
    "use strict";
    var href = document.getElementById('linkRef').textContent,
        openURL;
    if (site) {
      href = site + window.encodeURIComponent(href);
    }
    if (typeof window.MozActivity !== 'undefined') {
      try {
        openURL = new window.MozActivity({
          name: "view",
          data: {
            type: "url",
            url: href
          }
        });
      } catch (e) {
        window.open(href);
      }
    } else {
      window.open(href);
    }
    tiles.back();
  },
  scrap: function (href) {
    "use strict";
    if (typeof href === 'undefined') {
      href = document.getElementById('linkRef').textContent;
      tiles.back();
    }
    try {
      utils.log("Scraping " + href, "info");
      window.alir.ui.message(_("scraping") + ' ' + href, "info");
      scrap(href, function (err, res) {
        if (err) {
          utils.log(err.toString(), 'error');
          window.alir.ui.message(_('scrapingError'), 'error');
          res.loaded = false;
        }
        saveScraped(res);
      });
    } catch (e) {
      utils.log(e.toString(), "error");
      window.alir.ui.message(_('scrapingError'), 'error');
    }
  },
  share: function () {
    "use strict";
    var href = document.getElementById('linkRef').textContent,
        request;
    if (typeof window.MozActivity !== 'undefined') {
      try {
        request = new window.MozActivity({
          name: "share",
          data: {
            type: "url",
            url: href
          }
        });
        request.onerror = function () {
          if (request.error.name !== 'USER_ABORT') {
            utils.log("Error sharing : " + request.error.name, "error");
            window.alir.ui.message(_('scrapingError'), 'error');
          }
        };
      } catch (e) {
        utils.log("Error sharing : " + e, "error");
        window.alir.ui.message(_('scrapingError'), 'error');
      }
    } else {
      // @TODO How to share ???
      utils.log("Sorry, share is not available", "error");
    }
    tiles.back();
  },
  facebook: function () {
    "use strict";
    var txt = window.encodeURIComponent(document.getElementById('linkText').value);
    this.open('https://www.facebook.com/sharer/sharer.php?t=' + txt + '&u=');
  },
  google: function () {
    "use strict";
    this.open('https://plus.google.com/share?url=');
  },
  twitter: function () {
    "use strict";
    var txt = window.encodeURIComponent(document.getElementById('linkText').value);
    this.open('https://twitter.com/intent/tweet?text=' + txt + '&url=');
  }
};

window.choice = function (choices) {
  "use strict";
  var tile = document.querySelector('[data-tile=prompt]'),
      button;
  choices.push({'object': 'tiles', 'method': 'back', 'l10nId': 'back'});
  tile.innerHTML = '';
  choices.forEach(function (choice) {
    button = document.createElement('button');
    ['object', 'method', 'params', 'l10nId'].forEach(function (d) {
      if (typeof choice[d] !== 'undefined') {
        button.dataset[d] = choice[d];
      }
    });
    if (typeof choice.l10nId !== 'undefined') {
      button.innerHTML = _(choice.l10nId);
    }
    tile.appendChild(button);
  });
  tiles.go('prompt');
};

RemoteStorage.defineModule('alir', function module(privateClient, publicClient) {
  "use strict";

  // Define a common data type using JSON Schema
  privateClient.declareType('article', {
    "description": "Article",
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "id"
      },
      "title": {
        "type": "string"
      },
      "html": {
        "type": "string"
      },
      "text": {
        "type": "string"
      },
      "tags": {
        "type": "array"
      },
      "notes": {
        "type": "object"
      },
      "flags": {
        "type": "object"
      },
      "alternate": {
        "type": "array"
      },
      "loaded": {
        "type": "boolean"
      }
    }
  });

  privateClient.declareType('feed', {
    "description": "Feed",
    "type": "object",
    "properties": {
      "id": {
        "type": "string",
        "format": "id"
      },
      "title": {
        "type": "string"
      },
      "url": {
        "type": "string"
      },
      "lastUpdated": {
        "type": "string"
      },
      "type": {
        "type": "string"
      },
      "short": {
        "type": "boolean"
      },
      "articles": {
        "type": "object"
      }
    }
  });

  function getObject(type, key, cb) {
    var path = type + '/' + key;
    remoteStorage.alir.private.getObject(path).then(function (obj) {
      if (obj) {
        obj.id = key;
        cb(obj);
      } else {
        utils.log("Unable to load " + path, "error");
        path = '/' + path;
        remoteStorage.alir.private.getObject(path).then(function (obj) {
          if (obj) {
            obj.id = key;
          } else {
            utils.log("Unable to load " + path, "error");
            window.alir.ui.message(_('articleNotFound'), "error");
          }
          cb(obj);
        });
      }
    });
  }
  return {
    exports: {
      getArticle: function (key, cb) {
        getObject('article', key, cb);
      },
      saveArticle: function (article) {
        article.type = 'article';
        return privateClient.storeObject('article', 'article/' + article.id, article);
      },
      getFeed: function (key, cb) {
        getObject('feed', key, cb);
      },
      saveFeed: function (feed) {
        feed.type = 'feed';
        return privateClient.storeObject('feed', 'feed/' + feed.id, feed);
      },
      goOffline: function () {
        remoteStorage.stopSync();
      },
      goOnline: function () {
        remoteStorage.syncCycle();
      },
      private: privateClient,
      public: publicClient
    }
  };
});
function initUI() {
  // jshint maxstatements: 60
  "use strict";
  function clicked(elmt) {
    if (typeof elmt !== 'undefined' && elmt instanceof Element) {
      elmt.classList.add('clicked');
      window.setTimeout(function () {
        elmt.classList.remove('clicked');
      }, 400);
    }
    if (config.vibrate && typeof window.navigator.vibrate === 'function') {
      window.navigator.vibrate(50);
    }
  }
  // configuration {{
  (function () {
    // jshint maxcomplexity: 10
    var conf = localStorage.getItem('config');
    function firstUse() {
      // Create first use content
      function doFirst() {
        var article,
            xhr = new XMLHttpRequest({ mozSystem: true });
        document.documentElement.lang = document.webL10n.getLanguage();
        document.documentElement.dir = document.webL10n.getDirection();
        if (config.first === true) {
          // if mozSystem is not available, init a CORS Proxy
          if (typeof xhr.mozSystem !== 'boolean' || xhr.mozSystem !== true) {
            config.proxy = window.location.protocol + '//www.corsproxy.com/';
            document.getElementById('proxyUrl').value = config.proxy;
          }
          article = {
            id:    utils.uuid(),
            title: _('firstArticleTitle'),
            html:  new Showdown.converter().makeHtml(_('firstArticleMd')),
            date:  Date.now(),
            flags: {
              editable: false
            }
          };
          remoteStorage.alir.saveArticle(article);
        }
      }
      if (document.webL10n.getReadyState() === 'complete') {
        doFirst();
      } else {
        document.addEventListener('localized', doFirst);
      }
    }
    if (conf) {
      conf = JSON.parse(conf);
      utils.merge(config, conf);

      config.first = conf.first;
      firstUse();

      if (typeof conf.lang !== 'undefined') {
        $('#settingsLang select').value = conf.lang;
        if (document.webL10n.getLanguage() !== conf.lang) {
          document.webL10n.setLanguage(conf.lang);
        }
      }

      if (conf.rs.login) {
        $('#rsLogin').value = conf.rs.login;
        remoteStorage.widget.view.form.userAddress.value = conf.rs.login;
      }
      if (conf.dropBox.apiKey) {
        $('#dropboxApiKey').value = conf.dropBox.apiKey;
        remoteStorage.setApiKeys('dropbox', {api_key: conf.dropBox.apiKey});
      }
      if (conf.google.apiKey && conf.google.clientId) {
        $('#driveClientId').value = conf.goole.clientId;
        $('#driveApiKey').value   = conf.google.apiKey;
        remoteStorage.setApiKeys('googledrive', {client_id: conf.google.clientId, api_key: conf.google.apiKey});
      }
      if (conf.menu) {
        document.body.classList.remove('menu-right');
        document.body.classList.add('menu-left');
      } else {
        document.body.classList.remove('menu-left');
        document.body.classList.add('menu-right');
      }
      (function () {
        var alarm = $('#alarmInterval'),
            alarmValue = $('#alarmIntervalValue');
        function onIntervalChanged(event) {
          var value = event.target.value;
          conf.alarmInterval     = value;
          alarmValue.textContent = value;
          if (event.type === 'change' && typeof window.alarms !== "undefined") {
            window.alarms.reset(function () {
              window.alarms.plan();
            });
          }
        }
        alarm.value            = conf.alarmInterval;
        alarmValue.textContent = conf.alarmInterval;
        alarm.addEventListener('change', onIntervalChanged);
        alarm.addEventListener('input', onIntervalChanged);
      }());
      // sync interval {{
      ['On', 'Off'].forEach(function (mode) {
        var range      = $('#rsSyncInterval' + mode),
            rangeValue = $('#rsSyncInterval' + mode + 'Value'),
            prefName   = 'syncInterval' + mode;
        function onIntervalChanged(event) {
          var value = event.target.value;
          conf.rs[prefName] = value;
          rangeValue.textContent = value;
          if (event.type === 'change') {
            if (mode === 'On') {
              remoteStorage.setSyncInterval(value * 1000);
            }
            if (mode === 'Off') {
              remoteStorage.setBackgroundSyncInterval(value * 1000);
            }
          }
        }
        range.value            = conf.rs[prefName];
        rangeValue.textContent = conf.rs[prefName];
        range.addEventListener('change', onIntervalChanged);
        range.addEventListener('input', onIntervalChanged);
      });
      remoteStorage.setSyncInterval(conf.rs.syncIntervalOn * 1000);
      remoteStorage.setBackgroundSyncInterval(conf.rs.syncIntervalOff * 1000);
      // }}

      $('#settingsLoglevel select').value = conf.logLevel;
      utils.logLevel = conf.logLevel;

      $('#settingsTheme select').value = conf.theme;

      $('#proxyUrl').value = conf.proxy;

      window.alir.ui.setTheme(conf.theme);

      if (typeof conf.bookmarks === 'undefined') {
        conf.bookmarks = {};
      }

      if (conf.logs !== '') {
        document.getElementById('debugLog').innerHTML += conf.logs;
      }

      config = conf;
      window.alir._emit('configLoaded', conf);
    } else {
      firstUse();
    }
  }());
  // }}

  $$('form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      return false;
    });
  });

  // Actions {{
  (function () {

    // Generic event Listener
    document.body.addEventListener('click', function (ev) {
      //jshint curly: false
      var params = [],
          target  = ev.target,
          dataset = target.dataset,
          listeners,
          obj, path;

      listeners = [
        {
          // Reset button
          sel: "button[type=reset]",
          action: function (elmt) {
            var res = utils.parent(elmt, function (el) { return el.tagName === 'FIELDSET'; });
            if (res !== null) {
              $$("input", res).forEach(function (el) {
                el.value = '';
              });
            }
          }
        },
        // Links inside content
        {
          sel: "#articleShowTile a[href][target]",
          action: function (elmt) {
            document.getElementById("linkRef").textContent = elmt.href;
            document.getElementById("linkRefFull").textContent = elmt.href;
            document.getElementById("linkText").value = '';
            tiles.go('link');
          }
        },
        // Containers
        {
          sel: ".container .header",
          action: function (elmt) {
            var target = utils.parent(elmt, function (el) { return el.classList.contains('container'); });
            if (target) {
              target.classList.toggle('folded');
            }
          }
        }
      ];
      listeners.forEach(function (listener) {
        if (utils.match(ev.target, listener.sel)) {
          ev.preventDefault();
          clicked(ev.target);
          listener.action(ev.target);
        }
      });
      if (typeof dataset.method === 'undefined' && typeof ev.target.parentNode.dataset.method !== 'undefined') {
        target  = ev.target.parentNode;
        dataset = ev.target.parentNode.dataset;
      }
      if (dataset.method && typeof dataset.object !== 'undefined') {
        if (typeof dataset.params !== "undefined") {
          params = dataset.params.split(',');
        }
        path = dataset.object.split('.');
        obj = window;
        do {
          obj = obj[path.shift()];
        } while (typeof obj !== 'undefined' && path.length > 0);
        if (typeof obj === 'undefined') {
          utils.log("Unknown data object " + dataset.object, "error");
        } else {
          if (typeof obj[dataset.method] !== 'function') {
            utils.log(utils.format("Object %s has no method %s", dataset.object, dataset.method), "error");
          } else {
            clicked(target);
            obj[dataset.method].apply(obj, params);
          }
        }
      }
    });
    document.body.addEventListener('focus', function (ev) {
      if (ev.target.tagName === 'TEXTAREA') {
        // Move carret to the end of textarea
        ev.target.selectionStart = ev.target.value.length;
      }
    }, true);
  })();
  // }}

  remoteStorage.on("wire-busy", function (e) {
    document.body.classList.add('sync');
  });
  remoteStorage.on("wire-done", function (e) {
    document.body.classList.remove('sync');
  });
  remoteStorage.remote.on("wire-busy", function (e) {
    document.body.classList.add('sync');
  });
  remoteStorage.remote.on("wire-done", function (e) {
    document.body.classList.remove('sync');
  });
  //remoteStorage.on("sync-updated", function (e) {
  //  console.log(e);
  //});

  remoteStorage.on("features-loaded", function (e) {
    var features = [];
    remoteStorage.features.forEach(function (feature) {
      if (feature.supported === true) {
        features.push(feature.name);
      }
    });
    if (features.indexOf('Dropbox') !== -1) {
      $('#prefDropbox').classList.remove('hidden');
    } else {
      $('#prefDropbox').classList.add('hidden');
    }
    if (features.indexOf('GoogleDrive') !== -1) {
      $('#prefDrive').classList.remove('hidden');
    } else {
      $('#prefDrive').classList.add('hidden');
    }

  });
  // Gestures {{
  (function () {
    var checkbox, gestureEvents;
    gestureEvents = {
      gesture: function (e) {
        var items;
        function getItems() {
          var current  = $("#list > .current"),
              previous,
              next,
              items = $$("#list > li"),
              currentIndex;
          if (current === null) {
            return false;
          }
          if (items.length === 1) {
            previous = next = current;
          } else {
            items.some(function (e, i) {
              if (e.classList.contains("current")) {
                currentIndex = i;
              } else {
                return false;
              }
            });
            if (currentIndex === 0) {
              previous = items[items.length - 1];
              next     = items[currentIndex + 1];
            } else if (currentIndex === items.length - 1) {
              previous = items[currentIndex - 1];
              next     = items[0];
            } else {
              previous = items[currentIndex - 1];
              next     = items[currentIndex + 1];
            }
          }
          return [previous, current, next];
        }
        switch (e.detail.dir) {
        case 'E':
          items = getItems();
          if (items) {
            config.bookmarks[items[1].dataset.key] = window.scrollY / document.querySelector("[data-tile].shown").clientHeight;
            items[1].classList.add('hideRight');
            items[2].classList.add('showLeft');
            window.setTimeout(function () {
              items[1].classList.remove('current');
              items[1].classList.remove('hideRight');
              items[2].classList.remove('showLeft');
              window.articles.show(items[2].dataset.key);
            }, 500);
          }
          window.articles.ui.menu(false);
          break;
        case 'W':
          items = getItems();
          if (items) {
            config.bookmarks[items[1].dataset.key] = window.scrollY / document.querySelector("[data-tile].shown").clientHeight;
            items[1].classList.add('hideLeft');
            items[0].classList.add('showRight');
            window.setTimeout(function () {
              items[1].classList.remove('current');
              items[1].classList.remove('hideLeft');
              items[0].classList.remove('showRight');
              window.articles.show(items[0].dataset.key);
            }, 500);
          }
          window.articles.ui.menu(false);
          break;
        }
      }
    };
    if (config.gesture) {
      Gesture.attach(document.getElementById('articleShow'), gestureEvents);
    }
    checkbox = document.getElementById('prefGesture');
    checkbox.addEventListener('change', function () {
      if (checkbox.checked) {
        Gesture.attach(document.getElementById('articleShow'), gestureEvents);
      } else {
        Gesture.detach(document.getElementById('articleShow'), gestureEvents);
      }
    });
  }());
  // Delete article with left swipe in list
  Gesture.attach(document.getElementById('main'), {
    gesture: function (e) {
      var target;
      if (e.detail.dir === 'W') {
        target = utils.parent(e.detail.startTarget, function (e) { return typeof e.dataset.key !== 'undefined'; });
        if (target) {
          window.articles.delete(target.dataset.key, target.dataset.title);
        }
      }
    }
  });
  // }}
  // Tags {{
  (function () {
    var input = $('#tagTile [name=tagInput]');
    input.addEventListener('change', function () {
      tiles.back(input.value);
    });
    $('#tagList').addEventListener("click", function (event) {
      if (event.target.dataset && event.target.dataset.tag) {
        tiles.back(event.target.dataset.tag);
      }
    });
    $('#tagTile [name="save"]').addEventListener('click', function () {
      tiles.back(input.value);
    });
  }());
  // }}
  // Filters {{
  (function () {
    var filter = document.getElementById('listFilter');
    filter.addEventListener("input", window.articles.ui.updateFilter);
    filter.addEventListener("change", window.articles.ui.updateFilter);
    document.querySelector("#listFilter + button").addEventListener("click", function () {
      filter.value = '';
      window.articles.ui.updateFilter();
    });
  }());
  // }}
  // {{ Settings

  $('#rsLogin').addEventListener('change', function () {
    config.rs.login = this.value;
    remoteStorage.widget.view.form.userAddress.value = this.value;
  });
  function setState(state) {
    var actions = {
      "connect": $("#prefRS [data-method=connect]").classList,
      "disconnect": $("#settings [data-method=disconnect]").classList,
      "sync": $("#settings [data-method=sync]").classList,
      "reset": $("#settings [data-method=reset]").classList
    };
    switch (state) {
    case "initial":
      actions.connect.remove("hidden");
      actions.disconnect.add("hidden");
      actions.sync.add("hidden");
      //actions.reset.add("hidden");
      break;
    case "connected":
      actions.connect.add("hidden");
      actions.disconnect.remove("hidden");
      actions.sync.remove("hidden");
      //actions.reset.remove("hidden");
      break;
    default:
      utils.log("unknown state " + state, "warning");
    }
  }
  remoteStorage.on('ready', function () {
    utils.log(utils.format("Ready fired at %s", Math.round(window.performance.now())), "debug");
    setState(remoteStorage.remote.connected ? 'connected' : 'initial');
    window.alir.rs.status = 'ready';
  });
  remoteStorage.on('disconnected', function () {
    setState('initial');
  });
  setState('initial');
  $('#dropboxApiKey').addEventListener('change', function () {
    remoteStorage.setApiKeys('dropbox', {api_key: this.value});
    config.dropBox.apiKey = this.value;
  });
  $('#driveClientId').addEventListener('change', function () {
    remoteStorage.setApiKeys('googledrive', {client_id: this.value, api_key: $('#driveApiKey').value});
    config.google.clientId = this.value;
  });
  $('#driveApiKey').addEventListener('change', function () {
    remoteStorage.setApiKeys('googledrive', {client_id: $('#driveClientId').value, api_key: this.value});
    config.google.apiKey = this.value;
  });
  $('#prefMenuLeft').addEventListener('click', function () {
    if (this.checked) {
      document.body.classList.remove('menu-right');
      document.body.classList.add('menu-left');
      config.menu = true;
    } else {
      document.body.classList.remove('menu-left');
      document.body.classList.add('menu-right');
      config.menu = false;
    }
  });
  document.body.addEventListener('change', function (ev) {
    var val = ev.target.value;
    if (ev.target.dataset.target) {
      switch (ev.target.dataset.target) {
      case 'gesture':
        config.gesture = document.getElementById('prefGesture').checked;
        break;
      case 'vibrate':
        config.vibrate = document.getElementById('prefVibrate').checked;
        break;
      case 'lang':
        config.lang = val;
        document.webL10n.setLanguage(val);
        break;
      case 'logLevel':
        config.logLevel = val;
        utils.logLevel  = val;
        break;
      case 'theme':
        config.theme = val;
        window.alir.ui.setTheme(val);
        break;
      case 'proxy':
        config.proxy = val;
        break;
      }
    }
  });
  // }}
  // Left menu {{
  $('#menu').addEventListener('click', function (event) {
    var target = event.target,
        action = target.dataset.action;
    if (action === 'toggleMenu') {
      clicked(target);
      $('#menu').classList.toggle("show");
    }
  });
  // }}

  // Link share text {{
  (function () {
    var ta = document.getElementById('linkText'),
        l  = document.getElementById('linkTextLength');
    function onInput(event) {
      l.textContent = ta.value.length;
    }
    ta.addEventListener('change', onInput, false);
    ta.addEventListener('input', onInput, false);
  }());
  // }}

  // Manage scroll
  (function () {
    var height = document.querySelector("[data-tile].shown").clientHeight,
        scroll = $("#menu .scrollbar");
    //scroll.style.height = (window.innerHeight / document.querySelector("[data-tile].shown").clientHeight * 100) + '%';
    function checkSize() {
      var tile, h, header, hh, tmp;
      tile = document.querySelector("[data-tile].shown");
      header = document.querySelector('.shown > header,.shown > * > header');
      if (tile) {
        h = tile.clientHeight;
        if (header) {
          hh = header.getBoundingClientRect().bottom;
          tmp = (1 - (window.scrollY / (tile.clientHeight - document.body.clientHeight)));
          if (tmp < -0.5) {
            tmp = 1;
          }
          scroll.style.top = "calc(" + (hh * tmp) + "px + " + (window.scrollY / document.querySelector("[data-tile].shown").clientHeight * 100) + '%)';
        } else {
          scroll.style.top = (window.scrollY / document.querySelector("[data-tile].shown").clientHeight * 100) + '%';
        }
        if (h !== height || scroll.style.height === '') {
          height = h;
          if (header) {
            scroll.style.height = ((window.innerHeight - header.clientHeight - hh) / document.querySelector("[data-tile].shown").clientHeight * 100) + '%';
          } else {
            scroll.style.height = (window.innerHeight / document.querySelector("[data-tile].shown").clientHeight * 100) + '%';
          }
        }
      }
    }
    window.tiles.on('shown', checkSize);
    setInterval(checkSize, 250);
    document.addEventListener('scroll', checkSize);
  })();

  // Preferences
  (function () {
    ['gesture', 'vibrate'].forEach(function (pref) {
      var elmt = document.getElementById('pref' + pref[0].toUpperCase() + pref.substr(1));
      elmt.checked = config[pref];
    });
  }());

  function onHash() {
    var hash = window.location.hash.substr(1);
    if (tiles.exists(hash) && tiles.getCurrent() !== hash) {
      tiles.go(hash);
      return true;
    }
    return false;
  }
  window.addEventListener("hashchange", onHash, false);

  if (!onHash()) {
    // display default tile
    tiles.show('articleList');
  }
  if (typeof document.getElementById("authFrame").setVisible === "function") {
    // the application is installed, override auth methods
    (function () {
      var frame = document.getElementById("authFrame");
      frame.setVisible(false);
      function onLocationChange(e) {
        if (e.detail !== frame.getAttribute("src")) {
          frame.setAttribute("src", e.detail);
          RemoteStorage.Authorize._rs_init(remoteStorage);
          remoteStorage._emit("features-loaded");
          frame.removeEventListener('mozbrowserlocationchange', onLocationChange);
          tiles.back();
          frame.setVisible(false);
        }
      }
      remoteStorage.on('authing', function () {
        tiles.go("auth");
        frame.setVisible(true);
      });
      RemoteStorage.Authorize.getLocation = function () {
        var location = frame.getAttribute("src");
        if (location === null) {
          location = "http://localhost/";
        }
        return {
          href: location,
          toString: function () {
            return location;
          }
        };
      };
      RemoteStorage.Authorize.setLocation = function (location) {
        frame.setAttribute("src", location);
        frame.addEventListener('mozbrowserlocationchange', onLocationChange);
      };
    }());
  }
}
// }}

window.addEventListener('load', function () {
  //jshint maxstatements: 30
  "use strict";
  _ = document.webL10n.get;
  var hasPending = false;
  // Check if application is installed
  if (typeof navigator.mozHasPendingMessage === 'function' && typeof navigator.mozSetMessageHandler === 'function') {
    if (navigator.mozHasPendingMessage('alarm')) {
      utils.notify('Pending alarms');
      hasPending = true;
      navigator.mozSetMessageHandler("alarm", window.feeds.handleAlarmMessage);
    }
    if (navigator.mozHasPendingMessage('activity')) {
      utils.notify('Pending activity');
      hasPending = true;
      navigator.mozSetMessageHandler("activity", window.activityHandler);
    }
    if (navigator.mozHasPendingMessage('notification')) {
      utils.notify('Pending notification');
      hasPending = true;
      navigator.mozSetMessageHandler("notification", function (notification) {
        utils.log(notification, "debug");
      });
    }
  }

  remoteStorage.access.claim('alir', 'rw');
  remoteStorage.caching.enable('/alir/');
  window.alir.on('configLoaded', function () {
    //remoteStorage.enableLog();
    remoteStorage.displayWidget("rsWidget");
  });
  // config is loaded during initUI, so this must be registered BEFORE
  window.alir.on('configLoaded', function () {
    Object.keys(window.config.alarms).forEach(function (d) {
      window.alarms.set(new Date(d));
    });
    window.alarms.plan();
  });
  initUI();
  remoteStorage.alir.private.on('change', function onChange(ev) {
    var elmt, item, id;
    id = ev.relativePath.split('/').pop();
    if (typeof ev.oldValue === 'undefined' && typeof ev.newValue !== 'undefined') {
      //console.log("Create " + ev.relativePath);
      if (typeof ev.newValue.id === 'undefined') {
        ev.newValue.id = id;
      }
      if (typeof ev.newValue.type === 'undefined') {
        ev.newValue.type = ev.relativePath.split('/').shift();
      }
      displayItem(ev.newValue);
    } else if (typeof ev.oldValue !== 'undefined' && typeof ev.newValue === 'undefined') {
      //console.log("Delete " + ev.relativePath);
      elmt = document.getElementById(id);
      if (elmt) {
        elmt.parentNode.removeChild(elmt);
      }
      delete config.bookmarks[ev.relativePath];
    } else if (typeof ev.oldValue !== 'undefined' && typeof ev.newValue !== 'undefined') {
      //console.log("Update " + ev.relativePath);
      if (typeof ev.newValue.id === 'undefined') {
        ev.newValue.id = id;
      }
      if (typeof ev.newValue.type === 'undefined') {
        ev.newValue.type = ev.relativePath.split('/').shift();
      }
      item = displayItem(ev.newValue);
    }
  });
  window.tiles.on('shown', function (name) {
    if (name === 'settings') {
      document.body.classList.remove('error');
    }
  });
  //@TODO Remove this
  // This is just a migration step for previous contents
  /*
  (function () {
    remoteStorage.alir.private.getAll('').then(function (all) {
      if (typeof all === 'object') {
        Object.keys(all).forEach(function (key) {
          if (key.substr(-1) !== '/') {
            utils.log("Migrating article " + all[key].title, "info");
            all[key].id = key;
            remoteStorage.alir.saveArticle(all[key]);
            remoteStorage.alir.private.remove(key);
          }
        });
      } else {
        console.log('Nothing to migrate');
      }
    });
  }());
  */
  //window.alir.getAll();

});
window.addEventListener('unload', function () {
  "use strict";
  config.logs = document.getElementById('debugLog').innerHTML;
  config.first = false;
  if (config.testMode !== true) {
    localStorage.setItem('config', JSON.stringify(config));
  }
});
