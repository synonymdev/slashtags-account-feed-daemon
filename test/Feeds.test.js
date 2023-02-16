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
      it('has slashtags properpty', () => assert.equal(feed.slashtags, null))
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
      afterEach(async function () {
        await feed.deleteUserFeed({ user_id: 'testUser' })
      })

      describe('user_id validation', () => {
        it('fails with out args', async () => assert.rejects(
          async () => feed.createFeed(),
          { ...error, message: Feeds.err.userIdMissing }
        ))
        it('fails with missing user_id', async () => assert.rejects(
          async () => feed.createFeed({}),
          { ...error, message: Feeds.err.userIdMissing }
        ))
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
        })
        after(() => {
          feed.getFeedFromDb = getFeedFromDb
          feed.ready = true
        })

        it('fails if slahstags is not ready', async () => assert.rejects(
          async () => feed.createFeed({ user_id: 'testUser' }),
          { ...error, message: Feeds.err.notReady }
        ))
      })

      describe('User already exist', () => {
        let getFeedFromDb
        before(() => {
          getFeedFromDb = feed.getFeedFromDb
          feed.getFeedFromDb = () => true
        })
        after(() => feed.getFeedFromDb = getFeedFromDb)

        it('fails with non string user_id', async () => assert.rejects(
          async () => feed.createFeed({ user_id: 'testUser' }),
          { ...error, message: Feeds.err.userExists }
        ))
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

          it('fails with no feed error',
            async () => assert.rejects(async () => feed.createFeed({ user_id: 'testUser' }), error)
          )
        })
        describe('Feed creation fails', () => {
          before(() => feed.slashtags.feed = () => { throw new Error('test') })

          it('fails with no feed error',
            async () => assert.rejects(async () => feed.createFeed({ user_id: 'testUser' }), error)
          )
        })
      })

      describe('Initializing feed', () => {
        let updateFeed
        before(() => {
          error.message = Feeds.err.badSchemaSetup
          updateFeed = feed.slashtags.update
        })
        after(() => feed.slashtags.update = updateFeed)

        describe('Feed update fails', () => {
          before(() => feed.slashtags.udpate = () => { throw new Error('test') })

          it('fails with no feed error', async function () {
            assert.rejects(async () => feed.createFeed({ user_id: 'testUser' }), error)
          })
        })
      })
    })
    //   slashtags.update
    //  insert in to db
  })

//  beforeEach(async () => {
//    await util.mkdir(dbconfig.path)
//    await util.mkdir(stConfig)
//    newFeed()
//  })
//
//  afterEach(async () => {
//    await util.delFolder(testDir)
//  })

//  describe('Create Drive', () => {
//    it('Should create a drive for user', async function () {
//      this.timeout(10000)
//      await stFeed.start()
//      assert(stFeed.ready)
//      const drive = await stFeed.createDrive({ user_id: '11111' })
//      assert(drive.slashdrive)
//    })
//
//    it('Should throw error if the new feed fails to get initialized', async function () {
//      this.timeout(10000)
//      await stFeed.start()
//      const userId = '111'
//      try {
//        stFeed.slashtags.update = async (userid, key, data) => {
//          throw new Error('FAILED TO UPDATE')
//        }
//        const drive = await stFeed.createDrive({ user_id: userId })
//      } catch (err) {
//        console.log(err)
//        assert(err.message === Feeds.err.badSchemaSetup)
//        return
//      }
//      fail()
//    })
//    it('Should throw error if the new feed fails to be saved to db', async function () {
//      this.timeout(50000)
//      await stFeed.start()
//      const userId = '111'
//      try {
//        stFeed.db.insert = async (userid, key, data) => {
//          throw new Error('FAILED TO INSERT')
//        }
//        const drive = await stFeed.createDrive({ user_id: userId })
//      } catch (err) {
//        assert(err.message === Feeds.err.failedCreateDrive)
//        return
//      }
//      fail()
//    })
//    it('Should create a drive', async function () {
//      this.timeout(50000)
//      await stFeed.start()
//      const userId = 'satoshi123'
//      const drive = await stFeed.createDrive({
//        user_id: userId
//      })
//      assert(drive.slashdrive)
//    })
//
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
//    it('Should return null if user has no feed in the db', async function () {
//      this.timeout(50000)
//      await stFeed.start()
//      const userId = 'asdasd'
//      const res = await stFeed.getFeedFromDb(userId)
//      assert(!res)
//    })
//
//    it('Should create feed and delete it from db', async function () {
//      this.timeout(50000)
//      await stFeed.start()
//      const userId = 'satoshi123xxx'
//      const drive = await stFeed.createDrive({ user_id: userId })
//      let dbUser = await stFeed.getFeedFromDb(userId)
//      assert(dbUser.feed_key)
//      assert(dbUser.encrypt_key)
//      const res = await stFeed.deleteUserFeed({ user_id : userId })
//      dbUser = await stFeed.getFeedFromDb(userId)
//      assert(!dbUser)
//    })
//  })
})
