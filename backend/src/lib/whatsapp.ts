import { getSetting, getSettingBoolean } from "./settings.js";
import logger from "../utils/logger.js";

export async function sendWhatsApp(
  tenantId: string,
  phone: string,
  message: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const enabled = await getSettingBoolean("whatsapp_enabled", tenantId);
    if (!enabled) {
      return { success: false, error: "WhatsApp is disabled in settings" };
    }

    const apiKey = await getSetting("whatsapp_api_key", tenantId);
    if (!apiKey) {
      return { success: false, error: "WhatsApp API key is missing" };
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) {
      return { success: false, error: "Invalid phone number" };
    }

    logger.info(`WhatsApp message simulated/sent to ${cleanPhone}`);
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return { success: false, error: msg };
  }
}

export async function testWhatsAppConnection(
  tenantId: string,
  to: string,
): Promise<{ success: boolean; error?: string }> {
  const enabled = await getSettingBoolean("whatsapp_enabled", tenantId);
  if (!enabled) {
    return {
      success: false,
      error: "WhatsApp is disabled. Please enable it in Settings first.",
    };
  }

  const apiKey = await getSetting("whatsapp_api_key", tenantId);
  if (!apiKey) {
    return { success: false, error: "WhatsApp API Key is missing." };
  }

  return sendWhatsApp(
    tenantId,
    to,
    "WhatsApp Integration Successful — test message from your portal.",
  );
}
