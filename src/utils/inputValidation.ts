// Input validation utilities for enhanced security

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: any;
}

// UUID validation
export function validateUUID(value: string): ValidationResult {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: 'Value must be a non-empty string' };
  }
  
  if (!uuidRegex.test(value)) {
    return { isValid: false, error: 'Invalid UUID format' };
  }
  
  return { isValid: true, sanitizedValue: value.toLowerCase() };
}

// Text input validation and sanitization
export function validateText(value: string, maxLength: number = 1000, minLength: number = 0): ValidationResult {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: 'Value must be a non-empty string' };
  }
  
  // Remove any potential HTML/script tags
  const sanitized = value.replace(/<[^>]*>/g, '').trim();
  
  if (sanitized.length < minLength) {
    return { isValid: false, error: `Text must be at least ${minLength} characters long` };
  }
  
  if (sanitized.length > maxLength) {
    return { isValid: false, error: `Text must be no more than ${maxLength} characters long` };
  }
  
  return { isValid: true, sanitizedValue: sanitized };
}

// Username validation
export function validateUsername(value: string): ValidationResult {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: 'Username must be a non-empty string' };
  }
  
  // Allow only alphanumeric characters, underscores, and hyphens
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  const sanitized = value.trim().toLowerCase();
  
  if (sanitized.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }
  
  if (sanitized.length > 30) {
    return { isValid: false, error: 'Username must be no more than 30 characters long' };
  }
  
  if (!usernameRegex.test(sanitized)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }
  
  return { isValid: true, sanitizedValue: sanitized };
}

// Phone number validation
export function validatePhoneNumber(value: string): ValidationResult {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: 'Phone number must be a non-empty string' };
  }
  
  // Remove all non-digit characters
  const digitsOnly = value.replace(/\D/g, '');
  
  if (digitsOnly.length < 10 || digitsOnly.length > 15) {
    return { isValid: false, error: 'Phone number must be between 10 and 15 digits' };
  }
  
  return { isValid: true, sanitizedValue: digitsOnly };
}

// Email validation
export function validateEmail(value: string): ValidationResult {
  if (!value || typeof value !== 'string') {
    return { isValid: false, error: 'Email must be a non-empty string' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const sanitized = value.trim().toLowerCase();
  
  if (!emailRegex.test(sanitized)) {
    return { isValid: false, error: 'Invalid email format' };
  }
  
  return { isValid: true, sanitizedValue: sanitized };
}

// Amount validation for financial entries
export function validateAmount(value: string | number): ValidationResult {
  if (value === null || value === undefined || value === '') {
    return { isValid: false, error: 'Amount is required' };
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return { isValid: false, error: 'Amount must be a valid number' };
  }
  
  if (numValue < 0) {
    return { isValid: false, error: 'Amount cannot be negative' };
  }
  
  if (numValue > 999999.99) {
    return { isValid: false, error: 'Amount is too large' };
  }
  
  // Round to 2 decimal places
  const rounded = Math.round(numValue * 100) / 100;
  
  return { isValid: true, sanitizedValue: rounded };
}

// Generic object validation helper
export function validateObject<T extends Record<string, any>>(
  obj: any,
  validators: Record<keyof T, (value: any) => ValidationResult>
): ValidationResult & { sanitizedValue?: T } {
  if (!obj || typeof obj !== 'object') {
    return { isValid: false, error: 'Invalid object' };
  }
  
  const sanitized: any = {};
  
  for (const [key, validator] of Object.entries(validators)) {
    const validatorFunc = validator as (value: any) => ValidationResult;
    const result = validatorFunc(obj[key]);
    
    if (!result.isValid) {
      return { isValid: false, error: `${key}: ${result.error}` };
    }
    
    sanitized[key] = result.sanitizedValue || obj[key];
  }
  
  return { isValid: true, sanitizedValue: sanitized };
}