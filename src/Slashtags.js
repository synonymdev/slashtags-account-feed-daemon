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

  constructor (slashtagConfig) {
    const conf = { storage: slashtagConfig }
    const keyPath = path.join(slashtagConfig, 'primary-key')
    try {
      conf.primaryKey = readFileSync(keyPath)
    } catch (e) {
      log.err(e)
      log.info(`Generating new key, ${keyPath}`)
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

  async getFeed (feedId) {
    if (!this.ready) throw new Err('Slashtag is not ready')

    const slashtag = this.sdk.slashtag(feedId)
    const drive = slashtag.drivestore.get(feedId)
    await drive.ready()
    const { url } = slashtag

    const feedUrl = SlashURL.format(
      b4a.from(drive.key, 'hex'),
      {
        protocol: 'slashfeed:',
        fragment: { encryptionKey: z32.encode(b4a.from(drive.core.encryptionKey, 'hex')) }
      }
    )

    return { feedUrl, url, drive }
  }

  async updateFeed (feedId, key, value) {
    if (!this.ready) throw new Err('Slashtag is not ready')

    const { drive } = await this.getFeed(feedId)

    await drive.put(
      path.join(Slashtag.FEED_PREFIX, key),
      b4a.from(JSON.stringify(value))
    )
  }

  async readFeed (feedId, key) {
    if (!this.ready) throw new Err('Slashtag is not ready')

    const { drive } = await this.getFeed(feedId)
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

    const { drive } = await this.getFeed(feedId)

    await Promise.all(Array.from(drive.corestore.cores.values()).map(this._destroyCore.bind(this)))
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
