/*jshint browser: true, phantom: true, devel: true */
/*global casper:true */

require.paths.push(require('fs').workingDirectory + '/tests/');

var options = require("options").options;

casper.options.timeout = 15000;
casper.options.waitTimeout = 15000;

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

  // Links
  casper.then(function () {
    test.assertSelectorHasText('#list > li:nth-child(1)', 'Message de service');
    casper.click('#list > li:nth-child(1) h2 a');
    casper.waitUntilVisible('[data-tile=articleShow]', function () {
      casper.click('#articleShowTile .url a');
      casper.waitUntilVisible('#link', function () {
        casper.click('#link [data-method=back]');
        casper.waitUntilVisible('[data-tile=articleShow]', function () {
          casper.click('#articleShowTile .url a');
          casper.waitUntilVisible('#link', function () {
            casper.click('#link [data-method=open]');
            casper.waitForPopup(/www\.clochix\.net/, function () {
              test.pass("Link opened");
            });
            casper.waitUntilVisible('[data-tile=articleShow]', function () {
              casper.click('#articleShowTile .url a');
              casper.waitUntilVisible('#link', function () {
                casper.click('#link [data-method=twitter]');
                casper.waitForPopup(/twitter\.com/, function () {
                  test.pass("Share on Twitter");
                });
                casper.waitUntilVisible('[data-tile=articleShow]');
              });
            });
          });
        });
      });
    });
  });

  // Annotate
  casper.then(function () {
    test.comment('Annotate');
    casper.mouseEvent('dblclick', '#articleShowTile .content p');
    casper.waitUntilVisible('#noteEditTile', function () {
      casper.fill('#noteEditTile form', {
        text: 'This is wrong'
      });
      casper.click('#noteEditTile [data-method=save]');
      casper.waitUntilVisible('[data-tile=articleShow]', function () {
        test.assertVisible('#articleShowTile a.note', 'Article has note');
        test.assertNotVisible('#articleShowTile .tabNotes', 'Notes tab is not visible');
        casper.click('#articleShowTile .tab-notes a');
        casper.waitUntilVisible('#articleShowTile .tabNotes', function () {
          test.assertSelectorHasText('#articleShowTile .tabNotes', 'This is wrong', 'Notes tab displayed');
          casper.click('#articleShowTile .tab-content a');
          casper.click('#articleShowTile a.note');
          casper.waitUntilVisible('#noteViewTile', function () {
            test.assertSelectorHasText('#noteViewTile .content', 'This is wrong', 'View note');
            casper.click('#noteViewTile [data-method=share]');
            casper.waitUntilVisible('#link', function () {
              test.assertSelectorHasText('#linkRef', 'http://www.clochix.net/post/2012/01/09/Message-de-service', 'Note share link');
              test.assertField('linkText', 'This is wrong', 'Share note');
              casper.click('#link [data-method=back]');
              casper.waitUntilVisible('#noteViewTile', function () {
                casper.click('#noteViewTile [data-method=back]');
                casper.waitUntilVisible('#articleShowTile', function () {
                });
              });
            });
          });
        });
      });
    });
  });

  casper.then(function () {
    test.comment('Alternates');
    casper.click('#articleShowTile .articleMenu');
    casper.waitUntilVisible('#articleShowTile .articleActions a[data-method=delete]', function () {
      test.assertExists('#articleShowTile div.hasAlternates');
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
