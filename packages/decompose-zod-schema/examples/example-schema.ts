import { z } from 'https://deno.land/x/zod@v4.0.5/mod.ts';

// Example complex schema for testing decomposition
export const userSchema = z.object({
  // Basic user information
  user: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(100),
    email: z.string().email(),
    age: z.number().min(0).max(150),
    username: z.string().min(3).max(50),
  }),

  // User profile data
  profile: z.object({
    bio: z.string().max(500),
    avatar: z.string().url().optional(),
    website: z.string().url().optional(),
    location: z.string().max(100).optional(),
    socialLinks: z.object({
      twitter: z.string().optional(),
      linkedin: z.string().optional(),
      github: z.string().optional(),
      instagram: z.string().optional(),
    }),
  }),

  // User preferences and settings
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'auto', 'high-contrast']),
    language: z.enum([
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'ja', 'ko', 'zh', 
      'ar', 'hi', 'tr', 'pl', 'nl', 'sv', 'no', 'da', 'fi'
    ]),
    timezone: z.string(),
    dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
    timeFormat: z.enum(['12h', '24h']),
    notifications: z.object({
      email: z.boolean(),
      push: z.boolean(),
      sms: z.boolean(),
      newsletter: z.boolean(),
      marketing: z.boolean(),
    }),
  }),

  // Security settings
  security: z.object({
    twoFactor: z.boolean(),
    backupCodes: z.array(z.string()).optional(),
    apiKeys: z.array(z.object({
      id: z.string(),
      name: z.string(),
      key: z.string(),
      permissions: z.array(z.string()),
      createdAt: z.date(),
      lastUsed: z.date().optional(),
    })),
    sessions: z.array(z.object({
      id: z.string(),
      device: z.string(),
      browser: z.string(),
      location: z.string(),
      ipAddress: z.string(),
      createdAt: z.date(),
      lastActive: z.date(),
    })),
  }),

  // Large enum for testing enum splitting
  category: z.enum(Array.from({ length: 300 }, (_, i) => `category-${i}`) as [string, ...string[]]),

  // Metadata
  metadata: z.object({
    createdAt: z.date(),
    updatedAt: z.date(),
    version: z.number(),
    tags: z.array(z.string()),
    flags: z.record(z.boolean()),
    customFields: z.record(z.unknown()),
  }),
});

// Another example schema
export const configSchema = z.object({
  app: z.object({
    name: z.string(),
    version: z.string(),
    environment: z.enum(['development', 'staging', 'production']),
  }),
  
  database: z.object({
    host: z.string(),
    port: z.number(),
    username: z.string(),
    password: z.string(),
    database: z.string(),
    ssl: z.boolean(),
    poolSize: z.number(),
  }),

  cache: z.object({
    redis: z.object({
      host: z.string(),
      port: z.number(),
      password: z.string().optional(),
      db: z.number(),
    }),
    ttl: z.number(),
  }),

  features: z.object({
    authentication: z.boolean(),
    registration: z.boolean(),
    socialLogin: z.boolean(),
    twoFactor: z.boolean(),
    emailVerification: z.boolean(),
    passwordReset: z.boolean(),
    apiRateLimiting: z.boolean(),
    fileUploads: z.boolean(),
    notifications: z.boolean(),
  }),
});