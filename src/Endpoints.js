'use strict'
const { Err, log } = require('./BaseUtil')('RPC', __filename)

class Endpoints {
  constructor ({ endpointList, version, host, route, method }) {
    this.data = endpointList.map((ep) => {
      if (!ep.name || !ep.svc) throw new Err('INVALID_RPC_ENDPOINT_' + JSON.stringify(ep))

      log.info(`Method: ${ep.name} - ${ep.description}`)
      return ep
    })
    this.route = `/${version}/${route || 'rpc'}`
    this.full_route = `${host}${this.route}`
    this.method = method || 'post'
  }

  get length () {
    return this.data.length
  }

  forEach (cb) {
    this.data.forEach(cb)
  }

  getByName (k) {
    return this.data.filter(({ name }) => name === k).pop()
  }
}

module.exports = Endpoints
