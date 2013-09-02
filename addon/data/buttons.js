/*jshint browser: true, devel: true */
/*global self: true, unsafeWindow: true */
self.port.on('getToken', function getToken() {
  "use strict";
  if (unsafeWindow.remoteStorage) {
    self.port.emit("token", {
      url: unsafeWindow.remoteStorage.getStorageInfo().href,
      token: unsafeWindow.remoteStorage.getBearerToken()
    });
  }
});
self.port.on("getBody", function getBody() {
  "use strict";
  var obj = {
    title: window.document.title,
    url: window.location.toString(),
    html: window.document.body.innerHTML,
    date: Date.now()
  };
  self.port.emit('body', obj);
});

self.port.on("readaSax", function readaSax() {
  "use strict";
  var readable = new unsafeWindow.Readability(),
      article;
  readable.setSkipLevel(3);
  unsafeWindow.saxParser(document.childNodes[document.childNodes.length - 1], readable);
  article = readable.getArticle();
  document.body.innerHTML = "<h1>" + article.title + "</h1>" + article.html;
  document.body.style.maxWidth = "600px";
  document.body.style.margin = "auto";
});
