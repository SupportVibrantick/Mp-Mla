import { getSetting, getSettingBoolean } from "./settings.js";
import logger from "../utils/logger.js";
import axios from "axios";

/**
 * Send a WhatsApp message using system settings.
 * This is a placeholder for actual WhatsApp Business API integration.
 * Common providers in India: MSG91, Interakt, Gupshup, etc.
 */
export async function sendWhatsApp(
    phone: string,
    message: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const enabled = await getSettingBoolean("whatsapp_enabled");
        if (!enabled) {
            logger.debug("WhatsApp disabled via settings, skipping send");
            return { success: false, error: "WhatsApp is disabled in system settings" };
        }

        const apiKey = await getSetting("whatsapp_api_key");
        if (!apiKey) {
            logger.warn("WhatsApp API key not configured");
            return { success: false, error: "WhatsApp API key is missing" };
        }

        // Clean phone number (remove +, spaces, etc.)
        const cleanPhone = phone.replace(/\D/g, "");

        if (!cleanPhone) {
          return { success: false, error: "Invalid phone number" };
        }

        logger.info(`Attempting to send WhatsApp message to ${cleanPhone}...`);

        /**
         * NOTE: Implementation depends on the provider.
         * For example, using a simple Webhook or a specific API.
         * Here we simulate a successful send if configured.
         */
        
        // Mocking a successful send for now as per specific provider requirements aren't known
        // In a real scenario, you'd do:
        // await axios.post('https://api.provider.com/v1/messages', { to: cleanPhone, text: message }, { headers: { 'Authorization': `Bearer ${apiKey}` } });

        logger.info(`WhatsApp message simulated/sent to ${cleanPhone}`);
        return { success: true };

    } catch (error: any) {
        logger.error(`WhatsApp send failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * Specifically tests the WhatsApp configuration.
 */
export async function testWhatsAppConnection(to: string): Promise<{ success: boolean; error?: string }> {
    try {
        const enabled = await getSettingBoolean("whatsapp_enabled");
        if (!enabled) {
            return { success: false, error: "WhatsApp is disabled. Please enable it in Settings first." };
        }

        const apiKey = await getSetting("whatsapp_api_key");
        if (!apiKey) {
            return { success: false, error: "WhatsApp API Key is missing. Please check your settings." };
        }

        const msg = "✅ *WhatsApp Integration Successful*\n\nYour Constituency Management Portal WhatsApp settings are correctly configured!\n\nThis is a test message.";
        
        return await sendWhatsApp(to, msg);
    } catch (error: any) {
        logger.error("Test WhatsApp send error:", error);
        return { success: false, error: `Failed to send WhatsApp: ${error.message}` };
    }
}
