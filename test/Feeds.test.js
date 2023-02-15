/* eslint-env mocha */
'use strict'
const assert = require('assert')
const Feeds = require('../src/Feeds')
const UserDb = require('../src/UserDb')
const util = require('../src/util')
const path = require('path')
const SlashtagsFeeds = require('../src/Feeds')
const Schema = require('../schemas/slashfeed.json')
const SlashtagsFeedsLib = require('@synonymdev/feeds')

const getSchema = () => JSON.parse(JSON.stringify(Schema))

const testDir = path.resolve('./test-data')
const dbconfig = {
  name: 'user-db',
  path: path.resolve('./test-data/db')
}

const stConfig = path.resolve('./test-data/storage')

function fail () {
  throw new Error('EXPECTED TO THROW')
}
let stFeed
function newFeed () {
  return stFeed = new Feeds({
    db: dbconfig,
    slashtags: stConfig,
    feed_schema: Schema
  })
}

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

  describe.only('Constructor', () => {
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
        const keys = [ 'image', 'name', 'feed_type', 'version' ]
        keys.forEach((k) => {
          let tmp
          beforeEach(() => {
            error.message = Feeds.err.invalidSchema
            tmp = invalidConfig.feed_schema[k]
            invalidConfig.feed_schema[k] = null
          })
          afterEach(() => invalidConfig.feed_schema[k] = tmp)

          it(`fails without ${k}`, () => assert.throws(() => new Feeds(invalidConfig), error))
        })
      })

      describe('Missing slashtags', () => {
        let tmp
        beforeEach(() => {
          error.message = Feeds.err.badConfig
          tmp = {...invalidConfig.slashtags }
          invalidConfig.slashtags = null
        })
        afterEach(() => invalidConfig.slashtags = tmp)

        it('fails without slashtags', () => assert.throws(() => new Feeds(invalidConfig), error))
      })
    })
  })

  describe('Start', () => {})

  beforeEach(async () => {
    await util.mkdir(dbconfig.path)
    await util.mkdir(stConfig)
    newFeed()
  })

  afterEach(async () => {
    await util.delFolder(testDir)
  })

  it('Should create instance of Slashtags, Db ', async function () {
    this.timeout(5000)
    assert(!stFeed.ready)
    assert(stFeed.db)
    assert(stFeed.config)
    await stFeed.start()
    assert(stFeed.ready)
    assert(stFeed.slashtags)
    assert.deepEqual(stFeed.slashtags._storage, stConfig)
    assert.equal(stFeed.db.db.config, dbconfig)
    // TODO Write more slashtag checks
  })

  describe('Create Drive', () => {
    it('Should fail to create drive, when no user id is passed', async function () {
      this.timeout(5000)
      await stFeed.start()
      assert(stFeed.ready)
      try {
        await stFeed.createDrive({})
      } catch (err) {
        assert(err instanceof Feeds.Error)
        assert(err.message === SlashtagsFeeds.err.userIdMissing)
      }
    })

    it('Should create a drive for user', async function () {
      this.timeout(10000)
      await stFeed.start()
      assert(stFeed.ready)
      const drive = await stFeed.createDrive({ user_id: '11111' })
      assert(drive.slashdrive)
    })

    it('Should fail to create drive if params arent valid', async function () {
      this.timeout(5000)
      await stFeed.start()
      try {
        await stFeed.createDrive()
      } catch (err) {
        assert(err.message === Feeds.err.userIdMissing)
      }
    })

    it('Should fail to create drive if Feeds instance is not ready', async function () {
      this.timeout(5000)
      try {
        const drive = await stFeed.createDrive({ user_id: '111' })
      } catch (err) {
        assert(err.message === Feeds.err.notReady)
      }
    })

    it('Should throw error if feed creation has failed', async function () {
      this.timeout(5000)
      await stFeed.start()
      const userId = '111'
      try {
        stFeed.slashtags.feed = (param) => {
          assert(userId == param)
          throw new Error('TEST_MOCK_FAIL')
        }
        const drive = await stFeed.createDrive({ user_id: userId })
      } catch (err) {
        assert(err.message === Feeds.err.userNoFeed)
        return
      }
      fail()
    })
    it('Should throw error if feed creation response is unexpected', async function () {
      this.timeout(5000)
      await stFeed.start()
      const userId = '111'
      try {
        stFeed.slashtags.feed = async (param) => {
          return { }
        }
        const drive = await stFeed.createDrive({ user_id: userId })
      } catch (err) {
        assert(err.message === Feeds.err.userNoFeed)
        return
      }
      fail()
    })
    it('Should throw error if the new feed fails to get initialized', async function () {
      this.timeout(10000)
      await stFeed.start()
      const userId = '111'
      try {
        stFeed.slashtags.update = async (userid, key, data) => {
          throw new Error('FAILED TO UPDATE')
        }
        const drive = await stFeed.createDrive({ user_id: userId })
      } catch (err) {
        console.log(err)
        assert(err.message === Feeds.err.badSchemaSetup)
        return
      }
      fail()
    })
    it('Should throw error if the new feed fails to be saved to db', async function () {
      this.timeout(50000)
      await stFeed.start()
      const userId = '111'
      try {
        stFeed.db.insert = async (userid, key, data) => {
          throw new Error('FAILED TO INSERT')
        }
        const drive = await stFeed.createDrive({ user_id: userId })
      } catch (err) {
        assert(err.message === Feeds.err.failedCreateDrive)
        return
      }
      fail()
    })
    it('Should create a drive', async function () {
      this.timeout(50000)
      await stFeed.start()
      const userId = 'satoshi123'
      const drive = await stFeed.createDrive({
        user_id: userId
      })
      assert(drive.slashdrive)
    })

    it('Should create a drive and update it and read it', async function () {
      this.timeout(50000)
      await stFeed.start()
      const userId = 'satoshi123'
      const drive = await stFeed.createDrive({ user_id: userId })
      const wName = Schema.wallets[0].wallet_name
      const bal = 1.5
      const res = await stFeed.updateFeedBalance([
        {
          user_id: userId,
          wallet_name: wName,
          amount: bal
        }
      ])
      assert(res.includes(false) === false)
      await stFeed.slashtags.close()

      const feedReader = new SlashtagsFeedsLib(stConfig, Schema)

      const balance = await feedReader.get(userId, `wallet/${wName}/amount`)
      assert(balance === bal)
      await feedReader.close()
    })

    it('Should create a drive and broadcast it', async function () {
      this.timeout(50000)
      await stFeed.start()
      const userId = 'satoshi123'
      const userId2 = 'satoshixyz'
      const [drive, drive2] = await Promise.all([
        await stFeed.createDrive({ user_id: userId }),
        await stFeed.createDrive({ user_id: userId2 })
      ])
      const b = await stFeed.startFeedBroadcast()
      assert(b.feeds_started === 2)
    })
  })

  describe('User Feed Database', () => {
    it('Should return data if user has feed in the db', async function () {
      this.timeout(50000)
      await stFeed.start()
      const userId = 'satoshi123xxx'
      const drive = await stFeed.createDrive({ user_id: userId })
      const res = await stFeed.getFeedFromDb(userId)
      assert(typeof res.feed_key === 'string')
      assert(typeof res.encrypt_key === 'string')
    })

    it('Should return null if user has no feed in the db', async function () {
      this.timeout(50000)
      await stFeed.start()
      const userId = 'asdasd'
      const res = await stFeed.getFeedFromDb(userId)
      assert(!res)
    })

    it('Should create feed and delete it from db', async function () {
      this.timeout(50000)
      await stFeed.start()
      const userId = 'satoshi123xxx'
      const drive = await stFeed.createDrive({ user_id: userId })
      let dbUser = await stFeed.getFeedFromDb(userId)
      assert(dbUser.feed_key)
      assert(dbUser.encrypt_key)
      const res = await stFeed.deleteUserFeed({ user_id : userId })
      dbUser = await stFeed.getFeedFromDb(userId)
      assert(!dbUser)
    })
  })
})
