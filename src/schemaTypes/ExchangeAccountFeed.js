const Feeds = require('@synonymdev/feeds')
const path = require('path')
const { getFileName } = require('../util.js')

module.exports = class ExchangeAccountFeed {
  static SUPPORTED_TYPES = [
    'balance',
    'pnl',
    'pnl_and_balance'
  ]

  static REQUIRED_PROPS_FOR_TYPE = {
    balance: [
      'description',
      'units',
    ],

    pnl: [
      'description',
      'units',
    ],

    pnl_and_balance:[
      'description',
      'units',
    ]
  }

  static generateSchemaFields(schemaFields) {
    return schemaFields.map((field) => {
      return {
        ...field,
        main: path.join(Feeds.FEED_PREFIX, getFileName(field.name)),
      }
    })
  }

  static validateSchemaFields(fields, err) {
    fields.forEach((field) => {
      if (!ExchangeAccountFeed.SUPPORTED_TYPES.includes(field.type)) throw err || new Error(`Wrong type ${field.type}`)

      ExchangeAccountFeed.REQUIRED_PROPS_FOR_TYPE[field.type].forEach((prop) => {
        if(!field[prop]) throw err || new Error(`${field.type} for ${field.name} is missing ${prop}`)
      })
    })
  }

  static validateSchemaValues(fields, err) {
    return
  }

  static validateFieldsValues(updates, fields) {
    for (let balanceField in fields.balance) {
      updates.forEach((field) => {
        if (field.name === balanceField) ExchangeAccountFeed.validateBalanceValue(field.value)
      })
    }

    for (let pnlField in fields.pnl) {
      updates.forEach((field) => {
        if (field.name === pnlField) ExchangeAccountFeed.validatePNLValue(field.value)
      })
    }

    for (let pnlAndBalanceField in fields.pnl_and_balance) {
      updates.forEach((field) => {
        if (field.name === pnlAndBalanceField) ExchangeAccountFeed.validatePNLandBalanceValue(field.value)
      })
    }
  }

  static validateBalanceValue(value) {
    if (isNaN(parseFloat(value))) throw new Error('invalid balance')
  }

  static validatePNLValue(value) {
    const { absolute, relative } = value
    if (isNaN(parseFloat(absolute))) throw new Error('invalid absolute')
    if (isNaN(parseFloat(relative))) throw new Error('invalid relative')
  }

  static validatePNLandBalanceValue(value) {
    const { absolute_pnl, relative_pnl, balance } = value
    if (isNaN(parseFloat(balance))) throw new Error('invalid balance')
    if (isNaN(parseFloat(absolute_pnl))) throw new Error('invalid absolute')
    if (isNaN(parseFloat(relative_pnl))) throw new Error('invalid relative')
  }
}
