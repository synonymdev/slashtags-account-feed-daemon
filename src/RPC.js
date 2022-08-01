'use strict'
const RPCResponse = require("./RPCResponse")
const {
  Err, log
} = require("./BaseUtil")("RPC", __filename)
const Endpoints = require("./Endpoints")

function handleRequest(config, endpoint, req, reply){
  try {
    config.handler(endpoint,req)
  } catch(err){
    log.error(`Req to ${endpoint.name} failed:`, err)
    reply.code(500).send(RPCResponse.genericErr())
  }
}

function loadFastify(){
  const fastify = require('fastify')({ })
  fastify.register(require('@fastify/formbody'))
  return fastify
}

class RequestData {
  constructor(req){
    this.data = req.body
    this.headers = req.headers
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
      console.log(config)
      return handleRequest(config,ep,new RequestData(req),reply)
    })
  })

  function start(cb){
    log.info(`Listening: ${config.host} Port: ${config.port}`)
    fastify.listen(config.port,config.host,(err)=>{
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
