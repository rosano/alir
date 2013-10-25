/*jshint browser: true, devel: true */
/*global remoteStorage: true, RemoteStorage: true, HTMLtoXML: true, doT: true, Gesture: true */
/**
    Alir
    Copyright (C) {2013}  {Clochix}

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

var templates = {},
    list = document.getElementById('list'),
    listHtml = '',
    config,
    tiles;
config = {
  gesture: false,
  dropBox: {
    apiKey: ''
  },
  google: {
    clientId: '',
    apiKey: ''
  }
};


var utils = {
  device: {
    type: '',
    orientation: ''
  },
  logLevel: 'debug',
  logLevels: ['debug', 'info', 'warning', 'error'],
  // @src http://blog.snowfinch.net/post/3254029029/uuid-v4-js
  // @licence Public domain
  uuid : function uuid() {
    /*jshint bitwise: false */
    "use strict";
    var id = "", i, random;
    for (i = 0; i < 32; i++) {
      random = Math.random() * 16 | 0;
      if (i === 8 || i === 12 || i === 16 || i === 20) {
        id += "-";
      }
      id += (i === 12 ? 4 : (i === 16 ? (random & 3 | 8) : random)).toString(16);
    }
    return id;
  },
  format:  function format(str) {
    "use strict";
    var params = Array.prototype.splice.call(arguments, 1);
    return (str.replace(/%s/g, function () {return params.shift(); }));
  },
  log: function log() {
    "use strict";
    var level    = arguments[arguments.length - 1],
        levelNum = utils.logLevels.indexOf(level);
    if (levelNum === -1) {
      console.log("Unknown log level " + level);
    }
    if (levelNum >= utils.logLevels.indexOf(utils.logLevel)) {
      console.log('[' + level + '] ' + utils.format.apply(utils, arguments));
    }
  },
  createXPathFromElement: function createXPathFromElement(elm) {
    // source: http://stackoverflow.com/a/5178132
    //jshint maxcomplexity: 10
    "use strict";
    var allNodes = document.getElementsByTagName('*'),
        uniqueIdCount,
        i, n,
        sib, segs;
    for (segs = []; elm && elm.nodeType === 1; elm = elm.parentNode) {
      if (elm.hasAttribute('id')) {
        uniqueIdCount = 0;
        for (n = 0;n < allNodes.length;n++) {
          if (allNodes[n].hasAttribute('id') && allNodes[n].id === elm.id) {
            uniqueIdCount++;
          }
          if (uniqueIdCount > 1) {
            break;
          }
        }
        if (uniqueIdCount === 1) {
          segs.unshift('id("' + elm.getAttribute('id') + '")');
          return segs.join('/');
        } else {
          segs.unshift(elm.localName.toLowerCase() + '[@id="' + elm.getAttribute('id') + '"]');
        }
      } else if (elm.hasAttribute('class')) {
        segs.unshift(elm.localName.toLowerCase() + '[@class="' + elm.getAttribute('class') + '"]');
      } else {
        for (i = 1, sib = elm.previousSibling; sib; sib = sib.previousSibling) {
          if (sib.localName === elm.localName) {
            i++;
          }
        }
        segs.unshift(elm.localName.toLowerCase() + '[' + i + ']');
      }
    }
    return segs.length ? '/' + segs.join('/') : null;
  }
};
function Tiles(global) {
  "use strict";
  var current,
      tiles = [];
  return {
    show: function (name) {
      Array.prototype.forEach.call(document.querySelectorAll('[data-tile]'), function (e) {
        if (e.dataset.tile === name) {
          e.classList.remove('hidden');
          window.scrollTo(0, 0);
          current = name;
        } else {
          e.classList.add('hidden');
        }
      });
    },
    go: function (name) {
      tiles.push({name: current, y: window.scrollY});
      this.show(name);
    },
    back: function () {
      var next = tiles.pop();
      this.show(next.name);
      window.scrollTo(0, next.y);
    }
  };
}
tiles = new Tiles();
/*
(function () {
  "use strict";
  var l = console.log;
  console.log = function log() {
    l.apply(console, arguments);
    if (Notification && Notification.permission === "granted") {
      var n = new Notification(arguments[0]);
    }
  };
})();
*/

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
      "flags": {
        "type": "object"
      }
    }
  });

  return {
    exports: {
      addPrivate: function (article) {
        return privateClient.storeObject('article', article.id, article);
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
function updateList() {
  "use strict";
  function createList(objects, context) {
    /*jshint newcap: false*/
    if (typeof objects === "object") {
      Object.keys(objects).forEach(function (key) {
        var obj   = objects[key],
            title = obj.title || key,
            datas = {};
        datas = {
          key: key,
          context: context,
          title: title.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
          url: obj.url || '#',
          tags: Array.isArray(obj.tags) ? obj.tags.join(',') : '',
          flags: typeof obj.flags === 'object' ? Object.keys(obj.flags).filter(function (e) { return obj.flags[e] === true; }).join(',') : ''
        };
        if (obj.html) {
          datas.type = 'html';
          try {
            datas.content = HTMLtoXML(obj.html);
          } catch (e) {
            console.log('Error sanityzing ' + obj.title);
            datas.content = "Content contains errors";
          }
        } else {
          datas.type = 'text';
          datas.content = obj.text;
        }

        listHtml += templates.item(datas);
      });
    //} else {
    // No object in this context
    //  console.log('Unable to create list of undefined objects for context ' + context);
    }
  }
  remoteStorage.alir.private.getAll('').then(function onAll(objectsPrivate) {
    //remoteStorage.alir.public.getAll('').then(function onAll(objectsPublic) {
    listHtml = document.querySelector('#list > li:nth-of-type(1)').outerHTML + "\n";
    //createList(objectsPublic, 'public');
    createList(objectsPrivate, 'private');
    list.classList.add('list');
    list.classList.remove('detail');
    list.innerHTML = listHtml;
    //});
  });
}
function initUI() {
  // jshint maxstatements: 40
  "use strict";
  var $  = function (sel) {return document.querySelector.call(document, sel); },
      $$ = function (sel) {return document.querySelectorAll.call(document, sel); },
      forElement = function (sel, fct) {Array.prototype.forEach.call(document.querySelectorAll(sel), fct); },
      UI = {},
      menuActions = {};
  UI = {
    input: $('#input'),
    list: $('#list'),
    menu: {}
  };
  // reload configuration
  (function () {
    var conf = localStorage.getItem('config');
    if (conf) {
      config = JSON.parse(conf);
      if (!config.dropbox) {
        config.dropbox = {
          apiKey: ''
        };
      }
      if (config.dropbox.apiKey) {
        $('#dropboxApiKey').value = config.dropbox.apiKey;
        remoteStorage.setApiKeys('dropbox', {api_key: config.dropbox.apiKey});
      }
      if (!config.google) {
        config.google = {
          clientId: '',
          apiKey: ''
        };
      }
      if (config.google.apiKey && config.google.clientId) {
        $('#driveClientId').value = config.goole.clientId;
        $('#driveApiKey').value   = config.google.apiKey;
        remoteStorage.setApiKeys('googledrive', {client_id: config.google.clientId, api_key: config.google.apiKey});
      }
    }
  }());

  forElement('form', function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      return false;
    });
  });
  // left menu actions
  menuActions = {
    create: function doCreate() {
      menuActions.toggleMenu();
      $('#input [name="id"]').value    = utils.uuid();
      $('#input [name="url"]').value   = "";
      $('#input [name="title"]').value = "";
      $('#input [name="text"]').value  = "";
      tiles.show('input');
    },
    toggleContent: function doToggle() {
      var cl = $('#menu').classList;
      cl.toggle("detail");
      cl.toggle("list");
      cl = $('#list').classList;
      cl.toggle("detail");
      cl.toggle("list");
      forElement('#list li[data-key]', function (e) {
        e.classList.remove('hidden');
        e.classList.remove('current');
      });
      menuActions.toggleMenu();
    },
    toggleMenu: function doToggleMenu() {
      $('#menu').classList.toggle("show");
      document.body.classList.toggle("menu");
    },
    sync: function doSync() {
      remoteStorage.sync().then(function onSyncDone() {
        window.alert('Synk ok');
      }, function onSynFail() {
        window.alert('Synk ko');
      });
    },
    settings: function doMenu() {
      menuActions.toggleMenu();
      tiles.show('settings');
    },
    offline: function doOffline() {
      remoteStorage.alir.goOffline();
      document.body.classList.remove('online');
    },
    online: function doOnline() {
      remoteStorage.alir.goOnline();
      document.body.classList.add('online');
    },
    onoff: function doOnOff() {
      if (document.body.classList.contains('online')) {
        menuActions.offline();
      } else {
        if (remoteStorage.connected) {
          menuActions.online();
        } else {
          window.alert('Not connected');
        }
      }
    },
  };
  forElement('#menu .content [data-action]', function () {
    var elmt = arguments[0];
    UI.menu[elmt.dataset.action] = elmt;
  });
  if (!remoteStorage.connected) {
    document.body.classList.remove('online');
  }
  remoteStorage.on("disconnected", function (e) {
    document.body.classList.remove('online');
  });
  remoteStorage.on("sync-busy", function (e) {
    document.body.classList.add('sync');
  });
  remoteStorage.on("sync-done", function (e) {
    document.body.classList.remove('sync');
  });

  remoteStorage.on("features-loaded", function (e) {
    var features = [];
    remoteStorage.features.forEach(function (feature) {
      if (feature.supported === true) {
        features.push(feature.name);
      }
    });
    if (features.indexOf('Dropbox') !== -1) {
      $('#prefDropbox').style.display = '';
    } else {
      $('#prefDropbox').style.display = 'none';
    }
    if (features.indexOf('GoogleDrive') !== -1) {
      $('#prefDrive').style.display = '';
    } else {
      $('#prefDrive').style.display = 'none';
    }

  });
  //remoteStorage.on("ready", function (e) { });
  //UI.list.addEventListener('contextmenu', function (e) {
  //  window.alert(utils.createXPathFromElement(e.originalTarget));
  //});
  function toggleItem(key) {
    var clItem = $('[data-key="' + key + '"]').classList,
        clMenu = $('#menu').classList,
        clList = $('#list').classList;
    clMenu.toggle("detail");
    clMenu.toggle("list");
    clList.toggle("detail");
    clList.toggle("list");
    Array.prototype.forEach.call($$('li[data-key]'), function (e) {
      e.classList.toggle('hidden');
    });
    clItem.toggle('hidden');
    clItem.toggle('current');
    $('#menu .content .top').href = '#' + key;
  }
  UI.list.addEventListener('click', function onClick(event) {
    /*jshint maxcomplexity: 13 */
    var target = event.target,
        context, key, keyNode = target, parent;
    if (target.dataset && target.dataset.action) {
      while (keyNode.id !== 'list' && typeof keyNode.dataset.key === 'undefined' && keyNode.parentNode) {
        keyNode = keyNode.parentNode;
      }
      if (typeof keyNode.dataset.key !== 'undefined') {
        key = keyNode.dataset.key;
      }
      parent = target;
      while (parent.id !== 'list' && typeof parent.dataset.context === 'undefined' && parent.parentNode) {
        parent = parent.parentNode;
      }
      context = parent.dataset.context;
      switch (target.dataset.action) {
      case 'archive':
        (function () {
          var tags = keyNode.dataset.tags.split(','),
              i    = tags.indexOf('archive');
          if (i !== -1) {
            tags.splice(i, 1);
            keyNode.dataset.tags = tags.join(',');
          } else {
            tags.splice(1, 0, 'archive');
            keyNode.dataset.tags = tags.join(',').replace(',,,', ',,');
          }
          remoteStorage.get('/alir/' + key).then(function (err, article, contentType, revision) {
            if (err !== 200) {
              window.alert(err);
            } else {
              article.tags = tags.filter(function (t) {return t !== ''; });
              remoteStorage.put('/alir/' + key, article, contentType).then(function (err) {
                if (err !== 200) {
                  window.alert(err);
                }
              });
            }
          });
        }());
        break;
      case 'filterArchive':
        $('#list').classList.toggle('archives');
        break;
      case 'toggle':
        toggleItem(key);
        break;
      case 'delete':
        if (window.confirm("Supprimer ???")) {
          remoteStorage.alir[context].remove(key);
        }
        toggleItem(key);
        break;
      case 'compose':
        remoteStorage.alir[context].getObject(key).then(function (object) {
          $('#input [name="id"]').value    = key;
          $('#input [name="title"]').value = object.title;
          $('#input [name="url"]').value   = object.url;
          $('#input [name="text"]').value  = object.text;
          tiles.show('input');
        });
        break;
      }
    }
  });
  if (config.gesture) {
    Gesture.attach(UI.list, {
      gesture: function (e) {
        var items;
        function getItems() {
          var current  = $("#list > .current"),
              previous,
              next,
              items = [].slice.call($$("#list > li")),
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
        console.log(e.detail.dir);
        switch (e.detail.dir) {
        case 'E':
          items = getItems();
          if (items) {
            window.scroll(0, 0);
            items[1].classList.add('hideRight');
            items[2].classList.add('showLeft');
            window.setTimeout(function () {
              items[1].classList.remove('current');
              items[1].classList.remove('hideRight');
              items[1].classList.add('hidden');
              items[2].classList.remove('hidden');
              items[2].classList.remove('showLeft');
              items[2].classList.add('current');
            }, 500);
          }
          break;
        case 'W':
          items = getItems();
          if (items) {
            window.scroll(0, 0);
            items[1].classList.add('hideLeft');
            items[0].classList.add('showRight');
            window.setTimeout(function () {
              items[1].classList.remove('current');
              items[1].classList.remove('hideLeft');
              items[1].classList.add('hidden');
              items[0].classList.remove('hidden');
              items[0].classList.remove('showRight');
              items[0].classList.add('current');
            }, 500);
          }
          break;
        }
      }
    });
  }
  // input {{
  $('#input [name="save"]').addEventListener('click', function () {
    var id = $('#input [name="id"]').value,
        obj;

    if (id) {
      // update
      remoteStorage.get('/alir/' + id).then(function (err, article, contentType, revision) {
        if (err !== 200) {
          window.alert(err);
          tiles.show('list');
        } else {
          article.url   = $('#input [name="url"]').value;
          article.title = $('#input [name="title"]').value;
          article.text  = $('#input [name="text"]').value;
          remoteStorage.put('/alir/' + id, article, contentType).then(function (err) {
            if (err !== 200) {
              window.alert(err);
            }
            tiles.show('list');
          });
        }
      });
    } else {
      // create
      obj = {
        id: id,
        url: $('#input [name="url"]').value,
        title: $('#input [name="title"]').value,
        text: $('#input [name="text"]').value,
        flags: {
          editable: true
        }
      };
      remoteStorage.alir.addPrivate(obj);
      tiles.show('list');
    }
  });
  // }}
  // {{ Settings

  $('#settings [name="done"]').addEventListener('click', function () {
    tiles.show('list');
  });
  $('#settings [name="inspect"]').addEventListener('click', function () {
    remoteStorage.inspect();
  });
  $('#dropboxApiKey').addEventListener('change', function () {
    remoteStorage.setApiKeys('dropbox', {api_key: this.value});
    //remoteStorage.widget.view.reload();
    config.dropbox.apiKey = this.value;
  });
  $('#driveClientId').addEventListener('change', function () {
    remoteStorage.setApiKeys('googledrive', {client_id: this.value, api_key: $('#driveApiKey').value});
    //remoteStorage.widget.view.reload();
    config.google.clientId = this.value;
  });
  $('#driveApiKey').addEventListener('change', function () {
    remoteStorage.setApiKeys('googledrive', {client_id: $('#driveClientId').value, api_key: this.value});
    //remoteStorage.widget.view.reload();
    config.google.apiKey = this.value;
  });
  $('#prefMenuLeft').addEventListener('click', function () {
    if (this.checked) {
      document.body.classList.remove('menu-right');
      document.body.classList.add('menu-left');
    } else {
      document.body.classList.remove('menu-left');
      document.body.classList.add('menu-right');
    }
  });
  /*
  $('#settings [name="install"]').addEventListener('click', function () {
    var request = window.navigator.mozApps.install("http://alir.clochix.net/manifest.webapp");
    request.onerror = function () {
      window.alert("Error");
      console.log(this.error, 'error');
    };
    request.onsuccess = function () {
      window.alert("Yeah");
      tiles.show('list');
    };
  });
  */
  // }}
  // Left menu {{
  $('#menu').addEventListener('click', function (event) {
    var target = event.target,
        action = target.dataset.action;
    if (action && menuActions[action]) {
      menuActions[action]();
    }
  });
  // }}
  // Prepare templates
  templates.item = doT.template($('#tmpl-item').innerHTML);


  // Manage scroll
  (function () {
    var height = document.body.clientHeight,
        scroll = $("#menu .scrollbar");
    scroll.style.height = (window.innerHeight / document.body.clientHeight * 100) + '%';
    setInterval(function checkSize() {
      var h = document.body.clientHeight;
      if (h !== height) {
        height = h;
        scroll.style.height = (window.innerHeight / document.body.clientHeight * 100) + '%';
        scroll.style.top = (window.scrollY / document.body.clientHeight * 100) + '%';
      }
    }, 250);
    window.onscroll = function () {
      scroll.style.top = (window.scrollY / document.body.clientHeight * 100) + '%';
    };
  })();

  // Preferences
  (function () {
    var gesture = document.getElementById('prefGesture');
    gesture.checked = config.gesture;
    console.log(config);
    gesture.addEventListener('change', function () {
      config.gesture = gesture.checked;
    });
  }());


  tiles.show('list');
}
// }}

window.addEventListener('load', function () {
  "use strict";
  initUI();
  remoteStorage.enableLog();
  remoteStorage.access.claim('alir', 'rw');
  remoteStorage.caching.enable('/alir/');
  //remoteStorage.caching.enable('/public/alir/');
  remoteStorage.displayWidget();
  remoteStorage.alir.private.on('change', function onChange(ev) {
    updateList();
  });
  updateList();
/*
  if (Notification && Notification.permission !== "granted") {
    Notification.requestPermission(function (status) {
      // This allows to use Notification.permission with Chrome/Safari
      if (Notification.permission !== status) {
        Notification.permission = status;
      }
    });
  }
*/
});
window.addEventListener('unload', function () {
  "use strict";
  localStorage.setItem('config', JSON.stringify(config));
});
remoteStorage.remote.on("connected", function (e) {
  "use strict";
  document.getElementById('prefToken').value = remoteStorage.remote.token;
  document.body.classList.add('online');
});

