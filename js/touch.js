//jshint browser: true
/*global CustomEvent: true */
/*exported Gesture */
// @TODO add a polyfill for IE
// https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent#Polyfill

var Gesture = (function () {
  "use strict";
  var cursor,
      allowedEvent = ['gestureStart', 'gestureMove', 'gestureEnd', 'gesture'],
      listeners = [];

  cursor = {
    startX: 0,
    startY: 0
  };

  function getEvent(event) {
    if (event.touches) {
      if (event.type === 'touchend') {
        return event.changedTouches[0];
      } else {
        return event.touches[0];
      }
    } else {
      return event;
    }
  }
  function onTouchStart(event) {
    var ev = getEvent(event);
    cursor.startX    = ev.pageX;
    cursor.startY    = ev.pageY;
    listeners.forEach(function (elmt) {
      if (elmt.contains(ev.target)) {
        elmt.dispatchEvent(new CustomEvent("gestureStart", {detail: ev}));
      }
    });
  }
  function onTouchMove(event) {
    var ev = getEvent(event);
    listeners.forEach(function (elmt) {
      if (elmt.contains(ev.target)) {
        elmt.dispatchEvent(new CustomEvent("gestureMove", {detail: ev}));
      }
    });
  }
  function onTouchEnd(event) {
    var ev    = getEvent(event),
        delta = 10,
        dirs  = ['N', 'NW', 'W', 'SW', 'S', 'SE', 'E', 'NE', 'N'],
        dir   = false;

    if (Math.abs(ev.pageX - cursor.startX) > delta || Math.abs(ev.pageY - cursor.startY) > delta) {
      dir = dirs[Math.round(Math.atan2(ev.pageX - cursor.startX, ev.pageY - cursor.startY) * 4 / Math.PI) + 4];
    }

    listeners.forEach(function (elmt) {
      if (elmt.contains(ev.target)) {
        elmt.dispatchEvent(new window.CustomEvent("gestureEnd", {detail: ev}));
        if (dir) {
          elmt.dispatchEvent(new window.CustomEvent("gesture", {detail: {dir: dir}}));
        }
      }
    });
  }

  function attach(element, events) {
    var names = Object.keys(events),
    remaining = names.filter(function (e) { return allowedEvent.indexOf(e) === -1; });
    if (remaining.length > 0) {
      throw "Wrong event names: " + remaining.join(', ');
    }
    names.forEach(function (ev) {
      element.addEventListener(ev, events[ev]);
    });
    listeners.push(element);
  }

  function detach(element, events) {
    var names = Object.keys(events),
    remaining = names.filter(function (e) { return allowedEvent.indexOf(e) === -1; });
    if (remaining.length > 0) {
      throw "Wrong event names: " + remaining.join(', ');
    }
    names.forEach(function (ev) {
      element.removeEventListener(ev, events[ev]);
    });
  }
  window.addEventListener('mousedown', onTouchStart);
  window.addEventListener('touchstart', onTouchStart);
  window.addEventListener('mouseup', onTouchEnd);
  window.addEventListener('touchend', onTouchEnd);
  window.addEventListener('mousemove', onTouchMove);
  window.addEventListener('touchmove', onTouchMove);

  return {
    attach: attach,
    detach: detach
  };

})();

