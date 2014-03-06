//jshint browser: true
/* global utils: true, remoteStorage: true, _: true */
function scrap(url, cb) {
  //jshint maxstatements: 30
  "use strict";
  var article;
  article = {
    url: url,
    title: '???',
    html:  '???',
  };
  function onComplete(err, doc) {
    if (err) {
      cb(err, article);
    } else {
      try {
        var parser,
            readable = new window.Readability(),
            root, parsed;
        readable.setSkipLevel(3);
        if (doc.responseXML) {
          doc = doc.response;
        } else {
          try {
            parser = new DOMParser();
            doc = parser.parseFromString(doc.response, 'text/html');
          } catch (e) {
            cb('Unable to parse document response', article);
          }
        }
        if (!doc) {
          cb('Unable to parse document response', article);
        }
        root = doc.getElementsByTagName('html');
        if (root.length === 1) {
          root = root[0];
        } else {
          root = doc.getElementsByTagName('0');
          if (root.length > 1) {
            root = root[0];
          } else {
            root = false;
          }
        }
        if (root !== false) {
          window.saxParser(root, readable);
          parsed = readable.getArticle();
          article.title      = parsed.title;
          article.html       = parsed.html;
          article.alternates = [];
          [].slice.apply(root.querySelectorAll("link[rel='alternate'][type*=xml][title][href]")).forEach(function (e) {
            var alt = {
              href: e.href,
              title: e.title,
              type: e.type
            };
            article.alternates.push(alt);
          });
        }
        cb(null, article);
      } catch (e) {
        cb(e, article);
      }
    }
  }
  window.network.fetch(url, onComplete);
}
window.Network = function () {
  "use strict";
  var self          = this,
      timeout       = 20000,
      cache         = [],
      retryInterval = 60000;
  this.maxRetry = 5;
  /**
   * Store a failed request for later retry
   */
  function store(reason, url, cb) {
    var found, item;
    found = cache.find(function (e) { return e.url === url; });
    if (typeof found !== "undefined") {
      found.calls++;
    } else {
      item = {
        url: url,
        cb: cb,
        calls: 0
      };
      cache.push(item);
    }
  }
  /**
   * If online, retry to fetch all stored request
   */
  function retry(status) {
    cache = cache.filter(function (item) {
      if (item.calls > self.maxRetry) {
        item.cb("Error fetching " + item.url + ", max retry");
        return false;
      } else {
        return true;
      }
    });
    if (typeof status === "undefined") {
      status = window.alir.getStatus();
    }
    if (status.online === true) {
      cache.forEach(function (item) {
        utils.log("Retrying to fetch " + item.url, "debug");
        self.fetch(item.url, item.cb);
      });
    }
  }
  window.alir.on('statusUpdated', retry);
  window.setInterval(retry, retryInterval);

  this.fetch = function (url, cb) {
    //jshint maxstatements: 26
    var status, xhr, options, proxy, timer, computedUrl;
    status = window.alir.getStatus();
    computedUrl = url;
    if (status.online !== true) {
      store('offline', url, cb);
      return;
    }
    try {
      options = {
        mozAnon: true,
        mozSystem: true
      };
      xhr = new XMLHttpRequest(options);
      if (typeof xhr.mozSystem !== 'boolean' || xhr.mozSystem !== true) {
        if (window.config.proxy !== '' && window.config.proxy !== 'http://') {
          proxy = url.split('://');
          if (proxy !== null) {
            computedUrl = window.config.proxy + proxy[1];
          } else {
            cb(_('scrapNotInstalled'));
            return;
          }
        } else {
          cb(_('scrapNotInstalled'));
          return;
        }
      } else {
        // Add a timestamp to bypass the cache
        computedUrl += ((/\?/).test(url) ? "&" : "?") + 'ts=' + (new Date()).getTime();
      }
      xhr.open("GET", computedUrl, true);
      //xhr.responseType = "document";
      xhr.timeout = this.timeout;
      xhr.onload = function (e) {
        clearTimeout(timer);
        var i = cache.findIndex(function (e) { return e.url === url; });
        if (i !== -1) {
          cache.splice(i, 1);
        }
        cb(null, xhr);
      };
      xhr.onerror = function (e) {
        clearTimeout(timer);
        store('error', url, cb);
        utils.log("Request for %s failed: %s", url, e.target.status, "error");
        return;
      };
      timer = setTimeout(function () {
        xhr.abort();
        store('timeout', url, cb);
      }, timeout);
      xhr.send(null);
    } catch (e) {
      store('error', url, cb);
      utils.log(utils.format("Error getting %s : %s", url, e));
      return;
    }
  };
  this.clear = function () {
    cache = [];
  };
};
function saveScraped(article) {
  "use strict";
  try {
    var obj;
    if (typeof article.id === 'undefined') {
      article.id = utils.uuid();
    }
    obj = {
      id:    article.id,
      url:   article.url,
      title: article.title,
      html:  article.html,
      date:  Date.now(),
      flags: {
      },
      tags: [],
      alternates: article.alternates
    };
    if (article.title === '???') {
      article.loaded = false;
    }
    remoteStorage.alir.saveArticle(obj);
    window.displayItem(obj);
    utils.notify('"' + article.title + '" has been successfully saved', '', function () {
      if (window.alir.getStatus().installed) {
        navigator.mozApps.getSelf().onsuccess = function gotSelf(evt) {
          var app = evt.target.result;
          if (app !== null) {
            app.launch();
          }
          window.articles.show(article.id);
        };
      } else {
        window.articles.show(article.id);
      }
    });
    utils.log('Scraped : ' + article.title);
  } catch (e) {
    utils.log(utils.format("Error saving %s : %s", article.title, e), 'error');
  }
}
function activityHandler(activity) {
  'use strict';
  utils.log("Handling activity");
  try {
    var data;
    switch (activity.source.name) {
    case 'save-bookmark':
    case 'share':

      data = activity.source.data;
      if (data.type === 'url') {
        try {
          utils.log("Scraping " + data.url);
          scrap(data.url, function (err, res) {
            saveScraped(res);
            if (err) {
              utils.log(err.toString(), 'error');
              activity.postError(err);
            } else {
              activity.postResult('saved');
            }
          });
        } catch (e) {
          activity.postError('cancelled');
          utils.log(e.toString(), "error");
        }
      } else {
        activity.postError('type not supported');
        utils.log('Activity type not supported: ' + activity.source.data.type, 'error');
      }
      break;
    default:
      activity.postError('name not supported');
      utils.log('Activity name not supported: ' + activity.source.name, 'error');
    }
  } catch (e) {
    utils.log("Error handling activity: " + e, 'error');
  }
}
if (navigator.mozSetMessageHandler) {
  navigator.mozSetMessageHandler('activity', activityHandler);
}
