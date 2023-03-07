import { __filename } from './util.js'
import RPCResponse from './RPCResponse.js'
import Endpoints from './Endpoints.js'
import Schema from '../schemas/slashfeed.json' assert { type: 'json' }

import util from './BaseUtil.js'

import Fastify from 'fastify'
import formBodyPlugin from '@fastify/formbody'
const { Err, log } = util('RPC', __filename())

function loadFastify () {
  const fastify = Fastify({})
  fastify.register(formBodyPlugin)
  return fastify
}

class RequestContext {
  constructor ({ req, endpoints, handler, reply }) {
    this.data = req.body
    this.meta = req.headers
    this.req = req
    this.reply = reply
    this.handler = handler
    this.rpcsvc = endpoints.getByName(this.data?.method)
  }

  get method () {
    return this.data?.method
  }

  get params () {
    return this?.data?.params
  }

  getSvcFn () {
    return this.rpcsvc?.svc?.split('.')[1]
  }

  genericErr () {
    this.reply.send(RPCResponse.genericErr(this.data?.id))
  }

  respond (result) {
    this.reply.send(RPCResponse.fromResult(result, this.data?.id))
  }

  failedMethod (msg) {
    this.reply.send(RPCResponse.fromError({
      code: RPCResponse.error.badMethod,
      message: msg
    }, this.data?.id))
  }

  async runRequest () {
    if (!this.rpcsvc) {
      log.error(`Invalid RPC method called: ${this.data?.method}`)
      return this.reply.send(RPCResponse.fromError({
        code: RPCResponse.error.badMethod,
        message: 'Invalid method'
      }, this.data?.id))
    }

    let res
    try {
      res = await this.handler(this)
    } catch (err) {
      log.error(`Req to ${this.rpcsvc.name} failed:`, err.message)
      if (err.custom_err) {
        return this.failedMethod(err.message)
      }
      return this.genericErr()
    }
    this.respond(res)
  }
}

export default function (config) {
  if (!config) {
    config = Schema
  }
  if (!config?.port) throw new Err('RPC_PORT_NOT_PASSED')
  if (!config?.handler) throw new Err('RPC_HANDLER_NOT_PASSED')
  config.host = config.host || 'localhost'

  const endpointList = [
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

  const endpoints = new Endpoints({ endpointList, version: 'v0.1', host: `http://${config.host}:${config.port}` })

  const fastify = loadFastify()

  log.info(`Route: ${endpoints.method} => ${endpoints.route}`)
  fastify.post(endpoints.route, async (req, reply) => {
    try {
      const ctx = new RequestContext({
        req,
        reply,
        serverConfig: config,
        handler: config.handler,
        endpoints
      })
      return ctx.runRequest()
    } catch (err) {
      log.err('ERROR_RCTX', err)
      req.send(500)
    }
  })

  async function start () {
    log.info(`Listening: ${config.host} Port: ${config.port}`)
    try {
      await fastify.listen({ port: config.port, host: config.host })
    } catch (err) {
      log.err('FAILED_RPC_LISTEN', err)
      throw new Err('FAILED_RPC_LISTEN')
    }
  }

  async function stop () {
    try {
      await fastify.close()
      log.info('Stopped RPC server')
    } catch (err) {
      log.err('ERROR_STOPPING', err)
      throw new Err('FAILED_RPC_STOPPING')
    }
  }

  return {
    start,
    stop,
    endpoints
  }
}
