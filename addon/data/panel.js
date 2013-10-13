/*jshint browser: true, devel: true */
/*global self: true */
var $  = function (sel) {"use strict"; return document.querySelector.call(document, sel); },
    $$ = function (sel) {"use strict"; return document.querySelectorAll.call(document, sel); };

$('#readaSax').addEventListener('click', function () {
  "use strict";
  self.port.emit('readaSax');
});
$('#selectContent').addEventListener('click', function () {
  "use strict";
  self.port.emit('selectContent');
});
$('#putContent').addEventListener('click', function () {
  "use strict";
  self.port.emit('putContent');
});
$('#connect').addEventListener('click', function () {
  "use strict";
  self.port.emit('discover', $('#address').value);
});
