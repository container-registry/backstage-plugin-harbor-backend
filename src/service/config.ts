import { Config } from '@backstage/config';
import { NotFoundError } from '@backstage/errors';

export interface HarborInstance {
  host: string
  username: string
  password: string
  apiBaseUrl: string
}

export const getHarborInstances = (config: Config): HarborInstance[] => {
  const instances: HarborInstance[] = []

  if (config.has('harbor.baseUrl')) {
    instances.push({
      host: '',
      apiBaseUrl: config.getString('harbor.baseUrl'),
      username: config.getString('harbor.username'),
      password: config.getString('harbor.password'),
    })
  }

  if (config.has('harbor.instances')) {
    config.getConfigArray('harbor.instances').flatMap((c) => {
      instances.push({
        host: c.getString('host'),
        apiBaseUrl: c.getString('baseUrl'),
        username: c.getString('username'),
        password: c.getString('password'),
      })
    })
  }

  return instances
}

export const getCurrentHarborInstance = (harborInstances: HarborInstance[], host: string) : HarborInstance => {

  const currentInstance = harborInstances.find((i) => i.host === host)
  if (!currentInstance) {
    if (host) {
      throw new NotFoundError(
        `No Harbor instance for host '${host}' found. Please configure it in your app configuration.`
      )
    } else {
      throw new NotFoundError(
        'No default Harbor configuration found. Please configure it in your app configuration.'
      )
    }
  }

  return currentInstance
}