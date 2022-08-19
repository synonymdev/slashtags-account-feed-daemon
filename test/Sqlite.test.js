/* eslint-env mocha */
'use strict'
const assert = require('assert')
const path = require('path')
const Sqlite = require('../src/Sqlite')
const util = require('../src/util')

describe('Sqlite', () => {
  it('Should create instance sqlite db and delete it', async () => {
    const dbpath = path.resolve("./test-db")
    await util.mkdir(dbpath)
    const sqlite = new Sqlite({
      path: dbpath,
      name: `test-${util.rnd()}-db`
    })
    assert(sqlite.ready === false)
    await sqlite.start()
    assert(sqlite.ready === true)
    await sqlite.deleteSqlite()
  })

  it('Should fail to init db when name is missing', async () => {
    try {
      const sqlite = new Sqlite({})
    } catch (err) {
      assert(err instanceof Sqlite.Error)
      assert(Sqlite.err.dbNameMissing)
    }
  })

  it('Should fail to delete db if not ready', async () => {
    try {
      const sqlite = new Sqlite({})
      sqlite.deleteSqlite()
    } catch (err) {
      assert(err instanceof Sqlite.Error)
      assert(Sqlite.err.notReady)
    }
  })
})
