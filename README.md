# Slashtags account feeds daemon

---
**⚠️ This daemon is still in beta. Please use at your own risk.⚠️**

---

## Overview 

With this code service providers can offer external client applications a way to read the data in a customer's account(s) populated over slashtags.

The daemon can store one or more of a customer's account parameters into a slashtags. The data is encrypted. The customer's client application can, then, retrieve the encrypted data pertaining to the customer's account(s) with the slashtag's feed key.
This retrieval occurs in a peer to peer fashion over a slashtags. The client application can decipher the data with the corresponding decryption key. (For further background on Slashtags, see [website](https://slashtags.to/), [github](https://www.github.com/synonymdev/slashtags)).

As the customer's data is encrypted, and seeded by other servers for assuring availability and redundancy. Customer privacy requires securing the discovery key and the decryption key which accompany the feed (shared together via a [slashfeed url string](https://github.com/synonymdev/slashtags/tree/master/packages/url)). Compromise of both the decryption keys only entails a loss of customer privacy, not access to funds.

The rendering of Slashtags account feeds is currently supported by Bitkit [website](https://bitkit.to/), [github](https://github.com/synonymdev/bitkit).

To create and manage account feeds, you can either be run as a [daemon](#run-as-a-daemon) or import the code as a [npm dependency](#import-as-a-library).

## Configuration

### Defaults

A default configuration file for running the daemon is located in `./schemas/config.json`. A default configuration file to express the data available in the feed can be found in `./schemas/slashfeed.json`. All client account feeds will require the same available data configuration (unless you run multiple instances of the daemon or create multiple instances from the library).

### Customization

The configuration file for expressing the available data can be customized using the `schemaConfig` object. Running the daemon, you can pass `schemaConfig` as a property to `./schemas/config.json`. Importing as a library, you can insert `schemaConfig` as an argument in the creation of a Feeds instance (see the ["Import as a library"](#import-as-a-library) section).

You only need to set the custom configuration once and it will persist in the `./schemas/slashfeed.json` file. The configurable options for the slashfeed file are listed below. Each key-value pair is required when passing the `schemaConfig` object. 

```
schemaConfig: {
  name: "Name of your service",
  description: "Description of your account feed",
  icons: {
    48: 'data:image/png;base64,...' // <size>: <base64 image string>
    ...
  },
  fields: [
    {
      "name": "Name of the field to be shown as a part of the widget",
      "description": "Description of what the field displays",
      "type": "field type"
      "units": "The units for the field"
    },
    ...
  ]
}
```

Your client account feeds can support an arbitrary number of data fields. Each field in `schemaConfig` consists of a `name`, `description`, `type`, and `units`.

There are two main categories of data fields: basic and measurement. Only the measurement category requires a specific value for the `units` specification. Both the basic and measurement categories each have two field types.

**Basic**
* `utf8` (default): Intended for passing basic string values
* `number`: Intended for passing general numeric values 

**Measurement**
* `currency`: Intended for passing currency values in combination with a unit (e.g. `100.00 $`)
* `delta`: Intended for passing profit/loss measurements in combination with a unit (e.g. `+5 %`)

### Updating field values

After setting the available data configuration, you can start feeding values for each data field by passing objects with the following format: `{ name: "<name of field from schemaConfig.field[i].name>", value: "<value for this field>"}`. See [Update Field](#update-feed) below. 


## Import as a library

Install the library as a dependency:

```sh
npm i @synonymdev/feeds-daemon 
```

Import the library into your codebase and create a Feeds instance. The Feeds instance will allow you to create individual account feeds for clients. The database stores key data about the account feeds you have created for your clients. For the schemaConfig property, you can pass in the object as described [above](#customization). 

```js
const { Feeds } = require('@synonymdev/feeds-daemon')
const feeds = new Feeds({
    db: {
        name: 'feeds-db',
        path: "./data"
    },
    slashtags: "./",
    schemaConfig: "<data representation config>"
})
```

Start the Feeds instance. 

```js
await feeds.start()
```

You can now call various functions on the Feeds instance. In creating a feed, you can use a customer identification number, e-mail address, username, or some other appropriate variable. The `feed_id` is not exposed to the client application.    

```js
await feeds.createFeed({ feed_id: "55642289" }) // Creates an account feed
await feeds.updateFeedBalance({ feed_id: "55642289", fields: [{name:"bitcoin", value: 1.422},{name:"dollar", value: 482}]}) // Updates the balance of the account feed
let feed_55642289 = await feeds.getFeed({ feed_id: "55642289" }) // Retrieves the data of an account feed
await feeds.deleteFeed( { feed_id: "55642289" } ) // Deletes an account feed 
```

## Run as a daemon

Clone the repository and install the dependencies.

```sh
git clone
npm install
```

Set up the configuration for the daemon in `./schema/config.json`. As explained [above](#configuration), the configuration file should include a schemaConfig object. This customizes your `./schema/slashfeed.json` file, which determines the data available in your account feeds.

Start the daemon.

``` sh
npm run start # or node start.js
```

### Enable detailed logs

To show detailed logs, start your daemon as follows:

`DEBUG=stfeed:* node start.js`

### Run with PM2

`pm2 start`


## Testing & Development

There are tests for all methods located in the `./test` directory. You can run them executing `npm run test` in the root directory.

There is an example located in the `./examples` directory. It instantiates three account feeds and updates their data fields periodically. See the [README](./example/README.md) located in the directory for more details.


## RPC API

**A Postman collection has been provided.**

### Create a feed

Request creation of a new account feed (the `feed_id` is never exposed to the client application.)

``` sh
/// Request Body
curl --location --request POST 'http://localhost:8787/v0.1/rpc' \
--header 'Content-Type: application/json' \
--data-raw '{
    "method":"createFeed",
    "params":{
        "feed_id":"55642289"
    }
}'
```

Successful response: 

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

### Update a feed

Request to update an account feed.

``` sh
curl --location --request POST 'http://localhost:8787/v0.1/rpc' \
--header 'Content-Type: application/json' \
--data-raw '{
    "method":"updateFeedBalance",
    "params": {
        "feed_id":"55642289",
        "fields": [
          {
            "name": "Bitcoin",
            "value": 1.442
          }
        ]
    }
}'
```

Successful response:

``` json
{
    "jsonrpc": "2.0",
    "id": "4fefad839fa440cc2a85d8178d1d895fa1044460080b8fe1a26b4942aa86c07f",
    "result": true
}
```

### Get a feed

Request the details of an account feed.

``` sh
curl --location --request POST 'http://localhost:8787/v0.1/rpc' \
--header 'Content-Type: application/json' \
--data-raw '{
    "method":"getFeed",
    "params":{ "feed_id" : "55642289" }
}'
```

Successful response:

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

### Delete a feed

Delete an account feed.

```sh
curl --location --request POST 'http://localhost:8787/v0.1/rpc' \
--header 'Content-Type: application/json' \
--data-raw '{
    "method":"deleteFeed",
    "params":{ "feed_id" : "55642289" }
}'
```

Successful response:

``` json
{
    "jsonrpc": "2.0",
    "id": "c6ccd88f842330ab60153b5fb512101d2ab76824189eee5690f9070ebe18cb87",
    "result": {
        "deleted": "true"
    }
}
```
