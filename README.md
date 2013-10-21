alir
====

WIP — WIP — Experiment with remoteStorage — WIP — WIP

## Choose a backend

In order to use *Alir*, you need a remote storage. To respect the decentralized spirit of the Internet, I encourage you to [host your own remoteStorage server](http://remotestorage.io/get/). Unfortunately, most servers seems outdated. You can try [my fork of restore](https://github.com/clochix/restore), with minor fixes to work with the latest version of remoteStorage.js. Alternatively, the client library is working on an experimental support of Dropbox and Google Drive. So, if you have a Dropbox account, you can try to use it as remote storage.

### Connecting Alir to Dropbox

 - log in to [https://www.dropbox.com/login](https://www.dropbox.com/login);
 - go to [the App Console](https://www.dropbox.com/developers/apps) and click the blue button to create an application;
 - create a *Dropbox API app* application with access to *Files and datastores*. The application only needs access to files it creates. Choose a unique name for your app;
 - the last thing to do is to add 2 OAuth redirect URIs on next screen:
   - `chrome://alir` for the addon;
   - the URL where your instance of the application is hosted;
 - don’t forget to write somewhere the *App key*, you will need it to connect;

#### Connect the addon

You can build the addon from source with the JetPack SDK, or [download it](https://github.com/clochix/alir/blob/master/addon/alir.xpi). But you should never install an untrusted addon ;)

Once the addon is installed, go to it’s preference page and set the Dropbox App key. Then click on the addon icon in addon bar and connect to Dropbox. It should open a new page where you need to allow the addon to connect. If the connection is successful, a button on addon panel should allow you to put the content of current page to your dropbox storage.

#### Connect the application

Lets assume your have installed the application on http://toto.org/alir

Click on the left margin, then on option icon, set the API key, reload page (yes, not very friendly). A dropbox icon should appear on top right corner. Click on the icon, allow the application, and tadam, you may be able to see the contents you put with the addon.



## CLI Client

To put an URL into remote storage, use the cli client:
    put.js --url=http://…

### Interactive mode

    put.js -i -f toto

Extract URLs from file toto and ask for an action

   cat <file> | put.sh

The same with reading from stdin

### Config file

Create a `config.json` file with the server path and a auth token:

{
  "hostname": "toto.org",
  "path": "/storage/toto/alir/",
  "port": "443",
  "token": "xxxxxx"
}

## How to use Dropbaox as backend



You 
