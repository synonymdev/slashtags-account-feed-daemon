'use strict'

const async = require('async')
const _ = require('lodash')
const Sqlite = require('./Sqlite')

class FeedManager {
  constructor (config) {
    this.db = new Sqlite(config)
  }

  async init () {
    await this.db.start()
    await async.eachSeries([
      `CREATE TABLE IF NOT EXISTS slashtags (
            user_id VARCHAR(255) NOT NULL,
            feed_key TEXT NOT NULL,
            state INT,
            encrypt_key TEXT,
            meta TEXT,
            ts_created BIGINT,
            PRIMARY KEY (feed_key)
          )`,
          'CREATE INDEX IF NOT EXISTS slashtags_ix1 \
          ON slashtags (user_id)'
    ], (cmd, next) => {
      this.db.sqlite.run(cmd, next)
    })
  }

  findByUser(userId){
    return new Promise((resolve,reject)=>{
      this.db.sqlite.get(`SELECT * from slashtags WHERE user_id is "${userId}"`,[],(err,data)=>{
        if(err){
          return reject(err)
        }
        data.meta = JSON.parse(data.meta)
        resolve(data)
      })
    })
  }

  insert (data) {
    return new Promise((resolve,reject)=>{
      this.db.sqlite.run(`INSERT OR ${data.replace ? 'REPLACE' : 'IGNORE'} INTO slashtags 
          (
            user_id,
            feed_key,
            state,
            encrypt_key,
            meta,
            ts_created
          ) VALUES 
          (
            $user_id,
            $feed_key,
            $state,
            $encrypt_key,
            $meta,
            $ts_created
          )`, {
            $user_id: data.user_id,
            $feed_key: data.feed_key,
            $state: 1,
            $encrypt_key: data.encrypt_key,
            $meta: JSON.stringify(data.meta),
            $ts_created: Date.now(),
      }, (err,data)=>{
        if(err) return reject(err)
        resolve(data)
      })
    })
  }

  update (key, id, data, cb) {
    this.db.upsert({
      table: 'slashtags',
      pkey: key,
      pval: id,
      data: _.extend({}, data)
    }, cb)
  }

  removeUser (userId) {
    return new Promise((resolve,reject)=>{
      this.db.sqlite.run(`UPDATE slashtags SET state = 0 WHERE user_id="${userId}" ` ,[], (err,data)=>{
        if(err){ 
          return reject(err)
        }
        resolve(data)
      })
    })
  }

}
module.exports = FeedManager
