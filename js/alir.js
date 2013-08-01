/*jshint browser: true, devel: true */
/*global remoteStorage: true*/
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
 */

var list = document.getElementById('list'),
    listHtml = '';

remoteStorage.defineModule('alir', function module(privateClient, publicClient) {
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
        privateClient.release('');
        publicClient.release('');
      },
      goOnline: function () {
        privateClient.use('');
        publicClient.use('');
      },
      private: privateClient,
      public: publicClient
    }
  };
});
// Common utilities {{{
function format(str) {
  "use strict";
  var params = Array.prototype.splice.call(arguments, 1);
  return (str.replace(/%s/g, function () {return params.shift(); }));
}
// }}}
function updateList() {
  "use strict";
  remoteStorage.alir.private.getAll('').then(function onAll(objectsPrivate) {
    remoteStorage.alir.public.getAll('').then(function onAll(objectsPublic) {
      function createList(objects, context) {
        /*jshint newcap: false*/
        Object.keys(objects).forEach(function (key) {
          var obj   = objects[key],
              title = obj.title || key,
              type, content;
          if (obj.html) {
            type    = 'html';
            try {
              content = HTMLtoXML(obj.html);
            } catch (e) {
              console.log('Error sanityzing ' + obj.title);
              content = "Content contains errors";
            }
          } else {
            type    = 'text';
            content = obj.text;
          }
          title = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          listHtml += format('<li data-key="%s" data-context="%s" class="%s"><h2 data-action="toggle">%s</h2>', key, context, context, title);
          listHtml += '<p class="actions">';
          listHtml += format('<a class="action-icon forward toggle" data-action="toggle" href="#"></a> ', key);
          listHtml += format('<a class="action-icon delete" data-action="delete" href="#"></a> ', key);
          listHtml += '</p>';
          listHtml += format('<div class="content"><a class="url" href="%s" target="_blank">%s</a><div class="%s">%s</div></div></li>', obj.url || '#', obj.url || '', type, content);
        });
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
  // left menu actions
  menuActions = {
    create: function doCreate() {
      menuActions.toggleMenu();
      displayTile('input');
    },
    toggleContent: function doToggle() {
      forElement('#list .content', function (e) {
        e.classList.add('hidden');
      });
      forElement('#list li[data-key]', function (e) {
        e.classList.remove('hidden');
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
        context, key, tmp, keyNode = target;
    if (target.dataset.action) {
      while (typeof keyNode.dataset.key === 'undefined' && keyNode.parentNode) {
        keyNode = keyNode.parentNode;
      }
      if (typeof keyNode.dataset.key !== 'undefined') {
        key = keyNode.dataset.key;
      }
      context = target.parentNode.parentNode.dataset.context;
      switch (target.dataset.action) {
      case 'toggle':
        Array.prototype.forEach.call($$('li[data-key]'), function (e) {
          e.classList.toggle('hidden');
        });
        $('[data-key="' + key + '"]').classList.toggle('hidden');
        $('[data-key="' + key + '"] .content').classList.toggle('hidden');
        tmp = $('[data-key="' + key + '"] .toggle').classList;
        tmp.toggle('back');
        tmp.toggle('forward');
        UI.menu.toggleContent.classList.toggle('hidden');
        break;
      case 'delete':
        if (window.confirm("Supprimer ???")) {
          remoteStorage.alir[context].remove(key);
        }
      }
    }
  });
  // input {{
  $('#input [name="public"]').addEventListener('click', function () {
    var obj = {
      id: $('#input [name="id"]').value,
      title: $('#input [name="title"]').value,
      html: $('#input [name="html"]').value
    };
    remoteStorage.alir.addPublic(obj);
    menuActions.create();
  });
  $('#input [name="private"]').addEventListener('click', function () {
    var obj = {
      id: $('#input [name="id"]').value,
      url: $('#input [name="url"]').value,
      title: $('#input [name="title"]').value,
      html: $('#input [name="html"]').value
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
}
// }}

initUI();

remoteStorage.claimAccess({ alir: 'rw' });
remoteStorage.displayWidget();
remoteStorage.alir.private.on('change', function onChange() {
  "use strict";
  console.log('change');
  updateList();
});
updateList();
