import { strict as assert } from 'node:assert';
import path from 'path'
import { SlashURL } from '@synonymdev/slashtags-sdk'

import Slashtag from '../src/Slashtags.js'

describe('Slashtag', () => {
  const slashtagConfig = path.resolve('./test-data/storage')

  describe('constructor', () => {
    let slashtag
    before(() => slashtag = new Slashtag(slashtagConfig))
    after(async function () {
      this.timeout(5000)
      await slashtag.stop()
    })

    it('has sdk property', () => assert(slashtag.sdk))
    it('is closed', () => assert(slashtag.closed))
    it('assigns slashtag property to null', () => assert.equal(slashtag.slashtag, null))
  })

  describe('instance', () => {
    let slashtag
    before(async function () {
      this.timeout(5000)
      slashtag = new Slashtag(slashtagConfig)
      await slashtag.start()
    })
    after(async function () {
      this.timeout(5000)
      await slashtag.stop()
    })

    describe('start', () => {
      it('makes instance ready', () => assert(slashtag.ready))
    })

    describe('getFeed', () => {
      let feed
      before(async () => feed = await slashtag.getFeed('testFeedId'))

      it('has drive', () => assert(feed.drive))
      it('has feedUrl', () => assert(feed.feedUrl))

      describe('feedUrl', () => {
        let parsed
        before(() => parsed = SlashURL.parse(feed.feedUrl))

        it('has slashfeed protocol', () => assert.equal(parsed.protocol, 'slashfeed:'))
        it('has key', () => assert(parsed.key))
        it('has id', () => assert(parsed.id))
        it('has empty path', () => assert.equal(parsed.path, ''))
        it('has empty query', () => assert.deepStrictEqual(parsed.query, {}))
        it('has encryptionKey', () => assert(parsed.privateQuery.encryptionKey))
      })

      describe('url', () => {
        let parsed
        before(() => parsed = SlashURL.parse(feed.url))

        it('has slash protocol', () => assert.equal(parsed.protocol, 'slash:'))
        it('has key', () => assert(parsed.key))
        it('has id', () => assert(parsed.id))
        it('has empty path', () => assert.equal(parsed.path, ''))
        it('has empty query', () => assert.deepStrictEqual(parsed.query, {}))
        it('has no private query', () => assert.deepStrictEqual(parsed.privateQuery, {}))
      })
    })

    describe('updateFeed', () => {
      it('puts data to drive', async () => assert.equal(await slashtag.updateFeed('testFeedId', 'foo', 'bar'), undefined))
    })

    describe('readFeed', () => {
      let res
      describe('Reading data by existing key', () => {
        before(async () => res = await slashtag.readFeed('testFeedId', 'foo'))

        it('returns correct value', () => assert.equal(res, 'bar'))
      })

      describe('Reading data by non existing key', () => {
        before(async () => res = await slashtag.readFeed('testFeedId', 'foobar'))

        it('returns null', () => assert.equal(res, null))
      })
    })

    describe('destroyFeed', () => {
      before(async () => await slashtag.destroyFeed('testFeedId'))

      it('makes feed unreadable', async() => assert.equal(await slashtag.readFeed('testFeedId', 'foo'), null))
    })
  })
})
