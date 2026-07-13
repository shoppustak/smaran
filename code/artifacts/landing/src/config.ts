/** Test WhatsApp API number — swap for the production/staging number when available. */
export const WHATSAPP_NUMBER = "15551363612";

export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
