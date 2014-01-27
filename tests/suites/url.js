/*jshint browser: true, phantom: true, devel: true */
/*global casper:true */

require.paths.push(require('fs').workingDirectory + '/tests/');

var options = require("options").options;

casper.test.begin('Create and update articles', 6, function suite(test) {
  "use strict";
  require("common").init(casper);
  casper.start(options.startUrl, function () {
    casper.click("#menu [data-action=toggleMenu]");
    casper.click("#menu [data-method=create]");
    casper.waitUntilVisible("#input.shown", function () {
      casper.fill("#input > form", {
        "title": "Todo",
        "url": "http://toto.org/titi/tata",
        "text": " - [A](http://titi.org)\n - [B](/tutu)\n - [C](foo/bar)\n - ![A](http://titi.org)\n - ![B](/tutu)\n - ![C](foo/bar)\n"
      });
      casper.click("[data-action=articleSave]");
      casper.waitUntilVisible("#list > li", function () {
        casper.click("#list > li h2 a");
        casper.waitForSelector("#main.detail", function () {
          var urls = casper.getElementsAttribute("#list > li .content li a", "href"),
              imgs = casper.getElementsAttribute("#list > li .content li img", "src");
          test.assertEquals(urls[0], "http://titi.org", "Absolute url");
          test.assertEquals(urls[1], "http://toto.org/tutu", "Relative url (1)");
          test.assertEquals(urls[2], "http://toto.org/titi/foo/bar", "Relative url (2)");
          test.assertEquals(imgs[0], "http://titi.org", "Absolute url");
          test.assertEquals(imgs[1], "http://toto.org/tutu", "Relative url (1)");
          test.assertEquals(imgs[2], "http://toto.org/titi/foo/bar", "Relative url (2)");
        });
      });
    });
  });

  casper.run(function () {
    test.done();
  });
});
