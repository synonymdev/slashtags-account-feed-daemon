'use strict'
const assert = require('assert')
const path = require('path')
const Sqlite = require('../src/Sqlite')
const util = require('../src/util')

describe('Sqlite', () => {
  const ERROR_NAME = 'SQLITE_ERROR:'

  describe('Constructor', () => {
    it('fails to init db without config', () => assert.throws(
      () => new Sqlite(),
      { name: ERROR_NAME, message: Sqlite.err.configMissing }
    ))
    it('fails to init db without config.name', () => assert.throws(
      () => new Sqlite({}),
      { name: ERROR_NAME, message: Sqlite.err.dbNameMissing }
    ))
    it('fails to init db without config.path', () => assert.throws(
      () => new Sqlite({ name: `test-${util.rnd()}-db` }),
      { name: ERROR_NAME, message: Sqlite.err.dbPathMissing }
    ))
  })

  describe('Instance', () => {
    let config

    before(async () => {
      let dbPath = path.resolve("./test-db")
      await util.mkdir(dbPath)
      config = {
        path: dbPath,
        name: `test-${util.rnd()}-db`
      }
    })

    describe('new instance', () => {
      let sqlite
      before(() => sqlite = new Sqlite(config))

      describe('properties', () => {
        it('has config property', () => assert.deepEqual(sqlite.config, config))
        it('has default version', () => assert.equal(sqlite.version, '0.0.1'))
        it('is not ready', () => assert.equal(sqlite.ready, false))
        it('is has path', () => assert(sqlite.dbPath.includes(config.path.toString())))
        it('accepts custom version', () => assert.equal((new Sqlite({ ...config, version: 'xxx'})).version, 'xxx'))
      })

      describe('not ready db', () => {
        it('is not ready', () => assert.equal(sqlite.ready, false))
        it('fails to delete db if not ready', () => assert.throws(
          () => sqlite.deleteSqlite(),
          { name: ERROR_NAME, message: Sqlite.err.notReady }
        ))
      })

      describe('ready db', () => {
        before(async () => await sqlite.start())
        it('is ready', () => assert(sqlite.ready))
        it('deletes db', async () => sqlite.deleteSqlite())
      })
    })
  })
})
