
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

const _err = {
  badConfig: 'BAD_CONFIG'
}

async function main () {
  log.info('Starting Slashtags Feeds Daemon')
  log.info('Config:')
  log.info(JSON.stringify(config, null, 2))
  await util.mkdir(config.db.path)
  await util.mkdir(config.slashtags_dir)
  config.rpc.handler = function rpcHandler (ctx) {
    log.info('Processing new RPC call')
    const fnName = ctx.getSvcFn()
    const fn = feeds[fnName]
    if (!fn) {
      return ctx.failedMethod('INVALID_METHOD')
    }
    return fn.call(feeds, ctx.params)
  }
  const rpc = new RPC(config.rpc)
  if (!config?.db?.path) {
    throw new Err(_err.badConfig)
  }
  config.db.path = path.resolve(config.db.path)
  const feeds = new Feeds({
    db: config.db,
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
