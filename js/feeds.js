//jshint browser: true
/* global remoteStorage: true, template: true, tiles: true, utils: true, _: true, $:true */
window.feeds = {
  _cache: {},
  cache: function (obj) {
    "use strict";
    window.feeds._cache[obj.url] = obj;
  },
  save: function () {
    "use strict";
    var $  = tiles.$('feedEdit'),
        id = $('[name="id"]').value,
        obj;

    function doSave(feed) {
      remoteStorage.alir.saveFeed(feed);
      window.feeds.cache(feed);
      tiles.show('feeds');
      $('[name="url"]').value   = '';
      $('[name="title"]').value = '';
      $('[name="feedShort"]').checked = false;
    }
    if (id) {
      // update
      remoteStorage.get('/alir/feed/' + id).then(function (err, obj, contentType, revision) {
        if (err !== 200) {
          window.alert(err);
          tiles.show('feeds');
        } else {
          obj.id    = id;
          obj.url   = $('[name="url"]').value;
          obj.title = $('[name="title"]').value;
          obj.short = $('[name="feedShort"]').checked;
          obj.date  = Date.now();
          doSave(obj);
        }
      });
    } else {
      // create
      obj = {
        id:    utils.uuid(),
        url:   $('[name="url"]').value,
        title: $('[name="title"]').value,
        date:  Date.now(),
        short: $('[name="feedShort"]').checked,
        articles: {}
      };
      doSave(obj);
    }
  },
  fetch: function (url, test, cb) {
    //jshint maxcomplexity: 15
    "use strict";
    function getUrl(url, cb) {
      var xhr, options;
      options = {
        mozAnon: true,
        mozSystem: true
      };
      xhr = new XMLHttpRequest(options);
      xhr.onload = function (e) {
        xhr.responseXML.url = url;
        cb(null, xhr.responseXML);
      };
      xhr.onerror = function (e) {
        console.log(e);
        cb("Error : " + xhr.status + " " + e + " on " + url, {url: url});
      };
      xhr.open('GET', url, true);
      xhr.responseType = "document";
      xhr.send();
    }
    getUrl(url, function (err, doc) {
      //jshint maxstatements: 22
      var feedUpdated,
          root,
          format = 'atom',
          cache;
      if (typeof window.feeds._cache[url] === 'undefined') {
        window.feeds._cache[url] = {
          'articles': {},
          'short': false,
          'title': '???'
        };
      }
      cache = window.feeds._cache[url];
      utils.log('Updating feed ' + cache.title, "info");
      if (err) {
        console.log(err);
      } else {
        root = doc.firstChild.tagName;
        if (root === "rss") {
          format = 'rss';
          root = "rss > channel ";
        }
        utils.log("Feed format : " + format, "info");
        feedUpdated = doc.querySelector(root + " > updated");
        if (feedUpdated) {
          feedUpdated = new Date(feedUpdated.textContent);
        }
        root = format === 'atom' ? root + ' > entry' : root + ' > item';
        [].slice.call(doc.querySelectorAll(root)).forEach(function (entry) {
          //jshint maxstatements: 30
          var itemContent, itemId, itemTitle, itemUpdated, itemUrl;
          function getVal(key, prop) {
            var val = entry.querySelector(key);
            if (val) {
              if (prop) {
                return val.getAttribute(prop);
              } else {
                return val.textContent;
              }
            } else {
              return null;
            }
          }
          itemId      = format === 'atom' ? getVal('id') : getVal('guid');
          itemUrl     = format === 'atom' ? getVal('link', 'href') : entry.querySelector('link').textContent;
          itemTitle   = getVal('title');
          itemContent = getVal('content') || getVal('summary');
          itemUpdated = entry.querySelector("updated") || entry.querySelector("published") || entry.querySelector("pubdate") || entry.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", 'date');
          if (itemUpdated && itemUpdated.length) {
            itemUpdated = itemUpdated[0];
          }
          if (!!!itemId || !!!itemUpdated) {
            return;
          }
          itemUpdated = new Date(itemUpdated.textContent).toISOString();
          if (typeof cache.articles[itemId] !== 'undefined' && cache.articles[itemId].updated >= itemUpdated) {
            return;
          }
          if (typeof cache.articles[itemId] === 'undefined') {
            utils.log('New article "%s"', itemTitle, "info");
          } else {
            utils.log('Article Updated : "%s" "%s" < "%s"', itemTitle, cache.articles[itemId].updated, itemUpdated, "info");
          }
          if (itemUpdated > feedUpdated) {
            feedUpdated = itemUpdated;
          }
          function doSave(content) {
            var article = {
              id:    utils.uuid(),
              url:   itemUrl,
              title: itemTitle,
              html:  content,
              date:  itemUpdated,
              flags: {
                editable: false
              },
              tags: ['feed', cache.title]
            };
            if (test !== true) {
              remoteStorage.alir.saveArticle(article);
            }
          }
          cache.articles[itemId] = {
            url: itemUrl,
            updated: itemUpdated,
            title: itemTitle
          };
          if (test !== true && (cache.short || !!!itemContent)) {
            window.scrap(itemUrl, function (err, res) {
              if (err) {
                utils.log(err, 'error');
                doSave(err.toString());
              } else {
                doSave(res.html);
              }
            });
          } else {
            doSave(itemContent);
          }
        });
        if (test !== true) {
          remoteStorage.get('/alir/feed/' + window.feeds._cache[url].id).then(function (err, obj, contentType, revision) {
            if (err === 200) {
              obj.articles = cache.articles;
              obj.date     = Date.now();
              remoteStorage.alir.saveFeed(obj);
            }
          });
        }
      }
      if (cb) {
        cb(cache.articles);
      }
    });
  },
  test: function (url) {
    "use strict";
    var $   = tiles.$('feedEdit');
    url = url || $('[name="url"]').value;
    window.feeds.fetch(url, true, function (items) {
      items = items || {};
      window.alert("Found " + Object.keys(items).length + " item");
    });
  },
  create: function () {
    "use strict";
    var $   = tiles.$('feedEdit');
    $('[name="id"]').value    = '';
    $('[name="url"]').value   = '';
    $('[name="title"]').value = '';
    $('[name="feedShort"]').checked = false;
    tiles.show('feedEdit');
  },
  edit: function (url) {
    "use strict";
    var $    = tiles.$('feedEdit'),
        feed = this._cache[url];
    $('[name="id"]').value    = feed.id;
    $('[name="url"]').value   = feed.url;
    $('[name="title"]').value = feed.title;
    $('[name="feedShort"]').checked = feed.short;
    tiles.show('feedEdit');
  },
  show: function (url) {
    "use strict";
    var feed = this._cache[url],
        parent = $("#feedDetail");
    feed.items = utils.toArray(feed.articles);
    feed.items.forEach(function (v, k) {
      if (!v.title) {
        feed.items[k].title = v.url.split('/').pop();
      }
    });
    feed.items.sort(function (a, b) {return a.updated > b.updated ? -1 : 1; });
    parent.innerHTML = '';
    parent.appendChild(template('tmpl-feed-detail', feed));
    tiles.go('feedShow');
  },
  delete: function (url) {
    "use strict";
    var feed = this._cache[url];
    if (window.confirm(_('feedConfirmDelete', {title: feed.title}))) {
      remoteStorage.alir.private.remove('/feed/' + feed.id);
      delete this._cache[url];
      tiles.show('feeds');
    }
  },
  update: function () {
    "use strict";
    var feeds = Object.keys(window.feeds._cache),
        toFetch = feeds.length;
    feeds.forEach(function (url) {
      window.feeds.fetch(url, false, function () {
        toFetch--;
        if (toFetch === 0) {
          window.alert("Feeds updated");
        }
      });
    });
  }
};

