const { strict: assert } = require('node:assert')
const SlashtagsFeeds = require('../src/Feeds.js')
const FeedDb = require('../src/FeedDb.js')
const path = require('path')
const fs = require('fs')
const Schema = require('../schemas/slashfeed.json')
const Feeds = require('@synonymdev/feeds')

describe('SlashtagsFeeds', () => {
  const validConfig = {
    db: {
      name: 'feed-db',
      path: path.resolve('./test-db')
    },
    feed_schema: { ...Schema },
    slashtags: path.resolve('./test-data/storage'),
  }
  const error = { name: 'Slashtags' }

  describe('Constructor', () => {
    describe('Valid config', () => {
      let feed
      before(() => feed = new SlashtagsFeeds(validConfig))

      it('has config', () => assert.deepStrictEqual(feed.config, validConfig))
      it('has db', () => assert.deepStrictEqual(feed.db, new FeedDb(validConfig.db)))
      it('has feed_schema', () => assert.deepStrictEqual(feed.feed_schema, validConfig.feed_schema))
      it('has lock', () => assert.deepStrictEqual(feed.lock, new Map()))
      it('has ready flag', () => assert.equal(feed.ready, false))
      it('has slashtags property', () => assert.equal(feed._slashfeeds, null))

      describe('it generates and overwrites slashfeed based on config', () => {
        let conf
        beforeEach(() => {
          conf = {
            ...JSON.parse(JSON.stringify(validConfig)),
            schemaConfig: {
              name: Schema.name,
              description: Schema.description,
              icons: JSON.parse(JSON.stringify(Schema.icons)),
              fields: Schema.fields.map(f => JSON.parse(JSON.stringify(f)))
            }
          }
        })

        describe('invalid schamaConfig', () => {
          describe('missing name', () => {
            beforeEach(() => {
              delete conf.schemaConfig.name
              error.message = SlashtagsFeeds.err.missingFeedName
            })

            it('throws an error', () => assert.throws(() => new SlashtagsFeeds(conf), error))
          })

          describe('missing description', () => {
            beforeEach(() => {
              delete conf.schemaConfig.description
              error.message = SlashtagsFeeds.err.missingFeedDescription
            })

            it('throws an error', () => assert.throws(() => new SlashtagsFeeds(conf), error))
          })

          describe('missing icons', () => {
            beforeEach(() => {
              delete conf.schemaConfig.icons
              error.message = SlashtagsFeeds.err.missingFeedIcons
            })

            it('throws an error', () => assert.throws(() => new SlashtagsFeeds(conf), error))
          })

          describe('missing fields', () => {
            beforeEach(() => {
              delete conf.schemaConfig.fields
              error.message = SlashtagsFeeds.err.missingFeedFields
            })

            it('throws an error', () => assert.throws(() => new SlashtagsFeeds(conf), error))
          })

          describe('fields are not array', () => {
            beforeEach(() => {
              conf.schemaConfig.fields = 'fields'
              error.message = SlashtagsFeeds.err.invalidFeedFields
            })

            it('throws an error', () => assert.throws(() => new SlashtagsFeeds(conf), error))
          })

          describe('invalid icon', () => {
            beforeEach(() => {
              conf.schemaConfig.icons['48'] = 'not an image'
              error.message = SlashtagsFeeds.err.invalidFeedIcon
            })

            it('throws an error', () => assert.throws(() => new SlashtagsFeeds(conf), error))
          })

          describe('invalid field', () => {
            describe('missing name', () => {
              beforeEach(() => {
                delete conf.schemaConfig.fields[0].name
                error.message = SlashtagsFeeds.err.missingFieldName
              })

              it('throws an error', () => assert.throws(() => new SlashtagsFeeds(conf), error))
            })

            describe('missing description', () => {
              beforeEach(() => {
                delete conf.schemaConfig.fields[1].description
                error.message = SlashtagsFeeds.err.missingFieldDescription
              })

              it('throws an error', () => assert.throws(() => new SlashtagsFeeds(conf), error))
            })

            describe('invalid type', () => {
              beforeEach(() => {
                conf.schemaConfig.fields[1].type = 'unsupported type'
                error.message = SlashtagsFeeds.err.badFieldType
              })

              it('throws an error', () => assert.throws(() => new SlashtagsFeeds(conf), error))
            })
          })
        })

        describe('valid config', () => {
          let instance
          beforeEach(() => instance = new SlashtagsFeeds(conf))

          it('uses new schema', () => assert.deepStrictEqual(
            instance.feed_schema,
            SlashtagsFeeds.generateSchema(conf)
          ))
          it('persists generated schema', () => assert.deepStrictEqual(
            instance.feed_schema,
            JSON.parse(fs.readFileSync(SlashtagsFeeds.DEFAULT_SCHEMA_PATH).toString('utf8'))
          ))
        })
      })
    })

    describe('Invalid config', () => {
      const invalidConfig = {
        db: {
          name: 'feed-db',
          path: path.resolve('./test-db')
        },
        feed_schema: { ...Schema },
        slashtags: path.resolve('./test-data/storage'),
      }

      //      TODO:
//      describe('Invalid feed schema', () => {
//        before(() => error.message = SlashtagsFeeds.err.invalidSchema)
//
//        const keys = [ 'image', 'name', 'feed_type', 'version' ]
//        keys.forEach((k) => {
//          let tmp
//          beforeEach(() => {
//            tmp = invalidConfig.feed_schema[k]
//            invalidConfig.feed_schema[k] = null
//          })
//          afterEach(() => invalidConfig.feed_schema[k] = tmp)
//
//          it(`fails without ${k}`, () => assert.throws(() => new SlashtagsFeeds(invalidConfig), error))
//        })
//      })

      describe('Missing slashtags', () => {
        before(() => error.message = SlashtagsFeeds.err.badConfig)

        let tmp
        beforeEach(() => {
          tmp = {...invalidConfig.slashtags }
          invalidConfig.slashtags = null
        })
        afterEach(() => invalidConfig.slashtags = tmp)

        it('fails without slashtags', () => assert.throws(() => new SlashtagsFeeds(invalidConfig), error))
      })
    })
  })

  describe('Start', () => {
    let feed
    before(() => feed = new SlashtagsFeeds(validConfig))

    describe('Failed to initialize data base', () => {
      let dbInit
      before(() => {
        error.message = SlashtagsFeeds.err.dbFailedStart
        dbInit = feed.db.init
        feed.db.init = () => { throw new Error('test') }
      })
      after(() => feed.db.init = dbInit)

      it('fails to start', async () => assert.rejects(async () => feed.start(), error))
      it('does not create slashtags instance', () => assert.equal(feed._slashfeeds, null))
      it('does not get ready', () => assert.equal(feed.ready, false))
    })

    describe('Successful start', () => {
      before(async () => await feed.start())
      after(async () => await feed.stop())

      it('inits db', () => assert(feed.db.db.ready, true))
      it('gets ready', () => assert.equal(feed.ready, true))
      it('creates slashtags instance', () => assert(feed._slashfeeds))
      it('uses provided storage', () => assert.deepEqual(feed._slashfeeds._storage, validConfig.slashtags))
      // TODO Write more slashtag checks
    })
  })

  describe('CreateFeed', () => {
    const input = { feed_id: 'testCreateFeed' }

    let feed
    before(() => feed = new SlashtagsFeeds(validConfig))

    describe('Process already running', () => {
      before(() => {
        feed.ready = true
        error.message = SlashtagsFeeds.err.processAlreadyRunning
      })
      after(() =>  feed.ready = false)

      beforeEach(() => feed.lock.set('createFeed', 'test'))
      afterEach(() => feed.lock.delete('createFeed'))

      it('fails', async () => assert.rejects(async () => feed.createFeed(input), error))
    })

    describe('Creating a drive', () => {
      before(async () => await feed.start())
      after(async function () {
        this.timeout(5000)
        await feed.stop()
      })

      describe('feed_id validation', () => {
        before(() => error.message = SlashtagsFeeds.err.feedIdMissing)

        it('fails with out args', async () => assert.rejects(async () => feed.createFeed(), error))
        it('fails with missing feed_id', async () => assert.rejects(async () => feed.createFeed({}), error))
        it('fails with non string feed_id', async () => assert.rejects(
          async () => feed.createFeed({ feed_id: 1 }),
          { ...error, message: SlashtagsFeeds.err.feedIdNotString }
        ))
      })

      describe('Slashtags is not ready', () => {
        let getFeedFromDb
        before(() => {
          getFeedFromDb = feed.getFeedFromDb
          feed.getFeedFromDb = () => true
          feed.ready = false
          error.message = SlashtagsFeeds.err.notReady
        })
        after(() => {
          feed.getFeedFromDb = getFeedFromDb
          feed.ready = true
        })

        it('fails if slahstags is not ready', async () => assert.rejects(async () => feed.createFeed(input), error))
      })

      describe('Feed already exist', () => {
        let getFeedFromDb
        before(() => {
          getFeedFromDb = feed.getFeedFromDb
          feed.getFeedFromDb = () => true
          error.message = SlashtagsFeeds.err.feedExists
        })
        after(() => feed.getFeedFromDb = getFeedFromDb)

        it('fails with non string feed_id', async () => assert.rejects(async () => feed.createFeed(input), error))
      })

      describe('Getting feed key', () => {
        let createFeed
        before(() => {
          error.message = SlashtagsFeeds.err.idNoFeed
          createFeed = feed._slashfeeds.feed
        })
        after(() => feed._slashfeeds.feed = createFeed)

        describe('Feed has no key', () => {
          before(() => feed._slashfeeds.feed = () => { return {} })

          it('fails with no feed error', async () => assert.rejects(async () => feed.createFeed(input), error))
        })

        describe('Feed creation fails', () => {
          before(() => feed._slashfeeds.feed = () => { throw new Error('test') })

          it('fails with no feed error', async () => assert.rejects(async () => feed.createFeed(input), error))
        })
      })

      describe('Initializing feed', () => {
        describe('Feed update fails', () => {
          let updateFeed
          before(() => {
            error.message = SlashtagsFeeds.err.badSchemaSetup
            updateFeed = feed._slashfeeds.update
            feed._slashfeeds.update = () => { throw new Error('test') }
          })
          after(() => feed._slashfeeds.update = updateFeed)

          it('fails with no feed error', async function () {
            this.timeout(5000)
            await assert.rejects(async () => feed.createFeed(input), error)
          })
        })

        describe('DB insert fails', () => {
          let insertFeed
          before(() => {
            error.message = SlashtagsFeeds.err.failedCreateDrive
            insertFeed = feed.db.insert
            feed.db.insert = () => { throw new Error('test') }
          })
          after(() => feed.db.insert = insertFeed)

          it('fails with no feed error', async function () {
            this.timeout(5000)
            await assert.rejects(async () => feed.createFeed(input), error)
          })
        })
      })

      describe('Successful feed initializaiton', () => {
        let res
        before(async function () {
          this.timeout(5000)
          res = await feed.createFeed(input)
        })

        after(async function () {
          this.timeout(5000)
          await feed.deleteFeed(input)
        })

        it('has slashdrive property', () => assert(res.slashdrive))
        describe('slashdrive property', () => {
          it('has key', () => assert(res.slashdrive.key))
          it('has encryption_key', () => assert(res.slashdrive.encryption_key))
          it('has url', () => assert(res.url))
        })
      })
    })
  })

  describe('deleteFeed', () => {
    const input = { feed_id: 'testDeleteFeed' }
    const success = { deleted: true }

    let feed
    before(async () => {
      feed = new SlashtagsFeeds(validConfig)
      await feed.start()
    })
    after(async function () {
      this.timeout(5000)
      await feed.stop()
    })

    describe('Calling delete feed before starting feed', () => {
      before(async function () {
        this.timeout(5000)
        await feed.stop()
        error.message = SlashtagsFeeds.err.notReady
      })

      after(async function () {
        this.timeout(5000)
        await feed.start()
      })

      it('fails', async () => assert.rejects(async () => feed.deleteFeed(), error))
    })

    describe('feed_id validation', () => {
      before(() => error.message = SlashtagsFeeds.err.feedIdMissing)

      it('fails with out args', async () => assert.rejects(async () => feed.deleteFeed(), error))
      it('fails with missing feed_id', async () => assert.rejects(async () => feed.deleteFeed({}), error))
      it('fails with non string feed_id', async () => assert.rejects(
        async () => feed.deleteFeed({ feed_id: 1 }),
        { ...error, message: SlashtagsFeeds.err.feedIdNotString }
      ))
    })

    describe('Feed does not exist in DB', () => {
      it('returns success', async () => assert.deepStrictEqual(await feed.deleteFeed(input), success))
    })

    describe('Error handling', () => {
      before(() => error.message = SlashtagsFeeds.err.failedDeleteFeed)

      describe('Feed lookup failed', () => {
        let getFeedFromDb
        before(() => {
          getFeedFromDb = feed.getFeedFromDb
          feed.getFeedFromDb = () => { throw new Error('test') }
        })
        after(() => feed.getFeedFromDb = getFeedFromDb)

        it('throws an error', async () => assert.rejects(async () => feed.deleteFeed(input), error))
      })

      describe('Feed removal from db failed', () => {
        let removeFeed
        let getFeedFromDb

        before(() => {
          getFeedFromDb = feed.getFeedFromDb
          removeFeed = feed.db.removeFeed

          feed.db.removeFeed = () => { throw new Error('test') }
          feed.getFeedFromDb = () => true
        })
        after(() => {
          feed.db.removeFeed = removeFeed
          feed.getFeedFromDb = getFeedFromDb
        })

        it('throws an error', async () => assert.rejects(async () => feed.deleteFeed(input), error))
      })

      describe('Feed removal from hypercore failed', () => {
        let destroy
        let getFeedFromDb

        before(() => {
          destroy = feed._slashfeeds.destroy
          getFeedFromDb = feed.getFeedFromDb

          feed._slashfeeds.destroy = () => { throw new Error('test') }
          feed.getFeedFromDb = () => true
        })
        after(() => {
          feed._slashfeeds.destroy = destroy
          feed.getFeedFromDb = getFeedFromDb
        })

        it('throws an error', async () => assert.rejects(async () => feed.deleteFeed(input), error))
      })
    })

    describe('Successful deletion', () => {
      let res
      before(async function () {
        this.timeout(5000)
        await feed.createFeed({ ...input, init_data: 11 })
        res = await feed.deleteFeed(input)
      })

      it('returns success', () => assert.deepStrictEqual(res, success))
      it('removes feed from db', async () => assert.equal(await feed.getFeedFromDb(input), null))
      describe('entry in hypercore', () => {
        let feedReader
        let res
        before(async function () {
          this.timeout(5000)
          await feed.stop()
          feedReader = new Feeds(validConfig.slashtags, validConfig.feed_schema)
          res = await feedReader.get(input.feed_id, `/bitcoin/main`)
        })

        after(async () => {
          await feedReader.close()
          await feed.start()
        })

        it('is removed', () => assert.equal(res, null))
      })
    })
  })

  describe('getFeed', () => {
    const input = { feed_id: 'testGetFeed' }

    let feed
    before(async () => {
      feed = new SlashtagsFeeds(validConfig)
      await feed.start()
    })
    after(async function () {
      this.timeout(5000)
      await feed.stop()
    })

    describe('Calling getFeed before starting feed', () => {
      before(async function () {
        this.timeout(5000)
        await feed.stop()
        error.message = SlashtagsFeeds.err.notReady
      })

      after(async function () {
        this.timeout(5000)
        await feed.start()
      })

      it('fails', async () => assert.rejects(async () => feed.getFeed(input), error))
    })

    describe('feed_id validation', () => {
      before(() => error.message = SlashtagsFeeds.err.feedIdMissing)

      it('fails with out args', async () => assert.rejects(async () => feed.getFeed(), error))
      it('fails with missing feed_id', async () => assert.rejects(async () => feed.getFeed({}), error))
      it('fails with non string feed_id', async () => assert.rejects(
        async () => feed.getFeed({ feed_id: 1 }),
        { ...error, message: SlashtagsFeeds.err.feedIdNotString }
      ))
    })


    describe('Error handling', () => {
      before(() => error.message = SlashtagsFeeds.err.feedNotFound)

      describe('Feed does not exist in DB', () => {
        it('throws an error', async () => assert.rejects(async () => feed.getFeed(input), error))
      })

      describe('Feed lookup failed', () => {
        let getFeedFromDb
        before(() => {
          getFeedFromDb = feed.getFeedFromDb
          feed.getFeedFromDb = () => { throw new Error('test') }
        })
        after(() => feed.getFeedFromDb = getFeedFromDb)

        it('throws an error', async () => assert.rejects(async () => feed.getFeed(input), error))
      })
    })

    describe('Successful retreival', () => {
      let readResult
      let createResult
      before(async function () {
        this.timeout(5000)

        createResult = await feed.createFeed(input)
        readResult = await feed.getFeed(input)
      })
      after(async () => await feed.deleteFeed(input))

      describe('feed_key', () => {
        it('has `feed_key`', () => assert(readResult.feed_key))
        it('is correct', () => assert.strictEqual(createResult.slashdrive.key, readResult.feed_key))
      })

      describe('encrypt_key', () => {
        it('has `encrypt_key`', () => assert(readResult.encrypt_key))
        it('is correct', () => assert.strictEqual(createResult.slashdrive.encryption_key, readResult.encrypt_key))
      })
    })
  })

  describe('updateFeedBalance', () => {
    const update = {
      feed_id: 'testUpdateFeed',
      fields: [
        {
          name: 'Bitcoin',
          value: 12,
        },
        {
          name: 'Bitcoin P/L',
          value: 1,
        }
      ]
    }

    let feed
    before(async () => {
      feed = new SlashtagsFeeds(validConfig)
      await feed.start()
    })
    after(async function () {
      this.timeout(5000)
      await feed.stop()
    })

    describe('Slashtags is not ready', () => {
      before(() => {
        feed.ready = false
        error.message = SlashtagsFeeds.err.notReady
      })
      after(() => feed.ready = true)

      it('fails if slahstags is not ready', async () => assert.rejects(async () => feed.updateFeedBalance(update), error))
    })

    describe('Input handling', () => {
      let input

      describe('feed_id is missing', () => {
        before(() => {
          input = { ...update, feed_id: undefined }
          error.message = SlashtagsFeeds.err.feedIdMissing
        })
        it('throws an error', async () => assert.rejects(async () => feed.updateFeedBalance(input), error))
      })

      describe('fields is missing', () => {
        before(() => {
          input = { ...update, fields: undefined }
          error.message = SlashtagsFeeds.err.missingFields
        })
        it('throws an error', async () => assert.rejects(async () => feed.updateFeedBalance(input), error))
      })

      describe('fields is not an array', () => {
        before(() => {
          input = { ...update, fields: 'fields' }
          error.message = SlashtagsFeeds.err.invalidFeedFields
        })
        it('throws an error', async () => assert.rejects(async () => feed.updateFeedBalance(input), error))
      })

      describe('fields is empty array', () => {
        before(() => {
          input = { ...update, fields: [] }
          error.message = SlashtagsFeeds.err.invalidFeedFields
        })
        it('throws an error', async () => assert.rejects(async () => feed.updateFeedBalance(input), error))
      })

      describe('field is missing name', () => {
        before(() => {
          input = { ...update, fields: [{ value: 1 }]}
          error.message = SlashtagsFeeds.err.missingFieldName
        })
        it('throws an error', async () => assert.rejects(async () => feed.updateFeedBalance(input), error))
      })

      describe('field is missing value', () => {
        before(() => {
          input = { ...update, fields: [{ name: 1 }]}
          error.message = SlashtagsFeeds.err.missingFieldValue
        })
        it('throws an error', async () => assert.rejects(async () => feed.updateFeedBalance(input), error))
      })
    })

    describe('Error handling', () => {
      describe('Feed does not exist', () => {
        before(() => {
          error.message = SlashtagsFeeds.err.feedNotExists
        })

        it('throws an error', async () => assert.rejects(
          async () => feed.updateFeedBalance({...update, feed_id: 'do_not_exist' }),
          error
        ))
      })

      describe('Feed exists but update faild', () => {
        let dbFind
        let updateFeed
        before(() => {
          error.message = SlashtagsFeeds.err.updateFeedFailed
          dbFind = feed.db.findByFeedId
          feed.db.findByFeedId = () => true
          updateFeed = feed._slashfeeds.update
          feed._slashfeeds.update = () => { throw new Error('update faild') }
        })
        after(() => {
          feed.db.findByFeedId = dbFind
          feed._slashfeeds.update = updateFeed
        })

        it('throws an error', async () => assert.rejects(
          async () => feed.updateFeedBalance({...update, feed_id: 'exist' }),
          error
        ))
      })
    })

    describe('Successful update', () => {
      let res
      before(async function() {
        this.timeout(5000)

        await feed.deleteFeed({ feed_id: update.feed_id })
        await feed.createFeed({ feed_id: update.feed_id })
        res = await feed.updateFeedBalance(update)
      })

      it('returns true', () => assert.deepStrictEqual(res, { updated: true }))
      describe('Reading feed', () => {
        let feedReader
        let balance
        let balanceChange
        before(async () => {
          await feed.stop()
          feedReader = new Feeds(validConfig.slashtags, validConfig.feed_schema)
          balance = await feedReader.get(update.feed_id, SlashtagsFeeds.getFileName(update.fields[0]))
          balanceChange = await feedReader.get(update.feed_id, SlashtagsFeeds.getFileName(update.fields[1]))
        })

        after(async () => {
          await feedReader.close()
          await feed.start()
          await feed.deleteFeed({ feed_id: update.feed_id })
        })

        it('returns correct balance', () => assert.equal(balance, update.fields[0].value))
        it('returns correct balance change', () => assert.deepStrictEqual(balanceChange, update.fields[1].value))
      })
    })
  })
})
