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
    <div className="group bg-(--color-bg) border-2 border-(--color-border) rounded-lg p-4 flex items-center gap-4 transition-all">
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
        {todo.due_at && (
          <div className="text-xs text-(--color-text-secondary) mt-2 font-medium uppercase tracking-wide opacity-70">
            Due: {new Date(todo.due_at).toLocaleDateString()}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={deleteTodo}
        className="inline-flex items-center justify-center p-1.5 text-(--color-text) rounded hover:bg-(--color-border) cursor-pointer select-none opacity-0 group-hover:opacity-30 hover:opacity-100 transition-opacity"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
}
