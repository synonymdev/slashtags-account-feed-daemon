const Hyperswarm = require('hyperswarm')
const Hyperdrive = require('Hyperdrive')
const Corestore = require('corestore')
const RAM = require('random-access-memory')
const Feeds = require('@synonymdev/feeds')
const path = require('path')

const remote = {
  "key": Buffer.from("9a3b244861b98f2b0cc04c354f53793fd6bb309e92e3a8be4a9e2c72b7c76441","hex"),
  "encryption_key": Buffer.from("8c6b35e753bd1cabc4d9fc752f85c6862bcdf350cb680580839174e48cd0c116","hex")
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
  const balance = (await drive.get("/feeds/wallet/Bitcoin/amount")).toString()
  console.log("Balance", balance)
  await swarm.destroy()

  process.exit(0)
}

main()