// Manage alarms
if (navigator.mozAlarms) {
  window.alarms = {
    display: function () {
      "use strict";
      var request = navigator.mozAlarms.getAll();

      request.onsuccess = function () {
        var alarms  = this.result;
        if (alarms.length === 0) {
          utils.log(_('alarmsNoAlarms'), 'warning');
        } else {
          alarms.forEach(function (alarm) {
            utils.log(alarm.data.action + " at " + alarm.date, "info");
          });
        }
      };

      request.onerror = function () {
        utils.log('Error getting alarms: ' + this.error);
      };
    },
    plan: function () {
      "use strict";
      var request = navigator.mozAlarms.getAll();

      request.onsuccess = function () {
        var alarms   = this.result,
            current  = new Date(),
            nb       = alarms.length,
            interval = window.config.alarmInterval || 60;
        utils.log(alarms.length + " alarms planned", "info");
        if (alarms.length === 0) {
          current.setMinutes(current.getMinutes() + 1);
          window.alarms.set(current);
        }
        alarms.forEach(function (alarm) {
          if (alarm.date > current) {
            current = alarm.date;
          }
        });
        utils.log("Last alarm planned at " + current.toISOString(), "info");
        while (nb < 10) {
          current.setMinutes(current.getMinutes() + parseInt(interval, 10));
          window.alarms.set(current);
          nb++;
        }
      };

      request.onerror = function () {
        utils.log('Error getting alarms: ' + this.error);
      };
    },
    set: function (date) {
      "use strict";
      var alarm, request;
      alarm = {
        date: date,
        respectTimezone: 'ignoreTimezone',
        data: {
          action: 'feedUpdate'
        }
      };
      request = navigator.mozAlarms.add(alarm.date, alarm.respectTimezone, alarm.data);

      request.onsuccess = function () {
        utils.log("Alarm planned at " + date, "info");
      };
      request.onerror = function () {
        utils.log("Error planning alarm at " + date, "error");
      };
    },
    reset: function (cb) {
      "use strict";
      var request = navigator.mozAlarms.getAll();

      request.onsuccess = function () {
        this.result.forEach(function (alarm) {
          navigator.mozAlarms.remove(alarm.id);
        });
        if (cb) {
          cb();
        }
      };

      request.onerror = function () {
        utils.log('Error getting alarms: ' + this.error);
      };
    },
  };
  if (navigator.mozSetMessageHandler) {
    navigator.mozSetMessageHandler("alarm", function (mozAlarm) {
      "use strict";
      console.log("alarm fired: " + JSON.stringify(mozAlarm.data));
      try {
        utils.log("alarm fired: " + JSON.stringify(mozAlarm.data), "info");
      }
      switch (mozAlarm.data.action) {
      case 'feedUpdate':
        window.feeds.update();
        window.alarms.plan();
      }
    });
  }

  window.alarms.plan();
}
