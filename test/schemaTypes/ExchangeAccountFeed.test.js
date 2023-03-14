const { strict: assert } = require('node:assert')
const ExchangeAccountFeed = require('../../src/schemaTypes/ExchangeAccountFeed.js')

describe('ExchangeAccountFeed', () => {
  const validExchangeAccountSchemaFields = [
    {
      "type": "balance",
      "name": "btc balance",
      "description": "description",
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

  describe('Generated scheam', () => {
    let res
    before(() => res = ExchangeAccountFeed.generateSchemaFields(validExchangeAccountSchemaFields))

    describe('balance', () => {
      it('contains description', () => assert.equal(
        res[0].description,
        validExchangeAccountSchemaFields[0].description
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
