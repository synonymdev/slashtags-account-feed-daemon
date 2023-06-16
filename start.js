const { promisify } = require('node:util')
const { RPC } = require('slashtags-server')
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
  config.rpc.endpointList = [
    {
      name: 'createFeed',
      description: 'Create a feed drive',
      svc: 'feeds.createFeed'
    },
    {
      name: 'updateFeed',
      description: 'Update feed feed',
      svc: 'feeds.updateFeedBalance'
    },
    {
      name: 'getFeed',
      description: 'Get a feed key',
      svc: 'feeds.getFeed'
    },
    {
      name: 'deleteFeed',
      description: 'Delete a feed',
      svc: 'feeds.deleteFeed'
    }
  ]
  const rpc = new RPC(config)
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
  await rpc.start()
  log.info('RPC server started')
}

main()
