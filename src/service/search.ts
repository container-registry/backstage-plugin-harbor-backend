import { Config } from '@backstage/config'
import { Base64 } from 'js-base64'
import fetch from 'node-fetch'
import * as redis from 'redis'

export async function repoSearch(
  baseUrl: string,
  username: string,
  password: string,
  body: string,
  team: string,
  redisConfig: Config | undefined
) {
  const repos: Repositories[] = JSON.parse(JSON.stringify(body))
  let client = redis.createClient({})
  if (redisConfig !== undefined) {
    const redisHost = redisConfig.getString('host')
    const redisPort = redisConfig.getNumber('port')

    client = redis.createClient({
      url: `redis://${redisHost}:${redisPort}`,
    })
  }

  await client.connect()

  const HarborRepos = await client.get(team)

  if (HarborRepos !== null && JSON.parse(HarborRepos).length >= 1) {
    return HarborRepos
  }
  const Repos = await findRepos(baseUrl, username, password, repos)

  await client.set(team, JSON.stringify(Repos))
  client.expire(team, 3600)
  return Repos
}

async function findRepos(
  baseUrl: string,
  username: string,
  password: string,
  repos: Repositories[]
) {
  const repoNames: RepoInformation[] = []

  await Promise.all(
    repos.map(async (v: { repository: string }) => {
      const url = `${baseUrl}/api/v2.0/search?q=${v.repository}`

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${Base64.encode(`${username}:${password}`)}`,
        },
      })
      const json = await response.json()

      if (json.hasOwnProperty('error')) {
        console.log(json.error.message, v.repository)

        return
      }

      if (json.hasOwnProperty('repository')) {
        if (json.repository.length >= 1) {
          json.repository.map(
            (v2: { project_name: string; repository_name: string }) => {
              const repoDetails: RepoInformation = {
                project: v2.project_name,
                repository: v2.repository_name.split('/', 2)[1],
              }

              repoNames.push(repoDetails)
            }
          )
        }
      }
    })
  )

  const uniqueObjArray = [
    ...new Map(repoNames.map((item) => [item.repository, item])).values(),
  ]

  return uniqueObjArray
}

interface Repositories {
  repository: string
}

interface RepoInformation {
  project: string
  repository: string
}
