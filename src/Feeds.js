const b4a = require('b4a')
const z32 = require('z32')

const Feeds = require('@synonymdev/feeds')
const FeedDb = require('./FeedDb.js')

const SlashtagsSchema = require('./SlashtagsSchema.js')
const Log = require('./Log.js')
const customErr = require('./CustomError.js')

const log = Log('core')
const Err = customErr({ errName: 'Slashtags', fileName: __filename })

const _err = {
  notReady: 'SLASHTAGS_NOT_READY',
  dbFailedStart: 'FAILED_TO_START_DB',
  feedIdMissing: 'FEED_ID_NOT_PASSED',
  failedCreateDrive: 'FAILED_TO_CREATE_FEED_FEED',
  badConfig: 'BAD_CONSTRUCTOR_CONFIG',
  badSchemaSetup: 'FEED_SCHEMA_FAILED',
  updateFeedFailed: 'FAILED_TO_UPDATE_FEED',
  idNoFeed: 'FEED_ID_HAS_NO_FEED',
  failedDeleteFeed: 'FAILED_FEED_DELETE',
  failedGettingActiveFeeds: 'FAILED_GETTING_ACTIVE_FEEDS',
  failedBroadcast: 'FAILED_BROADCAST',
  feedExists: 'FAILED_TO_CREATE_FEED_EXISTS',
  feedNotExists: 'FAILED_TO_CREATE_FEED_NOT_EXISTS',
  feedIdNotString: 'FEED_ID_PARAM_NOT_STRING',
  processAlreadyRunning: 'PROCESS_ALREADY_RUNNING',
  feedNotFound: 'FEED_FEED_NOT_FOUND',

  missingFields: 'MISSING_FIELDS',
  invalidFeedFields: 'INVALID_FEED_FIELDS',
  missingFieldName: 'MISSING_FIELD_NAME',
  missingFieldValue: 'MISSING_FIELD_VALUE',
  unknownField: 'UKNOWN_FIELD',
}

