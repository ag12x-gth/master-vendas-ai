/**
 * Normalize phone number to E.164 format
 * @param phone - Phone number in any format
 * @returns Normalized phone number or null if invalid
 */
export function normalizePhone(phone: string): string | null {
  // Remove all non-digit characters except + at the start
  let cleaned = phone.replace(/[^\d+]/g, '');
  
  // Remove + from anywhere except the start
  if (cleaned.startsWith('+')) {
    cleaned = '+' + cleaned.substring(1).replace(/\+/g, '');
  } else {
    cleaned = cleaned.replace(/\+/g, '');
  }
  
  // If it's a JID (WhatsApp ID format), extract the phone number
  if (phone.includes('@')) {
    const parts = phone.split('@');
    if (parts[0]) {
      cleaned = parts[0].replace(/[^\d]/g, '');
    }
  }
  
  // Ensure it starts with +
  if (!cleaned.startsWith('+')) {
    // If it starts with country code (e.g., 55 for Brazil), add +
    if (cleaned.length >= 10) {
      cleaned = '+' + cleaned;
    } else {
      return null; // Invalid number
    }
  }
  
  // Validate length (E.164 allows 7-15 digits after +)
  const digits = cleaned.substring(1);
  if (digits.length < 7 || digits.length > 15) {
    return null;
  }
  
  return cleaned;
}

/**
 * Check if a WhatsApp JID represents a group chat
 * @param jid - WhatsApp JID (e.g., "123456789@g.us" for group)
 * @returns True if it's a group chat
 */
export function isGroupChat(jid: string): boolean {
  return jid.includes('@g.us');
}
