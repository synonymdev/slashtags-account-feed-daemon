const { strict: assert } = require('node:assert')
const SlashtagsSchema = require('../src/SlashtagsSchema.js')
const fs = require('fs')
const Schema = require('../schemas/slashfeed.json')

describe('SlashtagsSchema', () => {
  const error = { name: 'Slashtags' }

  describe('generateSchema', () => {
    describe('it generates and overwrites slashfeed based on config', () => {
      let conf
      beforeEach(() => {
        conf = {
          name: Schema.name,
          description: Schema.description,
          icons: JSON.parse(JSON.stringify(Schema.icons)),
          fields: Schema.fields.map(f => JSON.parse(JSON.stringify(f)))
        }
      })

      describe('invalid schamaConfig', () => {
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

        describe('fields are not array', () => {
          beforeEach(() => {
            conf.fields = 'fields'
            error.message = SlashtagsSchema.err.invalidFeedFields
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

        describe('invalid field', () => {
          describe('missing name', () => {
            beforeEach(() => {
              delete conf.fields[0].name
              error.message = SlashtagsSchema.err.missingFieldName
            })

            it('throws an error', () => assert.throws(() => SlashtagsSchema.generateSchema(conf), error))
          })

          describe('missing description', () => {
            beforeEach(() => {
              delete conf.fields[1].description
              error.message = SlashtagsSchema.err.missingFieldDescription
            })

            it('throws an error', () => assert.throws(() => SlashtagsSchema.generateSchema(conf), error))
          })

          describe('invalid type', () => {
            beforeEach(() => {
              conf.fields[1].type = 'unsupported type'
              error.message = SlashtagsSchema.err.badFieldType
            })

            it('throws an error', () => assert.throws(() => SlashtagsSchema.generateSchema(conf), error))
          })
        })
      })
    })
  })
})
