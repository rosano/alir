/*jshint browser: true, devel: true */
/*global _: true, $:true, config: true, remoteStorage: true, tiles: true, View: true, utils: true, Showdown: true */
function Article() {
  "use strict";
  var self = this,
      currentId,
      tags = [],
      dynamicSheet = document.getElementById('dynamicCss').sheet;

  window.tiles.on('shown', function (tile, name) {
    if (name === 'list' && typeof currentId !== 'undefined') {
      self.onShown(currentId());
    }
  });
  this.setCurrentId = function setCurrentId(current) {
    currentId = current;
  };
  this.getCurrentId = function getCurrentId() {
    return currentId;
  };
  /**
   * Display an article
   *
   * @param {Object} obj
   *
   */
  this.display = function (obj) {
    //jshint maxstatements: 50, maxcomplexity: 20
    var title = obj.title || obj.id,
        data  = {},
        item,
        topAlt,
        topNote,
        classes = [];
    item = document.getElementById(obj.id);
    if (item) {
      classes = [].slice.call(item.classList);
      item.parentNode.removeChild(item);
    }
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
    if (obj.id === self.getCurrentId()) {
      obj.doLoad = true;
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
      flags: typeof obj.flags === 'object' ? Object.keys(obj.flags).filter(function (e) { return obj.flags[e] === true; }).join(',') : '',
      loaded: obj.doLoad === true
    };
    if (data.title === '???' && data.url !== '#') {
      data.title = data.url.replace(/\/$/, '').split('/').pop().replace(/[\W]/g, ' ');
    }
    if (utils.trim(data.title) === '') {
      data.title = _("noTitle");
    }
    // in order not to create huge DOM, we only display article content
    // when explicitely asked
    if (obj.doLoad === true) {
      if (obj.html) {
        data.type = 'html';
        data.content = View.toDom(obj.html, obj.url);
      } else {
        data.type = 'text';
        data.content = obj.text;
      }
    } else {
      data.type = 'none';
      data.content = '';
    }
    item = View.template('tmpl-article', data);
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
    // }}
    // Sort items by date {{
    // @TODO allow multiple sorts
    View.insertInList(document.getElementById('list'), "[data-key]", item, function (e) { return (e.dataset.date < obj.date); });
    // }}

    if (classes.length !== 0) {
      classes.forEach(function (cl) {
        item.classList.add(cl);
      });
    }

    return item;
  };
  this.create = function () {
    $('#input [name="id"]').value    = "";
    $('#input [name="url"]').value   = "";
    $('#input [name="title"]').value = "";
    $('#input [name="text"]').value  = "";
    tiles.show('input');
  };
  this.read = function (key, cb) {
    remoteStorage.alir.getArticle(key, cb);
  };
  this.edit = function (key) {
    self.read(key, function (article) {
      if (typeof article !== 'undefined') {
        $('#input [name="id"]').value    = key;
        $('#input [name="title"]').value = article.title;
        $('#input [name="url"]').value   = article.url;
        $('#input [name="text"]').value  = article.text;
        tiles.show('input');
      }
    });
  };
  this.delete = function (key) {
    var elmt;
    if (window.confirm(_('confirmDelete'))) {
      //@FIXME
      remoteStorage.alir.private.remove('/article/' + key);
      remoteStorage.alir.private.remove('article/' + key);
      delete config.bookmarks[key];
      elmt = document.getElementById(key);
      if (elmt) {
        elmt.classList.add('hidden');
      }
    }
    self.hide();
  };
  this.save = function () {
    var id = $('#input [name="id"]').value,
        article;

    if (id) {
      // update
      self.read(id, function (article) {
        if (article) {
          article.url   = $('#input [name="url"]').value;
          article.title = $('#input [name="title"]').value;
          article.text  = $('#input [name="text"]').value;
          article.html  = new Showdown.converter().makeHtml(article.text);
          article.date  = Date.now();
          remoteStorage.alir.saveArticle(article);
          self.display(article);
          tiles.show('list');
        }
      });
    } else {
      // create
      article = {
        id: utils.uuid(),
        url:   $('#input [name="url"]').value,
        title: $('#input [name="title"]').value,
        text:  $('#input [name="text"]').value,
        html:  new Showdown.converter().makeHtml($('#input [name="text"]').value),
        date:  Date.now(),
        flags: {
          editable: true
        },
        tags: ['note']
      };
      remoteStorage.alir.saveArticle(article);
      self.display(article);
      tiles.show('list');
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
    var elmt = document.getElementById(key);
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
    if (elmt) {
      if (elmt.dataset.loaded === "true") {
        doShow();
      } else {
        self.read(key, function (article) {
          if (article) {
            elmt.parentNode.removeChild(elmt);
            article.doLoad = true;
            self.display(article);
          }
          doShow();
        });
      }
    }
  };
  this.onShown = function onShown() {
    self.ui.menu(false);
    $('#menu .content .top').href = '#' + currentId;
    if (config.bookmarks[currentId]) {
      window.setTimeout(function () {
        window.scrollTo(0, config.bookmarks[currentId] * $('#list').clientHeight);
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
    location.hash = currentId;
  };
  this.hide = function hide() {
    var clMenu  = $('#menu').classList,
        clMain  = $('#main').classList,
        current = $('#list > .current');
    if (current && current.id) {
      config.bookmarks[current.id] = window.scrollY / $('#list').clientHeight;
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
    var node = document.getElementById(key),
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
        self.display(article);
      }
    });
  };
  this.share = function (key) {
    var node = document.getElementById(key),
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
  };
  this.ui = {
    menu: function (folded) {
      var cl = $('li.current .articleMenu').classList,
          actions = $('li.current .articleMenu .articleActions');
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
      document.querySelector("li.current .content > .alternates").classList.toggle('hidden');
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
        window.articles.display(article);
      }
      tiles.back();
    });
  };
  this.edit = function () {
    ["articleId", "noteId", "xpath", "text"].forEach(function (field) {
      $('#noteEdit [name="' + field + '"]').value = $('#noteView [name="' + field + '"]').value;
    });
    window.tiles.show('noteEdit');
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
