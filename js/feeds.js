//jshint browser: true
/* global remoteStorage: true, tiles: true, utils: true */
window.feeds = {
  _cache: {},
  cache: function (obj) {
    "use strict";
    window.feeds._cache[obj.url] = {
      id: obj.id,
      short: obj.short,
      articles: obj.articles
    };
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
        }
        doSave(obj);
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
  fetch: function (url) {
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
      var feedUpdated,
          items,
          isShort = false;
      if (typeof window.feeds._cache[url] === 'undefined') {
        items = {};
      } else {
        items   = window.feeds._cache[url].articles;
        isShort = window.feeds._cache[url].short;
      }
      if (err) {
        console.log(err);
      } else {
        feedUpdated = new Date(doc.querySelector("feed > updated").textContent);
        [].slice.call(doc.querySelectorAll('feed > entry')).forEach(function (entry) {
          var itemId, itemUpdated, itemUrl, article;
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
          itemId = getVal('id');
          if (itemId !== null) {
            itemUpdated = entry.querySelector("updated") || entry.querySelector("published");
            if (itemUpdated) {
              itemUpdated = new Date(itemUpdated.textContent);
              if (itemUpdated > feedUpdated) {
                feedUpdated = itemUpdated;
              }
              if (typeof items[itemId] === 'undefined' ||
                  typeof items[itemId] !== 'undefined' && items[itemId].updated < itemUpdated) {
                itemUrl = getVal('link', 'href');
                items[itemId] = {
                  url: itemUrl,
                  updated: itemUpdated
                };
                if (isShort) {
                  window.scrap(itemUrl, function (err, res) {
                    if (err) {
                      utils.log(err, 'error');
                    } else {
                      article = {
                        id:    utils.uuid(),
                        url:   res.url,
                        title: res.title,
                        html:  res.html,
                        date:  itemUpdated,
                        flags: {
                          editable: false
                        },
                        tags: ['feed']
                      };
                      remoteStorage.alir.saveArticle(article);
                    }
                  });
                } else {
                  article = {
                    id:    utils.uuid(),
                    url:   itemUrl,
                    title: getVal('title'),
                    html:  getVal('content'),
                    date:  itemUpdated,
                    flags: {
                      editable: false
                    },
                    tags: ['feed']
                  };
                  remoteStorage.alir.saveArticle(article);
                }
              }
            }
          }
        });
        window.feeds._cache[url].articles = items;
        remoteStorage.get('/alir/feed/' + window.feeds._cache[url].id).then(function (err, obj, contentType, revision) {
          if (err === 200) {
            obj.articles = items;
            remoteStorage.alir.saveFeed(obj);
          }
        });
      }
    });
  },
  show: function () {
    // @TODO
  },
  update: function () {
    "use strict";
    Object.keys(window.feeds._cache).forEach(function (url) {
      window.feeds.fetch(url);
    });
  }
};

