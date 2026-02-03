import { PencilIcon } from '@heroicons/react/20/solid';
import type { z } from 'zod';
import type { ProjectSchema } from '../schemas';

interface ProjectItemProps {
  project: z.infer<typeof ProjectSchema>;
  count: number;
  isActive: boolean;
  onSelect: () => void;
  onEdit: () => void;
}

export function ProjectItem({
  project,
  count,
  isActive,
  onSelect,
  onEdit,
}: ProjectItemProps) {
  return (
    <div className="group relative flex items-center">
      <button
        type="button"
        onClick={onSelect}
        className={`flex items-center justify-between w-full py-1.5 px-2 font-medium text-sm rounded-md cursor-pointer transition-all hover:bg-(--color-border) flex-1 ${isActive ? 'bg-(--color-text) text-(--color-bg) border-(--color-text) shadow-[0_2px_0_var(--color-dark)] dark:shadow-[0_2px_0_#000] hover:bg-(--color-text)' : 'text-(--color-text) bg-(--color-accent-subtle)'}`}
      >
        <span className="flex items-center gap-2">
          {project.pattern && (
            <span
              className={`w-6 h-6 rounded-full border-2 border-(--color-bg) ${project.pattern}`}
            />
          )}
          {project.title}
        </span>
        <span className="flex items-center gap-1">
          <span
            className={`inline-flex items-center justify-center min-w-6 h-5 px-1.5 text-[0.625rem] font-bold tracking-wider rounded-full ${isActive ? 'text-(--color-bg) bg-(--color-border)' : ' text-(--color-text) bg-(--color-border)'}`}
          >
            {count}
          </span>
        </span>
      </button>
      <button
        type="button"
        className={`opacity-0 group-hover:opacity-100 inline-flex items-center justify-center rounded-md text-xs font-semibold cursor-pointer select-none w-6 h-6 transition-opacity absolute right-2 ${isActive ? 'text-(--color-bg) hover:bg-(--color-bg)/10' : 'text-(--color-text) hover:bg-(--color-accent-subtle)'}`}
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        title="Edit project"
      >
        <PencilIcon className="w-3 h-3" />
      </button>
    </div>
  );
}
