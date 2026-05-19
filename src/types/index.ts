// Shared TypeScript types for The Gatekeeper

export interface SessionData {
  userId: string;
  name: string;
  email: string;
  isLoggedIn: boolean;
}

export interface PublicUser {
  id: string;
  name: string;
  email: string;
}

export interface ApiSuccess<T = undefined> {
  success: true;
  data?: T;
}

export interface ApiError {
  success: false;
  error: string;
  code: string;
  fields?: Record<string, string>;
}

export type ApiResponse<T = undefined> = ApiSuccess<T> | ApiError;

// Password strength levels (used by usePasswordStrength hook)
export type PasswordStrength = 'weak' | 'fair' | 'strong' | 'very-strong';
