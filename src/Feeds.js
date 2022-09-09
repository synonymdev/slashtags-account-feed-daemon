
const UserDb = require('./FeedsDb')
const SlashtagsFeedsLib = require('@synonymdev/feeds')
const log = require('./Log')('core')

const Err = require('./CustomError')({
  errName: 'Slashtags',
  fileName: __dirname
})

const _err = {
  notReady: 'SLASHTAGS_NOT_READY',
  dbFailedStart: 'FAILED_TO_START_DB',
  userIdMissing: 'USER_ID_NOT_PASSED',
  failedCreateDrive: 'FAILED_TO_CREATE_USER_FEED',
  failedCreateDriveArgs: 'FAILED_TO_CREATE_FEED_INVALID_RESPONSE',
  failedBalanceCheck: 'FAILED_BALANCE_CHECK',
  badConfig: 'BAD_CONSTRUCTOR_CONFIG',
  badSchemaSetup: 'FEED_SCHEMA_FAILED',
  badUserDataType: 'BAD_USER_DATA_TYPE',
  invalidSchema: 'INVALID_FEED_SCHEMA',
  badUpdateParam: 'BAD_UPDATE_PARAM',
  updateFeedFailed: 'FAILED_TO_UPDATE_FEED',
  userNoFeed: 'USER_ID_HAS_NO_FEED',
  failedDeleteUser: 'FAILED_USER_DELETE',
  failedGettingActiveFeeds: 'FAILED_GETTING_ACTIVE_FEEDS',
  failedBroadcast: 'FAILED_BROADCAST',
  userExists: 'FAILED_TO_CREATE_USER_EXISTS',
  useridNotString:"USER_ID_PARAM_NOT_STRING",
  processAlreadyRunning:"PROCESS_ALREADY_RUNNING",
  feedNotFound:"USER_FEED_NOT_FOUND"
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
  constructor (config) {
    this.config = config
    this.db = new UserDb(config.db)
    this.feed_schema = config.feed_schema
    if (!config.slashtags) throw new Err(_err.badConfig)
    this.validateFeed(this.feed_schema)
    this.ready = false
    this.slashtags = null
    this.lock = new Map()
  }

  validateFeed (schema) {
    if (!schema) throw new Err(_err.invalidSchema)
    const keys = [
      'image', 'name', 'feed_type', 'version'
    ]
    keys.forEach((k) => {
      if (!schema[k]) throw new Err(_err.invalidSchema)
    })
  }

  async start () {
    try {
      await this.db.init()
    } catch (err) {
      log.err(err)
      throw new Err(_err.dbFailedStart)
    }
    this.slashtags = new SlashtagsFeedsLib(this.config.slashtags, this.feed_schema)
    this.ready = true
  }

  /**
   * @desc Update feed balance
   * @param {Array} updates Array of updates
   * @param {String} updates[].user_id user id to update
   * @param {Object} updates[].wallet_name user id to update
   * @param {Object} updates[].amount amount
   */
  async updateFeedBalance (updates) {
    let res
    try {
      res = await Promise.all(updates.map(async (update) => {
        if (typeof update.wallet_name !== 'string' || typeof update.user_id !== 'string') throw new Err(_err.badUpdateParam)
        if (Number.isNaN(+update.amount)) throw new Err(_err.badUpdateParam)
        await this.slashtags.update(update.user_id, this._getWalletFeedKey(update.wallet_name), update.amount)
        return true
      }))
    } catch (err) {
      if (err instanceof Err) throw err
      throw new Err(_err.updateFeedFailed)
    }
    return res
  }

  async startFeedBroadcast () {
    let feeds
    try {
      feeds = await this.db.getAllActiveFeeds()
    } catch (err) {
      log.error(err)
      throw new Error(_err.failedGettingActiveFeeds)
    }

    let res
    try {
      res = await Promise.all(feeds.map((user) => {
        return this.slashtags.feed(user.user_id, {
          announce: true
        })
      }))
    } catch (err) {
      console.log(err)
      throw new Error(_err.failedBroadcast)
    }
    return {
      feeds_started: res.length
    }
  }

  async deleteUserFeed (args) {
    const userId = args.user_id.toString()
    try {
      const existingUser = await this.getFeedFromDb(userId)
      if(!existingUser) {
        log.info(`Deleting user that does not exist: ${userId}`)
        return { deleted: true }
      }
      await this.db.removeUser(userId)
      await this.slashtags.destroy(userId)
    } catch (err) {
      console.log(err)
      throw new Error(_err.failedDeleteUser)
    }

    return {
      deleted: true
    }
  }

  /**
   * @desc get user feed by key
   * @param {String} userId userId
   * @returns UserFeed object
   */
  async getFeedKey (userId) {
    let userFeed
    try {
      userFeed = await this.slashtags.feed(userId)
      if (!userFeed.key) throw new Err(_err.userNoFeed)
    } catch (err) {
      log.err(err)
      if (err instanceof Err) throw err
      throw new Err(_err.userNoFeed)
    }
    return {
      key: userFeed.key.toString('hex'),
      encryption_key: userFeed.encryptionKey.toString('hex')
    }
  }

  async getFeed (args) {
    try{
      const existingUser = await this.getFeedFromDb(args.user_id)
      if (!existingUser) {
        throw new Err(_err.feedNotFound)
      }
      return existingUser 
    } catch(err){
      throw new Err(_err.feedNotFound)
    }
  }

  async getFeedFromDb (userId) {
    const res = await this.db.findByUser(userId)
    if (!res) {
      return null
    }
    return {
      feed_key: res.feed_key,
      encrypt_key: res.encrypt_key
    }
  }

  /**
   * @desc Setup user's slashdrive with init values
   * @param {String} userId
   */
  async _initFeed (userId) {
    return Promise.all(this.feed_schema.wallets.map(async (w) => {
      await this.slashtags.update(userId, this._getWalletFeedKey(w.wallet_name), null)
    }))
  }

  _getWalletFeedKey (wname) {
    return `wallet/${wname}/amount`
  }

  async extCreateDrive(args){
    const key = "extCreateDrive"
    if(this.lock.has(key)){
      throw new Err(_err.processAlreadyRunning)
    }
    this.lock.set(key,Date.now())
    let res
    try{
      res = await this.createDrive(args)
    } catch(err){
      this.lock.delete(key)
      throw err
    }
    this.lock.delete(key)
    return res
  }

  /**
   * @desc Create a slashdrive for user. If a slashdrive exists, we just return the existing drive key.
   * @param {String} args.user_id
   * @returns {Object} feed_key
   */
  async createDrive (args) {
    if (!args?.user_id) throw new Err(_err.userIdMissing)
    if (typeof args.user_id !== "string") throw new Err(_err.useridNotString)
    if (!this.ready) throw new Err(_err.notReady)
    log.info(`Creating Slashdrive for ${args.user_id}`)

    const existingUser = await this.getFeedFromDb(args.user_id)
    if (existingUser) {
      throw new Err(_err.userExists)
    }

    const userId = args.user_id

    // Find or create the Slashdrive
    const userFeed = await this.getFeedKey(userId)

    // Init the feed with values
    try {
      await this._initFeed(userId, args.init_data)
    } catch (err) {
      console.log('FAILED_INIT_FEED', userId)
      console.log(err)
      throw new Err(_err.badSchemaSetup)
    }

    // Insert into database
    try {
      await this.db.insert({
        user_id: userId,
        feed_key: userFeed.key,
        encrypt_key: userFeed.encryption_key,
        meta: {}
      })
    } catch (err) {
      log.error(err)
      log.info('FAILED_TO_INSERT_INTO_DB', err)
      throw new Err(_err.failedCreateDrive)
    }
    log.info(`Finished creating new drive for ${userId}`)
    return { slashdrive: userFeed }
  }
}

module.exports = SlashtagsFeeds
