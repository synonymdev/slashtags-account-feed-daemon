import { __filename } from './util.js'
import Feeds from '@synonymdev/feeds'
import UserDb from './UserDb.js'

import { format } from '@synonymdev/slashtags-url'
import b4a from 'b4a'
import z32 from 'z32'

import Log from './Log.js'
import customErr from './CustomError.js'

const log = Log('core')
const Err = customErr({ errName: 'Slashtags', fileName: __filename() })

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
  userNotExists: 'FAILED_TO_CREATE_USER_EXISTS',
  useridNotString: 'USER_ID_PARAM_NOT_STRING',
  processAlreadyRunning: 'PROCESS_ALREADY_RUNNING',
  feedNotFound: 'USER_FEED_NOT_FOUND'
}

export default class SlashtagsFeeds {
  static err = _err
  static Error = Err

  /**
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

    const keys = ['image', 'name', 'feed_type', 'version']
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
    this.slashtags = new Feeds(this.config.slashtags, this.feed_schema)
    // TODO: check if "writing" flag exists and fail if so
    // NOTE: check with new slashtags instance but using different data-dir to exclude os level locks
    // create writing flag otherwise
    // add stop method to remove writing flag
    this.ready = true
  }

  async stop () {
    await this.slashtags.close()
    this.ready = false
  }

  /**
   * @desc Update feed balance
   * @param {Array} updates Array of updates
   * @param {String} updates[].user_id user id to update
   * @param {Object} updates[].wallet_name user id to update
   * @param {Object} updates[].amount amount
   */
  async updateFeedBalance (update) {
    if (!this.ready) throw new Err(_err.notReady)
    try {
      if (typeof update.wallet_name !== 'string' || typeof update.user_id !== 'string') throw new Err(_err.badUpdateParam)
      if (Number.isNaN(+update.amount)) throw new Err(_err.badUpdateParam)

      const existingUser = await this.db.findByUser(update.user_id)
      if (!existingUser) throw new Err(this.err.userNotExists)

      // NOTE: consider storing balance on db as well
      // TODO: this might be changed after generalizing slashfeed.json
      // XXX wallet is part of the schema which is not enforced in updateFeedBalance
      await this.slashtags.update(update.user_id, this._getWalletFeedKey(update.wallet_name), update.amount)
      return { updated: true }
    } catch (err) {
      log.err(err)
      if (err instanceof Err) throw err
      throw new Err(_err.updateFeedFailed)
    }
  }

  async deleteUserFeed (args) {
    if (!this.ready) throw new Err(_err.notReady)
    if (!args?.user_id) throw new Err(_err.userIdMissing)
    if (typeof args.user_id !== 'string') throw new Err(_err.useridNotString)

    const userId = args.user_id
    try {
      const existingUser = await this.getFeedFromDb(args)
      if (!existingUser) {
        log.info(`Deleting user that does not exist: ${userId}`)
        return { deleted: true }
      }
      // TODO: this needs to be atomic to prevent discrepancy between local DB and Hyperdrive
      await this.db.removeUser(userId)
      await this.slashtags.destroy(userId)
    } catch (err) {
      log.err(err)
      if (err instanceof Err) throw err
      throw new Err(_err.failedDeleteUser)
    }

    return { deleted: true }
  }

