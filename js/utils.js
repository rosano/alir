//jshint browser: true
/*global $:true, RemoteStorage: true */
var matchesSelector = document.documentElement.matches ||
                      document.documentElement.matchesSelector ||
                      document.documentElement.webkitMatchesSelector ||
                      document.documentElement.mozMatchesSelector ||
                      document.documentElement.oMatchesSelector ||
                      document.documentElement.msMatchesSelector;
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
  getDate: function (d) {
    "use strict";
    d = (typeof d  === 'undefined' ? new Date() : (typeof d === 'object' ? d : new Date(d)));
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString();
  },
  log: function log() {
    "use strict";
    var args = Array.prototype.slice.call(arguments),
        level,
        levelNum,
        message,
        ui,
        curDate = utils.getDate().substr(11, 8);
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
      ui = document.getElementById('debugLog');
      ui.innerHTML = utils.format('<span class="%s">[%s][%s]</span> %s\n', level, curDate, level + new Array(10 - level.length).join(' '), message) + ui.innerHTML;
      console.log(utils.format('=====> [%s][%s] %s\n', curDate, level + new Array(10 - level.length).join(' '), message));
      if (level === 'error') {
        window.alert(message);
      }
    }
  },
  notify: function (title, body, cb) {
    "use strict";
    var notif;
    if ("Notification" in window) {
      if (window.Notification.permission === "granted") {
        notif = new window.Notification(title, {body: body});
        if (cb) {
          notif.addEventListener('click', cb);
        }
      } else if (window.Notification.permission !== 'denied') {
        window.Notification.requestPermission(function (permission) {
          if (!('permission' in window.Notification)) {
            window.Notification.permission = permission;
          }
          if (permission === "granted") {
            notif = new window.Notification(title, {body: body});
            if (cb) {
              notif.addEventListener('click', cb);
            }
          }
        });
      }
    } else if ("mozNotification" in navigator) {
      notif = navigator.mozNotification.createNotification(title, body);
      notif.show();
      if (cb) {
        notif.addEventListener('click', cb);
      }
    } else {
      window.alert(title + "\n" + body);
    }
  },
  merge: function (a, b) {
    "use strict";
    Object.keys(a).forEach(function (keyA) {
      if (typeof b[keyA] === 'undefined') {
        b[keyA] = a[keyA];
      } else {
        if (typeof a[keyA] === 'object') {
          b[keyA] = utils.merge(a[keyA], b[keyA]);
        }
      }
    });
    return b;
  },
  match: function (elmt, sel) {
    "use strict";
    sel = sel + ', ' + sel + ' *';
    return matchesSelector.call(elmt, sel);
  },
  /**
   * Return parent element matching criteria
   *
   * @param {DOMElement} elmt
   * @param {Function}   match
   *
   * @return {DOMElement|null}
   */
  parent: function (elmt, match) {
    "use strict";
    var res = null, found = false;
    while (!found) {
      if (elmt.nodeType !== 1) {
        found = true;
      } else {
        if (match(elmt)) {
          res   = elmt;
          found = true;
        } else {
          elmt = elmt.parentNode;
        }
      }
    }
    return res;
  },
  /**
   * Convert Object to array
   *
   * @param {Object} obj
   * @param {String} key
   *
   * @return {Array}
   */
  toArray: function (obj, key) {
    "use strict";
    key = key || '_id';
    var res = [];
    Object.keys(obj).forEach(function (k) {
      var item = obj[k];
      item[key] = k;
      res.push(item);
    });
    return res;
  }
};

window.Tiles = function (global) {
  "use strict";
  RemoteStorage.eventHandling(this, "shown");
  var current,
      tiles = [],
      popup = (window.matchMedia("(min-width: 37rem) and (min-height: 37rem)").matches);
  this.show = function (name) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-tile]'), function (e) {
      if (e.dataset.tile === name) {
        e.classList.add('shown');
        window.scrollTo(0, 0);
        current = name;
      } else {
        e.classList.remove('shown');
      }
    });
    document.getElementById('menu').classList.remove('show');
    this._emit('shown', name);
  };
  this.go = function (name, cb) {
    tiles.push({name: current, y: window.scrollY, cb: cb});
    if (popup) {
      document.body.classList.add("popup");
      Array.prototype.forEach.call(document.querySelectorAll('[data-tile]'), function (e) {
        if (e.dataset.tile === name) {
          e.classList.add('popup');
          window.scrollTo(0, 0);
          current = name;
        }
      });
      this._emit('shown', name);
    } else {
      this.show(name);
    }
    document.getElementById('menu').classList.remove('show');
  };
  this.back = function (res) {
    var popupElmt, next;
    if (popup) {
      popupElmt = document.querySelector(".popup[data-tile]");
      if (popupElmt) {
        popupElmt.classList.remove('popup');
      }
      document.body.classList.remove('popup');
    } else {
      next = tiles.pop();
      if (typeof next === 'object') {
        this.show(next.name);
        if (typeof next.cb === 'function') {
          next.cb(res);
        }
        window.scrollTo(0, next.y);
      }
    }
    document.getElementById('menu').classList.remove('show');
  };
  this.$ = function (name) {
    var root = document.querySelector('[data-tile="' + name + '"]');
    return function (sel) { return root.querySelector(sel); };
  };
};

