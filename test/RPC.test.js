import assert from 'assert'
import axios from 'axios'

import rpc from '../src/RPC.js'
import { rnd } from '../src/util.js'

const noop = () => {}
describe('RPC ', () => {
  const ERROR_NAME = 'RPC_ERROR'
  const ENDPOINTS = ['createFeed', 'updateFeedBalance', 'deleteUserFeed', 'getFeed']

  describe('Config', () => {
    it('fails without port', () => assert.throws(
      () => rpc({ handler: noop }),
      { name: ERROR_NAME, message: 'RPC_PORT_NOT_PASSED' }
    ))
    it('fails wthout handler', () => assert.throws(
      () => rpc({ port: 9191 }),
      { name: ERROR_NAME, message: 'RPC_HANDLER_NOT_PASSED' }
    ))
  })

  describe('Instance', () => {
    let server
    const port = 9191
    const handler = noop
    beforeEach(() => server = rpc({ port, handler }))

    describe('Endpoints', () => {
      it('has endpoints', () => assert(server.endpoints.length >= 0))
      describe('geting endpoint by name', () => {
        ENDPOINTS.forEach(epName => it(`gets ${epName}`, () => assert(server.endpoints.getByName(epName))))

        it('returns "undefined" for unregisterd endpoint', () => assert.equal(server.endpoints.getByName('unknowEndpoint'), undefined))
      })
    })

    describe('Start/Stop', () => {
      describe('Idle server', () => {
        afterEach(async () => server.stop())

        it('stops idle server', async () => server.stop())
        it('starts server', async () => server.start())
        it('stops server', async () => server.stop())
      })

      describe('Running server', () => {
        beforeEach(async () => server.start())
        afterEach(async () => server.stop())

        it('stops server', async () => server.stop())
        it('fails to start server', async () => assert.rejects(
          async () => server.start(),
          { name: ERROR_NAME, message: 'FAILED_RPC_LISTEN' }
        ))
      })
    })
  })

  describe('Request/Response', () => {
    const port = 9191
    const handler = (ctx) => ctx.respond(['test'])
    const server = rpc({ handler, port })

    before(async () => server.start())
    after(async () => server.stop())

    ENDPOINTS.forEach((ep) => {
      let res
      const reqId = rnd()
      before(async () => {
        res = await axios.post(server.endpoints.full_route, { id: reqId, method: ep })
      })

      describe(`${ep} response`, () => {
        it('returns jsonrpc version', () => assert.equal(res.data.jsonrpc, '2.0'))
        it('returns response data', () => assert.deepStrictEqual(res.data.result, ['test']))
        it('returns request Id', () => assert.deepStrictEqual(res.data.id, reqId))
        it('does not return addtional props', () => assert.equal(Object.keys(res.data).length, 3))
      })
    })

    describe('Unregisterd endpoint', () => {
      let res
      const reqId = rnd()
      before(async () => {
        res = await axios.post(server.endpoints.full_route, { id: reqId, method: 'undefined' })
      })

      describe('unregistered method respone', () => {
        it('returns error code', () => assert.equal(res.data.error.code, -32601))
        it('returns error message', () => assert.equal(res.data.error.message, 'Invalid method'))
        it('returns request Id', () => assert.deepStrictEqual(res.data.id, reqId))
        it('does not return addtional props', () => assert.equal(Object.keys(res.data).length, 3))
      })
    })
  })
})
