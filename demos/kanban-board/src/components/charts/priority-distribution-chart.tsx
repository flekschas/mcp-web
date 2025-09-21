import * as Plot from "@observablehq/plot";
import { useEffect, useRef } from "react";

export interface Priority {
  priority: string;
  count: number;
}

export interface PriorityDistributionChartProps {
  data: Priority[];
}

export const PriorityDistributionChart = ({ data }: PriorityDistributionChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const plot = Plot.plot({
      title: "Priority Distribution",
      width: 300,
      height: 300,
      color: { scheme: "spectral" },
      marks: [
        Plot.barY(data, {
          x: "priority",
          y: "count",
          fill: "priority",
          tip: true,
          title: (d: Priority) => `${d.priority}: ${d.count} tasks`
        }),
        Plot.ruleY([0])
      ]
    });

    containerRef.current.replaceChildren(plot);

    return () => plot.remove();
  }, [data]);

  return <div ref={containerRef} className="w-full flex justify-center" />;
};
