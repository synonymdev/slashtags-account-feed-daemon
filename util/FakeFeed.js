const Feeds = require("../src/Feeds")
const Schema = require("../schemas/slashfeed.json")
const config = require("./config.json")
const path = require("path")

const stConfig =  path.resolve("./fake-data/storage")
const dbconfig = {
  name : "fake-db",
  path: path.resolve("./fake-data/db")
}


function randomBal(){
  return (Math.random() * (2 - 0.0001) + 0.0001).toFixed(5);
}

async function main(config){
  console.log(`Feeds will be updated every ${config.timer} milisec`)

  async function updateFeeds(){
    const users = config.user_id
     await Promise.all(users.map(async (userId)=>{
      console.log("Updating feed: ", userId)
      const amount = randomBal()
      const res  = await stFeed.updateFeedBalance([
        {
          user_id: userId,
          wallet_name : "Bitcoin",
          amount,
        }
      ])
      console.log(`Bitcoin balance : `,userId, amount)
      return res
    }))
  }

  const stFeed = new Feeds({
    db: dbconfig,
    slashtags: stConfig,
    feed_schema: Schema
  })
  console.log("Starting feeds")
  await stFeed.start()

  const uf = await Promise.all(config.user_id.map((uid)=>{
    console.log("Starting user feed: ", uid)
    return stFeed.slashtags.feed(uid, {
      announce: true
    })
  }))

  console.log("User Feeds Running")

  const timer = setInterval(()=>{
    console.log("Starting to update...")
    updateFeeds()
  }, config.timer)
}

main(config)