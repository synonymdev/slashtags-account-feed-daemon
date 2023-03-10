const { strict: assert } = require('node:assert')
const SlashtagsSchema = require('../src/SlashtagsSchema.js')
const Schema = require('../schemas/slashfeed.json')

describe('SlashtagsSchema', () => {
  const error = { name: 'Slashtags' }

  describe('generateSchema', () => {
    describe('schemaConfig validation', () => {
      let conf
      beforeEach(() => {
        conf = {
          name: Schema.name,
          description: Schema.description,
          icons: JSON.parse(JSON.stringify(Schema.icons)),
          fields: JSON.parse(JSON.stringify(Schema.fields))
        }
      })

      describe('missing name', () => {
        beforeEach(() => {
          delete conf.name
          error.message = SlashtagsSchema.err.missingFeedName
        })

        it('throws an error', () => assert.throws(() => SlashtagsSchema.generateSchema(conf), error))
      })

      describe('missing description', () => {
        beforeEach(() => {
          delete conf.description
          error.message = SlashtagsSchema.err.missingFeedDescription
        })

        it('throws an error', () => assert.throws(() => SlashtagsSchema.generateSchema(conf), error))
      })

      describe('missing icons', () => {
        beforeEach(() => {
          delete conf.icons
          error.message = SlashtagsSchema.err.missingFeedIcons
        })

        it('throws an error', () => assert.throws(() => SlashtagsSchema.generateSchema(conf), error))
      })

      describe('missing fields', () => {
        beforeEach(() => {
          delete conf.fields
          error.message = SlashtagsSchema.err.missingFeedFields
        })

        it('throws an error', () => assert.throws(() => SlashtagsSchema.generateSchema(conf), error))
      })

      describe('invalid icon', () => {
        beforeEach(() => {
          conf.icons['48'] = 'not an image'
          error.message = SlashtagsSchema.err.invalidFeedIcon
        })

        it('throws an error', () => assert.throws(() => SlashtagsSchema.generateSchema(conf), error))
      })
    })
  })
})
