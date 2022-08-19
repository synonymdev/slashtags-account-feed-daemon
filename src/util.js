
const { randomBytes } = require('crypto')
const fs = require('fs/promises')
const util = {}

util.delFile = function delFile (file) {
  return fs.unlink(file)
}

util.delFolder = function delFolder (f) {
  return fs.rm(f, {
    recursive: true,
    force: true
  })
}

util.mkdir = function (f) {
  return fs.mkdir(f, { recursive: true })
}

util.rnd = function rnd () {
  return randomBytes(32).toString('hex')
}

module.exports = util
