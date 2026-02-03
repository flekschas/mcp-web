import type { z } from 'zod';
import type {
  ProjectSchema,
  ShowCompletedSchema,
  SortBySchema,
  SortOrderSchema,
  ThemeSchema,
  TodoSchema,
  ViewSchema,
} from './schemas';

export type Project = z.infer<typeof ProjectSchema>;
export type Todo = z.infer<typeof TodoSchema>;
export type Theme = z.infer<typeof ThemeSchema>;
export type SortBy = z.infer<typeof SortBySchema>;
export type SortOrder = z.infer<typeof SortOrderSchema>;
export type ShowCompleted = z.infer<typeof ShowCompletedSchema>;
export type View = z.infer<typeof ViewSchema>;
