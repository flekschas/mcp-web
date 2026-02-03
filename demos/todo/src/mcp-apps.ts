import { createApp } from '@mcp-web/app';
import { getDefaultStore } from 'jotai';
import { Statistics, StatisticsPropsSchema } from './components/Statistics';
import { statisticsAtom } from './states';

const store = getDefaultStore();

/**
 * Statistics MCP App - displays todo completion statistics.
 *
 * When AI calls this tool, it returns props that are rendered
 * in a visual UI component inside Claude Desktop.
 */
export const statisticsApp = createApp({
  name: 'statistics',
  description:
    'Display visual statistics about the todo list including completion rates, todos by project, and recently completed items. Use this when the user wants to see an overview or summary of their todos.',
  component: Statistics,
  propsSchema: StatisticsPropsSchema,
  handler: () => store.get(statisticsAtom),
});
