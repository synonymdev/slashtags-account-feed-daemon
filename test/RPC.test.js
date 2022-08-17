/* eslint-env mocha */
'use strict'
const assert = require('assert')
const rpc = require('../src/RPC');
const axios = require('axios').default;

const noop = () =>{}
describe('RPC ', () => {

  it('should fail when port is not passed', async function () {
    try{
      const server = rpc({
        handler: noop
      })
    } catch(err){
      assert(err.message === "RPC_PORT_NOT_PASSED")
    }
  })

  it('endpoint object should be created', async function () {
      const server = rpc({
        handler: noop,
        port:9191
      })
      assert(server.endpoints.length >= 0 )
      assert(server.endpoints.getByName("createFeed"))
  })

  it('should start listening to port and close', function (cb) {
    const server = rpc({
      port:9199,
      handler: noop
    })
    server.start((err)=>{
      assert(!err)
      server.stop(()=>{
        cb()
      })
    })
  })

  describe("Endpoints",()=>{
    let server 

    afterEach((cb)=>{
      server.stop(()=>{
        cb()
      })
    })
    it('should start listening to port and call endpoint. Verify response', function (cb) {
      this.timeout(5000)
      const respData = ['world']
      server = rpc({
        port:9199,
        handler:(ctx) =>{
          ctx.respond(respData)
          return 
        }
      })
      server.start(async (err)=>{
        assert(!err)
        const ep = server.endpoints.getByName("createFeed")
        let res
        const reqid = 111
        try{
          res = await axios.post(server.endpoints.full_route,{
            id:reqid,
            method:"createFeed"
          })
        } catch(err){
          throw err.message
        }
        assert(res.data.jsonrpc === "2.0")
        assert(JSON.stringify(res.data.result) === JSON.stringify(respData))
        assert(res.data.id === reqid)
        assert(Object.keys(res.data).length === 3)
        cb()
      })
    })
    it('should start listening to port and call endpoint and fail with bad method', function (cb) {
      this.timeout(5000)
      const respData = ['world']
      server = rpc({
        port:9199,
        handler:(ctx) =>{
          ctx.respond(respData)
          return 
        }
      })
      server.start(async (err)=>{
        assert(!err)
        const ep = server.endpoints.getByName("createFeed")
        let res
        const reqid = 111
        try{
          res = await axios.post(server.endpoints.full_route,{
            id:reqid,
            method:"bad method "
          })
        } catch(err){
          throw err.message
        }
        assert(res.data.error.code == -32601, "code invalid")
        assert(res.data.error.message === "Invalid method","bad method")
        assert(res.data.id === reqid)
        cb()
      })
    })
  })
})
