'use strict'

const async = require('async')
const Sqlite = require('./Sqlite')
const util = require('./util')
const {randomUUID} = require("crypto")

class AccountsAuditDb {
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
      `CREATE TABLE IF NOT EXISTS slashtags_accounts_audit (
            id VARCHAR(255),
            user_id VARCHAR(255),
            public_key TEXT NOT NULL,
            state INT NOT NULL,
            login_token VARCHAR(255) NOT NULL,
            login_ts INT NOT NULL,
            meta TEXT NOT NULL,
            PRIMARY KEY (id)
          )`,
      'CREATE INDEX IF NOT EXISTS slashtags_ix1 ON slashtags_accounts_audit (user_id)',
      'CREATE INDEX IF NOT EXISTS slashtags_ix2 ON slashtags_accounts_audit (public_key)'
    ], (cmd, next) => {
      this.db.sqlite.run(cmd, next)
    })
  }

  insert (data) {
    if(!data.user_id || !data.public_key || !data.state || !data.login_token) {
      throw new Error("INVALID_DATA_PASSED")
    }
    return new Promise((resolve, reject) => {
      this.db.sqlite.run(`INSERT OR ${data.replace ? 'REPLACE' : 'IGNORE'} INTO slashtags_accounts_audit 
          (
            id,
            user_id,
            public_key,
            state,
            login_ts,
            login_token,
            meta
          ) VALUES 
          (
            $id,
            $user_id,
            $public_key,
            $state,
            $login_ts,
            $login_token,
            $meta
          )`, {
        $id: randomUUID(),
        $user_id: data.user_id,
        $public_key: data.public_key,
        $login_token: data.login_token,
        $state: data.state,
        $meta: JSON.stringify(data.meta),
        $login_ts: Date.now()
      }, (err, data) => {
        if (err) return reject(err)
        resolve(data)
      })
    })
  }

  findByKey (pk) {
    return new Promise((resolve, reject) => {
      this.db.sqlite.all(`SELECT * from slashtags_accounts_audit WHERE public_key is "${pk}"`, [], (err, data) => {
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
}
module.exports = AccountsAuditDb
