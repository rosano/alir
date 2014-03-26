/*jshint browser: true, devel: true, esnext: true, node: true */
/*global require: true */
var data          = require("sdk/self").data,
    notifications = require("sdk/notifications"),
    request       = require("sdk/request").Request,
    ss            = require("sdk/simple-storage"),
    tabs          = require("sdk/tabs"),
    chromeApp     = 'alir',
    notify,
    panel;

const {Cc, Ci} = require('chrome');

// Init storage
ss.storage.params = {
  rs: {
    address: "",
    url: "",
    token: ""
  },
  dropbox: {
    token: ""
  }
};

// Display notifications
var notify = (function () {
  "use strict";
  function make(level) {
    return function (message) {
      notifications.notify({
        title: level,
        text: message
      });
    };
  }
  return {
    info: make('Information'),
    warn: make('Warning'),
    error: make('Error')
  };
})();

require("sdk/preferences/service").set("extensions.sdk.console.logLevel", "all");

// Listen for HTTP response and analyze headers to extract Location:
var listener = (function () {
  "use strict";
  var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService),
      observer,
      onParams;
  observer = {
    // Observer called on response
    observe: function observe(aSubject, aTopic, aData) {
      //jshint maxstatements: 25
      if (aTopic === "http-on-examine-response") {
        var channel = aSubject.QueryInterface(Ci.nsIHttpChannel),
            loc = false,
            re,
            params = {};
        console.debug("Response: " + channel.responseStatus);
        if (channel.responseStatus > 299 && channel.responseStatus < 400) {
          try {
            loc = channel.getResponseHeader("Location");
            console.debug("Location: " + loc);
          } catch (e) {}
        }
        if (loc) {
          re = new RegExp("^chrome://" + chromeApp);
          if (re.test(loc)) {
            listener.stop();
            tabs.activeTab.close();
            loc = decodeURIComponent(loc);
            if (loc.indexOf('#') !== -1) {
              params = require('sdk/querystring').parse(loc.split('#')[1]);
            } else {
              console.error("Enable to extract auth token from " + loc);
              notify.error("Enable to extract auth token from " + loc);
            }
            if (params.error) {
              notify.error("Unable to authenticate : " + params.error + " : " + params.error_description);
              console.error("Unable to authenticate : " + params.error + " : " + params.error_description);
            } else {
              onParams(params);
            }
          }
        }
      }
    }
  };
  // Start to listen for responses
  function start(cb) {
    onParams = cb;
    observerService.addObserver(observer, "http-on-examine-response", false);
  }
  function stop() {
    observerService.removeObserver(observer, "http-on-examine-response");
  }

  return {
    start: start,
    stop: stop
  };
}());

/**
 * Call oAuth provider
 *
 * @param {String}   url
 * @param {Dict}     params
 * @param {Function} onParams
 */
function doAuth(url, params, onParams) {
  "use strict";
  var tmp = [];
  listener.start(onParams);
  Object.keys(params).forEach(function (param) {
    tmp.push(param + '=' + encodeURIComponent(params[param]));
  });
  url += url.indexOf('?') > 0 ? '&' : '?';
  url += tmp.join('&');
  tabs.open({
    url: url,
    onReady: function onReady(tab) {
      tab.on('load', function onLoad() {
      });
    }
  });
}

// Discover remote storage
// Source https://github.com/remotestorage/remotestorage.js/blob/master/src/discover.js
function discover(userAddress, callback) {
  "use strict";
  var hostname = userAddress.split('@')[1],
      params = '?resource=' + encodeURIComponent('acct:' + userAddress),
      urls = [
    'https://' + hostname + '/.well-known/webfinger' + params,
    'https://' + hostname + '/.well-known/host-meta.json' + params,
    'http://' + hostname + '/.well-known/webfinger' + params,
    'http://' + hostname + '/.well-known/host-meta.json' + params
  ];
  function tryOne() {
    var url = urls.shift();
    if (!url) {
      return callback();
    }
    request({
      url: url,
      contentType: "text/html", // the default is "application/x-www-form-urlencoded" which trigger a different behaviour from the server
      onComplete: function (response) {
        if (response.status !== 200) {
          return tryOne();
        }
        var profile, link, authURL;

        try {
          profile = JSON.parse(response.text);
        } catch (e) {
          console.error("Failed to parse profile ", response.text, e);
          notify.error("Failed to parse profile ", response.text, e);
          tryOne();
          return;
        }

        if (!profile.links) {
          console.error("profile has no links section ", JSON.stringify(profile));
          notify.error("profile has no links section ", JSON.stringify(profile));
          tryOne();
          return;
        }

        profile.links.forEach(function (l) {
          if (l.rel === 'remotestorage') {
            link = l;
          } else if (l.rel === 'remoteStorage' && !link) {
            link = l;
          }
        });
        console.debug('got profile', profile, 'and link', link);
        if (link) {
          authURL = link.properties['auth-endpoint'] ||
            link.properties['http://tools.ietf.org/html/rfc6749#section-4.2'];
          callback(link.href, link.type, authURL);
        } else {
          tryOne();
        }
      }
    }).get();
  }
  tryOne();
}
/**
 * Put content
 *
 * @param {String} url
 * @param {String} token
 * @param {Dict}   content
 */
