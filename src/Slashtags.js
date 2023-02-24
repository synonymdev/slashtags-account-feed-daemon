// import Corestore from 'corestore'
import { __filename } from './util.js'
import { SDK, SlashURL } from '@synonymdev/slashtags-sdk'
import { readFileSync } from 'fs'
import { rm } from 'node:fs/promises'
import path from 'path'
import b4a from 'b4a'
import z32 from 'z32'

import Log from './Log.js'
import customErr from './CustomError.js'

const log = Log('core')
const Err = customErr({ errName: 'Slashtags', fileName: __filename() })

export default class Slashtag {
  static FEED_PREFIX = '/feed'
  static HEADER_PATH = '/slashfeed.json'

  static async openDrive(url) {
    const sdk = new SDK()
    await sdk.ready()

    let parsed
    try {
      parsed = SlashURL.parse(url)
    } catch (e) {
      log.err(e)
      throw new Err('FAILED_TO_OPEN_DRIVE_BAD_URL')
    }
    const key = parsed.key
    const encryptionKey =
      typeof parsed.privateQuery.encryptionKey === 'string'
        ? SlashURL.decode(parsed.privateQuery.encryptionKey)
        : undefined
    const drive = sdk.drive(key, { encryptionKey })
    await drive.ready()

    return { sdk, drive }
  }

  static async closeDrive({ sdk, drive }) {
    await drive.close()
    await sdk.close()
  }

  static async readFromDrive(drive, path) {
    if (!drive) throw new Err('FAILED_TO_READ_BAD_DRIVE')
    if (!path) throw new Err('FAILED_TO_READ_BAD_PATH')

    const res = await drive.get(path)
    if (!res) return null

    return JSON.parse(b4a.toString(res))
  }

  static getFeedUrl(drive) {
    return SlashURL.format(
      b4a.from(drive.key, 'hex'),
      {
        protocol: 'slashfeed:',
        fragment: { encryptionKey: z32.encode(b4a.from(drive.core.encryptionKey, 'hex')) }
      }
    )
  }

  constructor (slashtagPath, slashfeedPath = './schemas/slashfeed.json') {
    const conf = { storage: slashtagPath }
    const keyPath = path.join(slashtagPath, 'primary-key')
    try {
      conf.primaryKey = readFileSync(keyPath)
    } catch (e) {
      log.err(e)
      log.info(`Generating new key, ${keyPath}`)
    }

    try {
      this.header = readFileSync(slashfeedPath, 'utf8')
    } catch (e) {
      log.err(e)
      throw new Err('FAILED_TO_READ_SLAHSFEED_FILE')
    }

    this.sdk = new SDK(conf)

    this.slashtag = null
    this.closed = true
  }

  async start () {
    await this.sdk.ready()
    this.ready = true
  }

  async stop () {
    this.sdk.close()
    this.ready = false
  }

  async getFeed (feedId, opts = { transactional: false }) {
    if (!this.ready) throw new Err('Slashtag is not ready')

    const { slashtag, drive } = await this._getDrive(feedId)
    await this.sdk.swarm.join(drive.discoveryKey, { server: true, client: false }).flushed()

    const feedUrl = Slashtag.getFeedUrl(drive)
    const { url } = slashtag

    let batch = drive
    if (opts.transactional) {
      batch = drive.batch()
      // HACK hyperdrive batch has no destroy
      batch.destroy = () => { this.destroyFeed.bind(this)(feedId) }
    }

    try {
      // XXX: this will be always overwriting existing slashfeed.json
      await batch.put(Slashtag.HEADER_PATH, b4a.from(JSON.stringify(this.header)))
    } catch (e) {
      log.err(e)
      await batch.destroy()
      throw new Err('FAILED_TO_STORE_SLASHFEED_FILE')
    }

    return {
      feedUrl,
      url,
      batch,
      key: batch.key.toString('hex'),
      encryptionKey: batch.core.encryptionKey.toString('hex')
    }
  }

  async updateFeed (feedId, key, value, opts = { transactional: false }) {
    if (!this.ready) throw new Err('Slashtag is not ready')

    const { drive } = await this._getDrive(feedId)

    let batch = drive
    if (opts.transactional) {
      batch = drive.batch()
      // HACK hyperdrive batch has no destroy
      batch.destroy = async () => { await batch.del.call(batch, key) }
    }

    try {
      await batch.put(
        path.join(Slashtag.FEED_PREFIX, key),
        b4a.from(JSON.stringify(value))
      )
    } catch (e) {
      log.err(e)
      await batch.destroy()
      throw new Err('FAILED_TO_UPDATE_FEED')
    }

    return { batch }
  }

  async readFeed (feedId, key) {
    if (!this.ready) throw new Err('Slashtag is not ready')

    const { drive } = await this._getDrive(feedId)
    const block = await drive.get(path.join(Slashtag.FEED_PREFIX, key))

    try {
      return JSON.parse((block?.toString()) || null)
    } catch (e) {
      log.err(e)
      throw new Err('FAILED_TO_PARSE_FEED')
    }
  }

  async destroyFeed (feedId) {
    if (!this.ready) throw new Err('Slashtag is not ready')

    const { drive } = await this._getDrive(feedId)
    //const cores = Array.from(drive.corestore.cores.values()) // destroys everything
    const cores = [drive.core, drive.blobs.core] // destroys too little

    await Promise.all(cores.map(this._destroyCore.bind(this)))
  }

  async _getDrive(feedId) {
    // TODO: create new corestore for each slashtag and pass it
    // XXX hack pass path in config
    //const corestore = new Corestore(`./tmp_${feedId}`)
    // XXX sdk's slashtag does not accept corestore other than supplied to sdk instance
    const slashtag = this.sdk.slashtag(feedId)
    const drive = slashtag.drivestore.get(feedId)
    await drive.ready()

    return { slashtag, drive }
  }

  async _destroyCore (core) {
    const id = core.discoveryKey.toString('hex')

    const dir = path.join(
      this.sdk.storage,
      'cores',
      id.slice(0, 2),
      id.slice(2, 4),
      id
    )

    try {
      await core.close()
      await rm(dir, { recursive: true, force: true })
    } catch (e) {
      throw new Err('FAILED_TO_DESTROY_FEED')
    }
  }
}
