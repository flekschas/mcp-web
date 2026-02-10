import { PatternPicker } from './PatternPicker';

interface ProjectFormProps {
  title: string;
  pattern: string;
  onTitleChange: (title: string) => void;
  onPatternChange: (pattern: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  isEditing: boolean;
}

export function ProjectForm({
  title,
  pattern,
  onTitleChange,
  onPatternChange,
  onSubmit,
  onCancel,
  isEditing,
}: ProjectFormProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <form onSubmit={onSubmit} className="mb-2 p-3 bg-(--color-bg) border-2 border-(--color-border) rounded-lg">
      <input
        type="text"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Project name"
        className="w-full px-4 text-base bg-(--color-bg) text-(--color-text) border-2 border-(--color-border) rounded-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.05)] transition-[border-color] placeholder:text-(--color-text-secondary) placeholder:opacity-60 focus:outline-none focus:border-(--color-text) mb-3 py-2!"
        autoFocus
      />
      <div className="flex gap-2 items-start justify-between">
        <PatternPicker value={pattern} onChange={onPatternChange} />
        <div className="flex gap-2 items-start">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center gap-1.5 py-1.5 px-2 font-semibold text-xs uppercase tracking-wide bg-(--color-accent-subtle) hover:bg-(--color-accent-subtle-hover) text-(--color-text) border-2 border-transparent rounded-md transition-all cursor-pointer select-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 pt-1.5 pb-1 px-2 font-semibold text-xs uppercase tracking-wide rounded-md bg-(--color-accent) text-(--color-bg) border-2 border-(--color-accent) shadow-[0_2px_0_var(--color-accent-dark)] btn-3d-press-sm hover:bg-(--color-accent-hover) hover:border-(--color-accent-hover) cursor-pointer select-none disabled:opacity-50 disabled:cursor-default"
          >
            {isEditing ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </form>
  );
}
