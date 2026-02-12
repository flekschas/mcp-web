import { useAtomValue } from 'jotai';
import { filteredTodosAtom } from '../states';
import { TodoForm } from './TodoForm';
import { TodoItem } from './TodoItem';

export function TodoList() {
  const todos = useAtomValue(filteredTodosAtom);

  return (
    <div className="space-y-4">
      <TodoForm />

      <div className="space-y-3">
        {todos.length === 0 ? (
          <div className="text-center text-(--color-text-muted) py-16 font-medium opacity-70">
            No todos yet. Add one above!
          </div>
        ) : (
          todos.map(todo => <TodoItem key={todo.id} todo={todo} />)
        )}
      </div>
    </div>
  );
}
