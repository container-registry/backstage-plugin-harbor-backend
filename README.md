# Backstage Harbor Backend plugin

[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=container-registry_backstage-plugin-harbor-backend&metric=alert_status)](https://sonarcloud.io/dashboard?id=container-registry_backstage-plugin-harbor-backend)
![npm](https://img.shields.io/npm/dt/@bestsellerit/backstage-plugin-harbor-backend)

Welcome to the harbor backend plugin!
This plugin will show information about your docker images within harbor

![Dashboard](docs/img/dashboard.png)
![Docker Image](docs/img/widget.png)

## Getting started

### Enabling frontend

```bash
cd package/app
yarn add @bestsellerit/backstage-plugin-harbor
```

```ts
// packages/app/src/plugins.ts
export { plugin as harbor } from '@bestsellerit/backstage-plugin-harbor';
```

```ts
// packages/app/src/components/catalog/EntityPage.tsx
import { Router as HarborRouter } from '@bestsellerit/backstage-plugin-harbor';

const serviceEntityPage = (
  <EntityPageLayout>
    // ...
    <EntityLayout.Route path="/harbor" title="Harbor">
      <EntityHarborContent />
    </EntityLayout.Route>
  </EntityPageLayout>
)
```

```ts
// packages/app/src/components/catalog/EntityPage.tsx
const overviewContent = (
  <Grid container spacing={6} alignItems="stretch">
   // ...
    <EntitySwitch>
      <EntitySwitch.Case if={isHarborAvailable}>
        <Grid item>
         <EntityHarborCard/>
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>
    ...
  </Grid>
);
```

### Enabling backend

```bash
cd packages/backend
yarn add @bestsellerit/backstage-plugin-harbor-backend
```

Create a new file named `packages/backend/src/plugins/harbor.ts`, and add the following to it

```ts
import { createRouter } from '@bestsellerit/backstage-plugin-harbor-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin({
  logger,
  config,
}: PluginEnvironment): Promise<Router> {
  return await createRouter({ logger, config });
}
```

And finally, wire this into the overall backend router. Edit `packages/backend/src/index.ts`

```ts
import harbor from './plugins/harbor';
// ...
async function main() {
  // ...
  const harborEnv = useHotMemoize(module, () => createEnv('harbor'));
  apiRouter.use('/harbor', await harborusage(harborEnv));

```

## Configuration

The plugin requires configuration in the Backstage app-config.yaml to connect to harbors API.

```yaml
harbor:
  baseUrl: https://harbor.yourdomain.com
  username: 
    $env: HARBOR_USERNAME
  password:
    $env: HARBOR_PASSWORD

```

Adding annotations and values to your component file.

```yaml
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: sample-system
  description: "A sample system"
  annotations:
    goharbor.io/repository-slug: project/repository
```

## Contributing

Everyone is welcome to contribute to this repository. Feel free to raise [issues](https://github.com/container-registry/backstage-plugin-harbor-backend/issues) or to submit [Pull Requests.](https://github.com/container-registry/backstage-plugin-harbor-backend/pulls)

To test the plugin locally set environment variables APP_CONFIG_harbor_baseUrl, APP_CONFIG_harbor_username and APP_CONFIG_harbor_password. Run "yarn start" and access the endpoint at http://localhost:7007/artifacts?project={your-project-name}&repository={your-repo-name}


## History

This Backstage plugin was initially created by [BESTSELLER](https://github.com/BESTSELLER) and transferred to us.
