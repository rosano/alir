/*jshint browser: true, devel: true */
/*global remoteStorage: true*/
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
        Object.keys(objects).forEach(function (key) {
          var obj   = objects[key],
              title = obj.title || key;
          listHtml += format('<li data-key="%s" data-context="%s" class="%s"><h2>%s</h2>', key, context, context, title);
          listHtml += '<p class="actions">';
          listHtml += format('<a class="button" data-key="%s" data-action="toggle" href="#">Toggle</a> ', key);
          listHtml += format('<a class="button" data-key="%s" data-action="delete" href="#">Delete</a> ', key);
          listHtml += '</p>';
          listHtml += format('<div class="content hidden"><a class="url" href="%s" target="_blank">%s</a><div class="html">%s</div></div></li>', obj.url || '#', obj.url || '', obj.html);
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
  // left menu actions
  menuActions = {
    create: function doCreate() {
      UI.list.classList.toggle('hidden');
      UI.input.classList.toggle('hidden');
      menuActions.toggleMenu();
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
    offline: function doOffline() {
      remoteStorage.alir.goOffline();
      UI.menu.offline.classList.toggle('hidden');
      UI.menu.online.classList.toggle('hidden');
      document.body.classList.toggle('online');
    },
    online: function doOnline() {
      remoteStorage.alir.goOnline();
      UI.menu.online.classList.toggle('hidden');
      UI.menu.offline.classList.toggle('hidden');
      document.body.classList.toggle('online');
    }
  };
  forElement('#menu .content [data-action]', function () {
    var elmt = arguments[0];
    UI.menu[elmt.dataset.action] = elmt;
  });

  UI.list.addEventListener('click', function onClick(event) {
    var target = event.target,
        context, key;
    if (target.dataset.action) {
      key = target.dataset.key;
      context = target.parentNode.parentNode.dataset.context;
      switch (target.dataset.action) {
      case 'toggle':
        Array.prototype.forEach.call($$('li[data-key]'), function (e) {
          e.classList.toggle('hidden');
        });
        $('[data-key="' + key + '"]').classList.toggle('hidden');
        $('[data-key="' + key + '"] .content').classList.toggle('hidden');
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
    UI.list.classList.toggle('hidden');
    UI.input.classList.toggle('hidden');
  });
  // }}
  // Left menu {{
  $('#menu').addEventListener('click', function (event) {
    var target = event.target,
        action = target.dataset.action;
    if (action && menuActions[action]) {
      menuActions[action]();
    } else {
      console.log("Unknown action", target.dataset.action, menuActions);
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
