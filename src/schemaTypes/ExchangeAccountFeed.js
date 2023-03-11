const Feeds = require('@synonymdev/feeds')
const path = require('path')
const { getFileName } = require('../util.js')

module.exports = class ExchangeAccountFeed {
  static REQUIRED_FIELDS = [
    'balance',
    'pnl',
    'pnl_and_balance'
  ]

  static REQUIRED_PROPS_FOR_FIELDS = {
    balance: [
      'label',
      'denomination_type',
      'denomination_ratio',
      'units',
    ],

    pnl: [
      'label',
      'units',
    ],

    pnl_and_balance:[
      'label',
      'denomination_type',
      'denomination_ratio',
      'units',
    ]
  }

  static generateSchemaFields(schemaFields) {
    return {
      balance: ExchangeAccountFeed._generateBalanceFields(schemaFields.balance),
      pnl: ExchangeAccountFeed._generatePNLFields(schemaFields.pnl),
      pnl_and_balance: ExchangeAccountFeed._generatePNLandBalanceFields(schemaFields.pnl_and_balance),
    }
  }


  static validateSchemaFields(fields, err) {
    ExchangeAccountFeed.REQUIRED_FIELDS.forEach((field) => {
      if (!fields[field]) throw err || new Error(`missing ${field}`)
    })

    for (let fieldType in ExchangeAccountFeed.REQUIRED_PROPS_FOR_FIELDS) {
      for (let fieldName in fields[fieldType]) {
        for (let fieldProp of ExchangeAccountFeed.REQUIRED_PROPS_FOR_FIELDS[fieldType]) {
          if (!fields[fieldType][fieldName][fieldProp])
            throw err || new Error(`${fieldType} for ${fieldName} is missing ${fieldProp}`)
        }
      }
    }
  }

  static validateSchemaValues(fields, err) {
    ExchangeAccountFeed._validateSchemaBalanceValues(fields, err)
    ExchangeAccountFeed._validateSchemaPNLandBalanceValues(fields, err)
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

  static _validateSchemaBalanceValues(fields, err) {
    for (let fieldName in fields.balance) {
      if (!['main', 'base'].includes(fields.balance[fieldName].denomination_type))
        throw err || new Error('balance denomination_type must be "main" or "base"')
      if (!/[1-9]+/.test(fields.balance[fieldName].denomination_ratio.toString()))
        throw err || new Error('balance denomination_ratio must be natural number more or equal 1')
    }
  }

  static _validateSchemaPNLandBalanceValues(fields, err) {
    for (let fieldName in fields.pnl_and_balance) {
      if (!['main', 'base'].includes(fields.pnl_and_balance[fieldName].denomination_type))
        throw err || new Error('pnl_and_balance denomination_type must be "main" or "base"')
      if (!/[1-9]+/.test(fields.pnl_and_balance[fieldName].denomination_ratio.toString()))
        throw err || new Error('pnl_and_balance denomination_ratio must be natural number more or equal 1')
    }
  }

  static _generateBalanceFields(balanceFields) {
    let res = {}
    for (let balanceName in balanceFields) {
      res[balanceName] = {
        label: balanceFields[balanceName].label,
        denomination_type: balanceFields[balanceName].denomination_type,
        denomination_ratio: balanceFields[balanceName].denomination_ratio,
        units: balanceFields[balanceName].units,
        main: path.join(Feeds.FEED_PREFIX, getFileName(balanceName)),
      }
    }

    return res
  }

  static _generatePNLFields(pnlFields) {
    let res = {}
    for (let pnlName in pnlFields) {
      res[pnlName] = {
        label: pnlFields[pnlName].label,
        units: pnlFields[pnlName].units,
        main: path.join(Feeds.FEED_PREFIX, getFileName(pnlName)),
      }
    }

    return res
  }

  static _generatePNLandBalanceFields(pnlBalanceFields) {
    let res = {}
    for (let pnlBalanceName in pnlBalanceFields) {
      res[pnlBalanceName] = {
        label: pnlBalanceFields[pnlBalanceName].label,
        denomination_type: pnlBalanceFields[pnlBalanceName].denomination_type,
        denomination_ratio: pnlBalanceFields[pnlBalanceName].denomination_ratio,
        units: pnlBalanceFields[pnlBalanceName].units,
        main: path.join(Feeds.FEED_PREFIX, getFileName(pnlBalanceName)),
      }
    }

    return res
  }
}