/**
 * My own mini-templating system
 *
 * @param {String} sel  selector of the template
 * @param {Object} data data to populate the template
 *
 * @return {DOMDocumentFragment}
 */
window.template = function template(sel, data) {
  "use strict";
  var re  = new RegExp("{{([=#].*?)}}", 'g'),
      frag,
      xpathResult,
      i, elmt, attr/*,
      startTime = window.performance.now()*/;
  function getData(path, val) {
    var res = val, expr;
    if (path !== '.') {
      expr = path.split('.');
      while (res && expr.length > 0) {
        res = res[expr.shift()];
      }
    }
    if (typeof res === 'undefined') {
      console.log("UNDEFINED", path, val);
    }
    return res;
  }
  function repl(match) {
    var res, tmp, fct, type, value;
    type = match[2];
    match = match.substr(3, match.length - 5);
    switch (type) {
    case '=':
      // Value
      tmp = match.split('|');
      res = getData(utils.trim(tmp.shift()), data);
      if (tmp.length > 0) {
        while ((fct = tmp.shift()) !== undefined) {
          switch (utils.trim(fct).toLowerCase()) {
          case "join":
            res = res.join(',');
            break;
          case "tolocal":
            res = new Date(res).toLocaleString(undefined, {day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", "minute": "2-digit"});
            break;
          case "tolowercase":
            res = res.toLowerCase();
            break;
          default:
            utils.log("Unknown template function " + fct, "error");
          }
        }
      }
      break;
    case '#':
      // Sub template
      tmp = match.split(' ');
      value = getData(tmp[1], data);
      if (Array.isArray(value)) {
        res = value.reduce(function (p, c) {
          var val = {};
          val[tmp[1]] = c;
          return p + window.template(tmp[0], val).outerHTML;
        }, '');
      } else {
        res = window.template(tmp[0], data).outerHTML;
      }
      break;
    }
    return res;
  }
  frag = document.getElementById(sel).cloneNode(true);
  xpathResult = document.evaluate('//@*[contains(., "{{=")]', frag, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
  for (i = 0; i < xpathResult.snapshotLength; i++) {
    attr = xpathResult.snapshotItem(i);
    attr.nodeValue = attr.nodeValue.replace(re, repl);
  }
  xpathResult = document.evaluate('//*[contains(text(),"{{")]', frag, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null);
  for (i = 0; i < xpathResult.snapshotLength; i++) {
    elmt = xpathResult.snapshotItem(i);
    elmt.innerHTML = elmt.innerHTML.replace(re, repl);
  }
//  utils.log(utils.format("Template %s rendered in %s", sel, Math.round((window.performance.now() - startTime))), "debug");
  return frag.children[0];
};
/**
 * Article comment
 */
window.Comment = function () {
  "use strict";
  /*global remoteStorage: true, tiles: true, _: true */
  var UI;
  UI = {
    article: $('#noteEdit [name="articleId"]'),
    path:    $('#noteEdit [name="xpath"]'),
    content: $('#noteEdit [name="text"]')
  };

  function load(cb) {
    var articleId = $('#noteEdit [name="articleId"]').value;

    remoteStorage.get('/alir/article/' + articleId).then(function (err, article) {
      if (err === 200) {
        article.id = articleId;
      }
      cb(err, article);
    });
  }

  this.create = function (article, path) {
    UI.article.value = article;
    UI.path.value    = path;
    UI.content.value = '';
    window.tiles.go('noteEdit');
  };

  this.save = function () {
    var noteId    = $('#noteEdit [name="noteId"]').value;
    if (!noteId) {
      noteId = utils.uuid();
    }
    load(function (err, article) {
      if (err !== 200) {
        window.alert(err);
        tiles.back();
      } else {
        if (typeof article.notes !== 'object') {
          article.notes = {};
        }
        article.notes[noteId] = {
          xpath: $('#noteEdit [name="xpath"]').value,
          content: $('#noteEdit [name="text"]').value
        };
        remoteStorage.alir.saveArticle(article);
        window.displayItem(article);
        tiles.back();
      }
    });
  };
  this.edit = function () {
    ["articleId", "noteId", "xpath", "text"].forEach(function (field) {
      $('#noteEdit [name="' + field + '"]').value = $('#noteEdit [name="' + field + '"]').value;
    });
    window.tiles.show('noteEdit');
  };
  this.delete = function () {
    var noteId    = $('#noteView [name="noteId"]').value;
    if (window.confirm(_('noteConfirmDelete'))) {
      load(function (err, article) {
        if (err !== 200) {
          window.alert(err);
          tiles.back();
        } else {
          delete article.notes[noteId];
          remoteStorage.alir.saveArticle(article);
          window.displayItem(article);
        }
      });
    }
    tiles.back();
  };
};
