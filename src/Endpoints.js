'use strict'

class Endpoints {
  constructor(endpoints, version, hostport){
    this.data = endpoints.map((ep)=>{
      if( !ep.name || 
          !ep.svc
        ) throw new Error("INVALID_RPC_ENDPOINT_"+JSON.stringify(ep))
      ep.route = `/${version}/${ep.route}`
      ep.full_route = `${hostport}${ep.route}`
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