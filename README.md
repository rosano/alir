alir
====

Experiment with remoteStorage

## CLI Client

To put an URL into remote storage, use the cli client:
  put.js --ulr=http://…


### Config file

Create a `config.json` file with the server path and a auth token:

{
  "hostname": "toto.org",
  "path": "/storage/toto/alir/",
  "port": "443",
  "token": "xxxxxx"
}
