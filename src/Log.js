import debug from 'debug'

const base = 'stfeed'
class Log {
  constructor (name) {
    this.name = `${base}:${name}`
    this.info = debug(this.name + ':' + 'info')
    this.err = this.error = debug(this.name + ':' + 'err')
  }
}

export default (name) => {
  return new Log(name)
}
