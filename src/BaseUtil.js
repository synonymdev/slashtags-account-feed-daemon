const customErr = require('./CustomError.js')
const Log = require('./Log.js')

module.exports = (name, fileName) => {
  if (!name) {
    console.log('FAILED_SETTING_UP_UTIL', name, fileName)
    throw new Error('FAILED_SETTING_UP_UTIL')
  }
  return {
    Err: customErr({
      errName: `${name}_ERROR`,
      fileName
    }),
    log: Log(name),
    getFileName: (fieldName)  => {
      const regex = /[^a-z0-9]+/gi
      const trailing = /-+$/

      return `/${fieldName.toLowerCase().trim().replace(regex, '-').replace(trailing, '')}/`
    },
    snakeToCamel: (str) => {
      return str.toLowerCase().replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''))
    }
  }
}
