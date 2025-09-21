import * as Plot from "@observablehq/plot";
import { useEffect, useRef } from "react";

export interface Workload {
  name: string;
  taskCount: number;
  completedCount: number;
  completionRate: number;
}

export interface TeamWorkloadChartProps {
  data: Workload[];
}

export const TeamWorkloadChart = ({ data }: TeamWorkloadChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || data.length === 0) return;

    const plot = Plot.plot({
      title: "Team Workload & Completion Rates",
      width: 600,
      height: 300,
      x: { label: "Team Member" },
      y: { label: "Tasks" },
      color: { legend: true },
      marks: [
        Plot.barY(data, {
          x: "name",
          y: "taskCount",
          fill: "#94a3b8",
          tip: true,
          title: (d) => `${d.name}: ${d.taskCount} total tasks`
        }),
        Plot.barY(data, {
          x: "name",
          y: "completedCount",
          fill: "#22c55e",
          tip: true,
          title: (d) => `${d.name}: ${d.completedCount} completed (${d.completionRate}%)`
        }),
        Plot.ruleY([0])
      ]
    });

    containerRef.current.replaceChildren(plot);

    return () => plot.remove();
  }, [data]);

  return <div ref={containerRef} className="w-full flex justify-center" />;
};
