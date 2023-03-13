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
  'total net value: "-540041.33678973"',
  'btc balance: "-8856777.19488740"',
  'usd balance: "-658412.61"',
  'margin used: "-3144281.20851517"',
  'pnl: {"absolute":"-6144114.17860538","relative":"60.91"}',
  'bitcoin futures pnl: {"absolute":"-8351435.58215350","relative":"-20.92"}',
  'bitcoin futures balance: "-6480275.58345348"',
  'bitcoin options pnl: {"absolute":"7494553.67680640","relative":"28.39"}',
  'bitcoin options balance: "6678712.46114374"',
  'bitcoin pnl and balance: {"value":"1671238.87222260","absolute_pnl":"-3901669.66244578","relative_pnl":"10.82"}'
] +0ms
  example:satoshi9191 Updated feed: [
  'total net value: "3082602.53630579"',
  'btc balance: "-4622066.03493542"',
  'usd balance: "4061698.67"',
  'margin used: "-728434.17525291"',
  'pnl: {"absolute":"-826597.13923931","relative":"90.69"}',
  'bitcoin futures pnl: {"absolute":"-5438805.26907742","relative":"58.63"}',
  'bitcoin futures balance: "-458402.74076909"',
  'bitcoin options pnl: {"absolute":"-2772833.66769552","relative":"38.64"}',
  'bitcoin options balance: "9011384.84477997"',
  'bitcoin pnl and balance: {"value":"4379805.63379825","absolute_pnl":"7014897.92205394","relative_pnl":"-90.72"}'
] +0ms
  example:synonymxyz Updated feed: [
  'total net value: "-5312686.59047783"',
  'btc balance: "5488227.16344148"',
  'usd balance: "5969599.78"',
  'margin used: "7940113.55843396"',
  'pnl: {"absolute":"9615660.69163383","relative":"-71.20"}',
  'bitcoin futures pnl: {"absolute":"-8700234.18217898","relative":"59.86"}',
  'bitcoin futures balance: "6294792.03838855"',
  'bitcoin options pnl: {"absolute":"1224181.76382780","relative":"57.59"}',
  'bitcoin options balance: "-8294838.71348203"',
  'bitcoin pnl and balance: {"value":"-7941445.28917969","absolute_pnl":"8669050.75032265","relative_pnl":"-6.00"}'
] +0ms
...
```

The slashfeed urls can be converted to a QR code and scanned with the client application. Currently, only the [Bitkit wallet](https://bitkit.to/) supports the rendering of account feeds. Scanning one of the urls with Bitkit should display the drive's data within a widget. 
