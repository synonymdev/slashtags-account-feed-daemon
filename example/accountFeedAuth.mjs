import { faker } from '@faker-js/faker'
import debug from 'debug'
import axios from 'axios'
import config from './config.json' assert { type: 'json' }
import serverConfig from '../schemas/config.json' assert { type: 'json' }

import SDK from '@synonymdev/slashtags-sdk'
import { Server } from '@synonymdev/slashtags-auth'

import fs from 'fs'

const TARGET = `http://${serverConfig.rpc.host || 'localhost'}:${serverConfig.rpc.port}/v0.1/rpc`

const appLogger = debug('example')
const accountLogger = (accountId) => debug(`example:${accountId}`)

let saved
try { saved = fs.readFileSync('./example/primaryKey') } catch { }
const sdk = new SDK({ storage: './storage', primaryKey: saved })
if (!saved) fs.writeFileSync('./example/primaryKey', sdk.primaryKey)

const slashtag = sdk.slashtag()

async function main (config) {
  appLogger('Starting account feed')
  const accounts = await setupAccounts()
  const keyToFeed = {}
  await setupServer(accounts, keyToFeed)

  setInterval(async () => await updateAccounts(Object.keys(accounts)), config.feedTimer)
}

async function setupAccounts () {
  appLogger('Seting up accounts')
  appLogger('Config:')
  appLogger(config)
  const accountFeedMap = {}
  for (const accountId of config.accountIds) {
    const createdFeed = await createFeed(accountId)

    if (createdFeed.data.error?.message === 'FAILED_TO_CREATE_FEED_EXISTS') {
      const retreivedFeed = await getFeed(accountId)
      accountFeedMap[accountId] = retreivedFeed.data.result.url

      accountLogger(accountId)(`Already exists: ${retreivedFeed.data.result.url}`)
      continue
    }

    if (createdFeed.data.error) throw new Error(createdFeed.data.error)

    accountFeedMap[accountId] = createdFeed.data.result.url
    accountLogger(accountId)(`Created feed: ${createdFeed.data.result.url}`)
  }
  return accountFeedMap
}

async function setupServer (accounts, keyToFeed) {
  const server = new Server(slashtag, {
    onauthz: (token, remotePk) => {
      accountLogger(token)(`Authz request from ${remotePk}`)
      if (Object.keys(config.accountIds).includes(token)) {
        keyToFeed[remotePk] = accounts[token]
        return { status: 'ok' }
      }

      return { status: 'error' }
    },
    onmagiclink: (remotePk) => {
      accountLogger('magiclink')(`Request from ${remotePk}`)
      return keyToFeed[remotePk]
    }
  })

  for (const accountId in accounts) {
    const slashauthURL = server.formatURL(accountId)
    accountLogger(accountId)(`slashauth URL: ${slashauthURL}`)
  }
}

async function updateAccounts (accountIds) {
  appLogger('Updating account feeds')
  for (const accountId of accountIds) {
    const update = [
      {
        name: 'Bitcoin',
        value: faker.finance.amount(5, 10, 2)
      },
      {
        name: 'Bitcoin P/L',
        value: faker.finance.amount(-100, 100, 2)
      }
    ]
    await updateFeed(accountId, update)
    accountLogger(accountId)('Updated feed:', update.map(u => `${u.name}: ${JSON.stringify(u.value)}`))
  }
}

async function createFeed (accountId) {
  return await callRPC('createFeed', { feed_id: accountId })
}

async function updateFeed (accountId, update) {
  return await callRPC('updateFeed', { feed_id: accountId, fields: update })
}

async function getFeed (accountId) {
  return await callRPC('getFeed', { feed_id: accountId })
}

async function callRPC (method, params) {
  try {
    return await axios.post(TARGET, { method, params })
  } catch (e) {
    if (e.message.includes('ECONNREFUSED')) {
      debug('example:error')(`Error: ${TARGET} is not reachable`)
    }
    throw e.message
  }
}

main(config)
