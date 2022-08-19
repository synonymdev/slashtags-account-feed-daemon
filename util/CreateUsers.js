const Feeds = require("../src/Feeds")
const config = require("./config.json")
const path = require('path');
const Schema = require("../schemas/slashfeed.json")
const util = require("../src/util")

const stConfig =  path.resolve("./fake-data/storage")
const dbconfig = {
  name : "fake-db",
  path: path.resolve("./fake-data/db")
}


async function main(config){
  await util.mkdir(dbconfig.path)
  await util.mkdir(stConfig)
  stFeed = new Feeds({
    db: dbconfig,
    slashtags: stConfig,
    feed_schema: Schema
  })
  console.log("Starting drive")
  await stFeed.start()


  const res = await Promise.all(config.user_id.map(async (uid)=>{
    console.log("Creating drive for :", uid)
    const feed = await stFeed.createDrive({
      user_id: uid,
    })
    return [
      uid, feed
    ]
  }))
  console.log(JSON.stringify(res,null,2))
  console.log("Finished")
  process.exit(0)
}

main(config)