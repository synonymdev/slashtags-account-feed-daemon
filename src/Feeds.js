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
  userNotExists: 'FAILED_TO_CREATE_USER_NOT_EXISTS',
  useridNotString: 'USER_ID_PARAM_NOT_STRING',
  processAlreadyRunning: 'PROCESS_ALREADY_RUNNING',
  feedNotFound: 'USER_FEED_NOT_FOUND',

  missingFeedName: 'MISSING_FEED_NAME',
  missingFeedDescription: 'MISSING_FEED_DESCRIPTION',
  missingFeedIcons: 'MISSING_FEED_ICONS',
  missingFeedFields: 'MISSING_FEED_FIELDS',
  invalidFeedIcon: 'INVALID_FEED_ICON',

  missingFields: 'MISSING_FIELDS',
  invalidFeedFields: 'INVALID_FEED_FIELDS',
  missingFieldName: 'MISSING_FIELD_NAME',
  missingFieldDescription: 'MISSING_FIELD_DESCRIPTION',
  badFieldType: 'UNSUPPORTED_FIELD_TYPE',
  missingFieldValue: 'MISSING_FIELD_VALUE',
  unknownField: 'UKNOWN_FIELD',
  invalidFieldValue: 'INVALID_FIELD_VALUE',
}

export default class SlashtagsFeeds {
  static err = _err
  static Error = Err

  static DEFAULT_SCHEMA_PATH = './schemas/slashfeed.json'
  static VALID_TYPES = [
    'number',
    'number-change',
    'utf-8',
  ]

  static validateSchemaConfig(schemaConfig) {
    if (!schemaConfig.name) throw new SlashtagsFeeds.Error(SlashtagsFeeds.err.missingFeedName)
    if (!schemaConfig.description) throw new SlashtagsFeeds.Error(SlashtagsFeeds.err.missingFeedDescription)
    if (!schemaConfig.icons) throw new SlashtagsFeeds.Error(SlashtagsFeeds.err.missingFeedIcons)
    if (!schemaConfig.fields) throw new SlashtagsFeeds.Error(SlashtagsFeeds.err.missingFeedFields)
    if (!Array.isArray(schemaConfig.fields)) throw new SlashtagsFeeds.Error(SlashtagsFeeds.err.invalidFeedFields)

    const imageRX = new RegExp('^data:image\/((svg\\+xml)|(png));base64,.+$')
    for (let size in schemaConfig.icons) {
      const icon = schemaConfig.icons[size]

      if (typeof icon !== 'string') throw new SlashtagsFeeds.Error(SlashtagsFeeds.err.invalidFeedIcon)
      if (!imageRX.test(icon)) throw new SlashtagsFeeds.Error(SlashtagsFeeds.err.invalidFeedIcon)
    }

    schemaConfig.fields.forEach((field) => {
      if (field.type && (field.type !== '') && !SlashtagsFeeds.VALID_TYPES.includes(field.type)) {
        throw new SlashtagsFeeds.Error(SlashtagsFeeds.err.badFieldType)
      }

      if(!field.name) throw new SlashtagsFeeds.Error(SlashtagsFeeds.err.missingFieldName)
      if(!field.description) throw new SlashtagsFeeds.Error(SlashtagsFeeds.err.missingFieldDescription)
    })
  }

  static generateSchema(config) {
    const { schemaConfig } = config
    SlashtagsFeeds.validateSchemaConfig(schemaConfig)

    const schema = {
      name: schemaConfig.name,
      description: schemaConfig.description,
      type: 'account_feed',
      version: '0.0.1',
      icons: {},
    }

    for (let size in schemaConfig.icons) {
      schema.icons[size] = schemaConfig.icons[size]
    }

    schema.fields = schemaConfig.fields.map((field) => {
      return {
        name: field.name,
        description: field.description,
        main: `/${field.name}/`,
        type: field.type || 'utf-8'
      }
    })

    fs.writeFileSync(this.DEFAULT_SCHEMA_PATH, schema, 'utf-8')

    return schema
  }

