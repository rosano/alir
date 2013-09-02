/*jshint browser: true, devel: true */
/*global remoteStorage: true, RemoteStorage: true, HTMLtoXML: true, doT: true */
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
 * @TODO handle events
 * 'busy'
 * 'change'
 * 'conflict'
 * 'connect'
 * 'connected'
 * 'disconnect'
 * 'disconnected'
 * 'error'
 * 'ready'
 * 'reconnect'
 * 'state'
 * 'sync'
 * 'timeout'
 * 'unbusy'
 *
 * @TODO use notifications
 * https://developer.mozilla.org/en-US/docs/WebAPI/Using_Web_Notifications
 */

var templates = {},
    list = document.getElementById('list'),
    listHtml = '';

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
      }
    }
  });

  return {
    exports: {
      addPrivate: function (article) {
        var obj = privateClient.buildObject('article', article);
        return privateClient.storeObject('article', obj.id, obj);
      },
      addPublic: function (article) {
        var obj = publicClient.buildObject('article', article);
        return publicClient.storeObject('article', obj.id, obj);
      },
      goOffline: function () {
        // @FIXME this has little to do with offline
        remoteStorage.caching.disable('/alir/');
      },
      goOnline: function () {
        remoteStorage.caching.enable('/alir/');
      },
      private: privateClient,
      public: publicClient
    }
  };
});
function updateList() {
  "use strict";
  remoteStorage.alir.private.getAll('').then(function onAll(objectsPrivate) {
    remoteStorage.alir.public.getAll('').then(function onAll(objectsPublic) {
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
              url: obj.url || '#'
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
        } else {
          console.log('Unable to create list of undefined objects');
        }
      }
      listHtml = '';
      createList(objectsPublic, 'public');
      createList(objectsPrivate, 'private');
      list.innerHTML = listHtml;
    });
  });
}
function initUI() {
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
  function displayTile(name) {
    forElement('[data-tile]', function (e) {
      if (e.dataset.tile === name) {
        e.classList.remove('hidden');
      } else {
        e.classList.add('hidden');
      }
    });
  }
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
      displayTile('input');
    },
    toggleContent: function doToggle() {
      forElement('#list li[data-key]', function (e) {
        e.classList.remove('hidden');
        e.classList.remove('current');
      });
      UI.menu.toggleContent.classList.toggle('hidden');
      menuActions.toggleMenu();
    },
    toggleMenu: function doToggleMenu() {
      $('#menu').classList.toggle("show");
      document.body.classList.toggle("menu");
    },
    sync: function doSync() {
      document.body.classList.add('sync');
      remoteStorage.fullSync().then(function onSyncDone() {
        document.body.classList.remove('sync');
        window.alert('Synk ok');
      }, function onSynFail() {
        document.body.classList.remove('sync');
        window.alert('Synk ko');
      });
    },
    settings: function doMenu() {
      menuActions.toggleMenu();
      displayTile('settings');
    },
    offline: function doOffline() {
      remoteStorage.alir.goOffline();
      document.body.classList.toggle('online');
    },
    online: function doOnline() {
      remoteStorage.alir.goOnline();
      document.body.classList.toggle('online');
    },
    onoff: function doOnOff() {
      if (UI.menu.onoff.checked) {
        menuActions.offline();
      } else {
        menuActions.online();
      }
    }
  };
  forElement('#menu .content [data-action]', function () {
    var elmt = arguments[0];
    UI.menu[elmt.dataset.action] = elmt;
  });

  UI.list.addEventListener('click', function onClick(event) {
    var target = event.target,
        context, key, tmp, keyNode = target, parent;
    if (target.dataset.action) {
      while (typeof keyNode.dataset.key === 'undefined' && keyNode.parentNode) {
        keyNode = keyNode.parentNode;
      }
      if (typeof keyNode.dataset.key !== 'undefined') {
        key = keyNode.dataset.key;
      }
      parent  = target;
      while (typeof parent.dataset.context === 'undefined' && parent.parentNode) {
        parent = parent.parentNode;
      }
      context = parent.dataset.context;
      switch (target.dataset.action) {
      case 'toggle':
        Array.prototype.forEach.call($$('li[data-key]'), function (e) {
          e.classList.toggle('hidden');
        });
        tmp = $('[data-key="' + key + '"]').classList;
        tmp.toggle('hidden');
        tmp.toggle('current');
        tmp = $('[data-key="' + key + '"] .toggle').classList;
        tmp.toggle('back');
        tmp.toggle('forward');
        UI.menu.toggleContent.classList.toggle('hidden');
        break;
      case 'delete':
        if (window.confirm("Supprimer ???")) {
          remoteStorage.alir[context].remove(key);
        }
        break;
      case 'compose':
        remoteStorage.alir[context].getObject(key).then(function (object) {
          console.log(object);
          $('#input [name="id"]').value    = key;
          $('#input [name="title"]').value = object.title;
          $('#input [name="url"]').value   = object.url;
          $('#input [name="text"]').value  = object.text;
          displayTile('input');
        });
        break;
      }
    }
  });
  // input {{
  $('#input [name="public"]').addEventListener('click', function () {
    var obj = {
      id: $('#input [name="id"]').value,
      title: $('#input [name="title"]').value,
      text: $('#input [name="text"]').value
    };
    remoteStorage.alir.addPublic(obj);
    menuActions.create();
  });
  $('#input [name="private"]').addEventListener('click', function () {
    var obj = {
      id: $('#input [name="id"]').value,
      url: $('#input [name="url"]').value,
      title: $('#input [name="title"]').value,
      text: $('#input [name="text"]').value
    };
    remoteStorage.alir.addPrivate(obj);
    menuActions.create();
  });
  $('#input [name="cancel"]').addEventListener('click', function () {
    displayTile('list');
  });
  // }}
  // {{ Settings
  $('#settings [name="cancel"]').addEventListener('click', function () {
    displayTile('list');
  });
  $('#settings [name="install"]').addEventListener('click', function () {
    var request = window.navigator.mozApps.install("http://alir.clochix.net/manifest.webapp");
    request.onerror = function () {
      window.alert("Error");
      console.log(this.error, 'error');
    };
    request.onsuccess = function () {
      window.alert("Yeah");
      displayTile('list');
    };
  });
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
}
// }}

/*
window.addEventListener('load', function () {
  "use strict";
  if (Notification && Notification.permission !== "granted") {
    Notification.requestPermission(function (status) {
      // This allows to use Notification.permission with Chrome/Safari
      if (Notification.permission !== status) {
        Notification.permission = status;
      }
    });
  }
});
*/

initUI();

remoteStorage.access.claim('alir', 'rw');
remoteStorage.displayWidget();
remoteStorage.alir.private.on('change', function onChange(ev) {
  "use strict";
  //console.log('change');
  //console.log(ev);
  updateList();
});
updateList();
