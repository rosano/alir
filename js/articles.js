/*jshint browser: true, devel: true */
/*global _: true, $:true, config: true, remoteStorage: true, tiles: true, View: true, utils: true, Showdown: true */
function Article() {
  //jshint maxstatements: 28
  "use strict";
  var self = this,
      currentId,
      tags = [],
      dynamicSheet = document.getElementById('dynamicCss').sheet;

  /**
   * Display the tile to add a note
   */
  function doNote(event) {
    var res = utils.parent(event.target, function (el) { return typeof el.dataset.key !== 'undefined'; });
    if (res !== null) {
      window.comment.create(res.dataset.key, utils.createXPathFromElement(event.target));
    }
  }
  if ("ontouchstart" in window) {
    document.getElementById("articleShow").addEventListener('contextmenu', doNote);
  }
  document.getElementById("articleShow").addEventListener('dblclick', doNote);

  /**
   * prepare an article for display
   */
  function prepare(obj) {
    //jshint maxcomplexity: 13
    var title = obj.title || obj.id,
        data;
    if (typeof obj.notes !== 'object') {
      obj.notes = {};
    }
    if (typeof obj.date === 'undefined') {
      obj.date = utils.getDate();
    } else {
      try {
        obj.date = utils.getDate(obj.date);
      } catch (e) {
        utils.log("Wrong date in article.display: " + obj.date, "error");
      }
    }
    data = {
      key: obj.id,
      context: 'private',
      hasNotes: Object.keys(obj.notes).length > 0 ? 'hasNotes' : '',
      title: title.replace(/</g, '&lt;').replace(/>/g, '&gt;'),
      url: obj.url || '#',
      date: obj.date,
      tags: Array.isArray(obj.tags) ? obj.tags : [],
      alternates: Array.isArray(obj.alternates) ? obj.alternates : [],
      notes: Object.keys(obj.notes).map(function (e, i) { return {id: e, url: obj.id + '/' + e}; }),
      flags: typeof obj.flags === 'object' ? Object.keys(obj.flags).filter(function (e) { return obj.flags[e] === true; }).join(',') : ''
    };
    if (data.title === '???' && data.url !== '#') {
      data.title = data.url.replace(/\/$/, '').split('/').pop().replace(/[\W]/g, ' ');
    }
    if (utils.trim(data.title) === '') {
      data.title = _("noTitle");
    }
    // Tags {{
    if (Array.isArray(obj.tags) && obj.tags.length > 0) {
      obj.tags.forEach(function (tag) {
        if (tags.indexOf(tag) === -1) {
          tags.push(tag);
          (function (tag) {
            var elmt = document.createElement('li');
            elmt.dataset.tag = tag;
            elmt.textContent = tag;
            View.insertInList(document.getElementById('tagList'), "li", elmt, function (e) { return (e.dataset.tag.toLowerCase() > tag.toLowerCase()); });
          })(tag);
        }
      });
    }
    // }}

    return data;
  }
  window.tiles.on('leaving', function (name) {
    if (name === 'articleShow' && typeof currentId !== 'undefined') {
      self.hide();
    }
  });
  window.tiles.on('shown', function (name) {
    if (name === 'articleShow' && typeof currentId !== 'undefined') {
      self.onShown(currentId);
    }
  });
  this.setCurrentId = function setCurrentId(current) {
    currentId = current;
  };
  this.getCurrentId = function getCurrentId() {
    return currentId;
  };
  /**
   * Add an article to the list
   *
   * @param {Object} obj
   *
   */
  this.addToList = function (obj) {
    var data, item, classes = [];
    item = $('#list > [data-key="' + obj.id + '"]');
    if (item) {
      classes = [].slice.call(item.classList);
      item.parentNode.removeChild(item);
    }
    data = prepare(obj);
    data.type = 'none';
    data.content = '';
    item = View.template('tmpl-article', data);
    // Sort items by date {{
    // @TODO allow multiple sorts
    View.insertInList(document.getElementById('list'), "[data-key]", item, function (e) { return (e.dataset.date < obj.date); });
    // }}
    if (classes.length !== 0) {
      classes.forEach(function (cl) {
        item.classList.add(cl);
      });
    }
  };
  /**
   * Display an article
   *
   * @param {Object} obj
   *
   */
  this.display = function (obj, update) {
    //jshint maxstatements: 25
    var data, item, topNote, topAlt, tile;
    data = prepare(obj);
    if (obj.html) {
      data.type = 'html';
      data.content = View.toDom(obj.html, obj.url);
    } else {
      data.type = 'text';
      data.content = obj.text;
    }
    item = View.template('tmpl-article-detail', data);
    // Notes {{
    if (typeof obj.notes === 'object') {
      topNote = item.querySelector(".content > .notes");
      Object.keys(obj.notes).forEach(function (noteId, i) {
        var note = obj.notes[noteId],
            target,
            container,
            a;
        container = document.createElement('div');
        container.appendChild(item);
        try {
          target = document.evaluate(note.xpath, container, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        } catch (e) {
          utils.log("Unable to evaluate XPath " + note.xpath + ' : ' + e, "error");
          target = item.firstChild;
        }
        if (target) {
          // Note
          a = document.createElement('a');
          a.setAttribute('class', 'note icon-comment');
          a.dataset.object = "comment";
          a.dataset.method = "read";
          a.dataset.params = obj.id + ',' + noteId;
          a.setAttribute('href', '#' + obj.id + '/' + noteId);
          a.setAttribute('name', noteId);
          target.insertBefore(a, target.firstChild);
          // headnote
          a = document.createElement('span');
          a.setAttribute('class', 'note icon-comment');
          a.dataset.object = "articles.ui";
          a.dataset.method = "scrollToNote";
          a.dataset.params = noteId;
          topNote.appendChild(a);
        } else {
          utils.log("Unable to evaluate XPath " + note.xpath, "error");
        }
      });
    }
    // }}
    // Alternates {{
    if (Array.isArray(obj.alternates) && obj.alternates.length > 0) {
      topAlt = item.querySelector(".content > .alternates .alternatesButtons");
      item.classList.add("hasAlternates");
      obj.alternates.forEach(function (alt) {
        var a = document.createElement('button');
        a.setAttribute('type', 'button');
        a.textContent = alt.title;
        a.addEventListener('click', function () {
          window.feeds.create(alt.href, alt.title);
        });
        topAlt.appendChild(a);
      });
    }
    tile = document.getElementById('articleShow');
    tile.innerHTML = '';
    tile.appendChild(item);
    currentId = obj.id;
    if (update !== true) {
      tiles.go('articleShow');
    }
    // }}

    return item;
  };
  this.create = function () {
    var choices = [];
    $('#articleEdit [name="id"]').value    = "";
    $('#articleEdit [name="url"]').value   = "http://";
    $('#articleEdit [name="title"]').value = "";
    $('#articleEdit [name="text"]').value  = "";
    choices.push({'object': 'articles', 'method': 'createArticle', 'l10nId': 'articleCreateArticle'});
    choices.push({'object': 'articles', 'method': 'createUrl', 'l10nId': 'articleCreateUrl'});
    window.choice(choices);
  };
  this.createArticle = function () {
    var tile = document.querySelector('[data-tile=articleEdit]');
    tiles.back();
    tile.classList.remove('url');
    tile.classList.add('article');
    tiles.go('articleEdit');
  };
  this.createUrl = function () {
    var tile = document.querySelector('[data-tile=articleEdit]');
    tiles.back();
    tile.classList.add('url');
    tile.classList.remove('article');
    tiles.go('articleEdit');
  };
  this.read = function (key, cb) {
    remoteStorage.alir.getArticle(key, cb);
  };
  this.edit = function (key) {
    var tile = document.querySelector('[data-tile=articleEdit]');
    tile.classList.remove('url');
    tile.classList.add('article');
    self.read(key, function (article) {
      if (typeof article !== 'undefined') {
        $('#articleEdit [name="id"]').value    = key;
        $('#articleEdit [name="title"]').value = article.title;
        $('#articleEdit [name="url"]').value   = article.url;
        $('#articleEdit [name="text"]').value  = article.text;
        tiles.go('articleEdit');
      }
    });
  };
  this.delete = function (key, title) {
    var elmt;
    if (window.confirm(_('confirmDelete', {title: title}))) {
      //@FIXME
      remoteStorage.alir.private.remove('/article/' + key);
      remoteStorage.alir.private.remove('article/' + key);
      delete config.bookmarks[key];
      elmt = $('#list > [data-key="' + key + '"]');
      if (elmt) {
        elmt.parentNode.removeChild(elmt);
      }
      tiles.back();
    }
    self.hide();
  };
  this.save = function () {
    var tile = document.querySelector('[data-tile=articleEdit]'),
        id = $('#articleEdit [name="id"]').value,
        article;

    function doSave(article) {
      if (article.url === 'http://') {
        article.url = '';
      }
      remoteStorage.alir.saveArticle(article);
      tiles.back(); // remove articleEdit from tiles heap
      self.display(article);
    }
    if (id) {
      // update
      self.read(id, function (article) {
        if (article) {
          article.url   = $('#articleEdit [name="url"]').value;
          article.title = $('#articleEdit [name="title"]').value;
          article.text  = $('#articleEdit [name="text"]').value;
          article.html  = new Showdown.converter().makeHtml(article.text);
          article.date  = Date.now();
          doSave(article);
        } else {
          utils.log('Unable to load article ' + id, 'error');
        }
      });
    } else {
      if (tile.classList.contains('article')) {
        // create
        article = {
          id: utils.uuid(),
          url:   $('#articleEdit [name="url"]').value,
          title: $('#articleEdit [name="title"]').value,
          text:  $('#articleEdit [name="text"]').value,
          html:  new Showdown.converter().makeHtml($('#articleEdit [name="text"]').value),
          date:  Date.now(),
          flags: {
            editable: true
          },
          tags: ['note']
        };
        doSave(article);
      } else {
        tiles.back(); // remove articleEdit from tiles heap
        window.link.scrap($('#articleEdit [name="url"]').value);
      }
    }
  };
  this.reload = function (key) {
    self.read(key, function (article) {
      if (typeof article !== 'undefined') {
        window.scrap(article.url, function (err, res) {
          if (err) {
            utils.log(err.toString(), 'error');
          } else {
            res.id = key;
            window.saveScraped(res);
          }
        });
      }
    });
  };
  this.show = function show(key) {
    if (key === currentId) {
      return;
    }
    function doShow() {
      var clItem  = $('[data-key="' + key + '"]').classList,
          clMenu  = $('#menu').classList,
          clList  = $('#main').classList;
      clMenu.add("detail");
      clMenu.remove("list");
      clList.add("detail");
      clList.remove("list");
      clList.remove("edit");
      clItem.add('current');
      clItem.add('read');

      currentId = key;
      self.onShown();
    }
    self.read(key, function (article) {
      if (article) {
        self.display(article);
        doShow();
      } else {
        window.alert(_('articleNotFound'));
      }
    });
  };
  this.onShown = function onShown() {
    var iframe = document.getElementById('articleShow').querySelector('iframe'),
        scroll;
    if (iframe) {
      iframe.contentDocument.body.style.margin  = "0px";
      iframe.contentDocument.body.style.padding = "0px";
      iframe.style.height = iframe.contentDocument.body.clientHeight + 20 + "px";
    }
    self.ui.menu(false);
    $('#menu .content .top').href = '#' + currentId;
    if (config.bookmarks[currentId]) {
      scroll = config.bookmarks[currentId] * $('#articleShow').clientHeight;
    } else {
      scroll = 0;
    }
    window.setTimeout(function () {
      window.scrollTo(0, scroll);
    }, 100);
    location.hash = currentId;
  };
  this.hide = function hide() {
    var clMenu  = document.getElementById('menu').classList,
        clMain  = document.getElementById('main').classList,
        current = $('#list > [data-key="' + currentId + '"]');
    if (current) {
      config.bookmarks[currentId] = window.scrollY / $('#articleShow').clientHeight;
      current.classList.remove('current');
      current.scrollIntoView();
    }
    clMenu.remove("detail");
    clMenu.add("list");
    clMenu.remove('show');
    clMain.remove("detail");
    clMain.add("list");
    self.setCurrentId();
    location.hash = '';
  };
  this.addTag = function (key) {
    tiles.go('tagTile', function (tag) {
      if (typeof tag !== 'undefined') {
        if (tag !== null) {
          self.switchTag(key, tag);
        }
      }
    });
  };
  this.switchTag = function (key, tag) {
    var node = $('#list > [data-key="' + key + '"]'),
        tags = node.dataset.tags.split(',').filter(function (e) { return e !== ''; }),
        i    = tags.indexOf(tag);
    if (i !== -1) {
      tags.splice(i, 1);
      node.dataset.tags = ',' + tags.join(',') + ',';
    } else {
      tags.splice(1, 0, tag);
      node.dataset.tags = ',' + tags.join(',').replace(',,,', ',,') + ',';
    }
    self.read(key, function (article) {
      if (article) {
        article.tags = tags.filter(function (t) {return t !== ''; });
        remoteStorage.alir.saveArticle(article);
        self.display(article, true);
      }
    });
  };
  this.share = function (key) {
    if (window.alir.getStatus().installed) {
      var node = $('#list > [data-key="' + key + '"]'),
          request = new window.MozActivity({
        name: "share",
        data: {
          type: "url",
          url: node.dataset.url
        }
      });
      request.onerror = function () {
        window.alert("Error sharing : " + request.error.name);
      };
    //} else {
    //  // @TODO What to do ???
    }
  };
  this.ui = {
    menu: function (folded) {
      var cl = $('#articleShow .articleMenu').classList,
          actions = $('#articleShow .articleMenu .articleActions');
      function style() {
        if (cl.contains('folded')) {
          actions.style.marginTop = -actions.clientHeight + 'px';
        } else {
          actions.style.marginTop = '';
        }
      }
      if (typeof folded === 'undefined') {
        cl.toggle('folded');
        style();
      } else if (folded) {
        cl.remove('folded');
        style();
      } else {
        cl.add('folded');
        style();
      }
    },
    filterArchive: function () {
      $('#main').classList.toggle('archives');
    },
    filterFeed: function () {
      $('#main').classList.toggle('feeds');
    },
    filterStar: function () {
      $('#main').classList.toggle('stars');
    },
    editArticles: function () {
      $('#main').classList.toggle('edit');
    },
    deleteArticles: function () {
      var toDel = window.$$('#list h2 .delitem input:checked');
      if (toDel.length > 0) {
        if (window.confirm(_('articlesDelete', {nb: toDel.length}))) {
          toDel.forEach(function (elmt) {
            var key = utils.parent(elmt, function (e) { return typeof e.dataset.key !== 'undefined'; });
            if (key) {
              key.classList.add('hidden');
              key = key.dataset.key;
              //@FIXME
              remoteStorage.alir.private.remove('/article/' + key);
              remoteStorage.alir.private.remove('article/' + key);
              delete config.bookmarks[key];
            }
          });
        }
      }
      $('#main').classList.remove('edit');
    },
    updateFilter: function () {
      var filterVal = document.getElementById('listFilter').value.toLowerCase();
      while (dynamicSheet.cssRules[0]) {
        dynamicSheet.deleteRule(0);
      }
      if (utils.trim(filterVal) !== '') {
        dynamicSheet.insertRule("#main.list #list > li[data-tags] { display: none !important; }", 0);
        dynamicSheet.insertRule('#main.list #list > li[data-tags*="' + filterVal + '"], #main.list #list > li[data-title*="' + filterVal + '"] { display: block !important; }', 1);
      }
    },
    addFilterTag: function () {
      tiles.go('tagTile', function (tag) {
        if (typeof tag !== 'undefined') {
          if (tag !== null) {
            document.getElementById('listFilter').value = tag;
            self.ui.updateFilter();
          }
        }
      });
    },
    scrollToNote: function (noteId) {
      var note = document.querySelector('[name="' + noteId + '"]');
      if (note) {
        note.scrollIntoView(true);
      } else {
        utils.log("No note with id " + noteId, "warning");
      }
    },
    // Toggle display of alternate subscription buttons
    toggleAlternates: function () {
      document.querySelector("#articleShow .content > .alternates").classList.toggle('hidden');
    }
  };
  this.mock = function (n) {
    var article, ipsum, aIpsum, i, j, l, text;
    ipsum = "Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum";
    aIpsum = ipsum.split(' ');
    l = aIpsum.length;
    function title() {
      var res = [], j;
      for (j = 0; j < Math.floor(Math.random() * 5) + 1; j++) {
        res.push(aIpsum[Math.floor(Math.random() * (l - 1))]);
      }
      res = res.join(" ");
      return res.charAt(0).toUpperCase() + res.slice(1);
    }
    for (i = 0; i < n; i++) {
      text = '';
      for (j = 0; j < Math.floor(Math.random() * 10) + 1; j++) {
        text += '###' + title() + "\n\n" + ipsum + "\n\n";
      }
      article = {
        id: utils.uuid(),
        title: title(),
        html:  new Showdown.converter().makeHtml(text),
        date:  Date.now(),
        flags: {
          editable: true
        },
        tags: title.toLowerCase().split(' ')
      };
      remoteStorage.alir.saveArticle(article);
    }
  };
}
window.articles = new Article();

/**
 * Article comment
 */
window.Comment = function () {
  "use strict";
  var UI;
  UI = {
    article: $('#noteEdit [name="articleId"]'),
    path:    $('#noteEdit [name="xpath"]'),
    content: $('#noteEdit [name="text"]')
  };

  this.create = function (article, path) {
    UI.article.value = article;
    UI.path.value    = path;
    UI.content.value = '';
    window.tiles.go('noteEdit');
  };

  this.read = function (articleId, noteId) {
    window.articles.read(articleId, function (article) {
      if (article) {
        // @TODO: sanitize
        $('#noteView .content').textContent      = article.notes[noteId].content;
        $('#noteView [name="text"]').value       = article.notes[noteId].content;
        $('#noteView [name="articleId"]').value  = articleId;
        $('#noteView [name="noteId"]').value     = noteId;
        $('#noteView [name="xpath"]').value      = article.notes[noteId].xpath;
        tiles.go('noteView');
      }
    });
  };

  this.save = function () {
    var noteId    = $('#noteEdit [name="noteId"]').value,
        articleId = $('#noteEdit [name="articleId"]').value;
    if (!noteId) {
      noteId = utils.uuid();
    }
    window.articles.read(articleId, function (article) {
      if (article) {
        if (typeof article.notes !== 'object') {
          article.notes = {};
        }
        article.notes[noteId] = {
          xpath: $('#noteEdit [name="xpath"]').value,
          content: $('#noteEdit [name="text"]').value
        };
        remoteStorage.alir.saveArticle(article);
        tiles.back();
        window.articles.display(article, true);
      }
    });
  };
  this.edit = function () {
    ["articleId", "noteId", "xpath", "text"].forEach(function (field) {
      $('#noteEdit [name="' + field + '"]').value = $('#noteView [name="' + field + '"]').value;
    });
    window.tiles.go('noteEdit');
  };
  this.delete = function () {
    var noteId    = $('#noteView [name="noteId"]').value,
        articleId = $('#noteView [name="articleId"]').value;
    if (window.confirm(_('noteConfirmDelete'))) {
      window.articles.read(articleId, function (article) {
        if (article) {
          delete article.notes[noteId];
          remoteStorage.alir.saveArticle(article);
          window.articles.display(article);
        } else {
          tiles.back();
        }
      });
    }
    tiles.back();
  };
};
window.comment = new window.Comment();
