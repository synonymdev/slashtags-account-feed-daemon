import { faker } from '@faker-js/faker'
import debug from 'debug'
import axios from 'axios';
import config from './config.json' assert { type: 'json' }
import serverConfig from '../schemas/config.json' assert { type: 'json' }

const TARGET = `http://${serverConfig.rpc.host || 'localhost'}:${serverConfig.rpc.port}/v0.1/rpc`

const appLogger = debug('example')
const accountLogger = (accountId) => debug(`example:${accountId}`)

async function main (config) {
  appLogger('Starting account feed')
  const accountIds = await setupAccounts()
  setInterval(async () => await updateAccounts(accountIds), config.feedTimer)
}

async function setupAccounts() {
  appLogger('Seting up accounts')
  let accountIds = []
  for (let accountId of config.accountIds) {
    accountIds.push(accountId)
    const createdFeed = await createFeed(accountId)

    if (createdFeed.data.error?.message === 'FAILED_TO_CREATE_FEED_EXISTS') {
      const retreivedFeed = await getFeed(accountId)
      accountLogger(accountId)(`already exists: ${retreivedFeed.data.result.url}`)
      continue
    }

    if (createdFeed.data.error) throw new Error(createdFeed.data.error)

    accountLogger(accountId)(`Created feed: ${createdFeed.data.result.url}`)
  }
  return accountIds
}

async function updateAccounts(accountIds) {
  appLogger('Updating account feeds')
  for (let accountId of accountIds) {
    let update = [
      {
        name: 'Bitcoin',
        value: faker.finance.amount(5, 10, 2)
      },
      {
        name: 'Bitcoin Change',
        value: {
          value: faker.finance.amount(5, 10, 2),
          change: faker.finance.amount(0, 100),
        }
      }
    ]
    await updateFeed(accountId, update)
    accountLogger(accountId)(`Updated feed:`, update.map(u => `${u.name}: ${JSON.stringify(u.value)}`))
  }
}

async function createFeed(accountId) {
  return await callRPC('createFeed', { feed_id: accountId })
}

async function updateFeed(accountId, update) {
  return await callRPC('updateFeedBalance', { feed_id: accountId, fields: update })
}

async function getFeed(accountId) {
  return await callRPC('getFeed', { feed_id: accountId })
}

async function callRPC(method, params) {
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
