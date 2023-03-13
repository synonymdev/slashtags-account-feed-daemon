# Slashtags Exchange Feeds Daemon

A simple HTTP RPC deamon to enable publishing Slashtags Exchange Feeds. Can be used either as a [Library](#import-as-library) or as a [Daemon](#run-as-daemon)

## Import as Library

Install as a dependency

```sh
npm i @synonymdev/feeds-daemon 
```

Import to your code and instantiate providing corresponding parameters and start the server

```js
const { Feeds } = require('@synonymdev/feeds-daemon')
const feeds = new Feeds({
    db: {
        name: 'feeds-db',
        path: "./data"
    },
    slashtags: "./",
    feed_schema: "<feed schema json file>"
})

await feeds.start()
```

You can now call various functions
```js
let feed = await feeds.getFeed({ feed_id: "123123" })
```

## Run as Daemon

**1. Setup config**
Go to `./schema/config.json` Update config items.

**2. Update your feeds slashfeed.json file**
This schema file allows feed consumers to parse the feed.

```
git clone
npm install
mkdir ./db
node start.js
```

### *Enable detailed logs specifying env variable**

`DEBUG=stfeed:*`

###  *Run with PM2

*`pm2 start`

## Test & Development
There are tests for all methods located in `./test` dir. You can run them by `npm run test`
There examples in `./examples` folder. They require running daemon. Run `npm run start` to start daemon and in separate terminal run `npm run example:exchange:account` to start generating account feed. See [examples readme](./example/README.md) for more details

## RPC API

**A Postman collection has been provided.**

### Create Feed
Create a feed request
``` sh
/// Request Body
curl --location --request POST 'http://localhost:8787/v0.1/rpc' \
--header 'Content-Type: application/json' \
--data-raw '{
    "method":"createFeed",
    "params":{
        "feed_id":"satoshi123"
    }
}'
```
Response
``` json
{
  "jsonrpc": "2.0",
  "id": "<call id>",
  "result": {
    "url": ":<slashfeed url>",
    "feed_key": "<public key>",
    "encrypt_key": "<private key>"
  }
}
```

### Update Feed
Update feed request
``` sh
curl --location --request POST 'http://localhost:8787/v0.1/rpc' \
--header 'Content-Type: application/json' \
--data-raw '{
    "method":"updateFeed",
    "params": {
        "feed_id":"satoshi123",
        "fields": [
            {
              "name": "total balance",
              "value": 11
            },
            {
              "name": "total open pnl",
              "value": 12
            },
            {
              "name": "total open pnl and total balance",
              "value": { "balance": 10, "absolute_pnl": 1, "relative_pnl": 10 }
            }
        ]
    }
}'
```
Response
``` json
{
    "jsonrpc": "2.0",
    "id": "<call id>",
    "result": {
      "updated": true
    }
}
```

### Get Feed
``` sh
curl --location --request POST 'http://localhost:8787/v0.1/rpc' \
--header 'Content-Type: application/json' \
--data-raw '{
    "method":"getFeed",
    "params":{ "feed_id" : "satoshi123" }
}'
```
Response
``` json
{
    "jsonrpc": "2.0",
    "id": "call id",
    "result": {
        "url": ":<slashfeed url>",
        "feed_key": "<public key>",
        "encrypt_key": "<private key>"
    }
}
```

### Delete Feed
```sh
curl --location --request POST 'http://localhost:8787/v0.1/rpc' \
--header 'Content-Type: application/json' \
--data-raw '{
    "method":"deleteFeed",
    "params":{ "feed_id" : "satoshi123" }
}'
```
Response
``` json
{
    "jsonrpc": "2.0",
    "id": "c6ccd88f842330ab60153b5fb512101d2ab76824189eee5690f9070ebe18cb87",
    "result": {
        "deleted": "true"
    }
}
```

