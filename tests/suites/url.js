/*jshint browser: true, phantom: true, devel: true */
/*global casper:true */

require.paths.push(require('fs').workingDirectory + '/tests/');

var options = require("options").options;

casper.test.begin('Create and update articles', 6, function suite(test) {
  "use strict";
  require("common").init(casper);
  casper.start(options.startUrl, function () {
    casper.click("#menu [data-method=create]");
    casper.waitUntilVisible('[data-tile=prompt]', function () {
      casper.click('[data-method=createArticle]');
      casper.waitUntilVisible('[data-tile=articleEdit]', function () {
        casper.fill("#articleEditTile > form", {
          "title": "Todo",
          "url": "http://toto.org/titi/tata",
          "text": " - [A](http://titi.org)\n - [B](/tutu)\n - [C](foo/bar)\n - ![A](http://titi.org)\n - ![B](/tutu)\n - ![C](foo/bar)\n"
        });
        casper.click('[data-l10n-id="articleSave"]');
        casper.waitUntilVisible('[data-tile=articleShow]', function () {
          casper.click('#list > li:nth-child(1) h2 a');
          casper.waitUntilVisible('[data-tile=articleShow]', function () {
            var urls = casper.getElementsAttribute("#articleShowTile .content li a", "href"),
                imgs = casper.getElementsAttribute("#articleShowTile .content li img", "src");
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
  });

  casper.run(function () {
    test.done();
  });
});
