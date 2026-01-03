import { defineConfig } from 'vitepress'

import pkg from '../../package.json';

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "MCP-Web",
  description: "MCP integration for frontend web apps",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Get Started', link: '/get-started' },
      { text: 'API', link: '/api-reference' },
      {
        text: `v${pkg.version}`,
        items: [
          {
            text: 'npm',
            link: 'https://www.npmjs.com/package/@mcp-web/web'
          },
          {
            text: 'Changelog',
            link: 'https://github.com/flekschas/mcp-web/blob/main/CHANGELOG.md'
          }
        ]
      }
    ],

    sidebar: [
      {
        text: 'Guides',
        items: [
          { text: 'Get Started', link: '/get-started' },
          { text: 'Frontend Queries', link: '/frontend-triggered-queries' },
          { text: 'Structuring Your App', link: '/structuring-your-app' },
          { text: 'Integrations', link: '/integrations' },
          { text: 'Large Schemas', link: '/large-schema' },
        ]
      },
      {
        text: 'Learn',
        items: [
          { text: 'MCP-Web Architecture', link: '/architecture' },
          { text: 'Declarative & Reactive State', link: '/declarative-reactive-state' }
        ]
      },
      {
        text: 'Examples',
        items: [
          { text: 'Todo', link: '/demos/todo' },
          { text: 'Checkers Game', link: '/demos/checkers' },
          { text: 'HiGlass', link: '/demos/higlass' },
        ]
      },
      {
        text: 'API Reference',
        link: '/api-reference',
      },
      {
        text: 'GitHub',
        link: 'https://github.com/flekschas/mcp-web/',
      },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/flekschas/mcp-web/' }
    ]
  },
  markdown: {
    image: {
      lazyLoading: true
    }
  }
})
