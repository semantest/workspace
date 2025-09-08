/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  // Main documentation sidebar
  tutorialSidebar: [
    {
      type: 'doc',
      id: 'overview',
      label: 'Overview',
    },
    {
      type: 'category',
      label: 'Architecture',
      items: [
        'architecture/introduction',
      ],
    },
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/quick-start',
      ],
    },
    {
      type: 'category',
      label: 'Components',
      items: [
        {
          type: 'category',
          label: 'Core',
          items: [
            'components/core/overview',
          ],
        },
        {
          type: 'category',
          label: 'Application Layer',
          items: [
            'components/application/overview',
          ],
        },
        {
          type: 'category',
          label: 'Domain Layer',
          items: [
            'components/domain/overview',
          ],
        },
        {
          type: 'category',
          label: 'Backend Services',
          items: [
            'components/backend/overview',
          ],
        },
        {
          type: 'category',
          label: 'Browser Integration',
          items: [
            'components/browser/websocket',
          ],
        },
        {
          type: 'category',
          label: 'Extensions',
          items: [
            'components/extensions/chrome',
            'components/extensions/content-script-api',
            'components/extensions/user-guide',
          ],
        },
        {
          type: 'category',
          label: 'Domains',
          items: [
            'components/domains/image-download',
          ],
        },
        {
          type: 'category',
          label: 'SDK & Client',
          items: [
            'components/sdk/client',
            'components/sdk/overview',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Developer Guide',
      items: [
        'developer-guide/contributing',
        'developer-guide/testing',
        'developer-guide/debugging',
        'developer-guide/best-practices',
        'developer-guide/style-guide',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api/client',
        'api/backend',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/docker',
        'deployment/infrastructure/overview',
      ],
    },
  ],
}

module.exports = sidebars