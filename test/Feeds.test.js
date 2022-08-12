/* eslint-env mocha */
'use strict'
const assert = require('assert')
const Feeds = require("../src/Feeds")
const util = require("./util")
const path = require('path');
const SlashtagsFeeds = require('../src/Feeds');
const Schema = require("../schemas/FeedSchema.json")
const Predefined = require("../schemas/Predefined.json")

const getSchema = ()=> JSON.parse(JSON.stringify(Schema))

const testDir = path.resolve("./test-data")
const dbconfig = {
  name : "user-db",
  path: path.resolve("./test-data/db")
}

const stConfig =  path.resolve("./test-data/storage")

function fail(){
  throw new Error("EXPECTED TO THROW")
}
let stFeed
function newFeed() {
  return stFeed = new Feeds({
    db: dbconfig,
    slashtags: stConfig,
    feed_schema: Schema
  })
}

function feedConfig (){
  return {
    db: dbconfig,
    slashtags: stConfig,
    feed_schema:  feedItems
  }
}

function createValidDrive(stFeed, userId){
  return stFeed.createDrive({
    user_id: userId,
    init_data: {
      "balance" : []
    }
  })
}

describe('Feeds ', () => {

  beforeEach(async ()=>{
    await util.mkdir(dbconfig.path)
    await util.mkdir(stConfig)
    newFeed()
  })

  afterEach(async ()=>{
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
    assert.deepEqual(stFeed.slashtags._storage,stConfig)
    assert.equal(stFeed.db.db.config,dbconfig)
    //TODO Write more slashtag checks
  })

  describe("Feed Schema",()=>{
    const args = [
      null,
      undefined,
      "asd",
      123123, 
      "{}",
      "[]",
      ()=>{
        const s = getSchema()
        s.definitions = null
        return { val : s, name : "broken definition" }
      },
      ()=>{
        const s = getSchema()
        s.properties.version = null
        return { val : s, name : "broken properties" }
      },
      ()=>{
        const s = getSchema()
        s.properties.balances = "asda"
        return { val : s, name : "broken balances" }
      }
    ]
    const fn = []
    
    args.map((value)=>{
      const testName = typeof value === "function" ? value().name : value
      const schema = typeof value === "function" ? value().val : value
      fn.push(
        it('Should fail when feed schema is '+ testName, async function () {
          this.timeout(5000)
          try{
            const stFeed = new Feeds({
              db: dbconfig,
              feed_schema:  schema,
              slashtags: stConfig,
            })
          } catch(err){
            assert(err.message === Feeds.err.invalidSchema)
            return
          }
          fail()
        })
      )
    })

    it('Should be succesful with value schema', async function () {
      this.timeout(5000)
      try{
        const stFeed = new Feeds({
          db: dbconfig,
          feed_schema:  getSchema(),
          slashtags: stConfig,
        })
      } catch(err){
        throw err
        return
      }
    })

  })


  it('Should fail when passing invalid configs', async function () {
    this.timeout(5000)
    try{
      const stFeed = new Feeds({
        db: dbconfig,
      })
    } catch(err){
      console.log(err)
      assert(err.message === Feeds.err.badConfig)
    }

    try{
      const stFeed = new Feeds({
        db: dbconfig,
      })
    } catch(err){
      assert(err.message === Feeds.err.badConfig)
    }
  })

  describe("Create Drive",()=>{
    it("Should fail to create drive, when no user id is passed", async function () {
      this.timeout(5000)
      await stFeed.start()
      assert(stFeed.ready)
      try {
        await stFeed.createDrive({})
      } catch(err){
        assert(err instanceof Feeds.Error)
        assert(err.message === SlashtagsFeeds.err.userIdMissing)
      }
    })

    it("Should create a drive for user", async function () {
      this.timeout(5000)
      await stFeed.start()
      assert(stFeed.ready)
      const drive = await stFeed.createDrive({ user_id: "11111", init_data: []})
      assert(drive.slashdrive)
    })

    it("Should fail to create drive if params arent valid", async function () {
      this.timeout(5000)
      await stFeed.start()
      try{
        await stFeed.createDrive()
      } catch(err){
        assert(err.message === Feeds.err.userIdMissing)
      }
    })

    it("Should fail to create drive if Feeds instance is not ready", async function () {
      this.timeout(5000)
      try{
        const drive = await stFeed.createDrive({ user_id:"111" })
      } catch(err){
        assert(err.message === Feeds.err.notReady)
      }
    })

    it("Should throw error if feed creation has failed", async function () {
      this.timeout(5000)
      await stFeed.start()
      const userId = "111"
      try{
        stFeed.slashtags.feed = (param)=>{
          assert(userId == param)
          throw new Error("TEST_MOCK_FAIL")
        }
        const drive = await stFeed.createDrive({ user_id: userId })
      } catch(err){
        assert(err.message === Feeds.err.failedCreateDrive)
        return
      }
      fail()
    })
    it("Should throw error if feed creation response is unexpected", async function () {
      this.timeout(5000)
      await stFeed.start()
      const userId = "111"
      try{
        stFeed.slashtags.feed = async (param)=>{
          return { }
        }
        const drive = await stFeed.createDrive({ user_id: userId })
      } catch(err){
        console.log(err.message)
        assert(err.message === Feeds.err.failedCreateDriveArgs)
        return
      }
      fail()

    })
    it("Should throw error if the new feed fails to get initialized", async function () {
      this.timeout(5000)
      await stFeed.start()
      const userId = "111"
      try{
        stFeed.slashtags.update = async (userid, key, data)=>{
          throw new Error("FAILED TO UPDATE")
        }
        const drive = await stFeed.createDrive({ user_id: userId })
      } catch(err){
        assert(err.message === Feeds.err.badSchemaSetup)
        return
      }
      fail()
    })
    it("Should throw error if the new feed fails to be saved to db", async function () {
      this.timeout(50000)
      await stFeed.start()
      const userId = "111"
      try{
        stFeed.db.insert = async (userid, key, data)=>{
          throw new Error("FAILED TO INSERT")
        }
        const drive = await stFeed.createDrive({ user_id: userId })
      } catch(err){
        assert(err.message === Feeds.err.failedCreateDrive)
        return
      }
      fail()
    })
    it("Should create a drive", async function () {
      this.timeout(50000)
      await stFeed.start()
      const userId = "satoshi123"
      const drive = await stFeed.createDrive({
        user_id: userId,
      })
      assert(drive.slashdrive)
    })

    it("Should create a drive and update it", async function () {
      this.timeout(50000)
      await stFeed.start()
      const userId = "satoshi123"
      const drive = await stFeed.createDrive({ user_id: userId })
      
      const res  = await stFeed.updateFeedBalance([
        {
          user_id: userId,
          wallet_name : Predefined.balances[0].wallet_name,
          amount : 1.5,
        }
      ])
      assert(res.includes(false) === false)
    })
  })

})
