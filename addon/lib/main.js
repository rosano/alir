/*jshint browser: true, devel: true, esnext: true */
/*global require: true */
var data          = require("sdk/self").data,
    notifications = require("sdk/notifications"),
    request       = require("sdk/request").Request,
    ss            = require("sdk/simple-storage"),
    tabs          = require("sdk/tabs"),
    chromeApp     = 'alir',
    notify,
    panel;

// Init storage
ss.storage.params = {
  address: "",
  url: "",
  token: ""
};

(function () {
  "use strict";
  function make(level) {
    return function (message) {
      notifications.notify({
        title: level,
        text: message
      });
    };
  }
  notify = {
    info: make('Information'),
    warn: make('Warning'),
    error: make('Error')
  };
})();

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

// Create panel and widget
panel = require("sdk/panel").Panel({
  contentURL: data.url("panel.html"),
  contentScriptFile: data.url("panel.js")
});
require("sdk/widget").Widget({
  label: "alir",
  id: "alir",
  panel: panel,
  contentURL: data.url("alir.png")
});

panel.port.on("discover", function (address) {
  "use strict";
  console.debug("discovering " + address);
  ss.storage.params.token = address;
  discover(address, function onDiscover(href, storageApi, authURL) {
    var events    = require("sdk/system/events"),
        { Ci }    = require("chrome"),
        listening = false,
        url       = authURL;
    // Listen for HTTP response and analyze headers to extract Location:
    function listener(event) {
      //jshint maxstatements: 25
      var channel = event.subject.QueryInterface(Ci.nsIHttpChannel),
      loc,
      re,
      params = {};
      try {
        loc = channel.getResponseHeader("Location");
      } catch (e) {}
      console.debug("Location: " + loc);
      if (loc) {
        re = new RegExp("^chrome://" + chromeApp);
        if (re.test(loc)) {
          events.off("http-on-examine-response", listener);
          listening = false;
          tabs.activeTab.close(function onClosed() {});
          loc = decodeURIComponent(loc);
          if (loc.indexOf('#') !== -1) {
            loc.split('#')[1].split('&').forEach(function (item) {
              // Dirty, but my access token ends with '=' :S
              var param = item.split('='),
                  key   = param.shift(),
                  val   = param.join('=');
              params[key] = val;
            });
          } else {
            console.error("Enable to extract auth token from " + loc);
            notify.error("Enable to extract auth token from " + loc);
          }
          if (params.error) {
            notify.error("Unable to authenticate : " + params.error + " : " + params.error_description);
            console.error("Unable to authenticate : " + params.error + " : " + params.error_description);
          } else {
            if (params.access_token) {
              ss.storage.params.token = params.access_token;
              notify.info("Successfully connected to remote storage");
            } else {
              console.error("No auth token in " + loc);
              notify.error("No auth token in " + loc);
            }
          }
        }
      }
    }
    if (url) {
      events.on("http-on-examine-response", listener);
      listening = true;
      ss.storage.params.url = href + '/alir/';
      // @see https://raw.github.com/remotestorage/remotestorage.js/master/src/authorize.js
      url += authURL.indexOf('?') > 0 ? '&' : '?';
      url += '&redirect_uri=' + encodeURIComponent('chrome://' + chromeApp);
      url += '&scope=' + encodeURIComponent('alir:rw');
      url += '&client_id=' + encodeURIComponent('addon');
      url += '&response_type=token';
      tabs.open({
        url: url,
        onReady: function onReady(tab) {
          tab.on('load', function onLoad() {

          });
        }
      });
    } else {
      console.error("Unable to get authURL");
      notify.error("Unable to discover storage for this address");
    }
  });
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
panel.port.on('putContent', function () {
  "use strict";
  var worker;

  if (!ss.storage.params.url || !ss.storage.params.token) {
    notify.error("Please connect first to a remote storage server");
    return;
  }

  worker = tabs.activeTab.attach({
    contentScriptFile: [
      data.url("buttons.js")
    ]
  });
  worker.port.on("body", function put(obj) {
    var url,
    token,
    slug;

    url   = ss.storage.params.url;
    token = ss.storage.params.token;
    slug = require('sdk/util/uuid').uuid().toString().replace(/\W/g, '');
    request({
      url: url + slug,
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      content: JSON.stringify(obj),
      onComplete: function putComplete(response) {
        if (response.status < 300) {
          notify.info("OK");
        } else {
          notify.error("Unable to put content : " + response.status + " " + response.statusText + " " + response.text);
        }
      }
    }).put();
  });
  worker.port.emit('getBody');
});

/*
var btn = require("toolbarbutton").ToolbarButton({
  id: 'my-toolbar-button',
  label: 'Test',
  image: 'http://clochix.net/favicon.png',
  onCommand: function () {
    "use strict";
    if (typeof(tabs.activeTab._worker) === 'undefined') {
      var worker = tabs.activeTab.attach({
        contentScript: 'self.port.on("sayhello", function() { alert("Hello world!"); })'
      });
      tabs.activeTab._worker = worker;
    }
    tabs.activeTab._worker.port.emit("sayhello");
  }
});
if (require('self').loadReason === "install") {
  btn.moveTo({
    toolbarID: "nav-bar",
    forceMove: false // only move from palette
  });
}
*/
