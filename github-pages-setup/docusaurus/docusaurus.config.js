// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Semantest',
  tagline: 'A modular, domain-driven testing framework for browser automation',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://semantest.github.io',
  baseUrl: '/workspace/',

  // GitHub pages deployment config
  organizationName: 'semantest',
  projectName: 'semantest.github.io',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve('./sidebars.js'),
          editUrl: 'https://github.com/semantest/semantest.github.io/tree/main/',
          showLastUpdateAuthor: true,
          showLastUpdateTime: true,
          versions: {
            current: {
              label: 'Latest',
              path: '/',
            },
          },
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/semantest/semantest.github.io/tree/main/',
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/semantest-social-card.jpg',
      navbar: {
        title: 'Semantest',
        logo: {
          alt: 'Semantest Logo',
          src: 'img/logo.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'tutorialSidebar',
            position: 'left',
            label: 'Documentation',
          },
          {
            to: '/api',
            label: 'API',
            position: 'left',
          },
          {
            to: '/blog',
            label: 'Blog',
            position: 'left',
          },
          {
            type: 'docsVersionDropdown',
            position: 'right',
          },
          {
            href: 'https://github.com/semantest/workspace',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Docs',
            items: [
              {
                label: 'Getting Started',
                to: '/docs/getting-started',
              },
              {
                label: 'Architecture',
                to: '/docs/architecture',
              },
              {
                label: 'Components',
                to: '/docs/components',
              },
            ],
          },
          {
            title: 'Community',
            items: [
              {
                label: 'Stack Overflow',
                href: 'https://stackoverflow.com/questions/tagged/semantest',
              },
              {
                label: 'Discord',
                href: 'https://discord.gg/semantest',
              },
              {
                label: 'Twitter',
                href: 'https://twitter.com/semantest',
              },
            ],
          },
          {
            title: 'More',
            items: [
              {
                label: 'Blog',
                to: '/blog',
              },
              {
                label: 'GitHub',
                href: 'https://github.com/semantest',
              },
              {
                label: 'Releases',
                href: 'https://github.com/semantest/workspace/releases',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Semantest. Built with Docusaurus.`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ['bash', 'diff', 'json', 'docker', 'yaml'],
      },
      // Algolia search configuration (to be added later)
      algolia: {
        appId: 'YOUR_APP_ID',
        apiKey: 'YOUR_SEARCH_API_KEY',
        indexName: 'semantest',
        contextualSearch: true,
      },
    }),
}

module.exports = config