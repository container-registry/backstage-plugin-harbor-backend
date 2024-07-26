import { loggerToWinstonLogger } from '@backstage/backend-common';
import {
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { createRouter } from './service/router';

/**
 * Harbor backend plugin
 *
 * @public
 */

export const harborBackendPlugin = createBackendPlugin({
  pluginId: 'harbor',
  register(env) {
    env.registerInit({
      deps: {
        http: coreServices.httpRouter,
        logger: coreServices.logger,
        config: coreServices.rootConfig,
      },
      async init({ http, logger, config }) {
        logger.info('Harbor backend plugin is running');
        http.use(
          await createRouter({ config, logger: loggerToWinstonLogger(logger) }),
        );
      },
    });
  },
});
