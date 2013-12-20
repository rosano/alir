# Àlir

![A chair](https://raw.github.com/clochix/alir/master/img/icon-256.png)

This is a chair. A good offline place to sit down and read. Àlir’s goal is to provide a similar pleasant feeling.

Àlir is an application I use in the browser of my phone to read articles when I’m offline in the tube. It may also work in other contexts, in the bus or inside Chromium for example, but I haven’t tested it yet. So use it at your own risk and don’t hesitate to suggest improvements. I really need design and UX feedbacks and advices. [There’s a demo](https://alir.5apps.com/) kindly hosted by 5apps.

Àlir tries to respect the decentralized state of the Internet. The application itself consists only of HTML, JavaScript and CSS, so you can easily host it everywhere on the Web, or install it on your phone.

The application allows to share your data between multiple locations and devices thanks to [remoteStorage](http://remotestorage.io/). In fact, for now, syncinc is the only way to add articles into the application. To synchronize your data, you need a remoteStorage account:
 - if you are tech savvy, install your own sync server. [Several are available](http://remotestorage.io/get/), in Node.js, PHP, Ruby… I tried [reStore](https://github.com/jcoglan/restore) and it should work;
 - register an account on a [provider](http://remotestorage.io/get/). I currently use a free account provided by [5apps](https://5apps.com/storage/beta);
 - alternatively, the developers of remoteStorage are working on gateways to allow the use of mainstream cloud storage as sync servers. If you have a Dropbox or a Google Drive account, you could try to connect to it (I tried with Dropbox, see explanations below);

There are two ways to use the application:

 - if you are a developer and have a Firefox OS powered device, you can install the application (see below) and push articles from the Web browser. Articles will be saved locally ;
 - otherwise, you need to use a distinct client and a Sync account. Currently, two clients are available, a Firefox addon and a command line interface. You need to connect them to your sync account and use them then tu push content into the application.

## Usage

### Main Menu

The big bar on the left is a menu you can toggle by taping on it, and a scrollbar to see where you are in the article.

The items in the manu allow to create a new content, change settings, force sync and go offline. Offline means the application shouldn't try to sync with the server. This is currently buggy.

When you’re on an article, the menu allows to return to the top or go back to the articles list.

### Read article

Some icons on top of the article should allow you to:

 - go back to main list;
 - archive the article;
 - delete the article;
 - add tags;
 - if you created the content, you can also edit it;

### Tags

You can add tags to articles, and filter the main list by tags. A very classical behaviour. The design is awful, please someone fix it !!!

### Archive

This is just a shortcut to add a "Archive" tag on an article, and filter list on it.

### Annotations

You can annotate every paragraph of an article with a long-click on it. To read the annotation, click on the icon next to the text.

### Writing notes

You can add your own articles by clicking on the plus icon in the left menu. You can use Markdown syntax to format your article.

### Settings

Here you can setup your API keys to connect to Dropbox or Google Drive.

### Gesture navigation

This is an experimental feature, disabled by default, because I’m not satisfied with it. When enabled in settings, it allows to go to previous or next article by sliding to the left / right. But it’s not very accurate, and I often slide when trying to scroll.

## Using the addon

The addon allows to push articles from Firefox to your application running on another device. You can build the addon from sources with the JetPack SDK, or [download it](https://github.com/clochix/alir/blob/master/addon/alir.xpi). But you should never install an untrusted addon ;) Don’t forget to go to the preferences to set your remoteStorage user name or Dropbox API key. I don’t want to create a Google account, so I have not implemented Google Drive into the addon. Feel free to contribute.

## Using Dropbox

 - log in to [https://www.dropbox.com/login](https://www.dropbox.com/login);
 - go to [the App Console](https://www.dropbox.com/developers/apps) and click the blue button to create an application;
 - create a *Dropbox API app* application with access to *Files and datastores*. The application only needs access to files it creates. Choose a unique name for your app;
 - the last thing to do is to add two OAuth redirect URIs on next screen:
   - `chrome://alir` for the addon;
   - the URL where your instance of the application is hosted (for example `http://toto.org/alir`);
 - don’t forget to write somewhere the *App key*, you will need it to connect;

### Connect the addon


Once the addon is installed, go to it’s preference page and set the Dropbox App key. Then click on the addon icon in addon bar and connect to Dropbox. It should open a new page where you need to allow the addon to connect. If the connection is successful, a button on addon panel should allow you to put the content of current page to your dropbox storage.

### Connect the application

Click on the left margin, then on option icon, set the API key, reload page (yes, not very friendly). A dropbox icon should appear on top right corner. Click on the icon, allow the application, and you may be able to see the contents you put with the addon.


## Using Google Drive

You need to give Google your phone number to add a third party application to Google Drive, so I haven’t be able to test it :(


## Firefox OS Client

If you have a phone running Firefox OS, you can also install the application. This will allow to put content into it from the browser of the phone. To do so, click on the bookmark icon (the star at the bottom), then choose to add the page to the home screen. A list of apps able to handle the bookmark will show up. Select Àlir and if everything works, it will fetch the page content, clean it up using [readabilitySAX](https://github.com/fb55/readabilitysax) and add it to your list of items to read.

Unfortunately, the process of authenticate against your sync provider from an installed app doesn’t work for now (I need to implement OAuth in the context of a privileged app). So you won’t be able for now to connect to your sync server.

Moreover, the application need some permissions, and installation is only available from the Marketplace. I will put it on the Marketplace once it’s a little bit more usable. For now, you can test it by putting your phone in developer mode and pushing the application form the App Manager.

## CLI Client

To put an URL into remote storage, use the cli client:
    put.js --url=http://…

### Interactive mode

Extract URLs from file toto and ask what to do:

    put.js -i -f toto


Extract URLs from file on STDIN and ask whet to do:

    cat <file> | put.sh


### Config file

The `put.js` client needs a `config.json` file with the server path and a auth token:

    {
      "hostname": "toto.org",
      "path": "/storage/toto/alir/",
      "port": "443",
      "token": "xxxxxx"
    }

