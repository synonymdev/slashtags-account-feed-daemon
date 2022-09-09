
const Db = require('./AccountsDb')
const AuditDb = require('./AccountsAuditDb')
const log = require('./Log')('accounts')
const { randomBytes } = require("crypto")
const { URL } = require("url")
const Err = require('./CustomError')({
  errName: 'Accounts',
  fileName: __dirname
})


const _err = {
  configInvalid:"CONFIG_INVALID",
  userExists: 'FAILED_TO_CREATE_USER_EXISTS',
  useridNotString:"USER_ID_PARAM_NOT_STRING",
  dbFailedStart: 'FAILED_TO_START_DB',
}

class SlashtagsAccounts {
  static err = _err
  static Error = Err

  /**
   *
   * @param {String} config.db.name Database name
   * @param {String} config.db.path Database path location
   * @param {String} config.slashtags.path Feeds storage path location
   * @param {String} config.slashtags.key Feeds seed key
   */
  constructor(config){
    if(!config.secret) throw new Err(_err.configInvalid)
    this.ready = false
    this.config = config
    this.db = new Db(config.db)
    this.auditDb = new AuditDb(config.db)
    this.token_sessions = new Set()
    this.authed_keys = new Set()
    if(!this.config.token_timeout){
      this.config.token_timeout = 3000
    }

    try{
      const u = new URL(this.config.auth_url)
      if(!u.protocol || !u.host) throw new Error()
    } catch(err){
      throw new Error("AUTH_URL_INVALID")
    }
  }

  static genSecret(size){
    return randomBytes(size || 32)
  }

  async start(){
    try {
      await this.db.init()
      await this.auditDb.init()
    } catch (err) {
      log.err(err)
      throw new Err(_err.dbFailedStart)
    }
    const { Server } = await import('@synonymdev/slashtags-auth')
    const {default: Slashtag} = await import("@synonymdev/slashtag")
    this.slashtag = new Slashtag()
    this.Server = Server
    this.server = new Server(this.slashtag, {
      onauthz: this.onAuth.bind(this),
      onmagiclink: this.onMagicLink.bind(this)
    })

    await this.slashtag.listen()
    this.ready = true
  }

  _addAuthKeys(key){
    if(this.authed_keys.has(key)) return 
    this.authed_keys.add(key)
    setTimeout(()=>{
      this.authed_keys.delete(key)
    },this.config.token_timeout)
  }

  async onAuth(token,remote){
    let user 
    const remoteStr = remote.toString("hex")
    const audit = {
      user_id:"na",
      public_key: remoteStr,
      login_token: token,
      meta: {}
    }

    try{
      // Check if the key is active 
      user = await this.db.findBySlashtag(remoteStr)
      audit.user_id = user ? user.user_id : audit.user_id
      
      if(!user || remoteStr !== user.slashtag_pub || user.state !== 1) {
        await this.auditDb.insert({ state: 100, ...audit})
        return {status: "error" , message: "key_invalid"}
      }

      const session = this.token_sessions.has(token)
      if(!session) {
        await this.auditDb.insert({ state: 101, ...audit })
        return { status: "error", message: "token_invalid"}
      }
      
      await this.auditDb.insert({ state: 200, ...audit})
      this._addAuthKeys(remoteStr)
      return { status : "ok"}
    
    } catch(err){
      // Any failure is recorded here
      try{
        await this.auditDb.insert({ state: 103, ...audit })
      } catch(err){
        log.err(err)
      }

      log.err(err)
      return { status : "error", message: "service_not_ready"}
    }
  }

  async onMagicLink(remote){
    const remoteStr = remote.toString("hex")
    try{
      const user = await this.db.findBySlashtag(remoteStr)
      if(!user || !this.authed_keys.has(remoteStr)) throw new Error("INVALID_USER")
    } catch(err){
      log.error(err)
      throw new Error("INVALID_KEY")
    }
    return `${this.config.auth_url}?auth_token=${SlashtagsAccounts.genSecret(128).toString("hex")}`
  }

  generateToken(){
    const tk = SlashtagsAccounts.genSecret().toString("hex")
    this.token_sessions.add(tk)
    setTimeout(()=>{
      this.token_sessions.delete(tk)
    },this.config.token_timeout)
    return {
      url : this.server.formatURL(tk),
      token: tk
    }
  }

  async getAccount(args){
    if (!args?.user_id) throw new Err(_err.userIdMissing)
    if (typeof args.user_id !== "string") throw new Err(_err.useridNotString)
    return this.db.findByUser(args.user_id)
  }

  async createAccount(args){
    if (!args?.user_id) throw new Err(_err.userIdMissing)
    if (typeof args.user_id !== "string") throw new Err(_err.useridNotString)


    const res = await this.db.insert({
      user_id:args.user_id,
      slashtag_pub:args.slashtag_pub,
      meta: {}
    })

  }
}

module.exports = SlashtagsAccounts
