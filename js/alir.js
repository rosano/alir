/*jshint browser: true, devel: true */
/*global remoteStorage: true, RemoteStorage: true, HTMLtoXML: true, Gesture: true */
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

var list = document.getElementById('list'),
    config,
    tiles,
    tags = [];
config = {
  gesture: false,
  dropBox: {
    apiKey: ''
  },
  google: {
    clientId: '',
    apiKey: ''
  },
  lang: 'en-US'
};
var _ = document.webL10n.get;


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
  trim: function trim(str) {
    "use strict";
    return str.replace(/^\s+/, '').replace(/\s+$/, '');
  },
  log: function log() {
    "use strict";
    var args = Array.prototype.slice.call(arguments),
        level,
        levelNum,
        message;
    if (args.length > 1) {
      level = args.pop();
    } else {
      level = "info";
    }
        levelNum = utils.logLevels.indexOf(level);
    if (levelNum === -1) {
      console.log("Unknown log level " + level);
    }
    if (levelNum >= utils.logLevels.indexOf(utils.logLevel)) {
      if (args.length === 1) {
        message = args[0];
        if (typeof message === 'object') {
          message = JSON.stringify(message, null, '  ');
        }
      } else {
        message = utils.format.apply(null, args);
      }
      document.getElementById('debugLog').innerHTML += utils.format('<span class="%s">[%s][%s]</span> %s\n', level, new Date().toISOString().substr(11, 8), level + new Array(10 - level.length).join(' '), message);
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
          e.classList.add('shown');
          window.scrollTo(0, 0);
          current = name;
        } else {
          e.classList.remove('shown');
        }
      });
    },
    go: function (name, cb) {
      tiles.push({name: current, y: window.scrollY, cb: cb});
      this.show(name);
    },
    back: function (res) {
      var next = tiles.pop();
      this.show(next.name);
      if (typeof next.cb === 'function') {
        next.cb(res);
      }
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
/**
 * My own mini-templating system
 *
 * @param {String} sel  selector of the template
 * @param {Object} data data to populate the template
 *
 * @return {DOMDocumentFragment}
 */
function template(sel, data) {
  "use strict";
  var re  = new RegExp("{{(=.*?)}}", 'g'),
      frag,
      xpathResult,
      i, j, elmt, name, value;
  function repl(match) {
    var res = data, tmp, expr, fct;
    match = match.substr(3, match.length - 5);
    tmp = match.split('|');
    expr = utils.trim(tmp.shift()).split('.');
    while (res && expr.length > 0) {
      res = res[expr.shift()];
    }
    if (tmp.length > 0) {
      while ((fct = tmp.shift()) !== undefined) {
        switch (utils.trim(fct).toLowerCase()) {
        case "tolowercase":
          res = res.toLowerCase();
          break;
        default:
          console.log("Unknown template function " + fct);
        }
      }
    }
    return res;
  }
  frag = document.querySelector(sel).cloneNode(true);
  xpathResult = document.evaluate('//*[contains(@*, "{{=")]', frag, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
  for (i = 0; i < xpathResult.snapshotLength; i++) {
    elmt = xpathResult.snapshotItem(i);
    for (j = 0; j < elmt.attributes.length; j++) {
      name  = elmt.attributes[j].name;
      value = elmt.attributes[j].value;
      elmt.attributes[name].value = value.replace(re, repl);
    }
  }
  xpathResult = document.evaluate('//*[contains(., "{{=")]', frag, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
  for (i = 0; i < xpathResult.snapshotLength; i++) {
    elmt = xpathResult.snapshotItem(i);
    elmt.innerHTML = elmt.innerHTML.replace(re, repl);
  }
  return frag.children[0];
}


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
      }
    }
  });

  return {
    exports: {
      savePrivate: function (article) {
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
/**
 * Convert a string into a DOM tree
 *
 * @param {String} str
 *
 * @return {DOMNode}
 *
 * @TODO Improve sanitizing
 */
function toDom(str) {
  /*jshint newcap: false*/
  "use strict";
  var sandbox = document.createElement('div');
  try {
    sandbox.innerHTML = HTMLtoXML(str);
    Array.prototype.forEach.call(sandbox.querySelectorAll('script, style'), function (e) {
      e.parentNode.removeChild(e);
    });
    Array.prototype.forEach.call(sandbox.querySelectorAll('* [id]'), function (e) {
      e.removeAttribute('id');
    });
    Array.prototype.forEach.call(sandbox.querySelectorAll('* [class]'), function (e) {
      e.removeAttribute('class');
    });
    Array.prototype.forEach.call(sandbox.querySelectorAll('* [style]'), function (e) {
      e.removeAttribute('style');
    });
    Array.prototype.forEach.call(sandbox.querySelectorAll('* a[href]'), function (e) {
      e.setAttribute('target', '_blank');
    });
    return sandbox.innerHTML;
  } catch (e) {
    console.log('Error sanityzing: ' + e);
    return _('contentError');
  }
}
function insertInList(list, selector, item, comp) {
  "use strict";
  var nextNode;
  Array.prototype.slice.call(list.querySelectorAll(selector)).some(function (e) {
    if (comp(e)) {
      nextNode = e;
      return true;
    }
  });
  if (typeof nextNode === 'undefined') {
    list.appendChild(item);
  } else {
    list.insertBefore(item, nextNode);
  }
}
/**
 * Add an item to the content list
 *
 * @param {Object} obj
 *
 */
function displayItem(obj) {
  //jshint maxstatements: 30
  "use strict";
  var title = obj.title || obj.id,
      data  = {},
      item,
      tagsNode;
  if (typeof obj.notes !== 'object') {
    obj.notes = {};
  }
  if (typeof obj.date === 'undefined') {
    obj.date = new Date().toISOString();
  } else {
    try {
      obj.date = new Date(obj.date).toISOString();
    } catch (e) {
      console.log(obj.date);
    }
  }
  data = {
    key: obj.id,
    context: 'private',
    hasNotes: Object.keys(obj.notes).length > 0 ? 'hasNotes' : '',
    title: title.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
    url: obj.url || '#',
    date: obj.date,
    tags: Array.isArray(obj.tags) ? obj.tags.join(',') : '',
    notes: Object.keys(obj.notes).map(function (e, i) { return {id: e, url: obj.id + '/' + e}; }),
    flags: typeof obj.flags === 'object' ? Object.keys(obj.flags).filter(function (e) { return obj.flags[e] === true; }).join(',') : ''
  };
  if (obj.html) {
    data.type = 'html';
    data.content = toDom(obj.html);
  } else {
    data.type = 'text';
    data.content = obj.text;
  }
  item = template('#tmpl-item', data);
  // Notes {{
  if (typeof obj.notes === 'object') {
    Object.keys(obj.notes).forEach(function (noteId, i) {
      var note   = obj.notes[noteId],
          target = document.evaluate(note.xpath, item, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue,
          a;
      if (target) {
        a = document.createElement('a');
        a.setAttribute('class', 'note icon-tag');
        a.setAttribute('data-note', noteId);
        a.setAttribute('href', '#' + obj.id + '/' + noteId);
        target.insertBefore(a, target.firstChild);
      } else {
        console.log("Unable to evaluate xpath " + note.xpath);
      }
    });
  }
  // }}
  // Tags {{
  if (Array.isArray(obj.tags) && obj.tags.length > 0) {
    tagsNode = item.querySelector('.tags');
    obj.tags.forEach(function (tag) {
      var elmt = template('#tmpl-tag', {tag: tag});
      tagsNode.appendChild(elmt);
      if (tags.indexOf(tag) === -1) {
        tags.push(tag);
        (function (tag) {
          var elmt = document.createElement('li');
          elmt.dataset.tag = tag;
          elmt.textContent = tag;
          insertInList(document.getElementById('tagList'), "li", elmt, function (e) { return (e.dataset.tag > tag); });
        })(tag);
      }
    });
  }
  // }}
  // Sort items by date {{
  // @TODO allow multiple sorts
  insertInList(list, "[data-key]", item, function (e) { return (e.dataset.date > obj.date); });
  // }}

  return item;
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
      if (typeof config.lang !== 'undefined') {
        $('#settingsLang select').value = config.lang;
        document.webL10n.setLanguage(config.lang);
      }
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
      $('#input [name="id"]').value    = "";
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
        window.alert(_('syncOk'));
      }, function onSynFail() {
        window.alert(_('syncKo'));
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
          window.alert(_('notConnected'));
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
  function onContentEvent(event) {
    var target = event.target,
        ce, parent;
    ce = {
      action: target.dataset.action,
      actionTarget: target.dataset.target,
      keyNode: target
    };
    while (ce.keyNode.id !== 'list' && typeof ce.keyNode.dataset.key === 'undefined' && ce.keyNode.parentNode) {
      if (typeof ce.action === 'undefined' && typeof ce.keyNode.action !== 'undefined' && typeof ce.dataset !== 'undefined') {
        ce.action       = ce.dataset.action;
        ce.actionTarget = ce.dataset.target;
      }
      ce.keyNode = ce.keyNode.parentNode;
    }
    if (typeof ce.keyNode.dataset.key !== 'undefined') {
      ce.key = ce.keyNode.dataset.key;
    }
    parent = target;
    while (parent.id !== 'list' && typeof parent.dataset.context === 'undefined' && parent.parentNode) {
      parent = parent.parentNode;
    }
    ce.context = parent.dataset.context;
    if (target.dataset.note) {
      ce.action = 'note';
      ce.noteId = target.dataset.note;
    }
    return ce;
  }
  UI.list.addEventListener('click', function onClick(event) {
    //jshint maxcomplexity: 12
    var ce = onContentEvent(event);
    function switchTag(tag) {
      var tags = ce.keyNode.dataset.tags.split(',').filter(function (e) { return e !== ''; }),
          i    = tags.indexOf(tag);
      if (i !== -1) {
        tags.splice(i, 1);
        ce.keyNode.dataset.tags = ',' + tags.join(',') + ',';
      } else {
        tags.splice(1, 0, tag);
        ce.keyNode.dataset.tags = ',' + tags.join(',').replace(',,,', ',,') + ',';
      }
      remoteStorage.get('/alir/' + ce.key).then(function (err, article, contentType, revision) {
        if (err !== 200) {
          window.alert(err);
        } else {
          article.id   = ce.key;
          article.tags = tags.filter(function (t) {return t !== ''; });
          remoteStorage.alir.savePrivate(article);
        }
      });
    }
    if (ce.action) {
      switch (ce.action) {
      case 'archive':
        switchTag('archive');
        break;
      case 'filterArchive':
        $('#list').classList.toggle('archives');
        break;
      case 'toggle':
        toggleItem(ce.key);
        break;
      case 'delete':
        if (window.confirm(_('confirmDelete'))) {
          remoteStorage.alir[ce.context].remove(ce.key);
        }
        toggleItem(ce.key);
        break;
      case 'compose':
        remoteStorage.alir[ce.context].getObject(ce.key).then(function (object) {
          $('#input [name="id"]').value    = ce.key;
          $('#input [name="title"]').value = object.title;
          $('#input [name="url"]').value   = object.url;
          $('#input [name="text"]').value  = object.text;
          tiles.show('input');
        });
        break;
      case 'note':
        remoteStorage.get('/alir/' + ce.key).then(function (err, article, contentType, revision) {
          if (err !== 200) {
            window.alert(err);
          } else {
            // @TODO: sanitize
            $('#noteView .content').textContent     = article.notes[ce.noteId].content;
            $('#noteView [name="articleId"]').value = ce.key;
            $('#noteView [name="noteId"]').value    = ce.noteId;
            $('#noteView [name="xpath"]').value     = article.notes[ce.noteId].xpath;
            tiles.go('noteView');
          }
        });
        break;
      case 'addTag':
        (function () {
          tiles.go('tagTile', function (tag) {
            if (typeof tag !== 'undefined') {
              if (tag !== null) {
                switchTag(tag);
              }
            }
          });
        })();
        break;
      case 'deleteTag':
        switchTag(ce.actionTarget);
      }
    }
  });
  /**
   * Display the tile to add a note
   */
  function doNote(event) {
    var ce = onContentEvent(event);
    if (ce.key) {
      $('#noteEdit [name="articleId"]').value = ce.key;
      $('#noteEdit [name="xpath"]').value = utils.createXPathFromElement(event.originalTarget);
      $('#noteEdit [name="text"]').value = '';
      tiles.go('noteEdit');
    }
  }
  UI.list.addEventListener('contextmenu', doNote);
  UI.list.addEventListener('dblclick', doNote);
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
          article.id    = id;
          article.url   = $('#input [name="url"]').value;
          article.title = $('#input [name="title"]').value;
          article.text  = $('#input [name="text"]').value;
          remoteStorage.alir.savePrivate(article);
          tiles.show('list');
        }
      });
    } else {
      // create
      obj = {
        id: utils.uuid(),
        url: $('#input [name="url"]').value,
        title: $('#input [name="title"]').value,
        text: $('#input [name="text"]').value,
        flags: {
          editable: true
        }
      };
      remoteStorage.alir.savePrivate(obj);
      tiles.show('list');
    }
  });
  // }}
  // Notes {{
  $('#noteEdit [name="save"]').addEventListener('click', function () {
    var articleId = $('#noteEdit [name="articleId"]').value,
        noteId    = $('#noteEdit [name="noteId"]').value;

    if (!noteId) {
      noteId = utils.uuid();
    }
    remoteStorage.get('/alir/' + articleId).then(function (err, article, contentType, revision) {
      if (err !== 200) {
        window.alert(err);
        tiles.back();
      } else {
        if (typeof article.notes !== 'object') {
          article.notes = {};
        }
        article.id = articleId;
        article.notes[noteId] = {
          xpath: $('#noteEdit [name="xpath"]').value,
          content: $('#noteEdit [name="text"]').value
        };
        remoteStorage.alir.savePrivate(article);
        tiles.back();
      }
    });
  });
  $('#noteEdit [name="cancel"]').addEventListener('click', function () {
    tiles.back();
  });
  $('#noteView [name="back"]').addEventListener('click', function () {
    tiles.back();
  });
  $('#noteView [name="delete"]').addEventListener('click', function () {
    if (window.confirm(_('noteConfirmDelete'))) {
      var articleId = $('#noteView [name="articleId"]').value,
          noteId    = $('#noteView [name="noteId"]').value;

      remoteStorage.get('/alir/' + articleId).then(function (err, article, contentType, revision) {
        if (err !== 200) {
          window.alert(err);
          tiles.back();
        } else {
          delete article.notes[noteId];
          article.id = articleId;
          remoteStorage.alir.savePrivate(article);
          tiles.back();
        }
      });
    }
    tiles.back();
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
    $('#tagTile [name="cancel"]').addEventListener('click', function () {
      tiles.back();
    });
  }());
  // }}
  // Filters {{
  (function () {
    var dynamicSheet = document.getElementById('dynamicCss').sheet,
        filter = document.getElementById('listFilter');
    function onFilterChange() {
      // @FIXME this function is too much dependant of the view marker
      while (dynamicSheet.cssRules[0]) {
        dynamicSheet.deleteRule(0);
      }
      if (utils.trim(filter.value) !== '') {
        dynamicSheet.insertRule("#list.list > li[data-tags] { display: none; }", 0);
        dynamicSheet.insertRule('#list.list > li[data-tags*="' + filter.value + '"], #list.list > li[data-title*="' + filter.value + '"] { display: block; }', 1);
      }
    }
    filter.addEventListener("change", onFilterChange);
    document.querySelector("#listFilter + button").addEventListener("click", function () {
      filter.value = '';
      onFilterChange();
    });
  }());
  // }}
  // {{ Settings

  $('#settings [name="done"]').addEventListener('click', function () {
    tiles.show('list');
  });
  $('#settings [name="inspect"]').addEventListener('click', function () {
    remoteStorage.inspect();
  });
  $('#settings [name="clearLog"]').addEventListener('click', function () {
    document.getElementById('debugLog').innerHTML =  "";
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
  $('#settingsLang select').addEventListener('change', function () {
    document.webL10n.setLanguage(this.value);
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
    $('#settingsLang select').addEventListener('change', function () {
      config.lang = this.value;
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
    var elmt, classes, item;
    console.log(ev);
    if (typeof ev.oldValue === 'undefined' && typeof ev.newValue !== 'undefined') {
      console.log("Create " + ev.relativePath);
      if (typeof ev.newValue.id === 'undefined') {
        ev.newValue.id = ev.relativePath;
      }
      displayItem(ev.newValue);
    } else if (typeof ev.oldValue !== 'undefined' && typeof ev.newValue === 'undefined') {
      console.log("Delete " + ev.relativePath);
      elmt = document.getElementById(ev.relativePath);
      if (elmt) {
        elmt.parentNode.removeChild(elmt);
      }
    } else if (typeof ev.oldValue !== 'undefined' && typeof ev.newValue !== 'undefined') {
      console.log("Update " + ev.relativePath);
      elmt = document.getElementById(ev.relativePath);
      if (elmt) {
        classes = elmt.getAttribute('class');
        elmt.parentNode.removeChild(elmt);
      }
      if (typeof ev.newValue.id === 'undefined') {
        ev.newValue.id = ev.relativePath;
      }
      item = displayItem(ev.newValue);
      item.setAttribute("class", classes);
    }
  });
  remoteStorage.alir.private.getAll('').then(function (objects) {
    Object.keys(objects).forEach(function (key) {
      objects[key].id = key;
      displayItem(objects[key]);
    });
  });

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