module.exports = class SlashtagsFeeds {
  static err = _err
  static Error = Err

  /**
   * @param {String} config.db.name Database name
   * @param {String} config.db.path Database path location
   * @param {String} config.slashtags.path Feeds storage path location
   * @param {String} config.slashtags.key Feeds seed key
   */
  constructor (config) {
    // Either schema needs to provided or its configuration
    if (config.schemaConfig && !config.feed_schema) throw new Err(_err.badConfig)
    if (!config.slashtags) throw new Err(_err.badConfig)

    let feedSchema
    if (config.schemaConfig) {
      feedSchema = SlashtagsSchema.generateSchema(config.schemaConfig)
      SlashtagsSchema.persistSchema(feedSchema)
    } else if (config.feed_schema) {
      feedSchema = config.feed_schema
    }
    SlashtagsSchema.validateSchemaConfig(feedSchema)

    this.config = config
    this.db = new FeedDb(config.db)
    this.feed_schema = feedSchema
    this.ready = false
    this._slashfeeds = null
    this.lock = new Map()
  }

  async start () {
    try {
      await this.db.init()
    } catch (err) {
      log.err(err)
      throw new Err(_err.dbFailedStart)
    }
    this._slashfeeds = new Feeds(this.config.slashtags, this.feed_schema)
    this.ready = true
  }

  async stop () {
    await this._slashfeeds.close()
    this.ready = false
  }

  /**
   * @desc Update feed balance
   * @param {Array} updates Array of updates
   * @param {String} updates[].feed_id feed id to update
   * FIXME
   * @param {Object} updates[].wallet_name feed id to update
   * @param {Object} updates[].amount amount
   */
  async updateFeed (update) {
    if (!this.ready) throw new Err(_err.notReady)

    this.validateUpdate(update)

    const existingFeed = await this.db.findByFeedId(update.feed_id)
    if (!existingFeed) throw new Err(_err.feedNotExists)

    try {
      // NOTE: consider storing balance on db as well
      for (const field of update.fields) {
        await this._slashfeeds.update(update.feed_id, SlashtagsSchema.getFileName(field.name), field.value)
      }
      return { updated: true }
    } catch (err) {
      log.err(err)
      if (err instanceof Err) throw err
      throw new Err(_err.updateFeedFailed)
    }
  }

  async deleteFeed (args) {
    if (!this.ready) throw new Err(_err.notReady)
    if (!args?.feed_id) throw new Err(_err.feedIdMissing)
    if (typeof args.feed_id !== 'string') throw new Err(_err.feedIdNotString)

    const feedId = args.feed_id
    try {
      const existingFeed = await this.getFeedFromDb(args)
      if (!existingFeed) {
        log.info(`Deleting feed that does not exist: ${feedId}`)
        return { deleted: true }
      }
      // XXX: this needs to be atomic to prevent discrepancy between local DB and Hyperdrive
      await this.db.removeFeed(feedId)
      await this._slashfeeds.destroy(feedId)
    } catch (err) {
      log.err(err)
      if (err instanceof Err) throw err
      throw new Err(_err.failedDeleteFeed)
    }

    return { deleted: true }
  }

  /**
   * @desc get feed by key
   * @param {String} feedId feedId
   * @returns FeedFeed object
   */
  async getFeedKey (args) {
    if (!this.ready) throw new Err(_err.notReady)
    if (!args.feed_id) throw new Err(_err.feedIdMissing)
    if (typeof args.feed_id !== 'string') throw new Err(_err.feedIdNotString)
    let feed
    try {
      feed = await this._slashfeeds.feed(args.feed_id)
      if (!feed.key) throw new Err(_err.idNoFeed)
    } catch (err) {
      log.err(err)
      if (err instanceof Err) throw err
      throw new Err(_err.idNoFeed)
    }
    return {
      // XXX should it be hex or base32
      key: feed.key.toString('hex'),
      encryption_key: feed.encryptionKey.toString('hex')
    }
  }

  async getFeed (args) {
    if (!this.ready) throw new Err(_err.notReady)
    if (!args?.feed_id) throw new Err(_err.feedIdMissing)
    if (typeof args.feed_id !== 'string') throw new Err(_err.feedIdNotString)

    try {
      const existingFeed = await this.getFeedFromDb(args)
      if (!existingFeed) throw new Err(_err.feedNotFound)
      return existingFeed
    } catch (err) {
      log.err(err)
      if (err instanceof Err) throw err
      throw new Err(_err.feedNotFound)
    }
  }

  async getFeedFromDb (args) {
    if (!this.ready) throw new Err(_err.notReady)
    if (!args.feed_id) throw new Err(_err.feedIdMissing)
    if (typeof args.feed_id !== 'string') throw new Err(_err.feedIdNotString)

    const res = await this.db.findByFeedId(args.feed_id)
    if (!res) return null

    const { format } = await import('@synonymdev/slashtags-url')
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
   * @desc Setup feed's slashdrive with init values
   * @param {String} feedId
   */
  async _initFeed (args) {
    for (let field in this.feed_schema.fields) {
      for (let fieldName in this.feed_schema.fields[field]) {
        await this._slashfeeds.update(
          args.feed_id,
          SlashtagsSchema.getFileName(fieldName),
          args.init_data || null
        )
      }
    }
  }

  async createFeed (args) {
    if (!this.ready) throw new Err(_err.notReady)
    if (!args?.feed_id) throw new Err(_err.feedIdMissing)
    if (typeof args.feed_id !== 'string') throw new Err(_err.feedIdNotString)

    const key = 'createFeed'
    if (this.lock.has(key)) throw new Err(_err.processAlreadyRunning)
    this.lock.set(key, Date.now())

    try {
      return await this._createDrive(args)
    } catch (err) {
      log.error(err)
      if (err instanceof Err) throw err
      throw new Error(_err.failedCreateDrive)
    } finally {
      this.lock.delete(key)
    }
  }

  /**
   * @desc Create a slashdrive for feed. If a slashdrive exists, we just return the existing drive key.
   * @param {String} args.feed_id
   * @returns {Object} feed_key
   */
  async _createDrive (args) {
    log.info(`Creating Slashdrive for ${args.feed_id}`)

    const existingFeed = await this.getFeedFromDb(args)
    if (existingFeed) throw new Err(_err.feedExists)

    const feed = await this.getFeedKey(args) // Find or create the Slashdrive

    // XXX: this needs to be atomic to prevent discrepancy between local DB and Hyperdrive
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
        feed_id: args.feed_id,
        feed_key: feed.key,
        encrypt_key: feed.encryption_key,
        meta: {}
      })
    } catch (err) {
      log.error(err)
      if (err instanceof Err) throw err
      throw new Err(_err.failedCreateDrive)
    }
    log.info(`Finished creating new drive for ${args.feed_id}`)

    const { format } = await import('@synonymdev/slashtags-url')
    const url = format(
      b4a.from(feed.key, 'hex'),
      {
        protocol: 'slashfeed:',
        fragment: { encryptionKey: z32.encode(b4a.from(feed.encryption_key, 'hex')) }
      }
    )

    return {
      url,
      slashdrive: feed
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
      res = await Promise.all(feeds.map((feed) => {
        return this._slashfeeds.feed(feed.feed_id)
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

  validateUpdate (update) {
    if (!update.feed_id) throw new Err(_err.feedIdMissing)
    if (!update.fields) throw new Err(_err.missingFields)
    if (!Array.isArray(update.fields)) throw new Err(_err.invalidFeedFields)
    if (update.fields.length === 0) throw new Err(_err.invalidFeedFields)

    const { validateFieldsValues } = require(
      `${__dirname}/schemaTypes/${this.snakeToCamel(this._slashfeeds.type || 'exchange_account_feed')}.js`
    )

    for (let field of update.fields) {
      if (!field.name) throw new Err(_err.missingFieldName)
    }

    for (let field of update.fields) {
      if (!field.value) throw new Err(_err.missingFieldValue)
    }

    validateFieldsValues(update.fields, this.feed_schema.fields)
  }

  snakeToCamel (str) {
    return str.toLowerCase().replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''))
  }
}
