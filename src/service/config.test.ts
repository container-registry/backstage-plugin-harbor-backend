import { ConfigReader } from '@backstage/config';
import { NotFoundError } from '@backstage/errors';
import { getCurrentHarborInstance, getHarborInstances, HarborInstance } from './config';

describe('config', () => {
  describe('getHarborInstances', () => {
    it('returns an empty list if not configured', () => {
      const config = new ConfigReader({})
      const instances = getHarborInstances(config)
      expect(instances.length).toEqual(0)
    })

    it('returns a single instance if the traditional config is uses', () => {
      const config = new ConfigReader({
        harbor: {
          baseUrl: 'https://harbor.dev',
          username: 'jane.doe',
          password: 'this-is-super-secure',
        },
      })
      const instances = getHarborInstances(config)
      expect(instances.length).toEqual(1)
      expect(instances).toEqual([
        {
          host: '',
          apiBaseUrl: 'https://harbor.dev',
          username: 'jane.doe',
          password: 'this-is-super-secure',
        } as HarborInstance,
      ])
    })

    it('returns a list of instances', () => {
      const config = new ConfigReader({
        harbor: {
          instances: [
            {
              host: 'harbor.dev',
              baseUrl: 'https://harbor.dev',
              username: 'jane.doe',
              password: 'this-is-super-secure',
            },
            {
              host: 'another-harbor.dev',
              baseUrl: 'https://another-harbor.dev',
              username: 'john.doe',
              password: 'this-is-even-more-secure',
            },
          ],
        },
      })
      const instances = getHarborInstances(config)
      expect(instances.length).toEqual(2)
      expect(instances).toEqual([
        {
          host: 'harbor.dev',
          apiBaseUrl: 'https://harbor.dev',
          username: 'jane.doe',
          password: 'this-is-super-secure',
        } as HarborInstance,
        {
          host: 'another-harbor.dev',
          apiBaseUrl: 'https://another-harbor.dev',
          username: 'john.doe',
          password: 'this-is-even-more-secure',
        } as HarborInstance,
      ])
    })

    it('returns a combined list of instances', () => {
      const config = new ConfigReader({
        harbor: {
          baseUrl: 'https://traditional-harbor.dev',
          username: 'foo.bar',
          password: 'this-is-super-secure-too',
          instances: [
            {
              host: 'harbor.dev',
              baseUrl: 'https://harbor.dev',
              username: 'jane.doe',
              password: 'this-is-super-secure',
            },
            {
              host: 'another-harbor.dev',
              baseUrl: 'https://another-harbor.dev',
              username: 'john.doe',
              password: 'this-is-even-more-secure',
            },
          ],
        },
      })
      const instances = getHarborInstances(config)
      expect(instances.length).toEqual(3)
      expect(instances).toEqual([
        {
          host: '',
          apiBaseUrl: 'https://traditional-harbor.dev',
          username: 'foo.bar',
          password: 'this-is-super-secure-too',
        } as HarborInstance,
        {
          host: 'harbor.dev',
          apiBaseUrl: 'https://harbor.dev',
          username: 'jane.doe',
          password: 'this-is-super-secure',
        } as HarborInstance,
        {
          host: 'another-harbor.dev',
          apiBaseUrl: 'https://another-harbor.dev',
          username: 'john.doe',
          password: 'this-is-even-more-secure',
        } as HarborInstance,
      ])
    })
  })

  describe('getCurrentHarborInstance', () => {
    it('returns a single instance if the traditional config is used', () => {
      const instances = [
        {
          host: '',
          apiBaseUrl: 'https://harbor.dev',
          username: 'jane.doe',
          password: 'this-is-super-secure',
        } as HarborInstance,
      ]
      const currentHarborInstance = getCurrentHarborInstance(instances, '')
      expect(currentHarborInstance).toEqual({
          host: '',
          apiBaseUrl: 'https://harbor.dev',
          username: 'jane.doe',
          password: 'this-is-super-secure',
        } as HarborInstance
      )
    })
    it('returns correct instance if multiple instance are defined', () => {
      const instances = [
        {
          host: 'harbor.dev',
          apiBaseUrl: 'https://harbor.dev',
          username: 'jane.doe',
          password: 'this-is-super-secure',
        } as HarborInstance,
        {
          host: 'another-harbor.dev',
          apiBaseUrl: 'https://another-harbor.dev',
          username: 'john.doe',
          password: 'this-is-even-more-secure',
        } as HarborInstance,
      ]
      const currentHarborInstance = getCurrentHarborInstance(instances, 'harbor.dev')
      expect(currentHarborInstance).toEqual({
          host: 'harbor.dev',
          apiBaseUrl: 'https://harbor.dev',
          username: 'jane.doe',
          password: 'this-is-super-secure',
        } as HarborInstance
      )
    })
    it('throws an error if there is no default harbor instance defined', () => {
      const instances: HarborInstance[] = []
      expect(() => getCurrentHarborInstance(instances, '')).toThrow(new NotFoundError("No default Harbor configuration found. Please configure it in your app configuration."));
    })
    it('throws an error if there are no harbor instances defined for host', () => {
      const instances = [
        {
          host: 'harbor.dev',
          apiBaseUrl: 'https://harbor.dev',
          username: 'jane.doe',
          password: 'this-is-super-secure',
        } as HarborInstance,
      ]
      expect(() => getCurrentHarborInstance(instances, 'another-harbor.dev')).toThrow(new NotFoundError("No Harbor instance for host 'another-harbor.dev' found. Please configure it in your app configuration."));
    })
  })
})
