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
      assert(server.endpoints.getbyName("createFeed").route)
      assert(server.endpoints.getbyName("createFeed").full_route)
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
    it('should start listening to port and call endpoint', function (cb) {
      this.timeout(5000)
      server = rpc({
        port:9199,
        handler: (endpoint, rpcReq) =>{
          console.log(rpcReq,111)
        }
      })
      server.start(async (err)=>{
        assert(!err)
        const ep = server.endpoints.getbyName("createFeed")
        try{
          const res = await axios.post(ep.full_route,{
            data:1
          })
        } catch(err){
          console.log(err.response.data)
        }
      })
    })
  })
})
