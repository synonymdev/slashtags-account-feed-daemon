# Slashtags Exchange Feeds Deamon

A simple HTTP RPC deamon to enable publishing Slashtags Exchange Feeds.

## API

### Create Feed
Create an exchange feed for a user
``` js
/// Request Body
{
  jsonrpc: '2.0',
  params: {
    user_id: "<user_id string>"
  },
  method: "createFeed",
  id: "<request id>"
}
```
``` js
/// Response
{
  jsonrpc: '2.0',
  result: [{
    slashdrive: "<slashdrive link>"
  }],
  method: "createFeed",
  id: "<request id>"

}
```

### Update Balance Feed
Update a wallet's balance for a user's feed.
``` js
/// Request Body
{
  jsonrpc: '2.0',
  params: [
    {
      user_id: "<user_id string>",
      wallet_name: "<wallet name>",
      amount: "<updated balance>",
    }
  ],
  method: "updateFeedBalance",
  id: "<request id>"
}
```
``` js
/// Response
{
  jsonrpc: '2.0',
  result: [true],
  id: "<request id>"

}
```