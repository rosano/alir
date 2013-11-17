/*jshint browser: true, devel: true */
/*global self: true */
var $  = function (sel) {
  "use strict";
  return document.querySelector.call(document, sel);
};

$('#readaSax').addEventListener('click', function () {
  "use strict";
  self.port.emit('readaSax');
});
$('#selectContent').addEventListener('click', function () {
  "use strict";
  self.port.emit('selectContent');
});
$('#putToRemote').addEventListener('click', function () {
  "use strict";
  self.port.emit('putToRemote');
});
$('#putToDropbox').addEventListener('click', function () {
  "use strict";
  self.port.emit('putToDropbox');
});
$('#connectRs').addEventListener('click', function () {
  "use strict";
  self.port.emit('discover');
});
$('#connectDropbox').addEventListener('click', function () {
  "use strict";
  self.port.emit('connectDropbox');
});
self.port.on('dropbox.connected', function onDropboxConnected() {
  "use strict";
  $('#dropboxLogin').classList.add('hidden');
  $('#putToDropbox').classList.remove('hidden');
});
self.port.on('rs.connected', function onRsConnected() {
  "use strict";
  $('#rsLogin').classList.add('hidden');
  $('#putToRemote').classList.remove('hidden');
});
