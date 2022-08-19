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
  constructor({req, endpoints, serverConfig, handler, reply}){
    this.data = req.body
    this.meta = req.headers
    this.req = req
    this.reply = reply
    this.handler = handler
    this.rpcsvc = endpoints.getByName(this.data?.method)
  }

  get params(){
    return this?.data?.params
  }

  getSvcFn(){
    return this.rpcsvc?.svc?.split(".")[1]
  }

  genericErr(){
    this.reply.send(RPCResponse.genericErr(this.data?.id))
  }

  respond(result){
    this.reply.send(RPCResponse.fromResult(result,this.data?.id))
  }

  failedMethod(msg){
    this.reply.send(RPCResponse.fromError({
      code: RPCResponse.error.badMethod,
      message:msg
    },this.data?.id))
  }

  async runRequest(){

    if(!this.rpcsvc){
      log.error(`Invalid RPC method called: ${this.data?.method}`)
      return this.reply.send(RPCResponse.fromError({code:RPCResponse.error.badMethod, message:"Invalid method"},this.data?.id))
    }

    let res 
    try {
      res = await this.handler(this)
    } catch(err){
      log.error(`Req to ${this.rpcsvc.name} failed:`, err)
      if(err.custom_err){
        return this.failedMethod(err.message) 
      }
      return this.genericErr()
    }
    this.respond(res)
  }
}

function server (config){
  if(!config) {
    config = require("../schemas/config.json")
  }
  if(!config?.port) throw new Err("RPC_PORT_NOT_PASSED")
  if(!config?.handler) throw new Err("RPC_HANDLER_NOT_PASSED")
  config.host = config.host || "localhost"

  const endpointList = [
    {
      name:"createFeed",
      description:"Create a user drive",
      svc: "feeds.createDrive",
    },
    {
      name:"updateFeedBalance",
      description:"Update user's feed balance",
      svc: "feeds.updateFeedBalance",
    },
    {
      name:"getFeedFromDb",
      description:"Get a user feed key",
      svc: "feeds.getFeedFromDb",
    },
    {
      name:"deleteUserFeed",
      description:"Delete a user feed",
      svc: "feeds.deleteUserFeed",
    }
  ]

  const endpoints = new Endpoints({
    endpointList, version: "v0.1",host : `http://${config.host}:${config.port}`
  })

  const fastify = loadFastify()

  log.info(`Route: ${endpoints.method} => ${endpoints.route}`)
  fastify.post(endpoints.route, async (req,reply)=>{
    try{
      const ctx = new RequestContext({
        req, 
        reply,
        serverConfig: config,
        handler: config.handler,
        endpoints
      })
      return ctx.runRequest()
    } catch(err){
      console.log(err)
      req.send(500)
    }

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