  /**
   * @param {String} config.db.name Database name
   * @param {String} config.db.path Database path location
   * @param {String} config.slashtags.path Feeds storage path location
   * @param {String} config.slashtags.key Feeds seed key
   */
  constructor (config) {
    // Either schema needs to provided or its configuration
    if (config.schemaConfig && !config.feed_schema) throw new Err(_.badConfig)
    if (!config.slashtags) throw new Err(_err.badConfig)

    let feedSchema
    if (config.feed_schema) {
      feedSchema = config.feed_schema
      SlashtagsFeeds.validateSchemaConfig(feedSchema)
    } else if (config.schemaConfig) {
      feedSchema = SlashtagsFeeds.generateSchema(config)
    }
    SlashtagsFeeds.validateSchemaConfig(feedSchema)

    this.config = config
    this.db = new UserDb(config.db)
    this.feed_schema = feedSchema
    this.ready = false
    this.slashtags = null
    this.lock = new Map()
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

    this.validateUpdate(update)

    const existingUser = await this.db.findByUser(update.user_id)
    if (!existingUser) throw new Err(_err.userNotExists)

    try {
      // NOTE: consider storing balance on db as well
      for (let field of update.fields) {
        await this.slashtags.update(
          update.user_id,
          `/${field.name}/`,
          field.value
        )

        // TODO: update not main
        // await this.slashtags.update(
        //   update.user_id,
        //   `${field.name}/${(new Date()).getTime()}`,
        //   field.value
        // )
      }
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
      // XXX: this needs to be atomic to prevent discrepancy between local DB and Hyperdrive
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
      // XXX should it be hex or base32
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
    return Promise.all(
      this.feed_schema.fields.map(
        async (field) => {
          await this.slashtags.update(
            args.user_id,
            `/${field.name}/main`,
            args.init_data || null
          )
        }
      )
    )
  }

  async createFeed (args) {
    if (!this.ready) throw new Err(_err.notReady)
    if (!args?.user_id) throw new Err(_err.userIdMissing)
    if (typeof args.user_id !== 'string') throw new Err(_err.useridNotString)

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
   * @desc Create a slashdrive for user. If a slashdrive exists, we just return the existing drive key.
   * @param {String} args.user_id
   * @returns {Object} feed_key
   */
  async _createDrive (args) {
    log.info(`Creating Slashdrive for ${args.user_id}`)

    const existingUser = await this.getFeedFromDb(args)
    if (existingUser) throw new Err(_err.userExists)

    const userFeed = await this.getFeedKey(args) // Find or create the Slashdrive

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
        user_id: args.user_id,
        feed_key: userFeed.key,
        encrypt_key: userFeed.encryption_key,
        meta: {}
      })
    } catch (err) {
      log.error(err)
      if (err instanceof Err) throw err
      throw new Err(_err.failedCreateDrive)
    }
    log.info(`Finished creating new drive for ${args.user_id}`)

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
        return this.slashtags.feed(user.user_id)
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

  validateUpdate(update) {
    if (!update.user_id) throw new Err(_err.userIdMissing)
    if (!update.fields) throw new Err(_err.missingFields)
    if (!Array.isArray(update.fields)) throw new Err(_err.invalidFeedFields)
    if (update.fields.length === 0) throw new Err(_err.invalidFeedFields)

    for (let field of update.fields) {
      this.validateFieldUpdate(field)
    }
  }

  validateFieldUpdate(field) {
    if (!field.name) throw new Err(_err.missingFieldName)
    if (!field.value) throw new Err(_err.missingFieldValue)

    const schemaField = this.feed_schema.fields.find((sF) => sF.name === field.name)
    if (!schemaField) throw new Err(_err.unknownField)

    if (schemaField.type === 'number-change') {
      if (!(field.value.value && field.value.change)) throw new Err(_err.invalidFieldValue)
    }
  }
}
