import * as Plot from "@observablehq/plot";
import { useEffect, useRef } from "react";
import type { Task } from "../../types";

export interface TaskAgeHistogramProps {
  tasks: Task[];
}

export const TaskAgeHistogram = ({ tasks }: TaskAgeHistogramProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || tasks.length === 0) return;

    const now = new Date();
    const tasksWithAge = tasks.map(task => ({
      ...task,
      ageInDays: Math.floor((now.getTime() - new Date(task.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    }));

    const plot = Plot.plot({
      title: "Task Age Distribution",
      width: 500,
      height: 250,
      x: { label: "Age (days)" },
      y: { label: "Number of tasks" },
      marks: [
        Plot.rectY(tasksWithAge, Plot.binX(
          { y: "count" },
          { x: "ageInDays", thresholds: 10 }
        )),
        Plot.ruleY([0])
      ]
    });

    containerRef.current.replaceChildren(plot);

    return () => plot.remove();
  }, [tasks]);

  return <div ref={containerRef} className="w-full flex justify-center" />;
};
