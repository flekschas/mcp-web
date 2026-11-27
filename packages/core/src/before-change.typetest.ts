/**
 * Type tests for `onBeforeChange` of `createStateTools`.
 *
 * These tests verify compile-time type safety. They don't execute any code,
 * but TypeScript will report errors if the type constraints are violated.
 */

import type { Elicit } from '@mcp-web/types';
import { z } from 'zod';
import { createStateTools } from './create-state-tools.js';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
const expectType = <T extends true>(_: T) => {};

const TodosSchema = z.array(z.object({ id: z.string(), title: z.string() }));
type Todos = z.infer<typeof TodosSchema>;
declare let todos: Todos;

// `prev` and `next` have the type of the state, and the context has `elicit`.
createStateTools({
  name: 'todos',
  description: 'Todos',
  get: () => todos,
  set: (value: Todos) => {
    todos = value;
  },
  schema: TodosSchema,
  expand: true,
  onBeforeChange: async ({ prev, next }, { elicit }) => {
    expectType<Equal<typeof prev, Todos>>(true);
    expectType<Equal<typeof next, Todos>>(true);
    expectType<Equal<typeof elicit, Elicit>>(true);
    if (next.length < prev.length && !(await elicit('Delete?'))) {
      throw new Error('The user chose not to delete.');
    }
  },
});

// It can return another state to store.
createStateTools({
  name: 'todos',
  description: 'Todos',
  get: () => todos,
  set: (value: Todos) => {
    todos = value;
  },
  schema: TodosSchema,
  onBeforeChange: ({ next }) => next.slice(0, 10),
});

// It can't return something that isn't the state.
createStateTools({
  name: 'todos',
  description: 'Todos',
  get: () => todos,
  set: (value: Todos) => {
    todos = value;
  },
  schema: TodosSchema,
  // @ts-expect-error a number is not the todos state
  onBeforeChange: () => 1,
});
