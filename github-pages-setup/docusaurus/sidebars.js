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
        'architecture/domain-driven-design',
        'architecture/module-structure',
        'architecture/event-system',
        'architecture/security',
      ],
    },
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/installation',
        'getting-started/quick-start',
        'getting-started/first-test',
        'getting-started/configuration',
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
            'components/core/events',
            'components/core/utilities',
          ],
        },
        {
          type: 'category',
          label: 'Browser',
          items: [
            'components/browser/overview',
            'components/browser/automation',
            'components/browser/websocket',
          ],
        },
        {
          type: 'category',
          label: 'Extensions',
          items: [
            'components/extensions/chrome',
            'components/extensions/firefox',
            'components/extensions/edge',
          ],
        },
        {
          type: 'category',
          label: 'Domains',
          items: [
            'components/domains/google-images',
            'components/domains/chatgpt',
            'components/domains/custom',
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
        'api/server',
        'api/events',
        'api/websocket-protocol',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/docker',
        'deployment/kubernetes',
        'deployment/ci-cd',
        'deployment/monitoring',
        'deployment/scaling',
      ],
    },
    {
      type: 'category',
      label: 'Resources',
      items: [
        'resources/examples',
        'resources/tutorials',
        'resources/faq',
        'resources/troubleshooting',
        'resources/changelog',
      ],
    },
  ],
}

module.exports = sidebars