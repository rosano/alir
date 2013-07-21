#!/usr/bin/env nodejs
/*jshint node: true, laxbreak: true, maxstatements: 100, maxcomplexity: 100 */

var crypto   = require('crypto'),
    fs       = require('fs'),
    https    = require("https"),
    optimist = require("optimist"),
    util     = require('util'),
    argv,
    shasum   = crypto.createHash('sha1');

// to accept self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

function entities(str) {
  "use strict";
  var re = new RegExp('&#([^\\s]*);', 'g');
  return str.replace(re, function (match, match2) {return String.fromCharCode(Number(match2)); });
}
/**
 * Parse url with Readability SAX
 */
function readaSax(url, cb) {
  "use strict";
  var Readability = require("readabilitySAX/readabilitySAX.js"),
      Parser = require("htmlparser2/lib/Parser.js"),
      request = require('request'),
      readable,
      parser,
      readableConf;

  readableConf = {
    stripUnlikelyCandidates: false, // Removes elements that probably don't belong to the article. Default: true
    weightClasses: true,           // Indicates whether classes should be scored. This may lead to shorter articles. Default: true
    cleanConditionally: false,      // Removes elements that don't match specific criteria (defined by the original Readability). Default: true
    cleanAttributes: true,         // Only allow some attributes, ignore all the crap nobody needs. Default: true
    searchFurtherPages: false,     // Indicates whether links should be checked whether they point to the next page of an article. Default: true
    linksToSkip: {},               // A map of pages that should be ignored when searching links to further pages. Default: {}
    pageURL: url,                   // The URL of the current page. Will be used to resolve all other links and is ignored when searching links. Default: ""
    type: 'html',                  // The default type of the output of getArticle(). Possible values are "html" or "text". Default: "html"
    resolvePaths: false            // Indicates whether ".." and "." inside paths should be eliminated. Default: false
  };
  readable = new Readability(readableConf);
  parser = new Parser(readable, {});

  request.get({url: url, followRedirect: true, headers: {'user-agent': 'Mozilla/5.0 (X11; U; Linux i686; en-US; rv:1.9.1.16) Gecko/20120421 Gecko Firefox/11.0'}}, function (error, response, body) {
    function format(str) {
      var re = new RegExp('.{1,80}(\\s|$)|\\S+?(\\s|$)', 'g');
      return entities(str).match(re).join("\n");
    }
    if (!error) {
      parser.parseComplete(body);
      var res = {
        url: url,
        title: entities(readable.getTitle()),
        html: readable.getHTML(),
        text: format(readable.getText())
      };
      cb(null, res);
    } else {
      cb(error);
    }
  });
}

/**
 * Pars url with Readability node
 */
function readaNode(url, cb) {
  "use strict";
  var readability = require('node-readability');

  readability.read(url, function (err, article) {
      var res = {
        url: url,
        title: article.getTitle().replace(/&#([^\s]*);/g, function (match, match2) {return String.fromCharCode(Number(match2)); }),
        html: article.getContent()
      };
      cb(null, res);
    });
}

argv = optimist
       .usage('$0 --url <url>')
       .check(function (argv) {
          "use strict";
          if (!argv.url && argv._.length !== 1 && !argv.i) {
            throw "You must specify a url";
          }
        })
       .string('url').describe("url", "url to fetch")
       .boolean('i').describe("i", "interactive mode")
       .boolean('sax').describe("sax", "use Sax parser")
       .argv;

function put(obj) {
  "use strict";
  var config,
      req,
      slug,
      requestOptions;

  config = JSON.parse(fs.readFileSync(require('path').resolve(__dirname, 'config.json')));

  requestOptions = {
    hostname: config.hostname,
    path: config.path,
    port: config.port,
    method: "PUT",
    headers: {
      Authorization: "Bearer " + config.token,
      "Content-Type": "application/json"
    },
    rejectUnauthorized: false
  };


  slug = obj.url.split('://').pop().split('?').shift().split('#').shift().replace(/[^\w\./]/g, '');

  shasum.update(obj.url, 'utf8');
  requestOptions.path += shasum.digest('hex');
  req = https.request(requestOptions, function (res) {
    if (res.statusCode === 200) {
      console.log('ok');
    } else {
      console.log("statusCode: ", res.statusCode);
      console.log("headers: ", res.headers);
    }
    process.exit(0);

    res.on('data', function (d) {
      process.stdout.write(d);
    });
  });
  req.write(JSON.stringify(obj));
  req.end();

  req.on('error', function (e) {
    console.error(e);
  });
}

function doPut(url, parser) {
  "use strict";
  parser(url, function onReada(err, res) {
    if (err) {
      console.log(err);
    } else {
      res.date = Date.now();
      put(res);
    }
  });
}

function interactive() {
  "use strict";
  var input = '';
  function interact(content) {
    var re       = new RegExp('http[^\\s]*', 'g'), // yes, I know
        matches  = content.match(re),
        i        = 1,
        readline = require('readline'),
        rl,
        actions;

    /**
     * Check answer
     *
     * @param {Array}    choices
     * @param {String}   answer
     * @param {function} onOk
     * @param {function} [onKo]
     *
     * @return void
     */
    function checkAnswer(choices, answer, onOk, onKo) {
      if (typeof onKo !== 'function') {
        onKo = function () {
          rl.write("Wrong answer !");
          process.exit(1);
        };
      }
      answer = parseInt(answer, 10);
      if (isNaN(answer)) {
        onKo();
      } else {
        answer--;
        if (typeof choices[answer] === 'undefined') {
          onKo();
        } else {
          onOk(choices[answer]);
        }
      }
    }
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    actions = [
      {
        "label": "put",
        "action": function (url) {
          doPut(url, readaNode);
        }
      },
      {
        "label": "put with Sax",
        "action": function (url) {
          doPut(url, readaSax);
        }
      },
      {
        "label": "view with Sax",
        "action": function (url) {
          readaSax(url, function (err, res) {
            console.log(util.inspect(res, {depth: 1}));
            process.exit(0);
          });
        }
      },
      {
        "label": "view",
        "action": function (url) {
          readaNode(url, function (err, res) {
            console.log(util.inspect(res, {depth: 1}));
            process.exit(0);
          });
        }
      },
      {
        "label": "test",
        "action": function (url) {
          console.log(url);
          process.exit(0);
        }
      }
    ];
    if (matches === null) {
      console.log("Sorry, I'm enable to find an url in this file");
      process.exit(1);
    }
    matches.forEach(function onUrl(url) {
      console.log(util.format("%d) %s", i++, url));
    });
    rl.question("Laquelle : ", function onAnswer(answer) {
      checkAnswer(matches, answer, function (url) {
        var j = 1;
        actions.forEach(function (action) {
          console.log(util.format("%d) %s", j++, action.label));
        });
        rl.question("Laquelle : ", function onAnswer(answer) {
          checkAnswer(actions, answer, function (action) {
            action.action(url);
          });
        });
      });
    });
  }
  if (!argv.f || !fs.existsSync(argv.f)) {
    console.log('You must specify a valid file with -f');
    process.exit(1);
  }

  input = fs.readFileSync(argv.f, {encoding: 'utf8'});
  //process.stdin.pause();
  interact(input);
}

if (argv.i) {
  interactive();
} else {
  doPut(argv.url || argv._[0], argv.sax ? readaSax : readaNode);
}
