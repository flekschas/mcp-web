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
          { text: 'Integrations', link: '/integrations' },
        ]
      },
      {
        text: 'Learn',
        items: [
          { text: 'Expose Frontend State and Actions as MCP Tools', link: '/setup' },
          { text: 'Trigger Queries from Frontend', link: '/frontend-triggered-queries' },
          { text: 'MCP-Web Architecture', link: '/architecture' }
        ]
      },
      {
        text: 'Examples',
        items: [
          { text: 'Kanban Board', link: '/demos/kanban' },
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
  }
})
