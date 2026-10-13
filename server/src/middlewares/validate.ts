import { Request, Response, NextFunction } from 'express';

type ValidationRule = {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'email';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  enum?: string[];
};

type Schema = Record<string, ValidationRule>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lightweight inline validator — no external lib dependency
 * Keeps request body typed and clean before hitting controllers
 */
export const validateBody = (schema: Schema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const errors: string[] = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`'${field}' is required.`);
        continue;
      }

      if (value === undefined || value === null || value === '') continue;

      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push(`'${field}' must be a string.`);
      }

      if (rules.type === 'email' && !EMAIL_REGEX.test(value)) {
        errors.push(`'${field}' must be a valid email address.`);
      }

      if (rules.type === 'number' && isNaN(Number(value))) {
        errors.push(`'${field}' must be a number.`);
      }

      if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
        errors.push(`'${field}' must be at least ${rules.minLength} characters.`);
      }

      if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
        errors.push(`'${field}' must not exceed ${rules.maxLength} characters.`);
      }

      if (rules.min !== undefined && Number(value) < rules.min) {
        errors.push(`'${field}' must be at least ${rules.min}.`);
      }

      if (rules.max !== undefined && Number(value) > rules.max) {
        errors.push(`'${field}' must be at most ${rules.max}.`);
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`'${field}' must be one of: ${rules.enum.join(', ')}.`);
      }
    }

    if (errors.length > 0) {
      res.status(400).json({ success: false, message: errors[0], errors });
      return;
    }

    next();
  };
};

// ── Pre-built schemas for common endpoints ────────────────────────────────────

export const registerSchema: Schema = {
  email: { required: true, type: 'email' },
  password: { required: true, type: 'string', minLength: 8, maxLength: 128 },
  fullName: { required: true, type: 'string', minLength: 2, maxLength: 100 },
  role: { type: 'string', enum: ['DOCTOR', 'HOSPITAL_ADMIN', 'RECRUITER', 'CREDENTIALING_OFFICER'] },
};

export const loginSchema: Schema = {
  email: { required: true, type: 'email' },
  password: { required: true, type: 'string', minLength: 1 },
};

export const forgotPasswordSchema: Schema = {
  email: { required: true, type: 'email' },
};

export const resetPasswordSchema: Schema = {
  token: { required: true, type: 'string', minLength: 10 },
  newPassword: { required: true, type: 'string', minLength: 8, maxLength: 128 },
};

export const createPostSchema: Schema = {
  content: { required: true, type: 'string', minLength: 1, maxLength: 5000 },
};

export const sendMessageSchema: Schema = {
  content: { required: true, type: 'string', minLength: 1, maxLength: 2000 },
};

export const createJobSchema: Schema = {
  title: { required: true, type: 'string', minLength: 3, maxLength: 200 },
  institutionName: { required: true, type: 'string', minLength: 2, maxLength: 200 },
  department: { required: true, type: 'string', minLength: 2, maxLength: 100 },
  specializationRequired: { required: true, type: 'string', minLength: 2, maxLength: 100 },
  location: { required: true, type: 'string', minLength: 2, maxLength: 200 },
  description: { required: true, type: 'string', minLength: 10, maxLength: 5000 },
  jobType: { type: 'string', enum: ['FULL_TIME', 'PART_TIME', 'LOCUM', 'FELLOWSHIP'] },
};
