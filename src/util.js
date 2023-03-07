const { randomBytes } = require('crypto')
const { unlink, rm, mkdir: fsMkdir } = require('node:fs/promises')

module.exports = {
  delFile: function (file) {
    return unlink(file)
  },

  delFolder: function (f) {
    return rm(f, {
      recursive: true,
      force: true
    })
  },

  mkdir: function (f) {
    return fsMkdir(f, { recursive: true })
  },

  rnd: function () {
    return randomBytes(32).toString('hex')
  }
}
