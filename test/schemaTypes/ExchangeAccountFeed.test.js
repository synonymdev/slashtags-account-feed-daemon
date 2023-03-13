const { strict: assert } = require('node:assert')
const ExchangeAccountFeed = require('../../src/schemaTypes/ExchangeAccountFeed.js')

describe('ExchangeAccountFeed', () => {
  const validExchangeAccountSchemaFields = [
    {
      "type": "balance",
      "name": "btc balance",
      "description": "description",
      "denomination_type": "main",
      "denomination_ratio": 8,
      "main": "path to value in slashdrive",
      "units": "sign to be shown next to value",
    },
    {
      "type": "pnl",
      "name": "spot pnl",
      "main": "path to value on slashdrive, the value example is { absolute: 75, relative: 12 }",
      "description": "description",
      "units": "sign to be shown next to absolute value, relative value always shown with % sign",
    },
    {
      "type": "pnl_and_balance",
      "name": "spot pnl and balance",
      "description": "description",
      "main": "path to value on slashdrive, the value example is { balance: 100, absolute_pnl: 75, relative_pnl: 300 }",
      "denomination_type": "base",
      "denomination_ratio": 8,
      "units": "sign to be shown next to absolute value, relative value always shown with % sign",
    }
  ]

//  describe('Invalid fields', () => {
//    let invalidFields
//    beforeEach(() => invalidFields = JSON.parse(JSON.stringify(validExchangeAccountSchemaFields)))
//
//    for (let field of validExchangeAccountSchemaFields) {
//      for (let prop of ExchangeAccountFeed.REQUIRED_PROPS_FOR_TYPE[field.type]) {
//        const message = `${field.type} for ${field.name} is missing ${prop}`
//        describe(message, () => {
//          beforeEach(() =>  delete field[prop])
//          it('fails', () => assert.throws(() => ExchangeAccountFeed.validateSchemaFields(invalidFields), { message }))
//        })
//      }
//    }
//  })

  describe('Invalid field values', () => {
    describe('Invalid denomination_type', () => {
      let invalidFields
      beforeEach(() => {
        invalidFields = JSON.parse(JSON.stringify(validExchangeAccountSchemaFields))
        invalidFields[0].denomination_type = 'wrong' 
      })
      it('fails', () => assert.throws(() => ExchangeAccountFeed.validateSchemaValues(invalidFields), {
        message: 'balance denomination_type must be "main" or "base"'
      }))
    })

    describe('Invalid denomination_ratio', () => {
      let invalidFields
      beforeEach(() => {
        invalidFields = JSON.parse(JSON.stringify(validExchangeAccountSchemaFields))
        invalidFields[2].denomination_ratio = 'wrong'
      })
      it('fails', () => {
        assert.throws(() => ExchangeAccountFeed.validateSchemaValues(invalidFields), {
          message: 'pnl_and_balance denomination_ratio must be natural number more or equal 1'
        })
      })
    })
  })

  describe('Generated scheam', () => {
    let res
    before(() => res = ExchangeAccountFeed.generateSchemaFields(validExchangeAccountSchemaFields))

    describe('balance', () => {
      it('contains description', () => assert.equal(
        res[0].description,
        validExchangeAccountSchemaFields[0].description
      ))

      it('contains denomination_type', () => assert.equal(
        res[0].denomination_type,
        validExchangeAccountSchemaFields[0].denomination_type
      ))

      it('contains denomination_ratio', () => assert.equal(
        res[0].denomination_ratio,
        validExchangeAccountSchemaFields[0].denomination_ratio
      ))

      it('contains main', () => assert.equal(
        res[0].main,
        '/feed/btc-balance/'
      ))

      it('contains units', () => assert.equal(
        res[0].units,
        validExchangeAccountSchemaFields[0].units
      ))
    })

    describe('pnl', () => {
      it('contains description', () => assert.equal(
        res[1].description,
        validExchangeAccountSchemaFields[1].description
      ))

      it('contains main', () => assert.equal(
        res[1].main,
        '/feed/spot-pnl/'
      ))

      it('contains units', () => assert.equal(
        res[1].units,
        validExchangeAccountSchemaFields[1].units
      ))
    })

    describe('pnl_and_balance', () => {
      it('contains description', () => assert.equal(
        res[2].description,
        validExchangeAccountSchemaFields[2].description
      ))

      it('contains denomination_type', () => assert.equal(
        res[2].denomination_type,
        validExchangeAccountSchemaFields[2].denomination_type
      ))

      it('contains denomination_ratio', () => assert.equal(
        res[2].denomination_ratio,
        validExchangeAccountSchemaFields[2].denomination_ratio
      ))

      it('contains main', () => assert.equal(
        res[2].main,
        '/feed/spot-pnl-and-balance/'
      ))

      it('contains units', () => assert.equal(
        res[2].units,
        validExchangeAccountSchemaFields[2].units
      ))
    })
  })
})
