alir
====

Experiment with remoteStorage

## CLI Client

To put an URL into remote storage, use the cli client:
    put.js --ulr=http://…

### Interactive pode

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
