/*jshint browser: true, devel: true */
/*global self: true */
var $  = function (sel) {"use strict"; return document.querySelector.call(document, sel); },
    $$ = function (sel) {"use strict"; return document.querySelectorAll.call(document, sel); };

$('#getToken').addEventListener('click', function () {
  "use strict";
  self.port.emit('getToken');
});
$('#readaSax').addEventListener('click', function () {
  "use strict";
  self.port.emit('readaSax');
});
$('#putContent').addEventListener('click', function () {
  "use strict";
  self.port.emit('putContent');
});
