const { strict: assert } = require('node:assert')
const ExchangeAccountFeed = require('../../src/schemaTypes/ExchangeAccountFeed.js')

describe('ExchangeAccountFeed', () => {
  const validExchangeAccountSchemaFields = {
    "balance": {
      "btc balance": {
        "label": "description or label",
        "denomination_type": "main",
        "denomination_ratio": 8,
        "main": "path to value in slashdrive",
        "units": "sign to be shown next to value",
      },
    },
    "pnl": {
      "spot pnl": {
        "main": "path to value on slashdrive, the value example is { absolute: 75, relative: 12 }",
        "label": "description or label",
        "units": "sign to be shown next to absolute value, relative value always shown with % sign",
      },
    },
    "pnl_and_balance": {
      "spot pnl and balance": {
        "label": "description or label",
        "main": "path to value on slashdrive, the value example is { balance: 100, absolute_pnl: 75, relative_pnl: 300 }",
        "denomination_type": "base",
        "denomination_ratio": 8,
        "units": "sign to be shown next to absolute value, relative value always shown with % sign",
      },
    }
  }

  describe('Invalid fields', () => {
    let invalidFields
    beforeEach(() => invalidFields = JSON.parse(JSON.stringify(validExchangeAccountSchemaFields)))

    for (let fieldType in ExchangeAccountFeed.REQUIRED_PROPS_FOR_FIELDS) {
      for (let fieldName in validExchangeAccountSchemaFields[fieldType]) {
        for (let fieldProp of ExchangeAccountFeed.REQUIRED_PROPS_FOR_FIELDS[fieldType]) {
          const message = `${fieldType} for ${fieldName} is missing ${fieldProp}`
          describe(message, () => {
            beforeEach(() =>  delete invalidFields[fieldType][fieldName][fieldProp])
            it('fails', () => assert.throws(() => ExchangeAccountFeed.validateFields(invalidFields), { message }))
          })
        }
      }
    }
  })

  describe('Invalid field values', () => {
    describe('Invalid denomination_type', () => {
      let invalidFields
      beforeEach(() => {
        invalidFields = JSON.parse(JSON.stringify(validExchangeAccountSchemaFields))
        invalidFields.balance['btc balance'].denomination_type = 'wrong' 
      })
      it('fails', () => assert.throws(() => ExchangeAccountFeed.validateValues(invalidFields), {
        message: 'balance denomination_type must be "main" or "base"'
      }))
    })

    describe('Invalid denomination_ratio', () => {
      let invalidFields
      beforeEach(() => {
        invalidFields = JSON.parse(JSON.stringify(validExchangeAccountSchemaFields))
        invalidFields.pnl_and_balance['spot pnl and balance'].denomination_ratio = 'wrong'
      })
      it('fails', () => {
        assert.throws(() => ExchangeAccountFeed.validateValues(invalidFields), {
          message: 'pnl_and_balance denomination_ratio must be natural number more or equal 1'
        })
      })
    })
  })

  describe('Generated scheam', () => {
    let res
    before(() => res = ExchangeAccountFeed.generateSchemaFields(validExchangeAccountSchemaFields))

    it('has balance', () => assert(res.balance))
    describe('balance', () => {
      it('has specified blance property', () => assert(res.balance['btc balance']))
      it('has contains label', () => assert.equal(
        res.balance['btc balance'].label,
        validExchangeAccountSchemaFields.balance['btc balance'].label
      ))

      it('has contains denomination_type', () => assert.equal(
        res.balance['btc balance'].denomination_type,
        validExchangeAccountSchemaFields.balance['btc balance'].denomination_type
      ))

      it('has contains denomination_ratio', () => assert.equal(
        res.balance['btc balance'].denomination_ratio,
        validExchangeAccountSchemaFields.balance['btc balance'].denomination_ratio
      ))

      it('has contains main', () => assert.equal(
        res.balance['btc balance'].main,
        '/feed/btc-balance/'
      ))

      it('has contains units', () => assert.equal(
        res.balance['btc balance'].units,
        validExchangeAccountSchemaFields.balance['btc balance'].units
      ))
    })

    describe('pnl', () => {
      it('has specified blance property', () => assert(res.pnl['spot pnl']))
      it('has contains label', () => assert.equal(
        res.pnl['spot pnl'].label,
        validExchangeAccountSchemaFields.pnl['spot pnl'].label
      ))

      it('has contains main', () => assert.equal(
        res.pnl['spot pnl'].main,
        '/feed/spot-pnl/'
      ))

      it('has contains units', () => assert.equal(
        res.pnl['spot pnl'].units,
        validExchangeAccountSchemaFields.pnl['spot pnl'].units
      ))
    })

    it('has pnl_and_balance', () => assert(res.pnl_and_balance))
    describe('pnl_and_balance', () => {
      it('has specified blance property', () => assert(res.pnl_and_balance['spot pnl and balance']))
      it('has contains label', () => assert.equal(
        res.pnl_and_balance['spot pnl and balance'].label,
        validExchangeAccountSchemaFields.pnl_and_balance['spot pnl and balance'].label
      ))

      it('has contains denomination_type', () => assert.equal(
        res.pnl_and_balance['spot pnl and balance'].denomination_type,
        validExchangeAccountSchemaFields.pnl_and_balance['spot pnl and balance'].denomination_type
      ))

      it('has contains denomination_ratio', () => assert.equal(
        res.pnl_and_balance['spot pnl and balance'].denomination_ratio,
        validExchangeAccountSchemaFields.pnl_and_balance['spot pnl and balance'].denomination_ratio
      ))

      it('has contains main', () => assert.equal(
        res.pnl_and_balance['spot pnl and balance'].main,
        '/feed/spot-pnl-and-balance/'
      ))

      it('has contains units', () => assert.equal(
        res.pnl_and_balance['spot pnl and balance'].units,
        validExchangeAccountSchemaFields.pnl_and_balance['spot pnl and balance'].units
      ))
    })
  })
})
