import customErr from './CustomError.js'
import Log from './Log.js'

export default (name, fileName) => {
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
