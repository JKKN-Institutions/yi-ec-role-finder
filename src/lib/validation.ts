import { z } from "zod";

// Assessment validation schemas
export const emailSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(255, "Email must be less than 255 characters"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .trim(),
});

export const verticalResponseSchema = z.object({
  priority1: z.string().min(1, "Priority 1 is required"),
  priority2: z.string().optional(),
  priority3: z.string().optional(),
});

export const longTextResponseSchema = z.object({
  response: z
    .string()
    .min(50, "Response must be at least 50 characters")
    .max(500, "Response must be less than 500 characters")
    .trim(),
});

export const shortTextResponseSchema = z.object({
  statement: z
    .string()
    .min(30, "Statement must be at least 30 characters")
    .max(300, "Statement must be less than 300 characters")
    .trim(),
});

export const radioWithTextResponseSchema = z.object({
  constraint: z.enum(["none", "time", "expectations", "skills"], {
    required_error: "Please select an option",
  }),
  handling: z.string().max(500, "Handling explanation must be less than 500 characters").optional(),
});

export const radioResponseSchema = z.object({
  leadership_style: z.enum(["leader", "doer", "learning", "strategic"], {
    required_error: "Please select an option",
  }),
});

// Admin validation schemas
export const feedbackSchema = z.object({
  actual_role_assigned: z.string().min(1, "Role is required"),
  ai_accuracy: z.enum(["accurate", "partial", "inaccurate"]),
  override_reasoning: z.string().max(500).optional(),
  hire_confidence: z.enum(["high", "medium", "low"]),
  hire_date: z.string().min(1, "Hire date is required"),
});

export const performanceReviewSchema = z.object({
  still_active: z.enum(["yes", "no"]),
  performance_rating: z.number().min(1).max(5),
  performance_notes: z.string().max(1000).optional(),
  role_change: z.string().max(100).optional(),
});

export const verticalSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name must be less than 100 characters").trim(),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
  display_order: z.number().int().positive(),
  is_active: z.boolean(),
});

export const userRoleSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  full_name: z.string().min(2, "Name must be at least 2 characters").max(100).trim(),
  roles: z
    .array(z.enum(["admin", "chair", "co_chair", "em"]))
    .min(1, "Select at least one role"),
});

// Score validation
export const scoreSchema = z.number().int().min(0).max(100);

// SQL injection prevention - never use this for actual SQL execution
export const sanitizeInput = (input: string): string => {
  return input.replace(/[';--]/g, "").trim();
};

// Rate limiting helper
export const checkRateLimit = async (
  key: string,
  limit: number,
  windowSeconds: number,
  storage: Storage = localStorage
): Promise<boolean> => {
  const now = Date.now();
  const storageKey = `ratelimit_${key}`;
  const stored = storage.getItem(storageKey);

  if (!stored) {
    storage.setItem(storageKey, JSON.stringify({ count: 1, resetAt: now + windowSeconds * 1000 }));
    return true;
  }

  const data = JSON.parse(stored);

  if (now > data.resetAt) {
    storage.setItem(storageKey, JSON.stringify({ count: 1, resetAt: now + windowSeconds * 1000 }));
    return true;
  }

  if (data.count >= limit) {
    return false;
  }

  data.count++;
  storage.setItem(storageKey, JSON.stringify(data));
  return true;
};
