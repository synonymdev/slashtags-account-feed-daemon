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
      assert(server.endpoints.getbyName("createFeed"))
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
        const ep = server.endpoints.getbyName("createFeed")
        let res
        const reqid = 111
        try{
          res = await axios.post(ep.full_route,{
            id:reqid
          })
        } catch(err){
          console.log(err)
        }
        assert(res.data.jsonrpc === "2.0")
        assert(JSON.stringify(res.data.result) === JSON.stringify(respData))
        assert(res.data.id === reqid)
        assert(Object.keys(res.data).length === 3)
        cb()
      })
    })
  })
})
