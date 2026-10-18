import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resendVerificationSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export const transactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(1, 'Description is required'),
  date: z.date(),
});

export const budgetSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  amount: z.number().positive('Amount must be positive'),
  period: z.enum(['monthly', 'weekly', 'yearly']),
  startDate: z.date(),
  endDate: z.date(),
});

export const debtSchema = z.object({
  type: z.enum(['owed_to_me', 'i_owe']),
  person: z.string().min(1, 'Person is required'),
  amount: z.number().positive('Amount must be positive'),
  description: z.string().min(1, 'Description is required'),
  dueDate: z.date().optional(),
  status: z.enum(['active', 'paid']).default('active'),
});

export const wishlistSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  price: z.number().positive('Price must be positive'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  link: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
  targetDate: z.date().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type BudgetInput = z.infer<typeof budgetSchema>;
export type DebtInput = z.infer<typeof debtSchema>;
export type WishlistInput = z.infer<typeof wishlistSchema>;
