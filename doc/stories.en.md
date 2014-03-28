Àlir is an application to store and read web articles, either from web site or feeds. It has been designed for Firefox OS, but should work in any modern browser with only a few limitations. Àlir is fully autonomous : you don’t need to create an account on a third party, nor to install anything on a server.

## Main features

 - offline is not a problem : you don’t need to be always connected to read. Articles are stored inside the application, you can read them event if you are in the tube or deep in a cave ;
 - you can annotate and tag articles ;
 - click on any link inside an article to download the target and add it to your reading list ;
 - subscribe to your favorites news feeds and read them inside the application ;
 - you can share the articles and your thought on the main social networks ;
 - if you don’t mind creating an account an a remote server (or host your own server), you can also synchronise the articles between all your devices, smartphone, tablet, computer ;
 - you can customize the font size, color…
 - Àlir is free software, you are free to use it, like it, hack it, give it to your friends ;


## I need your help

I’m hacking on Àlir for some months, now, and it begins to be quite usable. But it also has a lot of features, and probably even more bugs. So before submitting it to the Marketplace, I need feedbacks, I would like to find some fearless adventurer to play with it and report problems. So, if you have a Firefox OS phone and know how to hack on it, I would really appreciate some help.

## Install

Please remember that the application has not yet been reviewed by the Marketplace team, so install it at your own risks.

Àlir need to access some API, so it is a "privileged" application. This means that you can only install it from the Marketplace, or, for now, with the App Manager. I assume you know how to use the App manager.

You can download a [zip](https://github.com/clochix/alir/zipball/master) or [tar](https://github.com/clochix/alir/tarball/master) archive, or [fork the project](https://github.com/clochix/alir) on Github.

If you want to also share articles from your desktop computer, you need to install the addon located inside `addon` directory and to register an account on a sync server. You can install your own server, or simply [register a free account](https://5apps.com/users/sign_up?site=deploy) on my Web host, 5apps.

## A beautiful story

So you’re browsing the Web on your phone and just found a very long article that seems awesome. Let’s store it somewhere to read it tonight in the train. On the navigator toolbar at the bottom of the screen, click on the share icon, then on "Alir". If everythnigs works, a notification should pop up, saying the article has been successfully saved. That’s all, you can go back to work.

You’re now in the train, eager to read the article. Open Alir, the list of all saved papers appears. Click on the title of an article, and go on, read.

*Tip:* the scrollbar on the left is also the main navigation menu. Wherever you are, click on it to access settings or manage your feed subscriptions. If you’re connected to a sync server, you can also force sync, and go offline to save bandwidth.

If your reading give rise to some thought, you can annotate every paragraph. Just perform a long touch (or a double click on desktop), write your note and save it. You can access it later via the icon next to the paragraph, or via the "Notes" link below the title. Each note has a link to share it on some social networks.

If a link inside the article seems interesting, click on it. You can choose to open it in the browser or add it to the application to read it later.

On the top right side, a hamburger icon opens a menu, allowing you to delete the article, archive it (archived articles are hidden on main list, click on the archive icon to display them), star it and add some tags (they will be displayed on "Meta" tab). If the original website provide some feeds, you will also see an RSS icon in this menu. Click on it to subscribe to one of the feeds.

### Feeds

You can subscribe to feeds either from an article (easier), or by clicking on RSS icon on left sidebar menu, adding a new feed and enter its URL.

When adding a new feed, choose a short name, as it will be used as a tag on it’s articles. If the feed contains only summaries of the articles, check "short", so Àlir will try to get the full articles.

On top of feeds list, an icon allows to update all feeds. If you want to update just one feed, select it and use the icon on the detail tile. Àlir should try to update feeds every hours (you can set the interval in settings).

By default, articles from feeds are hidden on main article list. Click on the RSS icon on top to display them.


## Stay in sync

Sharing content between your desktop browser and your phone is easy. Just subscribe for a sync account and install the Àlir addon. Every time you want to send an article from the desktop to your phone, click on the add icon. If not already connected, connect to remote storage, then choose “Put to remote storage”. The article will be shared across all your instances of the application (you can also use the application from your desktop browser, or install it on your desktop computer. It’s an HTML5 application, it should work everywhere).


## Screenshots

Some screenshots for the braves that end up here

Articles list
![Article list](https://raw.github.com/clochix/alir/master/doc/articleList.png)

Main menu
![main menu](https://raw.github.com/clochix/alir/master/doc/menu.png)

Article detail
![article detail](https://raw.github.com/clochix/alir/master/doc/article.png)

Feed content
![feed content](https://raw.github.com/clochix/alir/master/doc/feedDetail.png)
