//jshint browser: true
/*global RemoteStorage: true */
var matchesSelector = document.documentElement.matches ||
                      document.documentElement.matchesSelector ||
                      document.documentElement.webkitMatchesSelector ||
                      document.documentElement.mozMatchesSelector ||
                      document.documentElement.oMatchesSelector ||
                      document.documentElement.msMatchesSelector;
var realLog = console.log;
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
    var date = (typeof d  === 'undefined' ? new Date() : new Date(d));
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString();
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
      realLog("Unknown log level " + level);
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
      if (ui) {
        ui.innerHTML = utils.format('<span class="%s">[%s][%s]</span> %s\n', level, curDate, level + new Array(10 - level.length).join(' '), message) + ui.innerHTML;
        if (level === 'error') {
          //window.alert(message);
          document.body.classList.add('error');
        }
      }
      realLog(utils.format('=====> [%s][%s] %s\n', curDate, level + new Array(10 - level.length).join(' '), message));
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
  },
  createXPathFromElement: function (elm) {
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

};
console.log = function () {
  "use strict";
  [].slice.call(arguments).forEach(function (a) { utils.log(a, 'debug'); });
};
window.onerror = function (errorMsg, url, lineNumber) {
  "use strict";
  utils.log("%s on %s:%s", errorMsg, url, lineNumber, "error");
};

var Tiles = function (global) {
  "use strict";
  RemoteStorage.eventHandling(this, "leaving", "shown");
  var current,
      tiles = [],
      popup = (window.matchMedia("(min-width: 37rem) and (min-height: 37rem)").matches);
  this.show = function (name) {
    this._emit('leaving', current);
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
    var i = tiles.findIndex(function (e) { return e.name === name; }),
        next;
    if (i !== -1) {
      next = tiles[i];
      this.show(next.name);
      if (typeof next.cb === 'function') {
        next.cb();
      }
      window.scrollTo(0, next.y);
      tiles.splice(i);
    } else {
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
        this._emit('leaving', current);
        this._emit('shown', name);
      } else {
        this.show(name);
      }
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
  this.pop = function () {
    var tile = tiles.pop();
    current = tile.name;
    return tile;
  };
  this.tiles = function () {
    return tiles;
  };
};
window.tiles = new Tiles();
