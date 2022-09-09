'use strict'

const async = require('async')
const Sqlite = require('./Sqlite')
const util = require('../src/util')

class AccountsDb {
  constructor (config) {
    if (!config?.path) {
      throw new Error('DB_PATH_NOT_SET')
    }
    this.config = config
  }

  async init () {
    await util.mkdir(this.config.path)
    this.db = new Sqlite(this.config)

    await this.db.start()
    await async.eachSeries([
      `CREATE TABLE IF NOT EXISTS slashtags_accounts (
            user_id VARCHAR(255) NOT NULL,
            slashtag_pub TEXT NOT NULL,
            state INT,
            meta TEXT,
            ts_created BIGINT,
            PRIMARY KEY (user_id)
          )`,
      'CREATE INDEX IF NOT EXISTS slashtags_ix1 ON slashtags_accounts (user_id)',
      'CREATE INDEX IF NOT EXISTS slashtags_ix2 ON slashtags_accounts (slashtag_pub)'
    ], (cmd, next) => {
      this.db.sqlite.run(cmd, next)
    })
  }

  findByUser (userId) {
    return new Promise((resolve, reject) => {
      this.db.sqlite.get(`SELECT * from slashtags_accounts WHERE user_id is "${userId}" and state = 1`, [], (err, data) => {
        if (err) {
          return reject(err)
        }
        if (!data) {
          return resolve(null)
        }
        data.meta = JSON.parse(data.meta)
        resolve(data)
      })
    })
  }

  findBySlashtag (key) {
    return new Promise((resolve, reject) => {
      this.db.sqlite.get(`SELECT * from slashtags_accounts WHERE slashtag_pub is "${key}" and state = 1`, [], (err, data) => {
        if (err) {
          return reject(err)
        }
        if (!data) {
          return resolve(null)
        }
        data.meta = JSON.parse(data.meta)
        resolve(data)
      })
    })
  }

  getAllActiveFeeds (userId) {
    return new Promise((resolve, reject) => {
      this.db.sqlite.all('SELECT * from slashtags_accounts WHERE state is 1', [], (err, data) => {
        if (err) {
          return reject(err)
        }
        if (!data) {
          return resolve(null)
        }
        resolve(data)
      })
    })
  }

  insert (data) {
    return new Promise((resolve, reject) => {
      this.db.sqlite.run(`INSERT OR ${data.replace ? 'REPLACE' : 'IGNORE'} INTO slashtags_accounts 
          (
            user_id,
            slashtag_pub,
            state,
            meta,
            ts_created
          ) VALUES 
          (
            $user_id,
            $slashtag_pub,
            $state,
            $meta,
            $ts_created
          )`, {
        $user_id: data.user_id,
        $slashtag_pub: data.slashtag_pub,
        $state: 1,
        $meta: JSON.stringify(data.meta),
        $ts_created: Date.now()
      }, (err, data) => {
        if (err) return reject(err)
        resolve(data)
      })
    })
  }

  removeUser (userId) {
    return new Promise((resolve, reject) => {
      this.db.sqlite.run(`UPDATE slashtags_accounts SET state = 0 WHERE user_id="${userId}" `, [], (err, data) => {
        if (err) {
          return reject(err)
        }
        resolve(data)
      })
    })
  }
}
module.exports = AccountsDb
