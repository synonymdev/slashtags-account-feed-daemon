
'use strict'
const {
  Err, log
} = require("./BaseUtil")("RPC_RESP", __filename)

class RPCResponse {
  constructor({result, error, id}){
    this.response = {
      jsonrpc:"2.0"
    }
    if(!id) throw new Err("RPC_ID_MISSING")
    this.response.id = id

    if(result) {
      this.response.result = result
    } else if(error){
      this.response.error = this._createErr()
    } else {
      throw new Err("INVALID_RPC_PARAMS")
    }
  }

  toString(){
    return JSON.stringify(this.response)
  }

  static error = {
    parseErr : -32700,
    invalidReq: -32600,
    badMethod: -32601,
    badParam: 32602,
    rpcErr : {
      code : -32603,
      message: "INTERNAL_SERVER_ERROR"
    },
  }

  _createErr(err){
    if(!err) throw new Err("RPC_ERROR_MISSING")
    if(!err.code) throw new Err("RPC_ERROR_CODE_MISSING")
    if(!err.message) throw new Err("RPC_ERROR_CODE_MISSING")
    return {
      code: err.code,
      message: err.message
    }
  }

  static fromResult(result, id){
    return new RPCResponse({ result,id })
  }

  static fromError(msg, code, id){
    return new RPCResponse({ error : { code, message },id })
  }

  static genericErr(){
    return RPCResponse.fromError(RPCResponse.error.rpcErr).toString()
  }
}




module.exports = RPCResponse