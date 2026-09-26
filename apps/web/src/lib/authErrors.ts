export type AuthErrorCategory =
  | "network"
  | "timeout"
  | "unavailable"
  | "server"
  | "empty_api_base"
  | "email_taken"
  | "invalid_credentials"
  | "validation_email"
  | "validation_password"
  | "rate_limit"
  | "unknown";

export type AuthPrimaryAction = "continue" | "try_again" | "return_to_cursor";

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
      return "Can’t reach Cursor Sync. Check your connection and try again.";
    case "timeout":
      return "That took too long. Try again.";
    case "unavailable":
      return "Sign-in isn’t available right now. Try again in a bit.";
    case "server":
      return "Something went wrong on our side. Try again.";
    case "empty_api_base":
      return "Sign-in isn’t set up in this build. Open Cursor Sync from the extension.";
    case "email_taken":
      return "That email is already in use.";
    case "invalid_credentials":
      return "Email or password is wrong.";
    case "validation_email":
      return "Enter a valid email.";
    case "validation_password":
      return "Use a stronger password.";
    case "rate_limit":
      return "Too many tries. Wait a minute and try again.";
    case "unknown":
      return "Sign-in isn’t available right now. Try again in a bit.";
  }
}

export function mutedHelperForAuthErrorCategory(
  category: AuthErrorCategory
): string | null {
  if (category === "network" || category === "timeout") {
    return "Your details weren’t sent.";
  }
  return null;
}

export function primaryActionForAuthErrorCategory(
  category: AuthErrorCategory
): AuthPrimaryAction {
  switch (category) {
    case "email_taken":
    case "invalid_credentials":
    case "validation_email":
    case "validation_password":
      return "continue";
    case "empty_api_base":
      return "return_to_cursor";
    case "network":
    case "timeout":
    case "unavailable":
    case "server":
    case "rate_limit":
    case "unknown":
      return "try_again";
  }
}

export type AuthFormErrorField = "email" | "password" | null;

export function fieldForAuthErrorCategory(
  category: AuthErrorCategory
): AuthFormErrorField {
  switch (category) {
    case "email_taken":
    case "validation_email":
      return "email";
    case "invalid_credentials":
    case "validation_password":
      return "password";
    default:
      return null;
  }
}

export type MappedAuthFormError = {
  message: string;
  field: AuthFormErrorField;
  category: AuthErrorCategory;
  primaryAction: AuthPrimaryAction;
  mutedHelper: string | null;
};

export function mapAuthApiError(error: unknown): MappedAuthFormError {
  if (error instanceof AuthApiError) {
    return {
      message: error.message,
      field: fieldForAuthErrorCategory(error.category),
      category: error.category,
      primaryAction: primaryActionForAuthErrorCategory(error.category),
      mutedHelper: mutedHelperForAuthErrorCategory(error.category),
    };
  }
  const category: AuthErrorCategory = "unavailable";
  return {
    message: messageForAuthErrorCategory(category),
    field: null,
    category,
    primaryAction: primaryActionForAuthErrorCategory(category),
    mutedHelper: null,
  };
}
