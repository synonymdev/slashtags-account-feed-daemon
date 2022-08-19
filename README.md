# Slashtags Exchange Feeds Deamon

A simple HTTP RPC deamon to enable publishing Slashtags Exchange Feeds.

## How to run
**1. Setup config**
Go to `./schema/config.json` Update config items.

**2. Update your feeds slashfeed.json file**
This schema file allows feed consumers to parse the feed.

```
git clone
npm install
node start.js
```

**Enable detailed logs** ``` DEBUG=stfeed:*```

**Run with PM2** `pm2 start`


## API
**A Postman collection has been provided.**
### Create Feed
Create an exchange feed for a user
``` sh
/// Request Body
curl --location --request POST 'http://localhost:8787/v0.1/rpc' \
--header 'Content-Type: application/json' \
--data-raw '{
    "method":"createFeed",
    "params":{
        "user_id":"satoshi123"
    }
}'
```
``` json
/// Response
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

### Update Balance Feed
Update a wallet's balance for a user's feed.
``` sh
curl --location --request POST 'http://localhost:8787/v0.1/rpc' \
--header 'Content-Type: application/json' \
--data-raw '{
    "method":"updateFeedBalance",
    "params":[
        {
            "user_id":"satoshi123",
            "wallet_name":"Bitcoin",
            "amount":1.442
        }
    ]
}'
```
``` json
/// Response
{
    "jsonrpc": "2.0",
    "id": "4fefad839fa440cc2a85d8178d1d895fa1044460080b8fe1a26b4942aa86c07f",
    "result": [
        true
    ]
}
```

### Get Feed key by user id
``` sh
curl --location --request POST 'http://localhost:8787/v0.1/rpc' \
--header 'Content-Type: application/json' \
--data-raw '{
    "method":"getFeedFromDb",
    "params":"satoshi123"
}'
```
``` json
/// Response
{
    "jsonrpc": "2.0",
    "id": "c6ccd88f842330ab60153b5fb512101d2ab76824189eee5690f9070ebe18cb87",
    "result": {
        "feed_key": "<string>",
        "encrypt_key": "<string>"
    }
}
```

### Delete User Feed
```sh
curl --location --request POST 'http://localhost:8787/v0.1/rpc' \
--header 'Content-Type: application/json' \
--data-raw '{
    "method":"deleteUserFeed",
    "params":"satoshi123"
}'
```
``` json
/// Response
{
    "jsonrpc": "2.0",
    "id": "c6ccd88f842330ab60153b5fb512101d2ab76824189eee5690f9070ebe18cb87",
    "result": {
        "deleted": "true"
    }
}
```


### Test & Development

There is a tests for all methods located in `./test` dir

### Dev Scripts
You can use the following scripts for dev.
* `./util/CreateUsers.js` Create Fake users
* `./util/FakeFeed.js` Broadcast a fake feed for users created in previous step
* `./util/ListenRemoteFeed.js` Listen to a exchange feed