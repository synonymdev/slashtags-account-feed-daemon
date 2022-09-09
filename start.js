
const RPC = require('./src/RPC')
const path = require('path')
const Feeds = require('./src/Feeds')
const config = require('./schemas/config.json')
const schema = require('./schemas/slashfeed.json')
const util = require('./src/util')
const { promisify } = require('util')

const {
  Err, log
} = require('./src/BaseUtil')('Main', __filename)


async function main () {
  log.info('Starting Slashtags Feeds Daemon')
  log.info('Config:')
  log.info(JSON.stringify(config, null, 2))
  await util.mkdir(config.slashtags_dir)
  config.rpc.handler = function rpcHandler (ctx) {
    log.info(`New RPC: ${ctx.method}`)
    const fnName = ctx.getSvcFn()
    const fn = feeds[fnName]
    if (!fn) {
      return ctx.failedMethod('INVALID_METHOD')
    }
    return fn.call(feeds, ctx.params)
  }
  const rpc = new RPC(config.rpc)

  const feeds = new Feeds({
    db: { path: path.resolve(config.db_dir), ...config.feeds_db },
    slashtags: config.slashtags_dir,
    feed_schema: schema
  })
  await feeds.start()
  log.info('Started Feeds')
  await feeds.startFeedBroadcast()
  log.info('Started Broadcasting')
  await promisify(rpc.start)()
  log.info('RPC server started')
}

main()
