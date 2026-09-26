export type AuthErrorCategory =
  | "network"
  | "misconfigured"
  | "not_found"
  | "server"
  | "email_taken"
  | "invalid_credentials"
  | "validation"
  | "unknown";

export class AuthApiError extends Error {
  readonly category: AuthErrorCategory;
  readonly status?: number;

  constructor(category: AuthErrorCategory, message: string, status?: number) {
    super(message);
    this.name = "AuthApiError";
    this.category = category;
    this.status = status;
  }
}

export function messageForAuthErrorCategory(category: AuthErrorCategory): string {
  switch (category) {
    case "network":
      return "Network is unavailable. Check your connection and try again.";
    case "misconfigured":
      return "The API is unreachable or misconfigured. Set VITE_API_URL at build time or use the Developer panel.";
    case "not_found":
      return "The API endpoint was not found. The site may be pointing at the wrong API host.";
    case "server":
      return "The server returned an error. Try again in a moment.";
    case "email_taken":
      return "That email is already registered. Sign in or use a different email.";
    case "invalid_credentials":
      return "Wrong email or password.";
    case "validation":
      return "Enter a valid email and a password of at least 8 characters.";
    case "unknown":
      return "Something went wrong. Try again.";
  }
}

export type AuthFormErrorField = "email" | "password" | null;

export function fieldForAuthErrorCategory(
  category: AuthErrorCategory,
  mode: "sign-in" | "sign-up"
): AuthFormErrorField {
  switch (category) {
    case "email_taken":
      return "email";
    case "invalid_credentials":
      return "password";
    case "validation":
      return mode === "sign-up" ? "email" : "password";
    case "misconfigured":
    case "network":
    case "not_found":
    case "server":
    case "unknown":
      return null;
  }
}

export function mapAuthApiError(
  error: unknown,
  mode: "sign-in" | "sign-up"
): { message: string; field: AuthFormErrorField } {
  if (error instanceof AuthApiError) {
    return {
      message: error.message,
      field: fieldForAuthErrorCategory(error.category, mode),
    };
  }
  return {
    message: messageForAuthErrorCategory("unknown"),
    field: null,
  };
}
