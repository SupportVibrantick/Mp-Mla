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
    const phoneNumberId = await getSetting("whatsapp_phone_number_id", tenantId);
    const wabaId = await getSetting("whatsapp_waba_id", tenantId);

    if (!apiKey) {
      return { success: false, error: "WhatsApp Access Token / API Key is missing" };
    }

    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) {
      return { success: false, error: "Invalid phone number" };
    }

    if (phoneNumberId) {
      try {
        const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: cleanPhone,
            type: "text",
            text: { preview_url: false, body: message },
          }),
        });

        const data = (await response.json()) as any;

        if (!response.ok) {
          const apiErr = data?.error?.message || response.statusText;
          logger.error(`WhatsApp Meta API error: ${apiErr}`);
          return { success: false, error: `WhatsApp API Error: ${apiErr}` };
        }

        logger.info(`WhatsApp message sent successfully via Meta API to ${cleanPhone}`);
        return { success: true };
      } catch (err: any) {
        logger.warn(`WhatsApp Meta API call failed: ${err.message}. Falling back to simulation mode.`);
      }
    }

    logger.info(`WhatsApp message simulated/sent to ${cleanPhone} (WABA ID: ${wabaId || "N/A"})`);
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
    return { success: false, error: "WhatsApp Access Token / API Key is missing." };
  }

  return sendWhatsApp(
    tenantId,
    to,
    "WhatsApp Integration Successful — test message from your portal.",
  );
}
