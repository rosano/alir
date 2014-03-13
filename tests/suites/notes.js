/*jshint browser: true, phantom: true, devel: true */
/*global casper:true */

require.paths.push(require('fs').workingDirectory + '/tests/');

var options = require("options").options;

casper.test.begin('Create and update articles', function suite(test) {
  "use strict";
  require("common").init(casper);
  casper.start(options.startUrl, function () {
    test.assertExists('#menu', "Menu exists");
    test.assertVisible('#main', "Main is visible");
    test.assertVisible('#listFilter', "listFilter is visible");
    test.assertElementCount("#list > li", 0, "No article");
    casper.click("#menu [data-method=create]");
    casper.waitUntilVisible('[data-tile=prompt]', function () {
      casper.click('[data-method=createArticle]');
      casper.waitUntilVisible('[data-tile=articleEdit]', function () {
        test.assertNotVisible('#articleUrl');
        test.assertVisible('#articleTitle');
        test.assertVisible('[data-tile=articleEdit] [name=text]');
        casper.fill("#articleEditTile > form", {
          "title": "Todo",
          "text": " - First\n - Second\n"
        });
        casper.click('[data-l10n-id="articleSave"]');
        casper.waitUntilVisible('[data-tile=articleShow]', function () {
          test.assertSelectorHasText("#articleShowTile > div > h3", "Todo");
        });
      });
    });
  });

  /*
  casper.then(function () {
    casper.click("#list > li:nth-of-type(1) .articleActions .compose");
    casper.waitUntilVisible('#input', function () {
      test.assertEquals(casper.getFormValues("#input > form").text, " - First\n - Second\n");
      casper.fill("#input > form", {
        "title": "Todo",
        "text": " - First\n - Second\n - Third\n"
      });
      casper.click("[data-action=articleSave]");
      casper.waitUntilVisible("#list > li", function () {
        test.assertElementCount("#list > li", 1);
        test.assertVisible("#list > li");
        test.assertSelectorHasText("#list > li h2", "Todo");
        casper.click("#list > li h2 a");
        casper.waitForSelector("#main.detail", function () {
          test.assertVisible("#list > li > .content");
          test.assertElementCount("#list > li .content li", 3, "Article content");
          test.assertSelectorHasText("#list > li .content ", "Third");
        });
      });
    });
  });
  */

  casper.run(function () {
    test.done();
  });
});
