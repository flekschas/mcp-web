import { useMemo } from 'react';
import type {
  BoardSettings,
  Task,
  TeamMember,
  UserPreferences,
} from '../types';
import { PriorityDistributionChart } from './charts/priority-distribution-chart';
import { StatusDistributionChart } from './charts/status-distribution-chart';
import { TaskAgeHistogram } from './charts/task-age-histogram';
import { TeamWorkloadChart } from './charts/team-workload-chart';

interface StatsViewProps {
  tasks: Task[];
  teamMembers: TeamMember[];
  settings: BoardSettings;
  preferences: UserPreferences;
  filterText: string;
  selectedColumn: string;
  assigneeFilter: string;
}

const StatsView = ({
  tasks,
  teamMembers,
  settings: _settings,
  preferences: _preferences,
  filterText,
  selectedColumn,
  assigneeFilter,
}: StatsViewProps) => {
  // Filter tasks based on current filters
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesFilter =
        filterText === '' ||
        task.title.toLowerCase().includes(filterText.toLowerCase()) ||
        task.description.toLowerCase().includes(filterText.toLowerCase()) ||
        task.tags.some((tag) =>
          tag.toLowerCase().includes(filterText.toLowerCase()),
        );

      const matchesColumn =
        selectedColumn === '' || task.status === selectedColumn;
      const matchesAssignee =
        assigneeFilter === '' || task.assigneeId === assigneeFilter;

      return matchesFilter && matchesColumn && matchesAssignee;
    });
  }, [tasks, filterText, selectedColumn, assigneeFilter]);

  const totalTasks = filteredTasks.length;

  // Status distribution
  const statusCounts = useMemo(() => {
    return {
      todo: filteredTasks.filter((task) => task.status === 'todo').length,
      'in-progress': filteredTasks.filter(
        (task) => task.status === 'in-progress',
      ).length,
      review: filteredTasks.filter((task) => task.status === 'review').length,
      done: filteredTasks.filter((task) => task.status === 'done').length,
    };
  }, [filteredTasks]);

  // Priority distribution
  const priorityCounts = useMemo(() => {
    return {
      urgent: filteredTasks.filter((task) => task.priority === 'urgent').length,
      high: filteredTasks.filter((task) => task.priority === 'high').length,
      medium: filteredTasks.filter((task) => task.priority === 'medium').length,
      low: filteredTasks.filter((task) => task.priority === 'low').length,
    };
  }, [filteredTasks]);

  // Assignee workload
  const assigneeWorkload = useMemo(() => {
    return teamMembers.map((member) => ({
      ...member,
      taskCount: filteredTasks.filter((task) => task.assigneeId === member.id)
        .length,
      completedCount: filteredTasks.filter(
        (task) => task.assigneeId === member.id && task.status === 'done',
      ).length,
    }));
  }, [teamMembers, filteredTasks]);

  const workloadData = useMemo(() => {
    return assigneeWorkload.map((member) => ({
      name: member.name,
      taskCount: member.taskCount,
      completedCount: member.completedCount,
      completionRate:
        member.taskCount > 0
          ? Math.round((member.completedCount / member.taskCount) * 100)
          : 0,
    }));
  }, [assigneeWorkload]);

  const priorityDistributionData = useMemo(() => {
    return Object.entries(priorityCounts).map(([priority, count]) => ({
      priority,
      count,
    }));
  }, [priorityCounts]);

  const statusDistributionData = useMemo(() => {
    return Object.entries(statusCounts).map(([status, count]) => ({
      status: status.replace('-', ' '),
      count,
      percentage: totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0,
    }));
  }, [statusCounts, totalTasks]);

  // Calculate key metrics
  const completedTasks = filteredTasks.filter(
    (task) => task.status === 'done',
  ).length;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Overdue tasks
  const now = new Date();
  const overdueTasks = filteredTasks.filter(
    (task) =>
      task.dueDate && new Date(task.dueDate) < now && task.status !== 'done',
  );

  // Average task age (in days)
  const avgTaskAge = Math.round(
    filteredTasks.reduce((total, task) => {
      const age =
        (now.getTime() - new Date(task.createdAt).getTime()) /
        (1000 * 60 * 60 * 24);
      return total + age;
    }, 0) / Math.max(filteredTasks.length, 1),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Project Statistics
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Overview of task metrics and team performance
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Tasks"
          value={totalTasks}
          subtitle="All tasks in project"
          color="blue"
        />
        <StatCard
          title="Completion Rate"
          value={`${completionRate}%`}
          subtitle={`${completedTasks} of ${totalTasks} completed`}
          color="green"
        />
        <StatCard
          title="Overdue Tasks"
          value={overdueTasks.length}
          subtitle="Past due date"
          color="red"
        />
        <StatCard
          title="Average Task Age"
          value={`${avgTaskAge}d`}
          subtitle="Average days since creation"
          color="purple"
        />
      </div>

      {/* Visual Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution Chart */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Status Distribution
          </h3>
          <StatusDistributionChart data={statusDistributionData} />
        </div>

        {/* Priority Distribution Chart */}
        <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
            Priority Distribution
          </h3>
          <PriorityDistributionChart data={priorityDistributionData} />
        </div>
      </div>

      {/* Task Age Analysis */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Task Age Distribution
        </h3>
        <TaskAgeHistogram tasks={filteredTasks} />
      </div>

      {/* Team Workload */}
      <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Team Workload & Performance
        </h3>

        {/* Team Workload Chart */}
        <div className="mb-6">
          <TeamWorkloadChart data={workloadData} />
        </div>

        {/* Detailed Team List */}
        <h4 className="text-md font-medium text-zinc-800 dark:text-zinc-200 mb-3">
          Detailed Breakdown
        </h4>
        <div className="space-y-4">
          {assigneeWorkload.map((member) => {
            const completionRate =
              member.taskCount > 0
                ? Math.round((member.completedCount / member.taskCount) * 100)
                : 0;
            return (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  {member.avatar && (
                    <img
                      src={member.avatar}
                      alt={member.name}
                      className="w-10 h-10 rounded-full"
                    />
                  )}
                  <div>
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">
                      {member.name}
                    </div>
                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                      {member.role}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                    {member.taskCount} tasks
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    {completionRate}% completed ({member.completedCount}/
                    {member.taskCount})
                  </div>
                </div>
              </div>
            );
          })}

          {/* Unassigned tasks */}
          {filteredTasks.some((task) => !task.assigneeId) && (
            <div className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-zinc-300 dark:bg-zinc-600 flex items-center justify-center">
                  <span className="text-zinc-600 dark:text-zinc-400 text-sm">
                    ?
                  </span>
                </div>
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    Unassigned
                  </div>
                  <div className="text-sm text-zinc-500 dark:text-zinc-400">
                    No assignee
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {filteredTasks.filter((task) => !task.assigneeId).length}{' '}
                  tasks
                </div>
                <div className="text-sm text-zinc-500 dark:text-zinc-400">
                  Need assignment
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  color?: string;
}

const StatCard = ({
  title,
  value,
  subtitle,
  color = 'blue',
}: StatCardProps) => (
  <div className="bg-white dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-6">
    <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-2">
      {title}
    </h3>
    <div
      className={`text-3xl font-bold text-${color}-600 dark:text-${color}-400 mb-1`}
    >
      {value}
    </div>
    {subtitle && (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
    )}
  </div>
);

export default StatsView;
