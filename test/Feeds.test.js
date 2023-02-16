/* eslint-env mocha */
'use strict'
const assert = require('assert')
const Feeds = require('../src/Feeds')
const UserDb = require('../src/UserDb')
const util = require('../src/util')
const path = require('path')
const Schema = require('../schemas/slashfeed.json')

describe('Feeds ', () => {
  const validConfig = {
    db: {
      name: 'user-db',
      path: path.resolve('./test-db')
    },
    feed_schema: { ...Schema },
    slashtags: path.resolve('./test-data/storage'),
  }
  const error = { name: 'Slashtags' }

  describe('Constructor', () => {
    describe('Valid config', () => {
      let feed
      before(() => feed = new Feeds(validConfig))

      it('has config', () => assert.deepStrictEqual(feed.config, validConfig))
      it('has db', () => assert.deepStrictEqual(feed.db, new UserDb(validConfig.db)))
      it('has feed_schema', () => assert.deepStrictEqual(feed.feed_schema, validConfig.feed_schema))
      it('has lock', () => assert.deepStrictEqual(feed.lock, new Map()))
      it('has ready flag', () => assert.equal(feed.ready, false))
      it('has slashtags property', () => assert.equal(feed.slashtags, null))
    })

    describe('Invalid config', () => {
      const invalidConfig = {
        db: {
          name: 'user-db',
          path: path.resolve('./test-db')
        },
        feed_schema: { ...Schema },
        slashtags: path.resolve('./test-data/storage'),
      }

      describe('Invalid feed schema', () => {
        before(() => error.message = Feeds.err.invalidSchema)

        const keys = [ 'image', 'name', 'feed_type', 'version' ]
        keys.forEach((k) => {
          let tmp
          beforeEach(() => {
            tmp = invalidConfig.feed_schema[k]
            invalidConfig.feed_schema[k] = null
          })
          afterEach(() => invalidConfig.feed_schema[k] = tmp)

          it(`fails without ${k}`, () => assert.throws(() => new Feeds(invalidConfig), error))
        })
      })

      describe('Missing slashtags', () => {
        before(() => error.message = Feeds.err.badConfig)

        let tmp
        beforeEach(() => {
          tmp = {...invalidConfig.slashtags }
          invalidConfig.slashtags = null
        })
        afterEach(() => invalidConfig.slashtags = tmp)

        it('fails without slashtags', () => assert.throws(() => new Feeds(invalidConfig), error))
      })
    })
  })

  describe('Start', () => {
    let feed
    before(() => feed = new Feeds(validConfig))

    describe('Failed to initialize data base', () => {
      let dbInit
      before(() => {
        error.message = Feeds.err.dbFailedStart
        dbInit = feed.db.init
        feed.db.init = () => { throw new Error('test') }
      })
      after(() => feed.db.init = dbInit)

      it('fails to start', async () => assert.rejects(async () => feed.start(), error))
      it('does not create slashtags instance', () => assert.equal(feed.slashtags, null))
      it('does not get ready', () => assert.equal(feed.ready, false))
    })

    describe('Successfull start', () => {
      before(async () => await feed.start())
      after(async () => await feed.stop())

      it('inits db', () => assert(feed.db.db.ready, true))
      it('gets ready', () => assert.equal(feed.ready, true))
      it('creates slashtags instance', () => assert(feed.slashtags))
      it('uses provided storage', () => assert.deepEqual(feed.slashtags._storage, validConfig.slashtags))
      // TODO Write more slashtag checks
    })
  })

  describe('CreateFeed', () => {
    const input = { user_id: 'testCreateUser' }

    let feed
    before(() => feed = new Feeds(validConfig))

    describe('Process already running', () => {
      before(() => error.message = Feeds.err.processAlreadyRunning)

      beforeEach(() => feed.lock.set('createFeed', 'test'))
      afterEach(() => feed.lock.delete('createFeed'))

      // TODO: for extra safety make sure it fails without calling _createDrive?
      it('fails to start', () => assert.rejects(async () => feed.createFeed(), error))
    })

    describe('Creating a drive', () => {
      before(async () => await feed.start())
      after(async function () {
        this.timeout(5000)
        await feed.stop()
      })
      afterEach(async () => {
        // XXX check what does not releaser
        await feed.lock.delete('createFeed')
        await feed.deleteUserFeed(input)
      })

      describe('user_id validation', () => {
        before(() => error.message = Feeds.err.userIdMissing)

        it('fails with out args', async () => assert.rejects(async () => feed.createFeed(), error))
        it('fails with missing user_id', async () => assert.rejects(async () => feed.createFeed({}), error))
        it('fails with non string user_id', async () => assert.rejects(
          async () => feed.createFeed({ user_id: 1 }),
          { ...error, message: Feeds.err.useridNotString }
        ))
      })

      describe('Slashtags is not ready', () => {
        let getFeedFromDb
        before(() => {
          getFeedFromDb = feed.getFeedFromDb
          feed.getFeedFromDb = () => true
          feed.ready = false
          error.message = Feeds.err.notReady
        })
        after(() => {
          feed.getFeedFromDb = getFeedFromDb
          feed.ready = true
        })

        it('fails if slahstags is not ready', async () => assert.rejects(async () => feed.createFeed(input), error))
      })

      describe('User already exist', () => {
        let getFeedFromDb
        before(() => {
          getFeedFromDb = feed.getFeedFromDb
          feed.getFeedFromDb = () => true
          error.message = Feeds.err.userExists
        })
        after(() => feed.getFeedFromDb = getFeedFromDb)

        it('fails with non string user_id', async () => assert.rejects(async () => feed.createFeed(input), error))
      })

      describe('Getting feed key', () => {
        let createFeed
        before(() => {
          error.message = Feeds.err.userNoFeed
          createFeed = feed.slashtags.feed
        })
        after(() => feed.slashtags.feed = createFeed)

        describe('Feed has no key', () => {
          before(() => feed.slashtags.feed = () => { return {} })

          it('fails with no feed error', async () => assert.rejects(async () => feed.createFeed(input), error))
        })

        describe('Feed creation fails', () => {
          before(() => feed.slashtags.feed = () => { throw new Error('test') })

          it('fails with no feed error', async () => assert.rejects(async () => feed.createFeed(input), error))
        })
      })

      describe('Initializing feed', () => {
        describe('Feed update fails', () => {
          let updateFeed
          before(() => {
            error.message = Feeds.err.badSchemaSetup
            updateFeed = feed.slashtags.update
            feed.slashtags.udpate = () => { throw new Error('test') }
          })
          after(() => feed.slashtags.update = updateFeed)

          // fails on timeout with arrow syntax
          it('fails with no feed error', async function () {
            assert.rejects(async () => feed.createFeed(input), error)
          })
        })

        describe('DB insert fails', () => {
          let insertFeed
          before(() => {
            error.message = Feeds.err.failedCreateDrive
            insertFeed = feed.db.insert
            feed.slashtags.insert = () => { throw new Error('test') }
          })
          after(() => feed.db.insert = insertFeed)

          // fails on timeout with arrow syntax
          it('fails with no feed error', async () => {
            assert.rejects(async () => feed.createFeed(input), error)
          })
        })
      })

      describe('Successfull feed initializaiton', () => {
        let res
        before(async function () {
          this.timeout(5000)
          res = await feed.createFeed(input)
        })

        it('has slashdrive property', () => assert(res.slashdrive))
        describe('slashdrive property', () => {
          it('has key', () => assert(res.slashdrive.key))
          it('has encryption_key', () => assert(res.slashdrive.encryption_key))
        })
      })
    })
  })

  describe('deleteUserFeed', () => {
    const input = { user_id: 'testDeleteUser' }
    const success = { deleted: true }

    let feed
    before(async () => {
      feed = new Feeds(validConfig)
      await feed.start()
    })
    after(async function () {
      this.timeout(5000)
      await feed.stop()
    })

//    describe('Calling delete user before starting feed', () => {
//      beforeEach(async function () {
//        this.timeout(5000)
//        await feed.stop()
//        error.message = Feeds.err.notReady
//      })
//
//      it('fails with out args', async () => assert.rejects(async () => feed.deleteUserFeed(), error))
//
//    })

    describe('user_id validation', () => {
      before(() => error.message = Feeds.err.userIdMissing)

      it('fails with out args', async () => assert.rejects(async () => feed.deleteUserFeed(), error))
      it('fails with missing user_id', async () => assert.rejects(async () => feed.deleteUserFeed({}), error))
      it('fails with non string user_id', async () => assert.rejects(
        async () => feed.deleteUserFeed({ user_id: 1 }),
        { ...error, message: Feeds.err.useridNotString }
      ))
    })

    describe('User does not exist in DB', () => {
      it('returns success', async () => assert.deepStrictEqual(await feed.deleteUserFeed(input), success))
    })

    describe('Error handling', () => {
      before(() => error.message = Feeds.err.failedDeleteUser)

      describe('User lookup failed', () => {
        let getFeedFromDb
        before(() => {
          getFeedFromDb = feed.getFeedFromDb
          feed.getFeedFromDb = () => { throw new Error('test') }
        })
        after(() => feed.getFeedFromDb = getFeedFromDb)

        it('throws an error', async () => assert.rejects(async () => feed.deleteUserFeed(input), error))
      })

      describe('User removal from db failed', () => {
        let removeUser
        let getFeedFromDb

        before(() => {
          getFeedFromDb = feed.getFeedFromDb
          removeUser = feed.db.removeUser

          feed.db.removeUser = () => { throw new Error('test') }
          feed.getFeedFromDb = () => true
        })
        after(() => {
          feed.db.removeUser = removeUser
          feed.getFeedFromDb = getFeedFromDb
        })

        it('throws an error', async () => assert.rejects(async () => feed.deleteUserFeed(input), error))
      })

      describe('User removal from hypercore failed', () => {
        let destroy
        let getFeedFromDb

        before(() => {
          destroy = feed.slashtags.destroy
          getFeedFromDb = feed.getFeedFromDb

          feed.slashtags.destroy = () => { throw new Error('test') }
          feed.getFeedFromDb = () => true
        })
        after(() => {
          feed.slashtags.destroy = destroy
          feed.getFeedFromDb = getFeedFromDb
        })

        it('throws an error', async () => assert.rejects(async () => feed.deleteUserFeed(input), error))
      })
    })

    describe('Succesfull deletion', () => {
      before(async function () {
        this.timeout(5000)
        await feed.createFeed(input)
        await feed.getFeedFromDb(input)
      })

      it('returns success', async () => assert.deepStrictEqual(await feed.deleteUserFeed(input), success))
      it('removes user from db', async () => assert.equal(await feed.getFeedFromDb(input), null))
      // TODO: add lookup in hypercore directly
    })
  })

  describe('getFeed', () => {})

  describe('startFeedBroadcast', () => {})

  describe('updateFeedBalance', () => {})

//  describe('Create Drive', () => {
//    it('Should create a drive and update it and read it', async function () {
//      this.timeout(50000)
//      await stFeed.start()
//      const userId = 'satoshi123'
//      const drive = await stFeed.createDrive({ user_id: userId })
//      const wName = Schema.wallets[0].wallet_name
//      const bal = 1.5
//      const res = await stFeed.updateFeedBalance([
//        {
//          user_id: userId,
//          wallet_name: wName,
//          amount: bal
//        }
//      ])
//      assert(res.includes(false) === false)
//      await stFeed.slashtags.close()
//
//      const feedReader = new SlashtagsFeedsLib(stConfig, Schema)
//
//      const balance = await feedReader.get(userId, `wallet/${wName}/amount`)
//      assert(balance === bal)
//      await feedReader.close()
//    })
//
//    it('Should create a drive and broadcast it', async function () {
//      this.timeout(50000)
//      await stFeed.start()
//      const userId = 'satoshi123'
//      const userId2 = 'satoshixyz'
//      const [drive, drive2] = await Promise.all([
//        await stFeed.createDrive({ user_id: userId }),
//        await stFeed.createDrive({ user_id: userId2 })
//      ])
//      const b = await stFeed.startFeedBroadcast()
//      assert(b.feeds_started === 2)
//    })
//  })
//
//  describe('User Feed Database', () => {
//    it('Should return data if user has feed in the db', async function () {
//      this.timeout(50000)
//      await stFeed.start()
//      const userId = 'satoshi123xxx'
//      const drive = await stFeed.createDrive({ user_id: userId })
//      const res = await stFeed.getFeedFromDb(userId)
//      assert(typeof res.feed_key === 'string')
//      assert(typeof res.encrypt_key === 'string')
//    })
//
//  })
})
