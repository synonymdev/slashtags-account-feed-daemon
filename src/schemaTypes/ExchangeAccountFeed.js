const Feeds = require('@synonymdev/feeds')
const path = require('path')

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
      balance: this._generateBalanceFields(schemaFields.balance),
      pnl: this._generatePNLFields(schemaFields.pnl),
      pnl_and_balance: this._generatePNLandBalanceFields(schemaFields.pnl_and_balance),
    }
  }


  static validateFields(fields) {
    this.REQUIRED_FIELDS.forEach((field) => {
      if (!fields[field]) throw new Error(`missing ${field}`)
    })

    for (let fieldType in this.REQUIRED_PROPS_FOR_FIELDS) {
      for (let fieldName in fields[fieldType]) {
        for (let fieldProp of this.REQUIRED_PROPS_FOR_FIELDS[fieldType]) {
          if (!fields[fieldType][fieldName][fieldProp])
            throw new Error(`${fieldType} for ${fieldName} is missing ${fieldProp}`)
        }
      }
    }
  }

  static validateValues(fields) {
    this._validateBalanceValues(fields)
    this._validatePNLandBalanceValues(fields)
  }

  static _validateBalanceValues(fields) {
    for (let fieldName in fields.balance) {
      if (!['main', 'base'].includes(fields.balance[fieldName].denomination_type))
        throw new Error('balance denomination_type must be "main" or "base"')
      if (!/[1-9]+/.test(fields.balance[fieldName].denomination_ratio.toString()))
        throw new Error('balance denomination_ratio must be natural number more or equal 1')
    }
  }

  static _validatePNLandBalanceValues(fields) {
    for (let fieldName in fields.pnl_and_balance) {
      if (!['main', 'base'].includes(fields.pnl_and_balance[fieldName].denomination_type))
        throw new Error('pnl_and_balance denomination_type must be "main" or "base"')
      if (!/[1-9]+/.test(fields.pnl_and_balance[fieldName].denomination_ratio.toString()))
        throw new Error('pnl_and_balance denomination_ratio must be natural number more or equal 1')
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
        main: path.join(Feeds.FEED_PREFIX, this._getFileName(balanceName)),
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
        main: path.join(Feeds.FEED_PREFIX, this._getFileName(pnlName)),
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
        main: path.join(Feeds.FEED_PREFIX, this._getFileName(pnlBalanceName)),
      }
    }

    return res
  }

  static _getFileName (fieldName) {
    const regex = /[^a-z0-9]+/gi
    const trailing = /-+$/

    return `/${fieldName.toLowerCase().trim().replace(regex, '-').replace(trailing, '')}/`
  }
}
