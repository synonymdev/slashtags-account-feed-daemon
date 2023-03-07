const { promisify } = require('node:util')
const RPC = require('./src/RPC.js')
const path = require('path')
const Feeds = require('./src/Feeds.js')
const config = require('./schemas/config.json')
const schema = require('./schemas/slashfeed.json')
const { mkdir } = require('./src/util.js')

const Log = require('./src/Log.js')
const customErr = require('./src/CustomError.js')
const log = Log('Main')
const Err = customErr({ errName: 'Slashtags', fileName: __filename })

const _err = {
  badConfig: 'BAD_CONFIG'
}

async function main () {
  log.info('Starting Slashtags Feeds Daemon')
  log.info('Config:')
  log.info(JSON.stringify(config, null, 2))
  await mkdir(config.db.path)
  await mkdir(config.slashtags_dir)
  config.rpc.handler = function rpcHandler (ctx) {
    log.info(`Processing new RPC call: ${ctx.method}`)
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
