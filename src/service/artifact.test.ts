import { getVoidLogger } from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import express from 'express';
import request from 'supertest';
import { createRouter } from './router';

describe('createRouter', () => {
  let app: express.Express;

  beforeAll(async () => {
    const router = await createRouter({
      logger: getVoidLogger(),
      config: new ConfigReader({
        harbor: {
          baseUrl: process.env.APP_CONFIG_harbor_baseUrl,
          username: process.env.APP_CONFIG_harbor_username,
          password: process.env.APP_CONFIG_harbor_password,
        },
      }),
    });
    app = express().use(router);
  });

  describe('GET /artifacts', () => {
    it('return repository info', async () => {
      const projectID = process.env.HARBOR_project;
      const repositoryID = process.env.HARBOR_repository;

      const response = await request(app)
        .get('/artifacts')
        .query({ project: projectID, repository: repositoryID });

      expect(response.statusCode).toEqual(200);
      expect(Array.isArray(response.body)).toBeTruthy();

      expect(response.body[0]).toHaveProperty('size');
      expect(response.body[0]).toHaveProperty('tag');
      expect(response.body[0]).toHaveProperty('pullTime');
      expect(response.body[0]).toHaveProperty('pushTime');
      expect(response.body[0]).toHaveProperty('projectID');
      expect(response.body[0]).toHaveProperty('repoUrl');
      expect(response.body[0]).toHaveProperty('vulnerabilities');
    });
  });
});
