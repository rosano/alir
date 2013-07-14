#!/usr/bin/env nodejs
/*jshint node: true, laxbreak: true, maxstatements: 100, maxcomplexity: 100 */

var crypto   = require('crypto'),
    fs       = require('fs'),
    https    = require("https"),
    optimist = require("optimist"),
    argv,
    parser,
    shasum   = crypto.createHash('sha1');

// to accept self-signed certificates
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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
      return str.replace(/&#([^\s]*);/g, function (match, match2) {return String.fromCharCode(Number(match2)); }).match(/.{1,80}(\s|$)|\S+?(\s|$)/g).join("\n");
    }
    if (!error) {
      parser.parseComplete(body);
      var res = {
        url: url,
        title: readable.getTitle().replace(/&#([^\s]*);/g, function (match, match2) {return String.fromCharCode(Number(match2)); }),
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
          if (!argv.url) {
            throw "You must specify a url";
          }
        })
       .string('url')
       .boolean('sax')
       .argv;

parser = argv.sax ? readaSax : readaNode;

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

parser(argv.url, function onReada(err, res) {
  "use strict";
  if (err) {
    console.log(err);
  } else {
    put(res);
  }
});
