/*jshint browser: true, devel: true */
/*global require: true */
var data    = require("sdk/self").data,
    ss      = require("sdk/simple-storage"),
    request = require("sdk/request").Request,
    tabs    = require("sdk/tabs"),
    panel;

// Init storage
ss.storage.params = {
  url: "",
  token: ""
};

// Create panel and widget
panel = require("sdk/panel").Panel({
  contentURL: data.url("panel.html"),
  contentScriptFile: data.url("panel.js")
});
require("sdk/widget").Widget({
  label: "alir",
  id: "alir",
  panel: panel,
  contentURL: "http://clochix.net/favicon.png"
});

panel.port.on('getToken', function () {
  "use strict";
  var worker;
  worker = tabs.activeTab.attach({
    contentScriptFile: [
      data.url("buttons.js")
    ]
  });
  worker.port.on("token", function (params) {
    ss.storage.params = {
      url: params.url,
      token: params.token
    };
    console.log(ss.storage.params.url);
    console.log(ss.storage.params.token);
  });
  worker.port.emit('getToken');
});
panel.port.on('readaSax', function () {
  "use strict";
  console.log('readaSax');
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
panel.port.on('putContent', function () {
  "use strict";
  var worker;
  worker = tabs.activeTab.attach({
    contentScriptFile: [
      data.url("buttons.js")
    ]
  });
  worker.port.on("body", function put(obj) {
    var url,
    token,
    slug;

    url   = ss.storage.params.url + '/alir/';
    token = ss.storage.params.token;
    slug = obj.url.split('://').pop().split('?').shift().split('#').shift().replace(/[^\w]/g, '');
    request({
      url: url + slug,
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      },
      content: JSON.stringify(obj)
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
