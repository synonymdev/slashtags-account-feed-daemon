import { faker } from '@faker-js/faker'
import debug from 'debug'
import axios from 'axios';
import config from './config.json' assert { type: 'json' }
import serverConfig from '../schemas/config.json' assert { type: 'json' }

const TARGET = `http://${serverConfig.rpc.host || 'localhost'}:${serverConfig.rpc.port}/v0.1/rpc`

const appLogger = debug('example')
const userLogger = (userId) => debug(`example:${userId}`)

async function main (config) {
  appLogger('Starting account feed')
  const persitedUserIds = await setupUsers()

  setInterval(async () => await updateUsers([...persitedUserIds]), config.feedTimer)
}

async function setupUsers() {
  appLogger('Seting up users')
  let userIds = []
  for (let userId of config.userIds) {
    userIds.push(userId)
    const createdFeed = await createFeed(userId)

    if (createdFeed.data.error?.message === 'FAILED_TO_CREATE_USER_EXISTS') {
      const retreivedFeed = await getFeed(userId)
      userLogger(userId)(`already exists: ${retreivedFeed.data.result.url}`)
      continue
    }

    if (createdFeed.data.error) throw new Error(createdFeed.data.error)

    userLogger(userId)(`Created feed: ${createdFeed.data.result.url}`)
  }
  return userIds
}

async function updateUsers(userIds) {
  appLogger('Updating user feeds')
  for (let userId of userIds) {
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
    await updateFeed(userId, update)
    userLogger(userId)(`Updated feed:`, update.map(u => `${u.name}: ${JSON.stringify(u.value)}`))
  }
}

async function createFeed(userId) {
  return await callRPC('createFeed', { user_id: userId })
}

async function updateFeed(userId, update) {
  return await callRPC('updateFeedBalance', { user_id: userId, fields: update })
}

async function getFeed(userId) {
  return await callRPC('getFeed', { user_id: userId })
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
