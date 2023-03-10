const path = require('path')
const fs = require('fs')
const Feeds = require('@synonymdev/feeds')

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
}

module.exports = class SlashtagsSchema {
  static err = _err
  static Error = Err

  static DEFAULT_SCHEMA_PATH = './schemas/slashfeed.json'

  static DEFAULT_TYPES = [
    'number',
    'utf-8'
  ]

  static MEASURED_TYPES = [
    'currency',
    'delta'
  ]

  static VALID_TYPES = [
    ...this.DEFAULT_TYPES,
    ...this.MEASURED_TYPES
  ]

  static validateSchemaConfig (schemaConfig) {
    if (!schemaConfig.name) throw new SlashtagsSchema.Error(SlashtagsSchema.err.missingFeedName)
    if (!schemaConfig.description) throw new SlashtagsSchema.Error(SlashtagsSchema.err.missingFeedDescription)
    if (!schemaConfig.icons) throw new SlashtagsSchema.Error(SlashtagsSchema.err.missingFeedIcons)
    if (!schemaConfig.fields) throw new SlashtagsSchema.Error(SlashtagsSchema.err.missingFeedFields)
    if (!Array.isArray(schemaConfig.fields)) throw new SlashtagsSchema.Error(SlashtagsSchema.err.invalidFeedFields)

    const imageRX = /^data:image\/((svg\+xml)|(png));base64,.+$/
    for (const size in schemaConfig.icons) {
      const icon = schemaConfig.icons[size]

      if (typeof icon !== 'string') throw new SlashtagsSchema.Error(SlashtagsSchema.err.invalidFeedIcon)
      if (!imageRX.test(icon)) throw new SlashtagsSchema.Error(SlashtagsSchema.err.invalidFeedIcon)
    }

    schemaConfig.fields.forEach((field) => {
      if (!field.name) throw new SlashtagsSchema.Error(SlashtagsSchema.err.missingFieldName)
      if (!field.description) throw new SlashtagsSchema.Error(SlashtagsSchema.err.missingFieldDescription)
      if (field.type && (field.type !== '') && !SlashtagsSchema.VALID_TYPES.includes(field.type)) {
        throw new SlashtagsSchema.Error(SlashtagsSchema.err.badFieldType)
      }

      if (this.MEASURED_TYPES.includes(field.type)) {
        if (!field.units) throw new SlashtagsSchema.Error(SlashtagsSchema.err.missingFieldUnits)
      }
    })
  }

  static generateSchema (schemaConfig) {
    SlashtagsSchema.validateSchemaConfig(schemaConfig)

    const schema = {
      name: schemaConfig.name,
      description: schemaConfig.description,
      type: 'account_feed',
      version: '0.0.1',
      icons: {}
    }

    for (const size in schemaConfig.icons) {
      schema.icons[size] = schemaConfig.icons[size]
    }

    schema.fields = schemaConfig.fields.map((field) => {
      return {
        name: field.name,
        description: field.description,
        main: path.join(Feeds.FEED_PREFIX, SlashtagsSchema.getFileName(field)),
        type: field.type || 'utf-8',
        units: field.units
      }
    })

    return schema
  }

  static persistSchema (schema) {
    fs.writeFileSync(this.DEFAULT_SCHEMA_PATH, Buffer.from(JSON.stringify(schema, undefined, 2)), 'utf-8')
  }

  static getFileName (field) {
    const regex = /[^a-z0-9]+/gi
    const trailing = /-+$/

    return `/${field.name.toLowerCase().trim().replace(regex, '-').replace(trailing, '')}/`
  }
}
