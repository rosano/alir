/*jshint browser: true, phantom: true, devel: true */
/*global casper:true */

require.paths.push(require('fs').workingDirectory + '/tests/');

var options = require("options").options,
    utils   = require("utils");

casper.test.begin('Reload config', 3, function suite(test) {
  "use strict";
  //casper.options.verbose = true;
  //casper.options.logLevel = 'debug';
  casper.on('exit', function () {
    casper.capture("last.png");
  });
  casper.on("remote.message", function (msg) {
    casper.echo("Message: " + msg, "INFO");
  });
  casper.on("page.error", function (msg, trace) {
    casper.echo("Error: " + msg, "ERROR");
    utils.dump(trace);
  });
  casper.start(options.startUrl, function () {
    var config = casper.getGlobal("config"),
        rs = config.rs;
    config.foo = "bar";
    config.menu = 2;
    delete config.rs;
    casper.evaluate(function (cfg) { window.config = cfg; }, config);
    casper.reload().then(function () {
      var config = casper.getGlobal("config");
      test.assertType(config.foo, "string", "foo");
      test.assertEquals(config.menu, 2, "menu");
      test.assertEquals(config.rs, rs, "rs");
    });
  });

  casper.run(function () {
    test.done();
  });
});
