//jshint browser: true
/* global utils: true, remoteStorage: true */
function scrap(url, cb) {
  "use strict";
  var options, xhr;
  function onComplete() {
    try {
      var readable = new window.Readability(),
          article;
      readable.setSkipLevel(3);
      window.saxParser(xhr.responseXML.childNodes[xhr.responseXML.childNodes.length - 1], readable);
      article = readable.getArticle();
      article.url = url;
      cb(null, article);
    } catch (e) {
      cb(e);
    }
  }
  function onFailed(e) {
    utils.log("Request failed : " + e, "error");
    utils.log("Request failed : " + e.target, "error");
    utils.log("Request failed : " + e.target.status, "error");
    utils.log("Request failed : " + e.target.statusText, "error");
    cb('Request Failed');
  }
  function onCanceled(e) {
    cb("Canceled");
  }
  try {
    options = {
      mozAnon: true,
      mozSystem: true
    };
    xhr = new XMLHttpRequest(options);
    xhr.open("GET", url, true);
    xhr.responseType = "document";
    xhr.onload = onComplete;
    xhr.onerror = onFailed;
    //xhr.addEventListener("error", onFailed, false);
    xhr.addEventListener("abort", onCanceled, false);
    xhr.send(null);
  } catch (e) {
    utils.log(utils.format("Error getting %s : %s", url, e));
    cb('Failed');
  }
}
function saveScraped(article) {
  "use strict";
  try {
    var obj;
    obj = {
      id: utils.uuid(),
      url: article.url,
      title: article.title,
      html: article.html,
      date: Date.now(),
      flags: {
      },
      tags: []
    };
    remoteStorage.alir.saveArticle(obj);
    window.alert('"' + article.title + '" has been successfully saved');
    utils.log('Created : ' + article.title);
  } catch (e) {
    utils.log(utils.format("Error saving %s : %s", article.title, e), 'error');
  }
}
if (navigator.mozSetMessageHandler) {
  navigator.mozSetMessageHandler('activity', function onActivity(activity) {
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
              if (err) {
                utils.log(err, 'error');
                activity.postError(err);
              } else {
                saveScraped(res);
                activity.postResult('saved');
              }
            });
          } catch (e) {
            activity.postError('cancelled');
            utils.log("" + e, "error");
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
  });
}

