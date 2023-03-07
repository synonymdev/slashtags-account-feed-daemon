import path from 'path'
import fs from 'fs/promises'
import Sqlite3 from 'sqlite3'

import customErr from './CustomError.js'
import { __filename } from './util.js'

const _err = {
  dbNameMissing: 'DB_NAME_MISSING',
  dbPathMissing: 'DB_PATH_MISSING',
  configMissing: 'CONFIG_MISSING',
  notReady: 'DB_NOT_INITED'
}

const SqliteErr = customErr({
  errName: 'SQLITE_ERROR:',
  fileName: __filename()
})

export default class Sqlite {
  constructor (config) {
    if (!config) throw new SqliteErr(_err.configMissing)
    this.config = { ...config }
    if (!this.config?.name) throw new SqliteErr(_err.dbNameMissing)
    if (!this.config?.path) throw new SqliteErr(_err.dbPathMissing)
    this.version = this.config?.version || '0.0.1'
    this.ready = false
    this.dbPath = path.resolve(this.config.path, `sqlite-${this.config.name}-${this.version}.sqlite`)
  }

  static Error = SqliteErr

  deleteSqlite () {
    if (!this.ready) throw new SqliteErr(_err.notReady)

    return fs.unlink(this.dbPath)
  }

  async start () {
    return new Promise((resolve, reject) => {
      this.sqlite = new Sqlite3.Database(this.dbPath, (err) => {
        if (err) return reject(err)

        this.ready = true
        resolve()
      })
    })
  }

  static err = _err
}
