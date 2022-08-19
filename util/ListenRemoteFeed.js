const Hyperswarm = require('hyperswarm')
const Hyperdrive = require('Hyperdrive')
const Corestore = require('corestore')
const RAM = require('random-access-memory')
const Feeds = require('@synonymdev/feeds')

const remote = {
  key: Buffer.from('8082faa5718fada58c0690a9e2dc4a3d9c3211f23ba9af03297e37704ffc6bfb', 'hex'),
  encryption_key: Buffer.from('8c6b35e753bd1cabc4d9fc752f85c6862bcdf350cb680580839174e48cd0c116', 'hex')
}

async function main () {
  const swarm = new Hyperswarm()
  const corestore = new Corestore(RAM)
  swarm.on('connection', (socket) => corestore.replicate(socket))
  const drive = new Hyperdrive(corestore, remote.key, {
    encryptionKey: remote.encryption_key
  })
  await drive.ready()
  console.log('Drive is ready')
  swarm.join(drive.discoveryKey, { client: true, server: false })

  await swarm.flush()
  console.log('Swarming')
  const done = drive.findingPeers()
  swarm.flush().then(done, done)
  await drive.update()

  console.log('Fetching header of feed')
  const result = (await drive.get(Feeds.HEADER_PATH))
  console.log(result)
  console.log('Header')
  console.log(JSON.stringify(JSON.parse(result), null, 2))
  console.log('Starting to poll feed: ')
  setInterval(async () => {
    const balance = (await drive.get('/feed/wallet/Bitcoin/amount'))
    console.log('\n\n Bitcoin Balance', balance.toString())
  }, 2000)
}

main()
