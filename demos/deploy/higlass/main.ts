import { createDemoServer } from '../lib/create-demo-server.ts';

createDemoServer({
  bridge: {
    name: 'MCP-Web HiGlass Demo',
    description:
      'Control the HiGlass genome browser - navigate genomic regions, add/remove tracks, and explore Hi-C data',
  },
  staticDir: './static',
});
