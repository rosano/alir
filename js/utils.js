//jshint browser: true
/* exported Tiles template */
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
      console.log(utils.format('=====> [%s][%s] %s\n', new Date().toISOString().substr(11, 8), level + new Array(10 - level.length).join(' '), message));
    }
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
