/*jshint browser: true, devel: true */
/*global remoteStorage: true, RemoteStorage: true, HTMLtoXML: true, Gesture: true, template: true, Tiles: true, utils: true, Showdown: true, Event: true, scrap: true, saveScraped: true */
/*exported: alir */
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

var config,
    tiles,
    comment,
    tags = [],
    config,
    isInstalled,
    _;
var $  = function (sel, root) { "use strict"; root = root || document; return root.querySelector(sel); },
    $$ = function (sel, root) { "use strict"; root = root || document; return [].slice.call(root.querySelectorAll(sel)); },
    forEvent = function (sel, event, fct) { "use strict"; Array.prototype.forEach.call(document.querySelectorAll(sel), function (elmt) { elmt.addEventListener(event, fct); }); };
config = {
  gesture: false,
  vibrate: false,
  rs: {
    login: ''
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
  bookmarks: {},
  style: {
    fontSize: 1
  }
};

tiles = new Tiles();
comment = new window.Comment();

function Alir() {
  "use strict";
  var self = this,
      dynamicSheet = document.getElementById('userCss').sheet,
      slider = $('#styleFontSize');
  RemoteStorage.eventHandling(this, "configLoaded");
  function updateStyle(conf) {
    while (dynamicSheet.cssRules[0]) {
      dynamicSheet.deleteRule(0);
    }
    $('#styleFontSize').value = conf.fontSize;
    dynamicSheet.insertRule("#list .content .html, #styleFontSizeSample { font-size: " + conf.fontSize + "rem; }", 0);
  }
  function onSizeChanged(event) {
    window.config.style.fontSize = slider.value;
    updateStyle(window.config.style);
  }
  self.on('configLoaded', function (conf) {
    updateStyle(conf.style);
  });
  slider.addEventListener('change',  onSizeChanged);
  slider.addEventListener('input',  onSizeChanged);
  this.install = function () {
    (function () {
      var request = window.navigator.mozApps.installPackage("https://alir.5apps.com/package.manifest");
      request.onerror = function () {
        window.alert("Install Error : " + this.error.name);
        console.log(this.error, 'error');
      };
      request.onsuccess = function () {
        window.alert("Install successful");
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
        alert("Error: " + request.error.name);
      };
    }());
  };
  this.styleReset = function () {
    window.config.style.fontSize = 1;
    updateStyle(window.config.style.fontSize);
  };
}
window.alir = new Alir();

function Article() {
  "use strict";
  var self = this,
      currentId/*,
      currentElmt*/;

  window.tiles.on('shown', function (tile, name) {
    if (name === 'list' && typeof currentId !== 'undefined') {
      self.onShown(currentId());
    }
  });
  this.setCurrentId = function setCurrentId(current) {
    currentId = current;
  };
  this.getCurrentId = function getCurrentId() {
    return currentId;
  };
  this.show = function show(key) {
    if (key === currentId) {
      return;
    }
    var elmt = document.getElementById(key);
    function doShow() {
      var clItem  = $('[data-key="' + key + '"]').classList,
          clMenu  = $('#menu').classList,
          clList  = $('#main').classList;
      clMenu.add("detail");
      clMenu.remove("list");
      clList.add("detail");
      clList.remove("list");
      clList.remove("edit");
      clItem.add('current');
      clItem.add('read');

      currentId = key;
      self.onShown();
    }
    function displayArticle(article) {
      elmt.parentNode.removeChild(elmt);
      article.id = key;
      article.doLoad = true;
      window.displayItem(article);
      doShow();
    }
    if (elmt) {
      if (elmt.dataset.loaded === "true") {
        doShow();
      } else {
        remoteStorage.alir.private.getObject('article/' + key).then(function (article) {
          if (article) {
            displayArticle(article);
          } else {
            utils.log("Unable to load article article/" + key, "error");
            remoteStorage.alir.private.getObject('/article/' + key).then(function (article) {
              if (article) {
                displayArticle(article);
              } else {
                utils.log("Unable to load article " + key, "error");
              }
            });
          }
        });
      }
    }
  };
  this.onShown = function onShown() {
    document.querySelector('li.current .articleMenu').classList.add('folded');
    $('#menu .content .top').href = '#' + currentId;
    if (config.bookmarks[currentId]) {
      window.setTimeout(function () {
        window.scrollTo(0, config.bookmarks[currentId] * $('#list').clientHeight);
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
    location.hash = currentId;
  };
  this.hide = function hide() {
    var clMenu  = $('#menu').classList,
        clMain  = $('#main').classList,
        current = $('#list > .current');
    if (current && current.id) {
      config.bookmarks[current.id] = window.scrollY / $('#list').clientHeight;
      current.classList.remove('current');
      current.scrollIntoView();
    }
    clMenu.remove("detail");
    clMenu.add("list");
    clMenu.remove('show');
    clMain.remove("detail");
    clMain.add("list");
    document.body.classList.remove("menu");
    window.articles.setCurrentId();
    location.hash = '';
  };
}
window.articles = new Article();

window.link = {
  open: function () {
    "use strict";
    var href = document.getElementById('linkRef').textContent,
        openURL;
    if (isInstalled) {
      openURL = new window.MozActivity({
        name: "view",
        data: {
          type: "url",
          url: href
        }
      });
    } else {
      window.open(href);
    }
    tiles.back();
  },
  scrap: function () {
    "use strict";
    var href = document.getElementById('linkRef').textContent;
    try {
      utils.log("Scraping " + href);
      scrap(href, function (err, res) {
        if (err) {
          utils.log(err.toString(), 'error');
          window.alert(err);
        } else {
          saveScraped(res);
        }
      });
    } catch (e) {
      utils.log(e.toString(), "error");
      window.alert(e);
    }
    tiles.back();
  },
  share: function () {
    "use strict";
    var href = document.getElementById('linkRef').textContent,
        openURL;
    openURL = new window.MozActivity({
      name: "share",
      data: {
        type: "url",
        url: href
      }
    });
    tiles.back();
  }
};

function createXPathFromElement(elm) {
  // source: http://stackoverflow.com/a/5178132
  //jshint maxcomplexity: 12
  "use strict";
  var allNodes = document.getElementsByTagName('*'),
  uniqueIdCount,
  i, n,
  sib, segs;
  for (segs = []; elm && elm.nodeType === 1; elm = elm.parentNode) {
    if (elm.hasAttribute('id')) {
      uniqueIdCount = 0;
      for (n = 0; n < allNodes.length; n++) {
        if (allNodes[n].hasAttribute('id') && allNodes[n].id === elm.id) {
          uniqueIdCount++;
        }
        if (uniqueIdCount > 1) {
          break;
        }
      }
      if (uniqueIdCount === 1) {
        segs.unshift('//*[@id="' + elm.getAttribute('id') + '"]');
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
      "notes": {
        "type": "object"
      },
      "flags": {
        "type": "object"
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

  return {
    exports: {
      saveArticle: function (article) {
        article.type = 'article';
        return privateClient.storeObject('article', 'article/' + article.id, article);
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
/**
 * Convert a string into a DOM tree
 *
 * @param {String} str
 *
 * @return {DOMNode}
 *
 * @TODO Improve sanitizing
 */
function toDom(str, fullUrl) {
  /*jshint newcap: false*/
  "use strict";
  var fragment = document.createDocumentFragment(),
      sandbox  = document.createElement('div'),
      domain   = new RegExp("((http.?://[^/]+).*/)([^?]*).?(.*$)").exec(fullUrl),
      domainUrl, baseUrl;
  if (domain !== null) {
    domainUrl = domain[2];
    baseUrl   = domain[1];
  } else {
    domainUrl = '';
    baseUrl   = '';
  }
  fragment.appendChild(sandbox);
  try {
    sandbox.innerHTML = HTMLtoXML(str);
  } catch (e) {
    //console.log('Error sanityzing: ', e);
    //@FIXME Unsecure !
    sandbox.innerHTML = str;
    //return _('contentError');
  }
  Array.prototype.forEach.call(sandbox.querySelectorAll('script, style', 'frame', 'iframe'), function (e) {
    e.parentNode.removeChild(e);
  });
  ['class', 'id', 'style', 'onclick', 'onload'].forEach(function (attr) {
    Array.prototype.forEach.call(sandbox.querySelectorAll('* [' + attr + ']'), function (e) {
      e.removeAttribute(attr);
    });
  });
  Array.prototype.forEach.call(sandbox.querySelectorAll('* a[href]'), function (e) {
    e.setAttribute('target', '_blank');
  });
  Array.prototype.forEach.call(sandbox.querySelectorAll('* img:not([src^=http])'), function (e) {
    var src = e.getAttribute('src');
    if (src.substr(0, 1) === '/') {
      e.setAttribute('src', domainUrl + src);
    } else {
      e.setAttribute('src', baseUrl + src);
    }
  });
  Array.prototype.forEach.call(sandbox.querySelectorAll('* a[href]:not([href^=http])'), function (e) {
    var src = e.getAttribute('href');
    if (src) {
      if (src.substr(0, 1) === '/') {
        e.setAttribute('href', domainUrl + src);
      } else {
        e.setAttribute('href', baseUrl + src);
      }
    }
  });
  return sandbox.innerHTML;
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
  //jshint maxstatements: 35, debug: true, maxcomplexity: 20
  "use strict";
  var title = obj.title || obj.id,
      data  = {},
      item,
      classes = [];
  if (typeof obj.type === "undefined") {
    obj.type = "article";
  }
  item = document.getElementById(obj.id);
  if (item) {
    classes = [].slice.call(item.classList);
    item.parentNode.removeChild(item);
  }
  switch (obj.type) {
  case 'article':
    if (typeof obj.notes !== 'object') {
      obj.notes = {};
    }
    if (typeof obj.date === 'undefined') {
      obj.date = utils.getDate();
    } else {
      try {
        obj.date = utils.getDate(obj.date);
      } catch (e) {
        console.log("Wrong date : " + obj.date);
      }
    }
    data = {
      key: obj.id,
      context: 'private',
      hasNotes: Object.keys(obj.notes).length > 0 ? 'hasNotes' : '',
      title: title.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      url: obj.url || '#',
      date: obj.date,
      tags: Array.isArray(obj.tags) ? obj.tags : [],
      notes: Object.keys(obj.notes).map(function (e, i) { return {id: e, url: obj.id + '/' + e}; }),
      flags: typeof obj.flags === 'object' ? Object.keys(obj.flags).filter(function (e) { return obj.flags[e] === true; }).join(',') : '',
      loaded: obj.doLoad === true
    };
    if (utils.trim(data.title) === '') {
      data.title = _("noTitle");
    }
    // in order not to create huge DOM, we only display article content
    // when explicitely asked
    if (obj.doLoad === true) {
      if (obj.html) {
        data.type = 'html';
        data.content = toDom(obj.html, obj.url);
      } else {
        data.type = 'text';
        data.content = obj.text;
      }
    } else {
      data.type = 'none';
      data.content = '';
    }
    item = template('tmpl-article', data);
    // Notes {{
    if (typeof obj.notes === 'object') {
      Object.keys(obj.notes).forEach(function (noteId, i) {
        var note = obj.notes[noteId],
            target,
            container,
            a;
        container = document.createElement('div');
        container.appendChild(item);
        try {
          target = document.evaluate(note.xpath, container, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        } catch (e) {
          console.log("Unable to evaluate XPath " + note.xpath + ' : ' + e);
        }
        if (target) {
          a = document.createElement('a');
          a.setAttribute('class', 'note icon-tag');
          a.setAttribute('data-note', noteId);
          a.setAttribute('href', '#' + obj.id + '/' + noteId);
          target.insertBefore(a, target.firstChild);
        } else {
          console.log("Unable to evaluate XPath " + note.xpath);
        }
      });
    }
    // }}
    // Tags {{
    if (Array.isArray(obj.tags) && obj.tags.length > 0) {
      obj.tags.forEach(function (tag) {
        if (tags.indexOf(tag) === -1) {
          tags.push(tag);
          (function (tag) {
            var elmt = document.createElement('li');
            elmt.dataset.tag = tag;
            elmt.textContent = tag;
            insertInList(document.getElementById('tagList'), "li", elmt, function (e) { return (e.dataset.tag.toLowerCase() > tag.toLowerCase()); });
          })(tag);
        }
      });
    }
    // }}
    // Sort items by date {{
    // @TODO allow multiple sorts
    insertInList(document.getElementById('list'), "[data-key]", item, function (e) { return (e.dataset.date < obj.date); });
    // }}
    break;
  case 'feed':
    data = {
      key: obj.id,
      context: 'private',
      title: title,
      url: obj.url
    };
    item = template('tmpl-feed', data);
    insertInList(document.getElementById('feeds'), "[data-key]", item, function (e) { return (e.dataset.title.toLowerCase() > title.toLowerCase()); });
    // update feed cache
    window.feeds.cache(obj);
    break;
  default:
    console.log("Unknown item type: " + obj.type);
  }

  if (classes.length !== 0) {
    classes.forEach(function (cl) {
      item.classList.add(cl);
    });
  }

  return item;
}
function getAll() {
  "use strict";
  var startTime = {};
  ['article', 'feed'].forEach(function (type) {
    startTime[type] = window.performance.now();
    remoteStorage.alir.private.getAll(type + '/').then(function (objects) {
      utils.log(utils.format("All %s got in %s", type, Math.round((window.performance.now() - startTime[type]))), "debug");
      if (objects) {
        Object.keys(objects).forEach(function (key) {
          objects[key].id = key;
          displayItem(objects[key]);
        });
      }
      utils.log(utils.format("All %s displayed in %s", type, Math.round((window.performance.now() - startTime[type]))), "debug");
    });
  });
}
function initUI() {
  // jshint maxstatements: 60
  "use strict";
  var UI = {},
      menuActions = {};
  UI = {
    input: $('#input'),
    list: $('#list'),
    main: $('#main'),
    menu: {}
  };
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
  // reload configuration
  (function () {
    var conf = localStorage.getItem('config');
    if (conf) {
      conf = JSON.parse(conf);
      utils.merge(config, conf);
      if (typeof conf.lang !== 'undefined') {
        $('#settingsLang select').value = conf.lang;
        document.webL10n.setLanguage(conf.lang);
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
      $('#settingsLoglevel').value = conf.logLevel;
      if (typeof conf.bookmarks === 'undefined') {
        conf.bookmarks = {};
      }

      config = conf;
      window.alir._emit('configLoaded', conf);
    }
  }());

  $$('form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      return false;
    });
  });

  // Actions {{
  (function () {
    var actions = {
      clearLogs: function () {
        document.getElementById('debugLog').innerHTML =  "";
      },
      getAll: function () {
        getAll();
      },
      inspect: function () {
        remoteStorage.inspect();
      },
      tileGo: function (name) {
        tiles.go(name);
      },
      tileShow: function (name) {
        tiles.show(name);
      },
      widgetShow: function () {
        $('#rsWidget').classList.toggle("hidden");
      }
    };

    // Generic event Listener
    document.body.addEventListener('click', function (ev) {
      //jshint curly: false
      var params = [],
          target  = ev.target,
          dataset = target.dataset,
          listeners;

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
          sel: "#list .content a[href][target]",
          action: function (elmt) {
            document.getElementById("linkRef").textContent = elmt.href;
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
        /*,
        {
          sel: "",
          action: function (elmt) {
          }
        }
        */
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
      if (dataset.method) {
        if (typeof dataset.params !== "undefined") {
          params = dataset.params.split(',');
        }
        if (typeof dataset.object !== 'undefined' && typeof window[dataset.object] !== 'undefined' && typeof window[dataset.object][dataset.method] === 'function') {
          clicked(target);
          window[dataset.object][dataset.method].apply(window[dataset.object], params);
        } else {
          if (typeof actions[dataset.method] === "undefined") {
            utils.log("Unknown method " + dataset.method);
          } else {
            clicked(target);
            actions[dataset.method].apply(null, params);
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
      document.body.classList.remove('sync');
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
          if ($('#rsLogin').value !== '') {
            remoteStorage.widget.view.events.connect(new Event(""));
          } else {
            window.alert(_('notConnected'));
          }
        }
      }
    },
  };
  $$('#menu .content [data-action]').forEach(function () {
    var elmt = arguments[0];
    UI.menu[elmt.dataset.action] = elmt;
  });
  if (!remoteStorage.connected) {
    document.body.classList.remove('online');
  }
  remoteStorage.on("disconnected", function (e) {
    document.body.classList.remove('online');
  });
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
  function onContentEvent(event) {
    var target = event.target,
        ce, parent;
    ce = {
      action: target.dataset.action,
      actionTarget: target.dataset.target,
      keyNode: target
    };
    while (ce.keyNode.id !== 'main' && typeof ce.keyNode.dataset.key === 'undefined' && ce.keyNode.parentNode) {
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
    while (parent.id !== 'main' && (typeof parent.dataset === 'undefined' || typeof parent.dataset.context === 'undefined') && parent.parentNode) {
      parent = parent.parentNode;
    }
    ce.context = parent.dataset.context;
    if (target.dataset.note) {
      ce.action = 'note';
      ce.noteId = target.dataset.note;
    }
    return ce;
  }
  UI.main.addEventListener('click', function onClick(event) {
    //jshint maxcomplexity: 20
    var ce = onContentEvent(event),
        elmt;
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
      remoteStorage.get('/alir/article/' + ce.key).then(function (err, article, contentType, revision) {
        if (err !== 200) {
          window.alert(err);
        } else {
          article.id   = ce.key;
          article.tags = tags.filter(function (t) {return t !== ''; });
          remoteStorage.alir.saveArticle(article);
        }
      });
    }
    if (ce.action) {
      clicked(event.target);
      switch (ce.action) {
      case 'none':
        break;
      case 'menu':
        $('li.current .articleMenu').classList.toggle('folded');
        break;
      case 'archive':
        switchTag('archive');
        break;
      case 'star':
        switchTag('star');
        break;
      case 'filterArchive':
        $('#main').classList.toggle('archives');
        break;
      case 'filterFeed':
        $('#main').classList.toggle('feeds');
        break;
      case 'filterStar':
        $('#main').classList.toggle('stars');
        break;
      case 'delete':
        if (window.confirm(_('confirmDelete'))) {
          remoteStorage.alir[ce.context].remove('/article/' + ce.key);
          delete config.bookmarks[ce.key];
          elmt = document.getElementById(ce.key);
          if (elmt) {
            elmt.classList.add('hidden');
          }
        }
        window.articles.hide();
        break;
      case 'compose':
        //remoteStorage.alir[ce.context].getObject('article/' + ce.key).then(function (object) {
        remoteStorage.get('/alir/article/' + ce.key).then(function (err, article, contentType, revision) {
          if (err !== 200) {
            window.alert(err);
          } else {
            $('#input [name="id"]').value    = ce.key;
            $('#input [name="title"]').value = article.title;
            $('#input [name="url"]').value   = article.url;
            $('#input [name="text"]').value  = article.text;
            tiles.show('input');
          }
        });
        break;
      case 'share':
        (function () {
          var request = new window.MozActivity({
            name: "share",
            data: {
              type: "url",
              url: ce.keyNode.dataset.url
            }
          });
          request.onerror = function () {
            window.alert("Error sharing : " + request.error.name);
          };
        }());
        break;
      case 'note':
        remoteStorage.get('/alir/article/' + ce.key).then(function (err, article, contentType, revision) {
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
        break;
      case 'editArticles':
        $('#main').classList.toggle('edit');
        break;
      case 'deleteArticles':
        (function () {
          var toDel = $$('#list h2 .delitem input:checked');
          if (toDel.length > 0) {
            if (window.confirm(_('articlesDelete', {nb: toDel.length}))) {
              toDel.forEach(function (elmt) {
                var key = utils.parent(elmt, function (e) { return typeof e.dataset.key !== 'undefined'; });
                if (key) {
                  key.classList.add('hidden');
                  key = key.dataset.key;
                  remoteStorage.alir.private.remove('/article/' + key);
                  delete config.bookmarks[key];
                }
              });
            }
          }
          $('#main').classList.remove('edit');
        }());
        break;
      case 'reload':
        window.scrap(ce.keyNode.dataset.url, function (err, res) {
          if (err) {
            utils.log(err.toString(), 'error');
            window.alert("Error reloading content");
          } else {
            remoteStorage.get('/alir/article/' + ce.key).then(function (err, article, contentType, revision) {
              if (err !== 200) {
                window.alert(err);
              } else {
                article.id    = ce.key;
                article.title = res.title;
                article.html  = res.html;
                remoteStorage.alir.saveArticle(article);
              }
            });
          }
        });
        break;
      }
    }
  });
  /**
   * Display the tile to add a note
   */
  function doNote(event) {
    var ce = onContentEvent(event);
    if (ce.key) {
      comment.create(ce.key, createXPathFromElement(event.target));
    }
  }
  if ("ontouchstart" in window) {
    UI.list.addEventListener('contextmenu', doNote);
  }
  UI.list.addEventListener('dblclick', doNote);
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
            config.bookmarks[items[1].dataset.key] = window.scrollY / UI.list.clientHeight;
            items[1].classList.add('hideRight');
            items[2].classList.add('showLeft');
            window.setTimeout(function () {
              items[1].classList.remove('current');
              items[1].classList.remove('hideRight');
              items[2].classList.remove('showLeft');
              window.articles.show(items[2].dataset.key);
            }, 500);
          }
          document.querySelector('li.current .articleMenu').classList.add('folded');
          break;
        case 'W':
          items = getItems();
          if (items) {
            config.bookmarks[items[1].dataset.key] = window.scrollY / UI.list.clientHeight;
            items[1].classList.add('hideLeft');
            items[0].classList.add('showRight');
            window.setTimeout(function () {
              items[1].classList.remove('current');
              items[1].classList.remove('hideLeft');
              items[0].classList.remove('showRight');
              window.articles.show(items[0].dataset.key);
            }, 500);
          }
          document.querySelector('li.current .articleMenu').classList.add('folded');
          break;
        }
      }
    };
    if (config.gesture) {
      Gesture.attach(UI.list, gestureEvents);
    }
    checkbox = document.getElementById('prefGesture');
    checkbox.addEventListener('change', function () {
      if (checkbox.checked) {
        Gesture.attach(UI.list, gestureEvents);
      } else {
        Gesture.detach(UI.list, gestureEvents);
      }
    });
  }());
  // input {{
  forEvent('#input [data-action="articleSave"]', 'click', function () {
    var id = $('#input [name="id"]').value,
        obj;

    if (id) {
      // update
      remoteStorage.get('/alir/article/' + id).then(function (err, article, contentType, revision) {
        if (err !== 200) {
          window.alert(err);
          tiles.show('list');
        } else {
          article.id    = id;
          article.url   = $('#input [name="url"]').value;
          article.title = $('#input [name="title"]').value;
          article.text  = $('#input [name="text"]').value;
          article.html  = new Showdown.converter().makeHtml(article.text);
          article.date  = Date.now();
          remoteStorage.alir.saveArticle(article);
          displayItem(article);
          tiles.show('list');
        }
      });
    } else {
      // create
      obj = {
        id: utils.uuid(),
        url:   $('#input [name="url"]').value,
        title: $('#input [name="title"]').value,
        text:  $('#input [name="text"]').value,
        html:  new Showdown.converter().makeHtml($('#input [name="text"]').value),
        date:  Date.now(),
        flags: {
          editable: true
        },
        tags: ['note']
      };
      remoteStorage.alir.saveArticle(obj);
      displayItem(obj);
      tiles.show('list');
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
    var dynamicSheet = document.getElementById('dynamicCss').sheet,
        filter = document.getElementById('listFilter');
    function onFilterChange() {
      var filterVal = filter.value.toLowerCase();
      while (dynamicSheet.cssRules[0]) {
        dynamicSheet.deleteRule(0);
      }
      if (utils.trim(filterVal) !== '') {
        dynamicSheet.insertRule("#main.list #list > li[data-tags] { display: none !important; }", 0);
        dynamicSheet.insertRule('#main.list #list > li[data-tags*="' + filterVal + '"], #main.list #list > li[data-title*="' + filterVal + '"] { display: block !important; }', 1);
      }
    }
    filter.addEventListener("keyup", onFilterChange);
    filter.addEventListener("change", onFilterChange);
    document.querySelector("#listFilter + button").addEventListener("click", function () {
      filter.value = '';
      onFilterChange();
    });
    document.querySelector("#main .filters [data-action=addFilterTag]").addEventListener("click", function () {
      tiles.go('tagTile', function (tag) {
        if (typeof tag !== 'undefined') {
          if (tag !== null) {
            filter.value = tag;
            onFilterChange();
          }
        }
      });
    });
  }());
  // }}
  // {{ Settings

  $('#rsLogin').addEventListener('change', function () {
    config.rs.login = this.value;
    remoteStorage.widget.view.form.userAddress.value = this.value;
  });
  $('#settings').addEventListener('click', function (event) {
    if (event.target.dataset && event.target.dataset.action) {
      switch (event.target.dataset.action) {
      case "connect":
        remoteStorage.widget.view.form.userAddress.value = $('#rsLogin').value;
        remoteStorage.widget.view.events.connect(new Event(""));
        break;
      case "connectDropbox":
        remoteStorage.widget.view.connectDropbox();
        break;
      case "connectDrive":
        remoteStorage.widget.view.connectGdrive();
        break;
      case "sync":
        remoteStorage.widget.view.events.sync(new Event(""));
        break;
      case "reset":
        remoteStorage.widget.view.events.reset(new Event(""));
        break;
      case "disconnect":
        remoteStorage.widget.view.events.disconnect(new Event(""));
        break;
      case "cacheReset":
        remoteStorage.caching.reset();
        break;
      }
    }
  });
  function setState(state) {
    var actions = {
      "connect": $("#prefRS [data-action=connect]").classList,
      "disconnect": $("#settings [data-action=disconnect]").classList,
      "sync": $("#settings [data-action=sync]").classList,
      "reset": $("#settings [data-action=reset]").classList
    };
    switch (state) {
    case "initial":
      actions.connect.remove("hidden");
      actions.disconnect.add("hidden");
      actions.sync.add("hidden");
      actions.reset.add("hidden");
      break;
    case "connected":
      actions.connect.add("hidden");
      actions.disconnect.remove("hidden");
      actions.sync.remove("hidden");
      actions.reset.remove("hidden");
      break;
    default:
      console.log("unknown state " + state);
    }
  }
  remoteStorage.on('ready', function () {
    utils.log(utils.format("Ready fired at %s", Math.round(window.performance.now())), "debug");
    setState(remoteStorage.remote.connected ? 'connected' : 'initial');
  });
  remoteStorage.on('disconnected', function () {
    setState('initial');
  });
  setState('initial');
  $('#dropboxApiKey').addEventListener('change', function () {
    remoteStorage.setApiKeys('dropbox', {api_key: this.value});
    //remoteStorage.widget.view.reload();
    config.dropBox.apiKey = this.value;
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
      config.menu = true;
    } else {
      document.body.classList.remove('menu-left');
      document.body.classList.add('menu-right');
      config.menu = false;
    }
  });
  $('#settings').addEventListener('change', function (ev) {
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
      }
    }
  });
  // }}
  // Left menu {{
  $('#menu').addEventListener('click', function (event) {
    var target = event.target,
        action = target.dataset.action;
    if (action && menuActions[action]) {
      clicked(target);
      menuActions[action]();
    }
  });
  // }}

  // Manage scroll
  (function () {
    var height = UI.list.clientHeight,
        scroll = $("#menu .scrollbar");
    scroll.style.height = (window.innerHeight / UI.list.clientHeight * 100) + '%';
    setInterval(function checkSize() {
      var h = UI.list.clientHeight;
      if (h !== height) {
        height = h;
        scroll.style.height = (window.innerHeight / UI.list.clientHeight * 100) + '%';
        scroll.style.top = (window.scrollY / UI.list.clientHeight * 100) + '%';
      }
    }, 250);
    window.onscroll = function () {
      scroll.style.top = (window.scrollY / UI.list.clientHeight * 100) + '%';
    };
  })();

  // Preferences
  (function () {
    ['gesture', 'vibrate'].forEach(function (pref) {
      var elmt = document.getElementById('pref' + pref[0].toUpperCase() + pref.substr(1));
      elmt.checked = config[pref];
    });
  }());

  window.addEventListener("hashchange", function () {
    if (window.location.hash === '' && document.getElementById('menu').classList.contains('detail')) {
      window.articles.hide();
    }
    if (window.location.hash !== '' && document.getElementById('menu').classList.contains('list')) {
      window.articles.show(window.location.hash.substr(1));
    }
  }, false);

  tiles.show('list');
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
  } else {
    utils.notify('Not installed');
  }

  if (window.navigator.mozApps) {
    (function () {
      var request = window.navigator.mozApps.getSelf();
      request.onsuccess = function () {
        if (request.result) {
          isInstalled = true;
          document.body.classList.remove('hosted');
          document.body.classList.add('installed');
        }
      };
      request.onerror = function () {
        alert("Error: " + request.error.name);
      };
    }());
  }
  //remoteStorage.enableLog();
  remoteStorage.setSyncInterval(60000);
  remoteStorage.setBackgroundSyncInterval(300000);
  remoteStorage.access.claim('alir', 'rw');
  remoteStorage.caching.enable('/alir/');
  //remoteStorage.caching.enable('/public/alir/');
  remoteStorage.displayWidget("rsWidget");
  initUI();
  remoteStorage.alir.private.on('change', function onChange(ev) {
    var elmt, item, id;
    id = ev.relativePath.split('/').pop();
    if (typeof ev.oldValue === 'undefined' && typeof ev.newValue !== 'undefined') {
      console.log("Create " + ev.relativePath);
      if (typeof ev.newValue.id === 'undefined') {
        ev.newValue.id = id;
      }
      if (id === window.articles.getCurrentId()) {
        ev.newValue.doLoad = true;
      }
      displayItem(ev.newValue);
    } else if (typeof ev.oldValue !== 'undefined' && typeof ev.newValue === 'undefined') {
      console.log("Delete " + ev.relativePath);
      elmt = document.getElementById(id);
      if (elmt) {
        elmt.parentNode.removeChild(elmt);
      }
      delete config.bookmarks[ev.relativePath];
    } else if (typeof ev.oldValue !== 'undefined' && typeof ev.newValue !== 'undefined') {
      console.log("Update " + ev.relativePath);
      if (typeof ev.newValue.id === 'undefined') {
        ev.newValue.id = id;
      }
      if (id === window.articles.getCurrentId()) {
        ev.newValue.doLoad = true;
      }
      item = displayItem(ev.newValue);
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
  getAll();

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
