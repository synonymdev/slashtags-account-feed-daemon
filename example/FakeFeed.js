import { faker } from '@faker-js/faker'
import debug from 'debug'
import axios from 'axios';
import config from './config.json' assert { type: 'json' }

const TARGET = 'http://127.0.0.1:8787/v0.1/rpc'
const logger = debug('example')

async function main (config) {
  logger('### Starting account feed ###')
  const persitedUserIds = await setupUsers()

  await new Promise(r => setTimeout(r, config.feedTimer));

  setInterval(async () => {
    await updateUsers([...persitedUserIds])
  }, config.feedTimer)
}

async function setupUsers() {
  logger('--- Seting up users ---')
  let userIds = []
  for (let userId of config.userIds) {
    userIds.push(userId)
    const createdFeed = await createFeed(userId)

    if (createdFeed.data.error?.message === 'FAILED_TO_CREATE_USER_EXISTS') {
      const retreivedFeed = await getFeed(userId)
      logger(`User "${userId}" already exists: ${retreivedFeed.data.result.url}`)
      continue
    }

    if (createdFeed.data.error) throw new Error(createdFeed.data.error)

    logger(`Created feed for "${userId}": ${createdFeed.data.result.url}`)
  }
  return userIds
}

async function updateUsers(userIds) {
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
    logger(`Updated user "${userId}":`, update.map(u => `${u.name}: ${JSON.stringify(u.value)}`))
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
  return await axios.post(TARGET, { method, params })
}

main(config)
