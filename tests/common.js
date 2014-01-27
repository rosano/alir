/*jshint browser: true, phantom: true, devel: true */
/*global exports: true */
var utils   = require("utils");
function init(casper) {
  "use strict";
  //casper.options.verbose = true;
  //casper.options.logLevel = 'debug';
  casper.on('exit', function () {
    casper.capture("last.png");
  });
  casper.on("remote.message", function (msg) {
    //casper.echo("Message: " + msg, "INFO");
  });
  casper.on("page.error", function (msg, trace) {
    casper.echo("Error: " + msg, "ERROR");
    utils.dump(trace);
  });
}

exports.init = init;
