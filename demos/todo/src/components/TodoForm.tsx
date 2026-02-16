import { PlusIcon } from '@heroicons/react/20/solid';
import { useAtomValue, useSetAtom } from 'jotai';
import { useState, useEffect } from 'react';
import { TodoSchema } from '../schemas';
import { todosAtom, viewAtom } from '../states';

export function TodoForm() {
  const [title, setTitle] = useState('');
  const [disabled, setDisabled] = useState(false);
  const setTodos = useSetAtom(todosAtom);
  const view = useAtomValue(viewAtom);

  useEffect(() => {
    setDisabled(title.trim().length === 0);
  }, [title]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTodo = TodoSchema.parse({
      title: title.trim(),
      project_id: view.type === 'project' ? view.id : null,
    });

    setTodos(prev => [...prev, newTodo]);
    setTitle('');
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="flex gap-3">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a new todo..."
          className="w-full py-2 px-4 text-base bg-(--color-bg) text-(--color-text) border-2 border-(--color-border) hover:border-(--color-border-hover) rounded-md transition-[border-color] placeholder:text-(--color-text-muted) placeholder:opacity-60 focus:outline-none focus:border-(--color-text) flex-1"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center w-11 h-10.5 rounded-md bg-(--color-accent) text-(--color-bg) border-2 border-(--color-accent) shadow-[0_2px_0_var(--color-accent-dark)] btn-3d-press-sm hover:bg-(--color-accent-hover) hover:border-(--color-accent-hover) cursor-pointer select-none disabled:opacity-50 disabled:cursor-default"
          disabled={disabled}
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
