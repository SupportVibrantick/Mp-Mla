import { getSetting, getSettingBoolean, getSettingNumber } from "./settings.js";
import { ApiError } from "../utils/ApiError.js";

export async function validatePasswordComplexity(
  password: string,
  tenantId: string,
): Promise<void> {
  const minLength = (await getSettingNumber("min_password_length", tenantId)) || 8;
  const requireUpper = await getSettingBoolean(
    "require_uppercase_letter",
    tenantId,
  );
  const requireNumber = await getSettingBoolean("require_number", tenantId);
  const requireSpecial = await getSettingBoolean(
    "require_special_character",
    tenantId,
  );

  if (password.length < minLength) {
    throw ApiError.badRequest(
      `Password must be at least ${minLength} characters long.`,
    );
  }
  if (requireUpper && !/[A-Z]/.test(password)) {
    throw ApiError.badRequest(
      "Password must contain at least one uppercase letter.",
    );
  }
  if (requireNumber && !/[0-9]/.test(password)) {
    throw ApiError.badRequest("Password must contain at least one number.");
  }
  if (requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
    throw ApiError.badRequest(
      "Password must contain at least one special character.",
    );
  }
}

export async function isPasswordExpired(
  tenantId: string,
  passwordChangedAt: Date | null,
): Promise<boolean> {
  const expiryDays = await getSettingNumber("password_expiry_days", tenantId);
  if (!expiryDays || expiryDays === 0) return false;

  const lastChanged = passwordChangedAt || new Date(0);
  const expiryDate = new Date(
    lastChanged.getTime() + expiryDays * 24 * 60 * 60 * 1000,
  );
  return new Date() > expiryDate;
}