function putContent(url, token, content) {
  "use strict";
  var slug;

  slug   = require('sdk/util/uuid').uuid().toString().replace(/\W/g, '');
  content.id = slug;
  content.type = 'article';
  request({
    url: url + 'article/' + slug,
    headers: {
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    content: JSON.stringify(content),
    onComplete: function putComplete(response) {
      if (response.status < 300) {
        notify.info("OK");
      } else {
        notify.error("Unable to put content : " + response.status + " " + response.statusText + " " + response.text);
      }
    }
  }).put();
}

// Create panel and widget
panel = require("sdk/panel").Panel({
  width: 400,
  height: 300,
  contentURL: data.url("panel.html"),
  contentScriptFile: data.url("panel.js")
});

panel.port.on("discover", function () {
  "use strict";
  var address = require('sdk/simple-prefs').prefs.rsAddress;
  if (typeof address !== "string" || address === "") {
    notify.error("Set your account address in addon pref");
  }
  console.debug("discovering " + address);
  ss.storage.params.rs.address = address;
  discover(address, function onDiscover(href, storageApi, authURL) {
    var params;
    params = {
      'redirect_uri': 'chrome://' + chromeApp,
      'scope': 'alir:rw',
      'client_id': 'addon',
      'response_type': 'token'
    };
    function onParams(params) {
      if (params.access_token) {
        ss.storage.params.rs.token = params.access_token;
        notify.info("Successfully connected to remote storage");
        panel.port.emit('rs.connected');
      } else {
        console.error("No auth token");
        notify.error("No auth token");
      }
    }
    if (authURL) {
      ss.storage.params.rs.url = href + '/alir/';
      doAuth(authURL, params, onParams);
    } else {
      console.error("Unable to get authURL");
      notify.error("Unable to discover storage for this address");
    }
  });
});
panel.port.on("connectDropbox", function () {
  "use strict";
  var key  = require('sdk/simple-prefs').prefs.dropboxApiKey,
      url  = "https://www.dropbox.com/1/oauth2/authorize?",
      csrf = require('sdk/util/uuid').uuid().toString().replace(/\W/g, ''),
      params;
  function onParams(params) {
    if (params.access_token) {
      if (params.state === csrf) {
        ss.storage.params.dropbox.token = params.access_token;
        notify.info("Successfully connected to Dropbox");
        panel.port.emit('dropbox.connected');
      } else {
        notify.error("Wrong CSRF");
      }
    } else {
      console.error("No auth token");
      notify.error("No auth token");
    }
  }
  if (!key) {
    notify.error("Enter your dropbox API key in the preferences");
  } else {
    params = {
      "client_id" : key,
      "redirect_uri": "chrome://" + chromeApp,
      "response_type": "token",
      "state": csrf
    };
    tabs.on('open', function (tab) {
      tab.on('ready', function (tab) {
      });
    });
    doAuth(url, params, onParams);
  }
});
panel.port.on('readaSax', function () {
  "use strict";
  var worker;
  worker = tabs.activeTab.attach({
    contentScriptFile: [
      data.url('lib/readabilitySAX/DOMasSAX.js'),
      data.url('lib/readabilitySAX/readabilitySAX.js'),
      data.url("buttons.js")
    ]
  });
  worker.port.emit('readaSax');
});
panel.port.on('selectContent', function () {
  "use strict";
  var worker;
  worker = tabs.activeTab.attach({
    contentScriptFile: [
      data.url("buttons.js")
    ]
  });
  worker.port.emit('selectContent');
});
panel.port.on('putToRemote', function () {
  "use strict";
  var worker;

  if (!ss.storage.params.rs.url || !ss.storage.params.rs.token) {
    notify.error("Please connect first to remote storage");
    return;
  }

  worker = tabs.activeTab.attach({
    contentScriptFile: [
      data.url("buttons.js")
    ]
  });
  worker.port.on("body", function put(obj) {
    putContent(ss.storage.params.rs.url, ss.storage.params.rs.token, obj);
  });
  worker.port.emit('getBody');
});
panel.port.on('putToDropbox', function () {
  "use strict";
  var worker;

  if (!ss.storage.params.dropbox.token) {
    notify.error("Please connect first to dropbox");
    return;
  }

  worker = tabs.activeTab.attach({
    contentScriptFile: [
      data.url("buttons.js")
    ]
  });
  worker.port.on("body", function put(obj) {
    putContent('https://api-content.dropbox.com/1/files_put/auto/alir/', ss.storage.params.dropbox.token, obj);
  });
  worker.port.emit('getBody');
});

panel.port.on("show", function () {
  "use strict";
  if (ss.storage.params.dropbox.token) {
    panel.port.emit('dropbox.connected');
  }
  if (ss.storage.params.rs.token) {
    panel.port.emit('rs.connected');
  }
});

require("sdk/widget").Widget({
  label: "alir",
  id: "alir",
  panel: panel,
  contentURL: data.url("alir.png")
});
