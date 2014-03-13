/*jshint browser: true, phantom: true, devel: true */
/*global casper:true */

require.paths.push(require('fs').workingDirectory + '/tests/');

var options = require("options").options,
    rs;

casper.test.begin('Reload config', 4, function suite(test) {
  "use strict";
  require("common").init(casper);
  casper.start(options.startUrl, function () {
    var config = casper.getGlobal("config");
    rs = config.rs;
    casper.evaluate(function () {
      window.config.foo = "bar";
      window.config.menu = 2;
      delete window.config.rs;
      window.location.reload();
    });
    casper.wait(2000);
  });

  casper.then(function () {
    var config = casper.getGlobal("config");
    test.assertType(config.foo, "string", "foo");
    test.assertEquals(config.menu, 2, "menu");
    test.assertEquals(config.rs, rs, "rs");
    test.assertEquals(Object.keys(config.alarms).length, 11, "alarms");
  });

  casper.run(function () {
    test.done();
  });
});
