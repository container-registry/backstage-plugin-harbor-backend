/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { errorHandler } from '@backstage/backend-common'
import { Config } from '@backstage/config'
import express from 'express'
import Router from 'express-promise-router'
import { Logger } from 'winston'
import { getArtifacts } from './artifact'
import { repoSearch } from './search'
import { getTeamArtifacts } from './teamArtifacts'

export interface RouterOptions {
  logger: Logger
  config: Config
}

export async function createRouter(
  options: RouterOptions
): Promise<express.Router> {
  const { logger, config } = options

  logger.info('Initializing harbor backend')
  const baseUrl = config.getString('harbor.baseUrl')
  const username = config.getString('harbor.username')
  const password = config.getString('harbor.password')
  const redisConfig = config.getOptionalConfig('redis')

  const router = Router()
  router.use(express.json())

  router.get('/artifacts', async (request, response) => {
    const project: any = request.query.project
    const repository: any = request.query.repository

    const artifacts = await getArtifacts(
      baseUrl,
      username,
      password,
      project,
      decodeURIComponent(repository)
    )

    response.send(artifacts)
  })

  router.post('/teamartifacts', async (request, response) => {
    const team: any = request.query.team
    const componentType: any = request.query.type
    const artifacts = await getTeamArtifacts(
      request.body,
      team,
      componentType,
      redisConfig
    )

    response.send(artifacts)
  })

  router.post('/search', async (request, response) => {
    const team: any = request.query.team
    const search = await repoSearch(
      baseUrl,
      username,
      password,
      request.body,
      team,
      redisConfig
    )

    response.send(search)
  })

  router.get('/health', (_, response) => {
    response.send({ status: 'ok' })
  })
  router.use(errorHandler())
  return router
}
