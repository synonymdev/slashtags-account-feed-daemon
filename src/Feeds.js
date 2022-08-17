
const UserDb = require("./UserDb")
const SlashtagsFeedsLib = require("@synonymdev/feeds")
const jtd = require("jtd")
const log = require("./Log")("core")

const Err = require("./CustomError")({
  errName: "Slashtags",
  fileName:__dirname
})

const _err ={
  notReady: "SLASHTAGS_NOT_READY",
  dbFailedStart: "FAILED_TO_START_DB",
  userIdMissing:"USER_ID_NOT_PASSED",
  failedCreateDrive:"FAILED_TO_CREATE_USER_FEED",
  failedCreateDriveArgs:"FAILED_TO_CREATE_FEED_INVALID_RESPONSE",
  failedBalanceCheck:"FAILED_BALANCE_CHECK",
  badConfig: "BAD_CONSTRUCTOR_CONFIG",
  badSchemaSetup: "FEED_SCHEMA_FAILED",
  badUserDataType:"BAD_USER_DATA_TYPE",
  invalidSchema: "INVALID_FEED_SCHEMA",
  badUpdateParam: "BAD_UPDATE_PARAM",
  updateFeedFailed:"FAILED_TO_UPDATE_FEED",
  userNoFeed : "USER_ID_HAS_NO_FEED"
}


class SlashtagsFeeds {
  static err = _err
  static Error = Err

  /**
   * 
   * @param {String} config.db.name Database name
   * @param {String} config.db.path Database path location
   * @param {String} config.slashtags.path Feeds storage path location
   * @param {String} config.slashtags.key Feeds seed key
   */
  constructor(config) {
    this.config = config
    this.db = new UserDb(config.db)
    this.feed_schema = config.feed_schema
    if(!config.slashtags) throw new Err(_err.badConfig)
    this._validateSchema(this.feed_schema)
    this.ready = false
    this.slashtags = null
  }

  _validateSchema(schema){
    try{
      const valid = jtd.isValidSchema(schema)
      if(!valid) throw new Error("INVALID_SCHEMA")
    } catch(err){
      throw new Err(_err.invalidSchema)
    }
    return true
  }

  async start(){
    try{
      await this.db.init()
    } catch(err){
      console.log(err)
      log.err(err)
      throw new Err(_err.dbFailedStart)
    }
    this.slashtags = new SlashtagsFeedsLib(this.config.slashtags, this.feed_schema)
    this.ready = true
  }

  /**
   * @desc Check if drive is setup
   * @param {String} uid user id
   * @returns {Booelan} True if exists
   */
  async _isInited(uid){
    try{
      balance = await slashtags.get(uid,SlashtagsFeedsLib.HEADER_PATH)
      if(balance && balance !== 0){
        return true
      }
    } catch(err){
      log.error("FAILED_CHECKING_INIT_STATUS",err)
      throw new Error(_err.failedBalanceCheck)
    }
    return false
  }

  /**
   * @desc Update feed balance
   * @param {Array} updates Array of updates
   * @param {String} updates[].user_id user id to update
   * @param {Object} updates[].wallet_name user id to update
   * @param {Object} updates[].amount amount
   */
  async updateFeedBalance(updates) {
    let res 
    try{
      res = await Promise.all(updates.map(async (update)=>{
        if(typeof update.wallet_name !== "string" || typeof update.user_id !== "string")  throw new Err(_err.badUpdateParam)
        if(Number.isNaN(+update.amount)) throw new Err(_err.badUpdateParam)
        await this.slashtags.update(update.user_id, this._getWalletFeedKey(update.wallet_name), update.amount)
        return true
      }))
    } catch(err){
      console.log(err)
      if(err instanceof Err) throw err
      throw new Err(_err.updateFeedFailed)
    }
    return  res
  }
  
  /**
   * @desc get user feed by key
   * @param {String} userId userId
   * @returns UserFeed object
   */
  async getFeedKey(userId){
    let userFeed
    try{
      userFeed = await this.slashtags.feed(userId)
      if(!userFeed.key) throw new Err(_err.userNoFeed)
    } catch(err){
      log.err(err)
      if(err instanceof Err) throw err
      throw new Err(_err.userNoFeed)
    }
    return {
      key: userFeed.key.toString("hex"),
      encryption_key: userFeed.encryptionKey.toString("hex")
    }
  }

  async getFeedFromDb(userId){

    const res = await this.db.findByUser(userId)
    if(!res) {
      return null
    }

    return {
      feed_key : res.feed_key,
      encrypt_key: res.encrypt_key
    }
  }

  /**
   * @desc Setup user's slashdrive with init values
   * @param {String} userId 
   */
   async _initFeed(userId){
    Promise.all(this.feed_schema.wallets.map(async (w)=>{
      await this.slashtags.update(userId, this._getWalletFeedKey(w.wallet_name), null)
    }))
  }

  _getWalletFeedKey(wname){
    return `wallet/${wname}/amount`
  }

  /**
   * @desc Create a slashdrive for user. If a slashdrive exists, we just return the existing drive key.
   * @param {String} args.user_id 
   * @returns {Object} feed_key
   */
   async createDrive(args){
    if(!args?.user_id) throw new Err(_err.userIdMissing)
    if(!this.ready) throw new Err(_err.notReady)
    log.info(`Creating Slashdrive for ${args.user_id}`)
    const { slashtags } = this
    
    let userFeed
    const userId = args.user_id

    // Find or create the Slashdrive
    try{
      userFeed = await this.getFeedKey(userId)
    } catch(err){
      throw err
    }

    // Init the feed with values
    try{
      await this._initFeed(userId, args.init_data)
    } catch(err){
      console.log("FAILED_INIT_FEED",userId)
      console.log(err)
      throw new Err(_err.badSchemaSetup)
    }

    // Insert into database
    try{
      await this.db.insert({
        user_id: userId,
        feed_key:userFeed.key,
        encrypt_key:userFeed.encryption_key,
        meta: {},
      })
    } catch(err){
      log.error(err)
      log.info("FAILED_TO_INSERT_INTO_DB",err)
      throw new Err(_err.failedCreateDrive)
    }
    log.info(`Finished creating new drive for ${userId}`)
    return {slashdrive: userFeed}
  }
}

module.exports = SlashtagsFeeds