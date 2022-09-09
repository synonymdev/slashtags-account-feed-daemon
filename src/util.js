
const { randomBytes } = require('crypto')
const fs = require('fs/promises')


const util = {}
util.accountsClient = async function (config) {
  const {default: SDK} = await import("@synonymdev/slashtags-sdk")
  const {default: Slashtag} = await import("@synonymdev/slashtag")
  const { Client } = await import ('@synonymdev/slashtags-auth')
  if (!config.secret) throw new Error('secret is missing')
  const sdk = new SDK({ primaryKey: config.secret, relay: config.relay })

  const slashtag = new Slashtag()
  const client = new Client(slashtag)
  return client

  // // Authorize an app by scanning a slashauth: url
  // const response = client.authz(config.url)
  // // true or false

  // // Request a magicLink from the server's slashtag url
  // const link = client.magiclik(url)
}

util.delFile = function delFile (file) {
  return fs.unlink(file)
}

util.delFolder = function delFolder (f) {
  return fs.rm(f, {
    recursive: true,
    force: true
  })
}

util.mkdir = function (f) {
  return fs.mkdir(f, { recursive: true })
}

util.rnd = function rnd () {
  return randomBytes(32).toString('hex')
}

module.exports = util
