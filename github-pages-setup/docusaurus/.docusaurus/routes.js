import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/workspace/blog',
    component: ComponentCreator('/workspace/blog', 'ed9'),
    exact: true
  },
  {
    path: '/workspace/blog/archive',
    component: ComponentCreator('/workspace/blog/archive', 'cf5'),
    exact: true
  },
  {
    path: '/workspace/blog/tags',
    component: ComponentCreator('/workspace/blog/tags', '355'),
    exact: true
  },
  {
    path: '/workspace/blog/tags/announcement',
    component: ComponentCreator('/workspace/blog/tags/announcement', '7c4'),
    exact: true
  },
  {
    path: '/workspace/blog/tags/getting-started',
    component: ComponentCreator('/workspace/blog/tags/getting-started', '03b'),
    exact: true
  },
  {
    path: '/workspace/blog/welcome',
    component: ComponentCreator('/workspace/blog/welcome', 'f62'),
    exact: true
  },
  {
    path: '/workspace/search',
    component: ComponentCreator('/workspace/search', '28e'),
    exact: true
  },
  {
    path: '/workspace/docs',
    component: ComponentCreator('/workspace/docs', '5dc'),
    routes: [
      {
        path: '/workspace/docs',
        component: ComponentCreator('/workspace/docs', '75e'),
        routes: [
          {
            path: '/workspace/docs',
            component: ComponentCreator('/workspace/docs', '5a7'),
            routes: [
              {
                path: '/workspace/docs',
                component: ComponentCreator('/workspace/docs', 'e62'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/api/backend',
                component: ComponentCreator('/workspace/docs/api/backend', '78e'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/api/client',
                component: ComponentCreator('/workspace/docs/api/client', 'b92'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/architecture/introduction',
                component: ComponentCreator('/workspace/docs/architecture/introduction', '568'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/components/application/overview',
                component: ComponentCreator('/workspace/docs/components/application/overview', 'fb4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/components/backend/overview',
                component: ComponentCreator('/workspace/docs/components/backend/overview', '35f'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/components/browser/websocket',
                component: ComponentCreator('/workspace/docs/components/browser/websocket', '3c7'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/components/core/overview',
                component: ComponentCreator('/workspace/docs/components/core/overview', '64d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/components/domain/overview',
                component: ComponentCreator('/workspace/docs/components/domain/overview', '32d'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/components/domains/image-download',
                component: ComponentCreator('/workspace/docs/components/domains/image-download', '137'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/components/extensions/chrome',
                component: ComponentCreator('/workspace/docs/components/extensions/chrome', '9ca'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/components/extensions/content-script-api',
                component: ComponentCreator('/workspace/docs/components/extensions/content-script-api', '6c4'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/components/extensions/user-guide',
                component: ComponentCreator('/workspace/docs/components/extensions/user-guide', '435'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/components/sdk/client',
                component: ComponentCreator('/workspace/docs/components/sdk/client', '968'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/components/sdk/overview',
                component: ComponentCreator('/workspace/docs/components/sdk/overview', '0fc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/deployment/docker',
                component: ComponentCreator('/workspace/docs/deployment/docker', 'b8c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/deployment/infrastructure/overview',
                component: ComponentCreator('/workspace/docs/deployment/infrastructure/overview', 'cdc'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/developer-guide/best-practices',
                component: ComponentCreator('/workspace/docs/developer-guide/best-practices', 'ae6'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/developer-guide/contributing',
                component: ComponentCreator('/workspace/docs/developer-guide/contributing', 'df5'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/developer-guide/debugging',
                component: ComponentCreator('/workspace/docs/developer-guide/debugging', 'c10'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/developer-guide/style-guide',
                component: ComponentCreator('/workspace/docs/developer-guide/style-guide', '266'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/developer-guide/testing',
                component: ComponentCreator('/workspace/docs/developer-guide/testing', '22a'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/getting-started/quick-start',
                component: ComponentCreator('/workspace/docs/getting-started/quick-start', 'b65'),
                exact: true,
                sidebar: "tutorialSidebar"
              }
            ]
          }
        ]
      }
    ]
  },
  {
    path: '/workspace/',
    component: ComponentCreator('/workspace/', 'bb4'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
