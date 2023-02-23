import { strict as assert } from 'node:assert';
import path from 'path'
import { SlashURL } from '@synonymdev/slashtags-sdk'
import { readFileSync } from 'fs'

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
      const feedId = 'testGetFeed'
      before(async function () {
        this.timeout(10000)
        feed = await slashtag.getFeed(feedId)
      })

      it('has batch', () => assert(feed.batch))
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

        describe('Reading by feedURL', () => {
          let content
          let res
          before(async function () {
            this.timeout(10000)
            res = await Slashtag.openDrive(feed.feedUrl)
            content = await Slashtag.readFromDrive(res.drive, Slashtag.HEADER_PATH)
          })

          after(async function() {
            this.timeout(10000)
            await Slashtag.closeDrive(res)
          })

          it('reads feed', () => assert.deepStrictEqual(
            JSON.parse(content),
            JSON.parse(readFileSync('./schemas/slashfeed.json', 'utf8')))
          )
        })
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

    describe('getFeed (transactional)', () => {
      describe('before flush', () => {
        const feedId = 'testFeedIdTransactionalUnflushed'
        let content
        let res
        before(async function () {
          this.timeout(10000)
          let feed = await slashtag.getFeed(feedId, { transactional: true })
          res = await Slashtag.openDrive(feed.feedUrl)
          content = await Slashtag.readFromDrive(res.drive, Slashtag.HEADER_PATH)
        })

        after(async function() {
          this.timeout(10000)
          await Slashtag.closeDrive(res)
        })

        it('fails to read feed', () => assert.equal(content, null))
      })

      describe('after flush', () => {
        let content
        let res
        const feedId = 'testFeedIdTransactionalFlushed'
        before(async function () {
          this.timeout(10000)
          let feed = await slashtag.getFeed(feedId, { transactional: true })
          await feed.batch.flush()

          res = await Slashtag.openDrive(feed.feedUrl)
          content = await Slashtag.readFromDrive(res.drive, Slashtag.HEADER_PATH)
        })

        after(async function() {
          this.timeout(10000)
          await Slashtag.closeDrive(res)
          await slashtag.destroyFeed(feedId)
        })

        it('reads feed', () => assert.deepStrictEqual(
          JSON.parse(content),
          JSON.parse(readFileSync('./schemas/slashfeed.json', 'utf8')))
        )
      })

      describe('destroy batch', () => {
        let content
        let res
        const feedId = 'testFeedIdTransactionalDestroyed'
        before(async function () {
          this.timeout(10000)
          let feed = await slashtag.getFeed(feedId, { transactional: true })
          await feed.batch.destroy()

          res = await Slashtag.openDrive(feed.feedUrl)
          content = await Slashtag.readFromDrive(res.drive, Slashtag.HEADER_PATH)
        })

        after(async function() {
          this.timeout(10000)
          await Slashtag.closeDrive(res)
        })

        it('fails to read feed', () => assert.equal(content, null))
      })
    })

    describe('updateFeed', () => {
      let res
      const feedId = 'testFeedIdUpdate'
      let content
      before(async function() {
        this.timeout(10000)
        await slashtag.getFeed(feedId)
        res = await slashtag.updateFeed(feedId, 'foo', 'bar')
        content = await slashtag.readFeed(feedId, 'foo')
      })

      after(async function () {
        this.timeout(10000)
        await slashtag.destroyFeed(feedId)
      })

      it('returns batch', () => assert(res.batch))
      it('updates content', () => assert.equal(content, 'bar'))
    })

    describe('updateFeed (transactional)', () => {
      describe('before flush', () => {
        let content
        const feedId = 'testFeedIdTransactionalUpdateUnflushed'
        before(async function () {
          this.timeout(10000)
          await slashtag.getFeed(feedId)
          await slashtag.updateFeed(feedId, 'foo', 'bar', { transactional: true })

          content = await slashtag.readFeed(feedId, 'foo')
        })

        it('fails to read feed', () => assert.equal(content, null))
      })

      describe('after flush', () => {
        let content
        const feedId = 'testFeedIdTransactionalUpdateFlushed'
        before(async function () {
          this.timeout(10000)
          await slashtag.getFeed(feedId)
          const { batch } = await slashtag.updateFeed(feedId, 'foo', 'bar', { transactional: true })
          await batch.flush()

          content = await slashtag.readFeed(feedId, 'foo')
        })

        after(async function() {
          this.timeout(10000)
          await slashtag.destroyFeed(feedId)
        })

        it('reads feed', () => assert.equal(content, 'bar'))
      })

      describe('destroy batch', () => {
        let content
        const feedId = 'testFeedIdTransactionalUpdateDestroyed'
        before(async function () {
          this.timeout(10000)
          await slashtag.getFeed(feedId)
          const { batch } = await slashtag.updateFeed(feedId, 'foo', 'bar', { transactional: true })
          console.log('calling destroy')
          await batch.destroy()
          console.log('called destroy')

          content = await slashtag.readFeed(feedId, 'foo')
        })

        it('fails to read feed', () => assert.equal(content, null))
      })
    })

    describe('readFeed', () => {
      let res
      describe('Reading data by existing key', () => {
        const feedId = 'testFeedIdReadFeed'
        before(async function () {
          this.timeout(10000)
          await slashtag.getFeed(feedId)
          await slashtag.updateFeed(feedId, 'foo', 'bar')
          res = await slashtag.readFeed(feedId, 'foo')
        })

        it('returns correct value', () => assert.equal(res, 'bar'))
      })

      describe('Reading data by non existing key', () => {
        const feedId = 'testFeedIdReadFeed'
        before(async () => res = await slashtag.readFeed(feedId, 'foobar'))

        it('returns null', () => assert.equal(res, null))
      })
    })

    describe.skip('destroyFeed', () => {
      const destroyedFeedId = 'destroyedFeedId'
      const untoucedFeedId = 'untoucedFeedId'
      before(async function () {
        this.timeout(10000)
        await slashtag._getDrive(untoucedFeedId)
        await slashtag.updateFeed(untoucedFeedId, 'tar', 'zar')

        await slashtag._getDrive(destroyedFeedId)
        await slashtag.updateFeed(destroyedFeedId, 'foo', 'bar')

        await slashtag.destroyFeed(destroyedFeedId)
      })

      it('makes deleted feed unreadable', async() => assert.equal(await slashtag.readFeed(destroyedFeedId, 'foo'), null))
      it('does not affect other feeds', async() => assert.equal(await slashtag.readFeed(untoucedFeedId, 'tar'), 'zar'))
    })
  })
})
