import React from 'react';
import ComponentCreator from '@docusaurus/ComponentCreator';

export default [
  {
    path: '/workspace/search',
    component: ComponentCreator('/workspace/search', 'd2e'),
    exact: true
  },
  {
    path: '/workspace/docs',
    component: ComponentCreator('/workspace/docs', 'd8e'),
    routes: [
      {
        path: '/workspace/docs',
        component: ComponentCreator('/workspace/docs', 'b7f'),
        routes: [
          {
            path: '/workspace/docs',
            component: ComponentCreator('/workspace/docs', '941'),
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
                path: '/workspace/docs/components/sdk/client',
                component: ComponentCreator('/workspace/docs/components/sdk/client', '968'),
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
                path: '/workspace/docs/getting-started',
                component: ComponentCreator('/workspace/docs/getting-started', '74c'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/getting-started/quick-start',
                component: ComponentCreator('/workspace/docs/getting-started/quick-start', 'b65'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/success-stories',
                component: ComponentCreator('/workspace/docs/success-stories', 'd76'),
                exact: true,
                sidebar: "tutorialSidebar"
              },
              {
                path: '/workspace/docs/tutorials/amazon-shopping',
                component: ComponentCreator('/workspace/docs/tutorials/amazon-shopping', '140'),
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
    component: ComponentCreator('/workspace/', 'a8e'),
    exact: true
  },
  {
    path: '*',
    component: ComponentCreator('*'),
  },
];
