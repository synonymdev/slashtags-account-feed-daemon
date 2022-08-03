'use strict'
const RPCResponse = require("./RPCResponse")
const {
  Err, log
} = require("./BaseUtil")("RPC", __filename)
const Endpoints = require("./Endpoints")


function loadFastify(){
  const fastify = require('fastify')({ })
  fastify.register(require('@fastify/formbody'))
  return fastify
}

class RequestContext {
  constructor({req, endpoint, serverConfig, handler, reply}){
    this.endpoint = endpoint
    this.data = req.body
    this.meta = req.headers
    this.req = req
    this.reply = reply
    this.handler = handler
  }

  genericErr(){
    this.reply.send(RPCResponse.genericErr(this.data.id))
  }

  respond(result){
    this.reply.send(RPCResponse.fromResult(result,this.data.id))
  }

  runRequest(){
    try {
      this.handler(this)
    } catch(err){
      log.error(`Req to ${this.endpoint.name} failed:`, err)
      this.genericErr()
    }
  }
}

function server (config){
  if(!config?.port) throw new Err("RPC_PORT_NOT_PASSED")
  if(!config?.handler) throw new Err("RPC_HANDLER_NOT_PASSED")
  config.host = config.host || "localhost"

  const endpointList = [
    {
      name:"createFeed",
      description:"Create a user drive",
      svc: "feeds.createDrive",
      method:"POST",
      route: "user/feed"
    }
  ]

  const endpoints = new Endpoints(endpointList, "v0.1",`http://${config.host}:${config.port}`)

  const fastify = loadFastify()

  endpoints.forEach((ep)=>{
    log.info(`Route: ${ep.method} => ${ep.route}`)
    fastify[ep.method](ep.route, async (req,reply)=>{
      const ctx = new RequestContext({
        req, 
        reply,
        endpoint:ep,
        serverConfig: config,
        handler: config.handler
      })
      return ctx.runRequest()
    })
  })

  function start(cb){
    log.info(`Listening: ${config.host} Port: ${config.port}`)
    fastify.listen(config.port, config.host,(err)=>{
      if(err) {
        log.err(`FAILED_RPC_LISTEN`,err)
        throw new Err("FAILED_RPC_LISTEN")
      }
      cb(null)
    })
  }

  function stop(cb){
    fastify.close((err)=>{
      log.info("Stopped RPC server")
      if(err){
        log.err("ERROR_STOPPING", err)
         throw new Err("FAILED_RPC_STOPPING")
      }
      cb(null)
    })
  }

  return {
    start,
    stop,
    endpoints
  }
}

module.exports = server
