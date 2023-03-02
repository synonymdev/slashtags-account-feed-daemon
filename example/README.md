## Account Feed Example

### Feed Daemon

From the root directory run `npm run start` to start daemon.
It will present you with: 
1. Its current configuration
2. List of available RPC methods
3. Route under which they are available

In case of the first run with default configuration it will create `data` directory for both internal state management database (SQLite) and feed data folder (for more details see [holepunch corestore docs](https://docs.holepunch.to/building-blocks/corestore)).

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

### Feed generation
In separate terminal run `npm run example:account` to start generating account feed.
It will create three [hyperdrive](https://docs.holepunch.to/building-blocks/hyperdrive) accessible under `slashfeed:<id>#encryptionKey=<key>` [slashfeed URL](https://github.com/synonymdev/slashtags/tree/master/packages/url).

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

You can now convert it to QR code and scan with your [bitkit wallet](https://bitkit.to/) and see corresponding feed updates in a widget appearing with delay specified as a `feedTimer`

```sh
example Updating account feeds +5s
example:abcde123 Updated feed: [ 'Bitcoin: "7.40"', 'Bitcoin P/L: "-99.27"' ] +0ms
example:satoshi9191 Updated feed: [ 'Bitcoin: "9.73"', 'Bitcoin P/L: "-51.02"' ] +0ms
example:synonymxyz Updated feed: [ 'Bitcoin: "8.52"', 'Bitcoin P/L: "54.86"' ] +0ms
...
```
