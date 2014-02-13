//jshint browser: true
/* global HTMLtoXML: true, utils: true */
window.$  = function (sel, root) {  "use strict"; root = root || document; return root.querySelector(sel); };
window.$$ = function (sel, root) {  "use strict"; root = root || document; return [].slice.call(root.querySelectorAll(sel)); };

var View = {};
/**
 * Convert a string into a DOM tree
 *
 * @param {String} str
 *
 * @return {DOMNode}
 *
 * @TODO Improve sanitizing
 */
View.toDom = function (str, fullUrl) {
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
    utils.log('Error sanityzing: ' + e.toString(), "error");
    //@FIXME Unsecure !
    sandbox.innerHTML = str;
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
};
View.insertInList = function (list, selector, item, comp) {
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
};
/**
 * My own mini-templating system
 *
 * @param {String} sel  selector of the template
 * @param {Object} data data to populate the template
 *
 * @return {DOMDocumentFragment}
 */
View.template = function (sel, data) {
  "use strict";
  var re  = new RegExp("{{([=#].*?)}}", 'g'),
      frag,
      xpathResult,
      i, elmt, attr/*,
      startTime = window.performance.now()*/;
  function getData(path, val) {
    var res = val, expr;
    if (path.substr(0, 3) === '../') {
      return val['..'][path.substr(3)];
    }
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
          var val = {'..': data};
          val[tmp[1]] = c;
          return p + View.template(tmp[0], val).outerHTML;
        }, '');
      } else {
        res = View.template(tmp[0], data).outerHTML;
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
