<h3 align="center">Exchange account feeds example</h3>


## Start account feeds daemon

From the root directory, execute `npm run start` to start the daemon.

You will be presented with 
1. The current configuration of the daemon
2. A list of available RPC methods
3. The IP:Port for using the RPC methods

Running the example for the first time, it will create `data` directory for the internal SQLite state management database ("feed-db") and the hyperdrives to serve the account data for different clients. 

```sh
$ npm run start

> @synonymdev/feeds-daemon@1.0.1 start
> DEBUG=stfeed* node start.js

(node:96373) ExperimentalWarning: Importing JSON modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
  stfeed:Main:info Starting Slashtags Feeds Daemon +0ms
  stfeed:Main:info Config: +0ms
  stfeed:Main:info {
  stfeed:Main:info   "rpc": {
  stfeed:Main:info     "port": 8787,
  stfeed:Main:info     "host": "127.0.0.1"
  stfeed:Main:info   },
  stfeed:Main:info   "slashtags_dir": "./data",
  stfeed:Main:info   "db": {
  stfeed:Main:info     "name": "feed-db",
  stfeed:Main:info     "path": "./data"
  stfeed:Main:info   }
  stfeed:Main:info } +0ms
  stfeed:RPC:info Method: createFeed - Create a feed drive +0ms
  stfeed:RPC:info Method: updateFeed - Update feed feed +0ms
  stfeed:RPC:info Method: getFeed - Get a feed key +0ms
  stfeed:RPC:info Method: deleteFeed - Delete a feed +0ms
  stfeed:RPC:info Route: post => /v0.1/rpc +0ms
  stfeed:Main:info Started Feeds +16ms
  stfeed:Main:info Started Broadcasting +2ms
  stfeed:RPC:info Listening: 127.0.0.1 Port: 8787 +12ms
```

## Feed generation

Open a separate terminal window and execute `npm run example:exchange:account` from the root directory. This will create three hyperdrives. Each hyperdrive feeds the data for a particular customer account. The drive contents are accessible by knowing the discovery key and the encryption key. This information can be shared by [slashfeed URL](https://github.com/synonymdev/slashtags/tree/master/packages/url), which has the following format: `slashfeed:<id>#encryptionKey=<key>`. 

```sh
example Starting account feed +0ms
example Seting up accounts +0ms
example Config: +0ms
example {
example   accountIds: [ 'abcde123', 'satoshi9191', 'synonymxyz' ],
example   feedTimer: 5000
example } +0ms
example:abcde123 Created feed: slashfeed:sx9uxfw5zdxuqb5ty7ox4zfe8hhffoa139na787kg94gzx1mrs3y#encryptionKey=ttium34uzwqkztg39t419bqgoaih5h4o3pwymyrd1f4qjdgoarmy +0ms
example:satoshi9191 Created feed: slashfeed:oi5do85a6sa4fnhdqogkh6n7wogaiftnoxbdkhm897ymtsc3fbgy#encryptionKey=qyy9d8zurx5nqjqh4z7rb5ndihimmf84mzozsrmtpuf17kued73o +0ms
example:synonymxyz Created feed: slashfeed:7fgcnreg8cmqom8yhjeqkhbyybdi5jyjf3f7oswkdnoj66kar31y#encryptionKey=9qg1a3cthjf69e3regqqduyfs95fkuaq18ddtasq9ih5cdrb7qey +0ms
```

The data will update periodically. 

```sh
example Updating account feeds +5s
example:abcde123 Updated feed: [
  'total balance: "-5443472.07061947"',
  'total open pnl: {"absolute":"-9039929.42534387","relative":"11.30"}',
  'total open pnl and total balance: {"value":"8112571.67253644","absolute_pnl":"2471980.91819883","relative_pnl":"-26.32"}'
] +0ms
example:satoshi9191 Updated feed: [
  'total balance: "-719298.06843400"',
  'total open pnl: {"absolute":"-331530.44059873","relative":"-61.52"}',
  'total open pnl and total balance: {"value":"-7741750.18537790","absolute_pnl":"-9805918.76897961","relative_pnl":"-17.91"}'
] +0ms
example:synonymxyz Updated feed: [
  'total balance: "9146804.61864919"',
  'total open pnl: {"absolute":"1281327.62853056","relative":"-70.31"}',
  'total open pnl and total balance: {"value":"-797822.55459577","absolute_pnl":"6331277.87150443","relative_pnl":"10.34"}'
] +0ms
...
```

The slashfeed urls can be converted to a QR code and scanned with the client application. Currently, only the [Bitkit wallet](https://bitkit.to/) supports the rendering of account feeds. Scanning one of the urls with Bitkit should display the drive's data within a widget. 
