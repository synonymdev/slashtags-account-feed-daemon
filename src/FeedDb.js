import async from 'async'

import Sqlite from './Sqlite.js'

export default class FeedManager {
  constructor (config) {
    this.db = new Sqlite(config)
  }

  async init () {
    await this.db.start()
    await async.eachSeries([
      `CREATE TABLE IF NOT EXISTS slashtags (
            feed_id VARCHAR(255) NOT NULL,
            feed_key TEXT NOT NULL,
            state INT,
            encrypt_key TEXT,
            meta TEXT,
            ts_created BIGINT,
            PRIMARY KEY (feed_key)
          )`,
      'CREATE INDEX IF NOT EXISTS slashtags_ix1 ON slashtags (feed_id)'
    ], (cmd, next) => {
      this.db.sqlite.run(cmd, next)
    })
  }

  findByFeedId (feedId) {
    return new Promise((resolve, reject) => {
      this.db.sqlite.get(`SELECT * from slashtags WHERE feed_id is "${feedId}" and state = 1`, [], (err, data) => {
        if (err) return reject(err)
        if (!data) return resolve(null)

        data.meta = JSON.parse(data.meta)
        resolve(data)
      })
    })
  }

  getAllActiveFeeds () {
    return new Promise((resolve, reject) => {
      this.db.sqlite.all('SELECT * from slashtags WHERE state is 1', [], (err, data) => {
        if (err) return reject(err)
        if (!data) return resolve(null)

        resolve(data)
      })
    })
  }

  insert (data, batch = null) {
    return new Promise((resolve, reject) => {
      this.db.sqlite.run(`INSERT OR ${data.replace ? 'REPLACE' : 'IGNORE'} INTO slashtags 
          (
            feed_id,
            feed_key,
            state,
            encrypt_key,
            meta,
            ts_created
          ) VALUES 
          (
            $feed_id,
            $feed_key,
            $state,
            $encrypt_key,
            $meta,
            $ts_created
          )`, {
        $feed_id: data.feed_id,
        $feed_key: data.feed_key,
        $state: 1,
        $encrypt_key: data.encrypt_key,
        $meta: JSON.stringify(data.meta),
        $ts_created: Date.now()
      }, (err, data) => {
        if (err) return reject(err)

        return resolve(data || null)
      })
    })
  }

  removeFeed (feedId, batch) {
    return new Promise((resolve, reject) => {
      // TODO: consider optional force removal instead
      // this.db.sqlite.run(`UPDATE slashtags SET state = 0 WHERE user_id="${userId}" `, [], (err, data) => {
      this.db.sqlite.run(`DELETE FROM slashtags WHERE feed_id="${feedId}" `, [], (err, data) => {
        if (err) return reject(err)

        return resolve(data || null)
      })
    })
  }
}
