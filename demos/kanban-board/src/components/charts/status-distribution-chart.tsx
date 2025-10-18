import * as Plot from '@observablehq/plot';
import { useEffect, useRef } from 'react';

export interface StatusDistributionChartProps {
  data: { status: string; count: number; percentage: number }[];
}

export const StatusDistributionChart = ({
  data,
}: StatusDistributionChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const plot = Plot.plot({
      title: 'Task Status Distribution',
      width: 400,
      height: 300,
      color: { scheme: 'observable10' },
      marks: [
        Plot.barX(data, {
          x: 'count',
          y: 'status',
          fill: 'status',
          tip: true,
          title: (d) => `${d.status}: ${d.count} tasks (${d.percentage}%)`,
        }),
        Plot.text(data, {
          x: (d) => d.count / 2,
          y: 'status',
          text: (d) => d.count.toString(),
          fill: 'white',
          fontSize: 14,
          fontWeight: 'bold',
        }),
      ],
    });

    containerRef.current.replaceChildren(plot);

    return () => plot.remove();
  }, [data]);

  return <div ref={containerRef} className="w-full flex justify-center" />;
};
