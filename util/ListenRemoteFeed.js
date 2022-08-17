const Hyperswarm = require('hyperswarm')
const Hyperdrive = require('Hyperdrive')
const Corestore = require('corestore')
const RAM = require('random-access-memory')
const Feeds = require('@synonymdev/feeds')
const path = require('path')

const remote = {
  "key": Buffer.from("","hex"),
  "encryption_key": Buffer.from("","hex")
}

const stConfig =  path.resolve("./fake-data/remote-data")

async function main(){

  const swarm = new Hyperswarm()
  const corestore = new Corestore(RAM)
  swarm.on('connection', (socket) => corestore.replicate(socket))
  const drive = new Hyperdrive(corestore, remote.key, {
    encryptionKey: remote.encryption_key
  })
  await drive.ready()
  swarm.join(drive.discoveryKey, { client: true, server: false })

  await swarm.flush()
  const d = await drive.findingPeers()
  await drive.update()

  console.log("Fetching header of feed")
  const result = (await drive.get(Feeds.HEADER_PATH)).toString()
  console.log("Header")
  console.log(JSON.stringify(JSON.parse(result),null,2))
  console.log("Starting to poll feed: ")
  setInterval(async ()=>{
    const balance = (await drive.get("/feed/wallet/Bitcoin/amount"))
    console.log("\n\n Bitcoin Balance", balance.toString())
  },2000)
}

main()