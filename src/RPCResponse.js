'use strict'
const {
  Err, log
} = require('./BaseUtil')('RPC_RESP', __filename)
const { randomBytes } = require('crypto')

class RPCResponse {
  constructor ({ result, error, id }) {
    this.response = {
      jsonrpc: '2.0'
    }
    if (!id) {
      id = randomBytes(32).toString('hex')
    }
    this.response.id = id
    if (result) {
      this.response.result = result
    } else if (error) {
      this.response.error = this._createErr(error)
    } else {
      log.error('INVALID_RPC_RESPONSE:', error, result)
      throw new Err('INVALID_RPC_PARAMS')
    }
  }

  toResponse () {
    return this.response
  }

  static error = {
    parseErr: -32700,
    invalidReq: -32600,
    badMethod: -32601,
    badParam: 32602,
    rpcErr: {
      code: -32603,
      message: 'INTERNAL_SERVER_ERROR'
    }
  }

  _createErr (err) {
    if (!err) throw new Err('RPC_ERROR_MISSING')
    if (!err.code) throw new Err('RPC_ERROR_CODE_MISSING')
    if (!err.message) throw new Err('RPC_ERROR_CODE_MISSING')
    return {
      code: err.code,
      message: err.message
    }
  }

  static fromResult (result, id) {
    return new RPCResponse({ result, id }).toResponse()
  }

  static fromError ({ code, message }, id) {
    return new RPCResponse({ error: { code, message }, id }).toResponse()
  }

  static genericErr (id) {
    return RPCResponse.fromError(RPCResponse.error.rpcErr, id)
  }
}

module.exports = RPCResponse
