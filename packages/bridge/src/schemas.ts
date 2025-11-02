import { z } from 'zod';

export const MissingAuthenticationErrorMessage = 'Missing authentication';
export const MissingAuthenticationErrorMessageSchema = z.literal(MissingAuthenticationErrorMessage);
export const InvalidAuthenticationErrorMessage = 'Invalid authentication';
export const InvalidAuthenticationErrorMessageSchema = z.literal(InvalidAuthenticationErrorMessage);
