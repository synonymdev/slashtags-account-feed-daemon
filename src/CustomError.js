
module.exports = function(config){
  if(!config.errName) throw new TypeError("ERR_NAME_MISSING")
  if(!config.fileName) throw new TypeError("FILE_NAME_MISSING")
  return class CustomError extends Error {
    constructor(msg, cause){
      super()
      this.name = config.errName
      this.file_name = config.fileName
      this.message = msg
      this.custom_err = true
      if(cause){
        this.cause = cause || null
      }
    }
  }
}