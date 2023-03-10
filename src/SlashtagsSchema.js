const fs = require('fs')

const customErr = require('./CustomError.js')
const Err = customErr({ errName: 'Slashtags', fileName: __filename })

const _err = {
  missingFeedName: 'MISSING_FEED_NAME',
  missingFeedDescription: 'MISSING_FEED_DESCRIPTION',
  missingFeedIcons: 'MISSING_FEED_ICONS',
  missingFeedFields: 'MISSING_FEED_FIELDS',
  invalidFeedIcon: 'INVALID_FEED_ICON',

  invalidFeedFields: 'INVALID_FEED_FIELDS',
  missingFieldName: 'MISSING_FIELD_NAME',
  missingFieldDescription: 'MISSING_FIELD_DESCRIPTION',
  missingFieldUnits: 'MISSING_FIELD_UNITS',
  badFieldType: 'UNSUPPORTED_FIELD_TYPE',

  invalidField: 'INVALID_FIELD',
  invalidFieldValue: 'INVALID_FIELD_VALUE'
}

module.exports = class SlashtagsSchema {
  static err = _err
  static Error = Err

  static DEFAULT_SCHEMA_PATH = './schemas/slashfeed.json'

  static validateSchemaConfig (schemaConfig) {
    if (!schemaConfig.name) throw new SlashtagsSchema.Error(SlashtagsSchema.err.missingFeedName)
    if (!schemaConfig.description) throw new SlashtagsSchema.Error(SlashtagsSchema.err.missingFeedDescription)
    if (!schemaConfig.icons) throw new SlashtagsSchema.Error(SlashtagsSchema.err.missingFeedIcons)
    if (!schemaConfig.fields) throw new SlashtagsSchema.Error(SlashtagsSchema.err.missingFeedFields)

    const imageRX = /^data:image\/((svg\+xml)|(png));base64,.+$/
    for (const size in schemaConfig.icons) {
      const icon = schemaConfig.icons[size]

      if (typeof icon !== 'string') throw new SlashtagsSchema.Error(SlashtagsSchema.err.invalidFeedIcon)
      if (!imageRX.test(icon)) throw new SlashtagsSchema.Error(SlashtagsSchema.err.invalidFeedIcon)
    }

    const { validateSchemaFields, validateSchemaValues } = require(
      `${__dirname}/schemaTypes/${this.snakeToCamel(schemaConfig.type || 'exchange_account_feed')}.js`
    )
    validateSchemaFields(schemaConfig.fields, SlashtagsSchema.err.invalidField)
    validateSchemaValues(schemaConfig.fields, SlashtagsSchema.err.invalidFieldValue)
  }

  static generateSchema (schemaConfig) {
    SlashtagsSchema.validateSchemaConfig(schemaConfig)

    const { generateSchemaFields } = require(
      `${__dirname}/schemaTypes/${this.snakeToCamel(schemaConfig.type || 'exchange_account_feed')}.js`
    )

    const schema = {
      name: schemaConfig.name,
      description: schemaConfig.description,
      type: schemaConfig.type || 'exchange_account_feed',
      version: schemaConfig.version || '0.0.1',
      icons: {}
    }

    for (const size in schemaConfig.icons) {
      schema.icons[size] = schemaConfig.icons[size]
    }

    schema.fields = generateSchemaFields(schemaConfig.fields)

    return schema
  }

  static persistSchema (schema) {
    fs.writeFileSync(this.DEFAULT_SCHEMA_PATH, Buffer.from(JSON.stringify(schema, undefined, 2)), 'utf-8')
  }

  static getFileName (fieldName) {
    const regex = /[^a-z0-9]+/gi
    const trailing = /-+$/

    return `/${fieldName.toLowerCase().trim().replace(regex, '-').replace(trailing, '')}/`
  }
  static snakeToCamel (str) {
    return str.toLowerCase().replace(/([-_][a-z])/g, group => group.toUpperCase().replace('-', '').replace('_', ''))
  }
}
