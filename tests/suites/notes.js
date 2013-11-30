/*jshint browser: true, phantom: true, devel: true */
/*global casper:true */

require.paths.push(require('fs').workingDirectory + '/tests/');

var options = require("options").options,
    utils   = require("utils");

casper.test.begin('Create and update articles', function suite(test) {
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
    test.assertExists('#menu', "Menu exists");
    test.assertVisible('#main', "Main is visible");
    test.assertVisible('#listFilter', "listFilter is visible");
    test.assertElementCount("#list > li", 0, "No article");
    casper.click("#menu [data-action=toggleMenu]");
    casper.click("#menu [data-action=create]");
    casper.waitUntilVisible("#input.shown", function () {
      casper.test.pass("Input field displayed");
      casper.fill("#input > form", {
        "title": "Todo",
        "text": " - First\n - Second\n"
      });
      casper.click("[data-action=articleSave]");
      casper.waitUntilVisible("#list > li", function () {
        test.assertElementCount("#list > li", 1, "Article created");
        test.assertVisible("#list > li");
        test.assertSelectorHasText("#list > li h2", "Todo");
        casper.click("#list > li h2 a");
        casper.waitForSelector("#main.detail", function () {
          test.assertVisible("#list > li > .content");
          test.assertElementCount("#list > li > .content .tags .tag", 1);
          test.assertSelectorHasText("#list > li > .content .tags .tag", "note");
          test.assertElementCount("#list > li .content li", 2, "Article content");
        });
      });
    });
  });

  casper.then(function () {
    casper.click("#list > li:nth-of-type(1) .actions .compose");
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

  casper.run(function () {
    test.done();
  });
});
