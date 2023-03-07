# Slashtags Exchange Feeds Daemon

A simple HTTP RPC deamon to enable publishing Slashtags Exchange Feeds. Can be used either as a [Library](#import-as-library) or as a [Daemon](#run-as-daemon)

## Configuration

### Default

Default configuration file can be found in `./schemas/config.json`
Default data representation configuration cab be found in `./schemas/slashfeed.json`

### Representation config

Providing `schemaConfig` as a part of configuration enables customization for representation logic. This is sufficient to provide this part of config once only as it will be persisted for future runs inside of `./schemas/slashfeed.json`. The basic configuration looks like this:

```
  schemaConfig: {
    name: "Name of you service",
    description: "Descrition of you widget",
    icons: {
      48: 'data:image/png;base64,...' // <size>: <base64 image string>
      96: 'data:image/png;base64,...'
    },
    fields: [
      {
        "name": "Name of you the field to be shown as a part of the widget",
        "description": "This field is shows relative change of some value",
        "type": "delta", // type of field used by widget for application of representation logic
        "units": "%" // it is required for some types (see below)
      },
      ...
    ]
  }
```

**Notes on Fields**: There can be arbitrary number of fields. Each field must have `name` and `description`. Default field type is `utf8` string. Property `units` will be prepended to the value before rendering it to end user. Supported field types are:
Basic:
* `utf8 (default)` - we suggest it to be used for passing basic string values
* `number` - we suggest it to be used for passing general numeric values 
Measured (types that require `units` being specified):
* `currency` - we suggest it to be used for passing currency values, in combination with `units` (e.g. `100.00 $`)
* `delta` - we suggest it to be used for passing change values, in combination with `units` (e.g. `+5 %`)

#### Updating configured values

After changing/specifying representation configuration, one can start feeding values into the data feed by providing objects with `{ name: "<name of field from schemaConfig.field[i].name>", value: "<value for this field>"}`. See [Update Field](#update-feed) below

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

### *Run with PM2

*`pm2 start`

## Test & Development
There are tests for all methods located in `./test` dir. You can run them by `npm run test`
There examples in `./examples` folder. They require running daemon. Run `npm run start` to start daemon and in separate terminal run `npm run example:account` to start generating account feed. See [examples readme](./example/README.md) for more details

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
    "id": "925b10c27f4ad350ab3ef7e027605fd83388c999a890cfdd8e6061656b5a5513",
    "result": {
        "slashdrive": {
            "key": "<string>",
            "encryption_key": "<string>"
        }
    }
}
```

### Update Feed
Update feed request
``` sh
curl --location --request POST 'http://localhost:8787/v0.1/rpc' \
--header 'Content-Type: application/json' \
--data-raw '{
    "method":"updateFeedBalance",
    "params": {
        "feed_id":"satoshi123",
        "fields": [
          {
            "name": "Bitcoin",
            "value": 1.442
          }
        ]
    }
}'
```
Response
``` json
{
    "jsonrpc": "2.0",
    "id": "4fefad839fa440cc2a85d8178d1d895fa1044460080b8fe1a26b4942aa86c07f",
    "result": true
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
    "id": "c6ccd88f842330ab60153b5fb512101d2ab76824189eee5690f9070ebe18cb87",
    "result": {
        "feed_key": "<string>",
        "encrypt_key": "<string>"
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

