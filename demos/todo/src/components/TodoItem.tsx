import { TrashIcon } from '@heroicons/react/20/solid';
import { useSetAtom } from 'jotai';
import { todosAtom } from '../states';
import type { Todo } from '../types';

interface TodoItemProps {
  todo: Todo;
}

export function TodoItem({ todo }: TodoItemProps) {
  const setTodos = useSetAtom(todosAtom);

  const toggleComplete = () => {
    setTodos(prev =>
      prev.map(t =>
        t.id === todo.id
          ? { ...t, completed_at: t.completed_at ? null : new Date().toISOString() }
          : t
      )
    );
  };

  const deleteTodo = () => {
    setTodos(prev => prev.filter(t => t.id !== todo.id));
  };

  const isCompleted = !!todo.completed_at;

  return (
    <div className="group card-retro p-4 flex items-start gap-4 transition-all hover:shadow-md">
      <input
        type="checkbox"
        checked={isCompleted}
        onChange={toggleComplete}
        className="checkbox-retro mt-0.5 shrink-0"
      />

      <div className="flex-1 min-w-0">
        <div className={`font-medium leading-tight ${isCompleted ? 'line-through text-(--color-text-secondary) opacity-60' : 'text-(--color-text)'}`}>
          {todo.title}
        </div>
        {todo.description && (
          <div className="text-sm text-(--color-text-secondary) mt-1 opacity-80">{todo.description}</div>
        )}
        {todo.due_date && (
          <div className="text-xs text-(--color-text-secondary) mt-2 font-medium uppercase tracking-wide opacity-70">
            Due: {new Date(todo.due_date).toLocaleDateString()}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={deleteTodo}
        className="btn-3d-danger opacity-0 group-hover:opacity-70 transition-opacity"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