  /**
   * @desc get user feed by key
   * @param {String} userId userId
   * @returns UserFeed object
   */
  async getFeedKey (args) {
    if (!this.ready) throw new Err(_err.notReady)
    if (!args.user_id) throw new Err(_err.userIdMissing)
    if (typeof args.user_id !== 'string') throw new Err(_err.useridNotString)
    let userFeed
    try {
      userFeed = await this.slashtags.feed(args.user_id)
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
    if (!this.ready) throw new Err(_err.notReady)
    if (!args?.user_id) throw new Err(_err.userIdMissing)
    if (typeof args.user_id !== 'string') throw new Err(_err.useridNotString)

    try {
      const existingUser = await this.getFeedFromDb(args)
      if (!existingUser) throw new Err(_err.feedNotFound)
      return existingUser
    } catch (err) {
      log.err(err)
      if (err instanceof Err) throw err
      throw new Err(_err.feedNotFound)
    }
  }

  async getFeedFromDb (args) {
    if (!this.ready) throw new Err(_err.notReady)
    if (!args.user_id) throw new Err(_err.userIdMissing)
    if (typeof args.user_id !== 'string') throw new Err(_err.useridNotString)

    const res = await this.db.findByUser(args.user_id)
    if (!res) return null

    const url = format(
      b4a.from(res.feed_key, 'hex'),
      {
        protocol: 'slashfeed:',
        fragment: { encryptionKey: z32.encode(b4a.from(res.encrypt_key, 'hex')) }
      }
    )

    return {
      url,
      feed_key: res.feed_key,
      encrypt_key: res.encrypt_key
    }
  }

  /**
   * @desc Setup user's slashdrive with init values
   * @param {String} userId
   */
  async _initFeed (args) {
    if (!args?.user_id) throw new Err(_err.userIdMissing)
    if (typeof args.user_id !== 'string') throw new Err(_err.useridNotString)
    // XXX wallet is part of the schema which is not enforced in updateFeedBalance
    return Promise.all(this.feed_schema.wallets.map(async (w) => {
      await this.slashtags.update(args.user_id, this._getWalletFeedKey(w.wallet_name), args.init_data || null)
    }))
  }

  _getWalletFeedKey (wname) {
    return `wallet/${wname}/amount`
  }

  async createFeed (args) {
    if (!this.ready) throw new Err(_err.notReady)
    if (!args?.user_id) throw new Err(_err.userIdMissing)
    if (typeof args.user_id !== 'string') throw new Err(_err.useridNotString)

    const key = 'createFeed'
    if (this.lock.has(key)) throw new Err(_err.processAlreadyRunning)

    this.lock.set(key, Date.now())
    let res
    try {
      res = await this._createDrive(args)
    } catch (err) {
      this.lock.delete(key)
      log.error(err)
      if (err instanceof Err) throw err
      throw new Error(_err.failedCreateDrive)
    }
    this.lock.delete(key)

    return res
  }

  /**
   * @desc Create a slashdrive for user. If a slashdrive exists, we just return the existing drive key.
   * @param {String} args.user_id
   * @returns {Object} feed_key
   */
  async _createDrive (args) {
    if (!args?.user_id) throw new Err(_err.userIdMissing)
    if (typeof args.user_id !== 'string') throw new Err(_err.useridNotString)
    if (!this.ready) throw new Err(_err.notReady)
    log.info(`Creating Slashdrive for ${args.user_id}`)

    const existingUser = await this.getFeedFromDb(args)
    if (existingUser) throw new Err(_err.userExists)

    const userId = args.user_id
    const userFeed = await this.getFeedKey(args) // Find or create the Slashdrive

    // TODO: this needs to be atomic to prevent discrepancy between local DB and Hyperdrive
    try {
      await this._initFeed(args)
    } catch (err) {
      log.err(err)
      if (err instanceof Err) throw err
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
      if (err instanceof Err) throw err
      throw new Err(_err.failedCreateDrive)
    }
    log.info(`Finished creating new drive for ${userId}`)

    const url = format(
      b4a.from(userFeed.key, 'hex'),
      {
        protocol: 'slashfeed:',
        fragment: { encryptionKey: z32.encode(b4a.from(userFeed.encryption_key, 'hex')) }
      }
    )

    return {
      url,
      slashdrive: userFeed
    }
  }

  async startFeedBroadcast () {
    let feeds
    try {
      feeds = await this.db.getAllActiveFeeds()
    } catch (err) {
      log.error(err)
      if (err instanceof Err) throw err
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
      log.error(err)
      if (err instanceof Err) throw err
      throw new Error(_err.failedBroadcast)
    }
    return {
      feeds_started: res.length
    }
  }
}
