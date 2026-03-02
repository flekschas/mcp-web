import type { TestApp } from '../types.js';
import { projectManagerApp } from './project-manager.js';
import { higlassApp } from './higlass.js';
import { vegaApp } from './vega.js';

/**
 * Registry of all test apps.
 * Keyed by app name for lookup by the browser harness and runner.
 */
export const apps: Record<string, TestApp> = {
  [projectManagerApp.name]: projectManagerApp,
  [higlassApp.name]: higlassApp,
  [vegaApp.name]: vegaApp,
};

export const appList: TestApp[] = Object.values(apps);
