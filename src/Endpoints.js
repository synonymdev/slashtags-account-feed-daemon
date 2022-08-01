'use strict'

class Endpoints {
  constructor(endpoints, version, hostport){
    this.data = endpoints.map((ep)=>{
      if( !ep.method ||
          !ep.route || 
          !ep.name || 
          !ep.method
        ) throw new Error("INVALID_RPC_ENDPOINT")
      ep.route = `/${version}/${ep.route}`
      ep.full_route = `${hostport}${ep.route}`
      ep.method = ep.method.toLowerCase()
      return ep
    })
  }

  get length(){
    return this.data.length
  }

  forEach(cb){
    this.data.forEach(cb)
  }

  getbyName(k){
    return this.data.filter(({name}) => name === k).pop()
  }
}

module.exports = Endpoints