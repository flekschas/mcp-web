import { defineConfig } from 'vitepress'

import pkg from '../../package.json';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "MCP-Web",
  description: "Expose frontend state and actions as MCP tools for AI agents",
  lastUpdated: true,
  cleanUrls: true,
  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#dc44b5' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'en' }],
    ['meta', { name: 'og:site_name', content: 'MCP-Web' }],
    [
      'script',
      {
        'async': '',
        src: 'https://cdn.counter.dev/script.js',
        'data-id': 'c0cd84ef-1b57-4616-a6db-c26306f866b7',
        'data-utcoffset': '-4',
      }
    ],
  ],
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: { light: '/logo-light.svg', dark: '/logo-dark.svg' },
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Get Started', link: '/get-started' },
      { text: 'API', link: '/api/' },
      {
        text: `v${pkg.version}`,
        items: [
          {
            text: 'npm',
            link: 'https://www.npmjs.com/package/@mcp-web/core'
          },
          {
            text: 'Changelog',
            link: 'https://github.com/flekschas/mcp-web/blob/main/CHANGELOG.md'
          }
        ]
      }
    ],

    sidebar: {
      '/': [
        {
          text: 'Guides',
          items: [
            { text: 'Get Started', link: '/get-started' },
            { text: 'Frontend Queries', link: '/frontend-triggered-queries' },
            { text: 'Interactive Apps', link: '/interactive-apps' },
            { text: 'Structuring Your App', link: '/structuring-your-app' },
            { text: 'Integrations', link: '/integrations' },
            { text: 'Expanded State Tools', link: '/expanded-state-tools' },
            { text: 'Large Schemas', link: '/large-schema' },
          ]
        },
        {
          text: 'Learn',
          items: [
            { text: 'MCP-Web Architecture', link: '/architecture' },
            { text: 'Declarative & Reactive State', link: '/declarative-reactive-state' },
            { text: 'Designing State Tools', link: '/designing-state-tools' },
          ]
        },
        {
          text: 'Examples',
          items: [
            { text: 'Todo', link: '/demos/todo' },
            { text: 'Checkers', link: '/demos/checkers' },
            { text: 'HiGlass', link: '/demos/higlass' },
          ]
        },
        {
          text: 'API Reference',
          link: '/api',
        },
        {
          text: 'GitHub',
          link: 'https://github.com/flekschas/mcp-web/',
        },
      ],
      '/api/': [
        {
          text: 'API Reference by Package:',
          items: [
            { text: 'Core', link: '/api/core' },
            { text: 'Bridge', link: '/api/bridge' },
            { text: 'Client', link: '/api/client' },
            { text: 'App', link: '/api/app' },
            { text: 'Tools', link: '/api/tools' },
            { text: 'Integrations', link: '/api/integrations' },
            { text: 'Decompose Zod Schema', link: '/api/decompose-zod-schema' },
            { text: 'MCPB', link: '/api/mcpb' },
          ]
        },
      ]
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/flekschas/mcp-web/' }
    ],

    footer: {
      message: '<a href="/made-with-love">Made with <span id="footer-heart-mount"></span> by Fritz and Claude</a>',
    }
  },
  markdown: {
    image: {
      lazyLoading: true
    }
  },
  sitemap: {
    hostname: 'https://mcp-web.dev'
  }
})
