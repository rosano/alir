//jshint browser: true
// Some polyfills
// Function.bind
if (!Function.prototype.bind) {
  Function.prototype.bind = function (oThis) {
    "use strict";
    if (typeof this !== "function") {
      // closest thing possible to the ECMAScript 5 internal IsCallable function
      throw new TypeError("Function.prototype.bind - what is trying to be bound is not callable");
    }

    var aArgs = Array.prototype.slice.call(arguments, 1),
        fToBind = this,
        FNOP = function () {},
        fBound = function () {
          return fToBind.apply(this instanceof Function && oThis ? this : oThis, aArgs.concat(Array.prototype.slice.call(arguments)));
        };

    FNOP.prototype = this.prototype;
    fBound.prototype = new FNOP();

    return fBound;
  };
}
// Array.find
if (!Array.prototype.find) {
  Array.prototype.find = function (callback, thisObject) {
    "use strict";
    var i, len, fct;
    if (typeof callback !== "function") {
      throw new TypeError();
    }
    if (typeof thisObject === 'undefined') {
      fct = callback;
    } else {
      fct = function () {
        return callback.apply(thisObject, arguments);
      };
    }
    for (i = 0, len = this.length; i < len; i++) {
      if (fct(this[i], i, this) === true) {
        return this[i];
      }
    }
  };
}
// Array.findIndex
if (!Array.prototype.findIndex) {
  Array.prototype.findIndex = function (callback, thisObject) {
    "use strict";
    var i, len, fct;
    if (typeof callback !== "function") {
      throw new TypeError();
    }
    if (typeof thisObject === 'undefined') {
      fct = callback;
    } else {
      fct = function () {
        return callback.apply(thisObject, arguments);
      };
    }
    for (i = 0, len = this.length; i < len; i++) {
      if (fct(this[i], i, this) === true) {
        return i;
      }
    }
    return -1;
  };
}

if (typeof window.Float64Array === "undefined") {
  window.Float64Array = {};
}
