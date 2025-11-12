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

/**
 * Detect if a phone number is a WhatsApp group based on length
 * Groups typically have 18 digits and start with 120363
 * @param phone - Phone number or JID
 * @returns True if it's likely a group
 * @deprecated Use detectGroup() instead for more accurate detection
 */
export function isGroupByPhone(phone: string): boolean {
  if (phone.includes('@g.us')) return true;
  
  const digitsOnly = phone.replace(/\D/g, '');
  
  if (digitsOnly.length > 15) {
    return true;
  }
  
  return false;
}

/**
 * Detect if a contact is a WhatsApp group/community using JID-first logic
 * Priority: JID suffixes > number pattern matching
 * @param options - Detection parameters
 * @returns True if it's a group, broadcast, newsletter, or community
 */
export function detectGroup(options: { remoteJid?: string; phone: string }): boolean {
  const { remoteJid, phone } = options;
  
  // 1. JID-based detection (most reliable)
  const jidToCheck = remoteJid || phone;
  const jidLower = jidToCheck.toLowerCase();
  
  if (jidLower.includes('@g.us')) return true;
  if (jidLower.includes('@broadcast')) return true;
  if (jidLower.includes('@newsletter')) return true;
  if (jidLower.includes('@community')) return true;
  
  // 2. Pattern-based detection for WhatsApp groups (fallback)
  // Modern WhatsApp groups: 120363 + 12 digits = 18 total digits
  const digitsOnly = phone.replace(/\D/g, '');
  
  // Match modern WhatsApp group pattern: starts with 120363 and has exactly 18 digits
  if (/^120363\d{12}$/.test(digitsOnly)) {
    return true;
  }
  
  // Legacy WhatsApp group format: phoneNumber-timestamp (e.g., 5511996444573-1449097597)
  // Groups in this format have a hyphen separating the creator's number from timestamp
  if (/-\d+$/.test(phone) && !phone.includes('@')) {
    return true;
  }
  
  // 3. Avoid false positives: numbers >15 digits that don't match known patterns
  // are likely malformed MSISDNs, not groups
  return false;
}
