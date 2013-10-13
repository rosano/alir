/*jshint browser: true, devel: true */
/*global self: true, unsafeWindow: true */
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

self.port.on("selectContent", function readaSax() {
  "use strict";
  var hover,
      toolbar,
      current = document.body;

  function onOver(evt) {
    var b = evt.target.getBoundingClientRect(),
    s = hover.style;
    current = evt.target;
    s.top = (window.scrollY + b.top) + 'px';
    s.left = (window.scrollX + b.left) + 'px';
    s.width = b.width + 'px';
    s.height = b.height + 'px';
  }
  function limit() {
    document.body.removeEventListener('click', limit);
    document.body.removeEventListener('mouseover', onOver);
    hover.style.height = 0;
    hover.style.width  = 0;
    document.body.innerHTML = current.innerHTML;
    document.body.style.maxWidth = "600px";
    document.body.style.margin = "auto";
    return false;
  }
  function erase() {
    document.body.removeEventListener('click', erase);
    document.body.removeEventListener('mouseover', onOver);
    hover.style.height = 0;
    hover.style.width  = 0;
    current.parentNode.removeChild(current);
    return false;
  }

  hover = document.createElement('div');
  hover.setAttribute("style", "position: absolute; top: 0; left: 0; width: 0; height: 0; background-color: rgba(255, 127, 127, .5); pointer-events: none; z-index: 9999");
  document.body.appendChild(hover);
  toolbar = document.createElement('div');
  current = document.body;
  toolbar.innerHTML = "<style scoped> div {position: fixed; top: 10px; left: 10px; padding: 10px; letter-spacing: .5em; background-color: #FFF; border: 2px solid black; border-radius: 5px; z-index: 9999}</style><span class='del'>Delete</span> <span class='limit'>Limit</span>";
  toolbar.addEventListener('click', function (hover) {
    if (hover.originalTarget.className) {
      switch (hover.originalTarget.className) {
      case 'limit':
        setTimeout(function () {
          document.body.addEventListener('mouseover', onOver);
          document.body.addEventListener('click', limit);
        }, 100);
        break;
      case 'del':
        setTimeout(function () {
          document.body.addEventListener('mouseover', onOver);
          document.body.addEventListener('click', erase);
        }, 100);
        break;
      }
    }
  });
  document.body.appendChild(toolbar);

});

