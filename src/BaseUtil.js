const customErr = require('./CustomError')
const Log = require('./Log')

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
    log: Log(name)
  }
}
