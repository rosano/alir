/*jshint browser: true, devel: true */
/*global remoteStorage: true*/
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
      add: function (trans) {
        var obj = privateClient.buildObject('article', trans);
        return privateClient.storeObject('article', obj.id, obj);
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
function format(str) {
  "use strict";
  var params = Array.prototype.splice.call(arguments, 1);
  return (str.replace(/%s/g, function () {return params.shift(); }));
}
function updateList() {
  "use strict";
  remoteStorage.alir.private.getAll('').then(function onAll(objects) {
    listHtml = '';
    Object.keys(objects).forEach(function (key) {
      var obj   = objects[key],
          title = obj.title || key;
      listHtml += format('<li data-key="%s"><h2>%s</h2>', key, title);
      listHtml += '<p class="actions">';
      listHtml += format('<a class="button" data-key="%s" data-action="toggle" href="#">Toggle</a> ', key);
      listHtml += format('<a class="button" data-key="%s" data-action="delete" href="#">Delete</a> ', key);
      listHtml += '</p>';
      listHtml += format('<div class="content hidden">%s</div></li>', obj.html);
    });
    list.innerHTML = listHtml;
  });
}
function initUI() {
  "use strict";
  list.addEventListener('click', function onClick(event) {
    var target = event.target,
        key;
    if (target.dataset.action) {
      key = target.dataset.key;
      switch (target.dataset.action) {
      case 'toggle':
        Array.prototype.forEach.call(document.querySelectorAll('li[data-key]'), function (e) {
          e.classList.toggle('hidden');
        });
        document.querySelector('[data-key="' + key + '"]').classList.toggle('hidden');
        document.querySelector('[data-key="' + key + '"] .content').classList.toggle('hidden');
        document.querySelector('#menu .toggle').classList.toggle('hidden');
        break;
      case 'delete':
        if (window.confirm("Supprimer ???")) {
          remoteStorage.alir.private.remove(key);
        }
      }
    }
  });
  // Left menu
  document.querySelector('#menu .slider').addEventListener('click', function toggleMenu() {
    document.querySelector('#menu').classList.toggle("show");
  });
  document.querySelector('#menu .toggle').addEventListener('click', function menuToggle() {
    Array.prototype.forEach.call(document.querySelectorAll('#list .content'), function (e) {
      e.classList.add('hidden');
    });
    Array.prototype.forEach.call(document.querySelectorAll('#list li[data-key]'), function (e) {
      e.classList.remove('hidden');
    });
    document.querySelector('#menu .toggle').classList.toggle('hidden');
    document.querySelector('#menu').classList.toggle("show");
  });
  // Force sync
  document.querySelector('#menu .sync').addEventListener('click', function menuSync() {
    document.body.classList.add('sync');
    remoteStorage.fullSync().then(function onSyncDone() {
      document.body.classList.remove('sync');
      window.alert('Synk ok');
    }, function onSynFail() {
      document.body.classList.remove('sync');
      window.alert('Synk ko');
    });
  });
  // Go offline
  document.querySelector('#menu .offline').addEventListener('click', function menuSync() {
    remoteStorage.alir.goOffline();
    document.querySelector('#menu .offline').classList.toggle('hidden');
    document.querySelector('#menu .online').classList.toggle('hidden');
    document.body.classList.toggle('online');
  });
  // Go online
  document.querySelector('#menu .online').addEventListener('click', function menuSync() {
    remoteStorage.alir.goOnline();
    document.querySelector('#menu .offline').classList.toggle('hidden');
    document.querySelector('#menu .online').classList.toggle('hidden');
    document.body.classList.toggle('online');
  });
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
