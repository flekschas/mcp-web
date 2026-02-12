import { CalendarIcon, CheckIcon, ClockIcon, MinusIcon } from '@heroicons/react/20/solid';
import * as Plot from '@observablehq/plot';
import { useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import '../index.css';

/* ---------------------------------- Styles -------------------------------- */

// Observable Plot SVG styling for dark mode compatibility
const plotContainerStyle = `
  [class*="plot-"] text,
  [class*="plot-"] .tick text {
    fill: var(--color-text) !important;
  }
  [class*="plot-"] .tick line,
  [class*="plot-"] [aria-label="y-grid"] line {
    stroke: var(--color-border) !important;
  }
  [class*="plot-"] [aria-label="y-axis"] line,
  [class*="plot-"] [aria-label="x-axis"] line {
    stroke: var(--color-text) !important;
  }
  /* Tooltip styling for dark mode */
  [class*="plot-"] [aria-label="tip"] g {
    fill: var(--color-bg) !important;
    stroke: var(--color-border) !important;
  }
  [class*="plot-"] [aria-label="tip"] text {
    fill: var(--color-text) !important;
  }
`;

/* --------------------------------- Schema --------------------------------- */

export const StatisticsPropsSchema = z.object({
  totalTodos: z.number().describe('Total number of todos'),
  completedTodos: z.number().describe('Number of completed todos'),
  activeTodos: z.number().describe('Number of active (incomplete) todos'),
  completionRate: z.number().describe('Completion rate as decimal (0-1)'),
  totalProjects: z.number().describe('Total number of projects'),
  completedTodosWithTime: z
    .array(
      z.object({
        id: z.string(),
        completionTimeMs: z.number().describe('Time to complete in milliseconds'),
        projectId: z.string().nullable(),
        projectName: z.string(),
      })
    )
    .describe('Completed todos with completion time for charts'),
  completedTodosWithDueDate: z
    .array(
      z.object({
        id: z.string(),
        dueVarianceMs: z.number().describe('Variance from due date in ms (negative = early)'),
        projectId: z.string().nullable(),
        projectName: z.string(),
      })
    )
    .describe('Completed todos with due date variance'),
  projects: z
    .array(
      z.object({
        id: z.string().nullable(),
        name: z.string(),
      })
    )
    .describe('List of projects for filtering'),
  projectStats: z
    .array(
      z.object({
        id: z.string().nullable(),
        name: z.string(),
        total: z.number(),
        completed: z.number(),
        active: z.number(),
      })
    )
    .describe('Per-project statistics for filtering'),
});

export type StatisticsProps = z.infer<typeof StatisticsPropsSchema>;

/* --------------------------------- Utils ---------------------------------- */

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

type BucketType = 'hours' | 'days';

interface TimeBucket {
  label: string;
  min: number;
  max: number;
}

const HOUR_BUCKETS: TimeBucket[] = [
  { label: '0-1h', min: 0, max: MS_PER_HOUR },
  { label: '1-4h', min: MS_PER_HOUR, max: 4 * MS_PER_HOUR },
  { label: '4-12h', min: 4 * MS_PER_HOUR, max: 12 * MS_PER_HOUR },
  { label: '12-24h', min: 12 * MS_PER_HOUR, max: MS_PER_DAY },
  { label: '1-3d', min: MS_PER_DAY, max: 3 * MS_PER_DAY },
  { label: '3-7d', min: 3 * MS_PER_DAY, max: 7 * MS_PER_DAY },
  { label: '7d+', min: 7 * MS_PER_DAY, max: Infinity },
];

const DAY_BUCKETS: TimeBucket[] = [
  { label: 'Same day', min: 0, max: MS_PER_DAY },
  { label: '1 day', min: MS_PER_DAY, max: 2 * MS_PER_DAY },
  { label: '2-3 days', min: 2 * MS_PER_DAY, max: 4 * MS_PER_DAY },
  { label: '4-7 days', min: 4 * MS_PER_DAY, max: 8 * MS_PER_DAY },
  { label: '1-2 weeks', min: 8 * MS_PER_DAY, max: 15 * MS_PER_DAY },
  { label: '2+ weeks', min: 15 * MS_PER_DAY, max: Infinity },
];

const DUE_VARIANCE_BUCKETS: TimeBucket[] = [
  { label: 'Early 3d+', min: -Infinity, max: -3 * MS_PER_DAY },
  { label: 'Early 1-3d', min: -3 * MS_PER_DAY, max: -MS_PER_DAY },
  { label: 'On time', min: -MS_PER_DAY, max: MS_PER_DAY },
  { label: 'Late 1-3d', min: MS_PER_DAY, max: 3 * MS_PER_DAY },
  { label: 'Late 3d+', min: 3 * MS_PER_DAY, max: Infinity },
];

function getBucket(value: number, buckets: TimeBucket[]): string {
  for (const bucket of buckets) {
    if (value >= bucket.min && value < bucket.max) {
      return bucket.label;
    }
  }
  return buckets[buckets.length - 1].label;
}

/* -------------------------------- Patterns -------------------------------- */

// Pattern IDs matching CSS class names for consistency
const PATTERN_IDS = [
  'pattern-diagonal',
  'pattern-dots',
  'pattern-hlines',
  'pattern-vlines',
  'pattern-grid',
] as const;

// SVG pattern definitions using native SVG elements
// Note: foreignObject approach doesn't work for patterns in most browsers
function createPatternDefs(): string {
  const color = 'var(--color-text)';
  const bg = 'var(--color-bg)';
  
  return `
    <pattern id="pattern-diagonal" patternUnits="userSpaceOnUse" width="7" height="7">
      <rect width="7" height="7" fill="${bg}"/>
      <line x1="0" y1="7" x2="7" y2="0" stroke="${color}" stroke-width="2"/>
    </pattern>
    <pattern id="pattern-dots" patternUnits="userSpaceOnUse" width="6" height="6">
      <rect width="6" height="6" fill="${bg}"/>
      <circle cx="3" cy="3" r="1.5" fill="${color}"/>
    </pattern>
    <pattern id="pattern-hlines" patternUnits="userSpaceOnUse" width="6" height="6">
      <rect width="6" height="6" fill="${bg}"/>
      <line x1="0" y1="3" x2="6" y2="3" stroke="${color}" stroke-width="2"/>
    </pattern>
    <pattern id="pattern-vlines" patternUnits="userSpaceOnUse" width="6" height="6">
      <rect width="6" height="6" fill="${bg}"/>
      <line x1="3" y1="0" x2="3" y2="6" stroke="${color}" stroke-width="2"/>
    </pattern>
    <pattern id="pattern-grid" patternUnits="userSpaceOnUse" width="7" height="7">
      <rect width="7" height="7" fill="${bg}"/>
      <line x1="0" y1="0" x2="7" y2="0" stroke="${color}" stroke-width="2"/>
      <line x1="0" y1="0" x2="0" y2="7" stroke="${color}" stroke-width="2"/>
    </pattern>
  `;
}

/* ------------------------------- Components ------------------------------- */

function ProgressBar({ value, max }: { value: number; max: number }) {
  const percentage = max > 0 ? (value / max) * 100 : 0;

  return (
    <div className="w-full h-2 bg-(--color-border) rounded overflow-hidden">
      <div
        className="h-full bg-(--color-accent) rounded transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sublabel,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
}) {
  return (
    <div className="bg-(--color-accent-subtle) rounded-lg p-4 text-center">
      <div className="text-2xl font-bold text-(--color-text)">{value}</div>
      <div className="text-xs text-(--color-text-muted) mt-1">{label}</div>
      {sublabel && (
        <div className="text-[10px] text-(--color-text-muted) opacity-70 mt-0.5">{sublabel}</div>
      )}
    </div>
  );
}

function PatternLegend({ projects }: { projects: string[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs mt-2">
      {projects.map((name, i) => (
        <div key={name} className="flex items-center gap-1.5">
          <div
            className={`w-4 h-4 rounded border border-(--color-border) ${PATTERN_IDS[i % PATTERN_IDS.length]}`}
          />
          <span className="text-(--color-text-muted)">{name}</span>
        </div>
      ))}
    </div>
  );
}

function CompletionTimeChart({
  data,
  projectFilter,
  stratifyByProject,
  bucketType,
  projectNames,
}: {
  data: StatisticsProps['completedTodosWithTime'];
  projectFilter: string | null | 'all';
  stratifyByProject: boolean;
  bucketType: BucketType;
  projectNames: string[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredData = useMemo(() => {
    if (projectFilter === 'all') return data;
    return data.filter((d) => d.projectId === projectFilter);
  }, [data, projectFilter]);

  const buckets = bucketType === 'hours' ? HOUR_BUCKETS : DAY_BUCKETS;
  const bucketOrder = buckets.map((b) => b.label);

  const chartData = useMemo(() => {
    return filteredData.map((d) => ({
      ...d,
      bucket: getBucket(d.completionTimeMs, buckets),
    }));
  }, [filteredData, buckets]);

  useEffect(() => {
    if (!containerRef.current || chartData.length === 0) return;

    const plot = Plot.plot({
      marginLeft: 40,
      marginBottom: 50,
      marginRight: 20,
      height: 200,
      width: containerRef.current.clientWidth,
      x: {
        label: null,
        domain: bucketOrder,
        padding: 0.2,
        tickRotate: -30,
      },
      y: {
        label: 'Count',
        grid: true,
      },
      color: stratifyByProject
        ? { domain: projectNames, range: projectNames.map((_, i) => `url(#${PATTERN_IDS[i % PATTERN_IDS.length]})`) }
        : undefined,
      marks: stratifyByProject
        ? [
            // Stratified: stacked bars with per-segment tooltips
            Plot.barY(
              chartData,
              Plot.stackY(
                Plot.groupX(
                  { y: 'count' },
                  { x: 'bucket', fill: 'projectName' }
                )
              )
            ),
            Plot.ruleY([0]),
            Plot.tip(
              chartData,
              Plot.pointer(
                Plot.stackY(
                  Plot.groupX(
                    { y: 'count' },
                    { x: 'bucket', fill: 'projectName' }
                  )
                )
              )
            ),
          ]
        : [
            // Non-stratified: simple bars with tooltip
            Plot.barY(
              chartData,
              Plot.groupX(
                { y: 'count' },
                { x: 'bucket', fill: 'var(--color-accent)' }
              )
            ),
            Plot.ruleY([0]),
            Plot.tip(
              chartData,
              Plot.pointerX(
                Plot.groupX(
                  { y: 'count' },
                  { x: 'bucket' }
                )
              )
            ),
          ],
    });

    // Inject SVG pattern definitions
    if (stratifyByProject) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = createPatternDefs();
      plot.insertBefore(defs, plot.firstChild);
    }

    containerRef.current.replaceChildren(plot);
    return () => plot.remove();
  }, [chartData, stratifyByProject, bucketOrder, projectNames]);

  if (filteredData.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center text-(--color-text-muted) text-sm">
        No completed todos to display
      </div>
    );
  }

  return (
    <>
      <style>{plotContainerStyle}</style>
      <div ref={containerRef} className="w-full" />
      {stratifyByProject && <PatternLegend projects={projectNames} />}
    </>
  );
}

function DueVarianceChart({
  data,
  projectFilter,
  stratifyByProject,
  projectNames,
}: {
  data: StatisticsProps['completedTodosWithDueDate'];
  projectFilter: string | null | 'all';
  stratifyByProject: boolean;
  projectNames: string[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  const filteredData = useMemo(() => {
    if (projectFilter === 'all') return data;
    return data.filter((d) => d.projectId === projectFilter);
  }, [data, projectFilter]);

  const bucketOrder = DUE_VARIANCE_BUCKETS.map((b) => b.label);

  const chartData = useMemo(() => {
    return filteredData.map((d) => ({
      ...d,
      bucket: getBucket(d.dueVarianceMs, DUE_VARIANCE_BUCKETS),
    }));
  }, [filteredData]);

  useEffect(() => {
    if (!containerRef.current || chartData.length === 0) return;

    const plot = Plot.plot({
      marginLeft: 40,
      marginBottom: 50,
      marginRight: 20,
      height: 200,
      width: containerRef.current.clientWidth,
      x: {
        label: null,
        domain: bucketOrder,
        padding: 0.2,
        tickRotate: -30,
      },
      y: {
        label: 'Count',
        grid: true,
      },
      color: stratifyByProject
        ? { domain: projectNames, range: projectNames.map((_, i) => `url(#${PATTERN_IDS[i % PATTERN_IDS.length]})`) }
        : undefined,
      marks: stratifyByProject
        ? [
            // Stratified: stacked bars with per-segment tooltips
            Plot.barY(
              chartData,
              Plot.stackY(
                Plot.groupX(
                  { y: 'count' },
                  { x: 'bucket', fill: 'projectName' }
                )
              )
            ),
            Plot.ruleY([0]),
            Plot.tip(
              chartData,
              Plot.pointer(
                Plot.stackY(
                  Plot.groupX(
                    { y: 'count' },
                    { x: 'bucket', fill: 'projectName' }
                  )
                )
              )
            ),
          ]
        : [
            // Non-stratified: simple bars with tooltip
            Plot.barY(
              chartData,
              Plot.groupX(
                { y: 'count' },
                { x: 'bucket', fill: 'var(--color-accent)' }
              )
            ),
            Plot.ruleY([0]),
            Plot.tip(
              chartData,
              Plot.pointerX(
                Plot.groupX(
                  { y: 'count' },
                  { x: 'bucket' }
                )
              )
            ),
          ],
    });

    // Inject SVG pattern definitions
    if (stratifyByProject) {
      const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.innerHTML = createPatternDefs();
      plot.insertBefore(defs, plot.firstChild);
    }

    containerRef.current.replaceChildren(plot);
    return () => plot.remove();
  }, [chartData, stratifyByProject, bucketOrder, projectNames]);

  if (filteredData.length === 0) {
    return (
      <div className="h-16 flex items-center justify-center text-(--color-text-muted) text-sm">
        No todos with due dates to display
      </div>
    );
  }

  return (
    <>
      <style>{plotContainerStyle}</style>
      <div ref={containerRef} className="w-full" />
      {stratifyByProject && <PatternLegend projects={projectNames} />}
    </>
  );
}

/* ------------------------------ Main Export ------------------------------- */

export function Statistics({
  totalTodos,
  completedTodos,
  activeTodos,
  completionRate,
  completedTodosWithTime,
  completedTodosWithDueDate,
  projects,
  projectStats,
}: StatisticsProps) {
  // Shared filter state for both charts
  const [projectFilter, setProjectFilter] = useState<string | null | 'all'>('all');
  const [stratifyByProject, setStratifyByProject] = useState(false);
  const [bucketType, setBucketType] = useState<BucketType>('days');

  // Get unique project names for stratification
  const projectNames = useMemo(() => projects.map((p) => p.name), [projects]);

  // Get stats for filtered view from pre-computed projectStats
  const filteredStats = useMemo(() => {
    if (projectFilter === 'all') {
      return { total: totalTodos, completed: completedTodos, active: activeTodos };
    }
    const stats = projectStats.find((p) => p.id === projectFilter);
    return stats 
      ? { total: stats.total, completed: stats.completed, active: stats.active }
      : { total: 0, completed: 0, active: 0 };
  }, [projectFilter, totalTodos, completedTodos, activeTodos, projectStats]);

  const displayCompletionRate =
    projectFilter === 'all'
      ? completionRate
      : filteredStats.total > 0
        ? filteredStats.completed / filteredStats.total
        : 0;

  return (
    <div className="font-sans w-full bg-(--color-bg) text-(--color-text)">
      {/* Centralized Controls - styled like header */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
        {/* Project filter */}
        <select
          value={projectFilter === null ? 'inbox' : projectFilter}
          onChange={(e) => {
            const val = e.target.value;
            setProjectFilter(val === 'all' ? 'all' : val === 'inbox' ? null : val);
            // Disable stratify when filtering by project
            if (val !== 'all') {
              setStratifyByProject(false);
            }
          }}
          className="select-retro py-2 pr-8 pl-3 text-xs font-semibold uppercase tracking-wide text-(--color-text) border-2 border-transparent rounded-md cursor-pointer transition-all"
        >
          <option value="all">Project: All</option>
          {projects.map((p) => (
            <option key={p.id ?? 'inbox'} value={p.id ?? 'inbox'}>
              Project: {p.name}
            </option>
          ))}
        </select>

        {/* Time bucket toggle */}
        <button
          type="button"
          onClick={() => setBucketType((prev) => prev === 'days' ? 'hours' : 'days')}
          className="inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-(--color-accent-subtle) hover:bg-(--color-accent-subtle-hover) text-(--color-text) border-2 border-transparent rounded-md text-xs font-semibold uppercase tracking-wide transition-all cursor-pointer select-none"
        >
          {bucketType === 'days' ? <CalendarIcon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />}
          {bucketType === 'days' ? 'Days' : 'Hours'}
        </button>

        {/* Stratify toggle - disabled when filtering by project */}
        <button
          type="button"
          onClick={() => setStratifyByProject((prev) => !prev)}
          disabled={projectFilter !== 'all'}
          className={`inline-flex items-center justify-center gap-1.5 py-2 px-3 bg-(--color-accent-subtle) text-(--color-text) border-2 border-transparent rounded-md text-xs font-semibold uppercase tracking-wide transition-all select-none ${
            projectFilter !== 'all' 
              ? 'opacity-40 cursor-not-allowed' 
              : 'hover:bg-(--color-accent-subtle-hover) cursor-pointer'
          }`}
        >
          {stratifyByProject ? <CheckIcon className="w-4 h-4" /> : <MinusIcon className="w-4 h-4" />}
          Stratify
        </button>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Total" value={totalTodos} />
        <StatCard label="Completed" value={completedTodos} />
        <StatCard label="Active" value={activeTodos} />
      </div>

      {/* Completion Progress */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-(--color-text)">
            {projectFilter === 'all'
              ? 'Overall Progress'
              : `Progress: ${projects.find((p) => p.id === projectFilter)?.name ?? 'Inbox'}`}
          </span>
          <span className="text-sm font-bold text-(--color-accent)">
            {Math.round(displayCompletionRate * 100)}%
          </span>
        </div>
        <ProgressBar value={filteredStats.completed} max={filteredStats.total || totalTodos} />
      </div>

      {/* Completion Time Chart */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-(--color-text) mb-3">
          Completion Time Distribution
        </h2>
        <div className="bg-(--color-accent-subtle) rounded-lg p-3">
          <CompletionTimeChart
            data={completedTodosWithTime}
            projectFilter={projectFilter}
            stratifyByProject={stratifyByProject}
            bucketType={bucketType}
            projectNames={projectNames}
          />
        </div>
      </div>

      {/* Due Variance Chart */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-(--color-text) mb-1">
          Due Date Performance
        </h2>
        <p className="text-xs text-(--color-text-muted) mb-3">
          How early or late todos were completed relative to their due date
        </p>
        <div className="bg-(--color-accent-subtle) rounded-lg p-3">
          <DueVarianceChart
            data={completedTodosWithDueDate}
            projectFilter={projectFilter}
            stratifyByProject={stratifyByProject}
            projectNames={projectNames}
          />
        </div>
      </div>

      {/* Empty State */}
      {totalTodos === 0 && (
        <div className="text-center py-10 text-(--color-text-muted)">
          <div className="text-5xl mb-3">📝</div>
          <div className="text-sm">
            No todos yet. Create some to see statistics!
          </div>
        </div>
      )}
    </div>
  );
}
