/*jshint browser: true, phantom: true, devel: true */
/*global casper:true */

require.paths.push(require('fs').workingDirectory + '/tests/');

var options = require("options").options;

casper.test.begin('Fetch URL', function suite(test) {
  "use strict";
  require("common").init(casper);
  casper.start(options.startUrl, function () {
    casper.waitUntilVisible('#list > li:nth-child(1) .title', function (a) {
      test.assertSelectorHasText('#list > li:nth-child(1) .title', 'Welcome !');
    });
  });

  casper.then(function () {
    casper.click('#menu .content .new');
    casper.waitUntilVisible('[data-tile=prompt]', function () {
      casper.click('[data-method=createUrl]');
      casper.waitUntilVisible('[data-tile=articleEdit]', function () {
        test.assertVisible('#articleUrl');
        test.assertNotVisible('#articleTitle', 'title');
        //test.assertNotVisible('#articleEditTile [name=text]', 'content');
        casper.evaluate(function () { document.getElementById('articleUrl').value = 'http://www.clochix.net/post/2012/01/09/Message-de-service'; });
        casper.click('[data-l10n-id="articleSave"]');
        casper.waitForSelector('#messagebar.info', function () {
          test.assertSelectorHasText('#messagebar', 'http://www.clochix.net/post/2012/01/09/Message-de-service', 'Message displayed');
          this.click('#messagebar');
          casper.waitUntilVisible('#list > li:nth-child(2)');
        });
      });
    });
  });

  casper.then(function () {
    test.assertSelectorHasText('#list > li:nth-child(1)', 'Message de service');
    casper.click('#list > li:nth-child(1) h2 a');
    casper.waitUntilVisible('[data-tile=articleShow]', function () {
    });
  });
  casper.then(function () {
      casper.click('#articleShowTile .articleMenu');
      casper.waitUntilVisible('#articleShowTile .articleActions a[data-method=delete]', function () {
        test.assertExists('#articleShowTile > div.hasAlternates');
        test.assertVisible('#articleShowTile .articleActions a.alternate');
        casper.click('#articleShowTile .articleActions a.alternate');
        casper.waitUntilVisible('#articleShowTile .alternates', function () {
          casper.click('#articleShowTile .alternatesButtons button');
          casper.waitUntilVisible('[data-tile=feedEdit]');
        });
      });
    });

  casper.then(function () {
    var values = casper.getFormValues('[data-tile=feedEdit] form');
    test.assertEquals(values.url, 'http://www.clochix.net/feed/atom');
    test.assertEquals(values.title, 'Atom 1.0');
    casper.evaluate(function () { document.getElementById('feedTitle').value = 'Clochix ATOM'; });
    casper.click('[data-tile=feedEdit] [data-method=save]');
    casper.waitUntilVisible('[data-tile=feeds]', function () {
      test.assertSelectorHasText('#feedsList > li', 'Clochix ATOM');
      casper.click('#feedsList > li [data-method]');
      casper.waitUntilVisible('#feedDetail', function () {
        casper.click('#feedDetail [data-method=fetch]');
        casper.waitForSelector('#feedDetail ul > li:nth-child(2)', function () {
          casper.click('#feedDetail ul > li:nth-child(2)');
          casper.waitUntilVisible('[data-tile=articleShow]', function () {
          });
        });
      });
    });
  });

  casper.then(function () {
    test.assertNotVisible('#articleShowTile .tags');
    casper.click('#articleShowTile .tabs .tab-meta a');
    casper.waitUntilVisible('#articleShowTile .tabMeta', function () {
      test.assertVisible('#articleShowTile .tags');
      test.assertSelectorHasText('#articleShowTile .tags', 'feed');
      test.assertSelectorHasText('#articleShowTile .tags', 'Clochix ATOM');
    });
  });

  casper.run(function () {
    test.done();
  });
});
