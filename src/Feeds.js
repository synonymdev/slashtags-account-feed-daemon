
const UserDb = require("./UserDb")
const Slashtags = require("@synonymdev/feeds")
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
  feedItemsMissing: "FEED_ITEMS_NOT_SET",
  badConfig: "BAD_CONSTRUCTOR_CONFIG",
  initFailed: "FEED_INIT_FAILED",
  initDataMissing:"FEED_INIT_DATA_MISSING",
  badUserDataType:"BAD_USER_DATA_TYPE"
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
    this.feed_items = config.feed_items
    if(!this.feed_items || !Array.isArray(this.feed_items)) throw new Err(_err.feedItemsMissing)
    if(!config?.slashtags?.path) throw new Err(_err.badConfig)
    if(!config?.slashtags?.key) throw new Err(_err.badConfig)
    this.ready = false
    this.slashtags = null
  }

  async start(){
    try{
      await this.db.init()
    } catch(err){
      console.log(err)
      log.err(err)
      throw new Err(_err.dbFailedStart)
    }
    this.slashtags = await Slashtags.init(this.config.slashtags)
    this.ready = true
  }

  /**
   * @desc Check if drive is setup
   * @param {String} uid user id
   * @returns {Booelan} True if exists
   */
  async _isInited(uid){
    try{
      balance = await slashtags.get(uid,"balance")
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
   * @desc Setup user's slashdrive with init values
   * @param {String} userId 
   */
   async _initFeed(userId, userData){
    return Promise.all(this.feed_items.map((key)=>{
      if(typeof userData[key] !== "string") throw new Err(_err.badUserDataType)
      return this.slashtags.update(userId, key, userData[key])
    }))
  }

  /**
   * @desc Create a slashdrive for user. If a slashdrive exists, we just return the existing drive key.
   * @param {String} args.user_id 
   * @returns {Object} feed_key
   */
   async createDrive(args){
    if(!args?.user_id) throw new Err(_err.userIdMissing)
    if(!this.ready) throw new Err(_err.notReady)
    if(!args.init_data) throw new Error(_err.initDataMissing)
    log.info(`Creating Slashdrive for ${args.user_id}`)
    const { slashtags } = this
    
    let userFeed
    const userId = args.user_id

    // Find or create the Slashdrive
    try{
      userFeed = await slashtags.feed(userId)
      if(!userFeed.key) throw new Err(_err.failedCreateDriveArgs)
    } catch(err){
      log.err(err)
      if(err instanceof Err) throw err
      throw new Err(_err.failedCreateDrive)
    }

    // Init the feed with values
    try{
      await this._initFeed(userId, args.init_data)
    } catch(err){
      console.log("FAILED_INIT_FEED",userId)
      console.log(err)
      throw new Err(err.initFailed)
    }

    // Insert into database
    try{
      await this.db.insert({
        user_id: userId,
        feed_key:userFeed.key.toString("hex"),
        encrypt_key:userFeed.encryptionKey.toString("hex"),
        meta: {},
      })
    } catch(err){
      log.error(err)
      log.info("FAILED_TO_INSERT_INTO_DB",err)
      throw new Err(_err.failedCreateDrive)
    }
    log.info(`Finished creating new drive for ${userId}`)
    return {slashdrive: userFeed.key.toString("hex") }
  }
}

module.exports = SlashtagsFeeds