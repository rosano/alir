//jshint browser: true
/* global utils: true, remoteStorage: true, _: true */
function scrap(url, cb) {
  //jshint maxstatements: 25
  "use strict";
  var options, xhr, status, article;
  article = {
    url: url,
    title: '???',
    html:  '???',
  };
  function onComplete() {
    try {
      var readable = new window.Readability(),
          root, parsed;
      readable.setSkipLevel(3);
      window.remote = xhr.responseXML;
      root = xhr.responseXML.getElementsByTagName('html');
      if (root.length === 1) {
        root = root[0];
      } else {
        root = xhr.responseXML.getElementsByTagName('0');
        if (root.length > 1) {
          root = root[0];
        } else {
          root = false;
        }
      }
      if (root !== false) {
        window.saxParser(root, readable);
        parsed = readable.getArticle();
        article.title = parsed.title;
        article.html  = parsed.html;
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
  function onFailed(e) {
    utils.log("Request for %s failed: %s", url, e.target.status, "error");
    cb('Request Failed', article);
  }
  function onCanceled(e) {
    cb("Canceled", article);
  }
  status = window.alir.getStatus();
  if (status.installed !== true) {
    cb(_('scrapNotInstalled'), article);
    return;
  }
  if (status.online !== true) {
    cb(_('scrapOffline'), article);
    return;
  }
  try {
    options = {
      mozAnon: true,
      mozSystem: true
    };
    xhr = new XMLHttpRequest(options);
    xhr.open("GET", url, true);
    xhr.responseType = "document";
    xhr.timeout = 20000;
    xhr.onload  = onComplete;
    xhr.onerror = onFailed;
    xhr.addEventListener("error", onFailed, false);
    xhr.addEventListener("abort", onCanceled, false);
    xhr.send(null);
  } catch (e) {
    utils.log(utils.format("Error getting %s : %s", url, e));
    cb('Failed ' + e.toString(), article);
  }
}
function saveScraped(article) {
  "use strict";
  try {
    var obj;
    if (typeof article.id === 'undefined') {
      article.id = utils.uuid();
    }
    obj = {
      id:    article.id,
      url: article.url,
      title: article.title,
      html: article.html,
      date: Date.now(),
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
    window.alert('"' + article.title + '" has been successfully saved');
    utils.log('Created : ' + article.title);
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
