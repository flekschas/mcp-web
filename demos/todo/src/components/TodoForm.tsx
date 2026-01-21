import { PlusIcon } from '@heroicons/react/20/solid';
import { useAtomValue, useSetAtom } from 'jotai';
import { useState } from 'react';
import { TodoSchema } from '../schemas';
import { todosAtom, viewAtom } from '../states';

export function TodoForm() {
  const [title, setTitle] = useState('');
  const setTodos = useSetAtom(todosAtom);
  const view = useAtomValue(viewAtom);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newTodo = TodoSchema.parse({
      title: title.trim(),
      project_id: view,
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
          className="input-retro flex-1"
        />
        <button
          type="submit"
          className="btn-3d-icon w-[calc(2.5rem+2px)]! h-[calc(2.5rem+2px)]!"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      </div>
    </form>
  );
}
