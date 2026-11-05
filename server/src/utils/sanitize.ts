/**
 * Input sanitization utilities.
 * Strips all HTML tags, script payloads, ASCII control characters,
 * and invisible/zero-width Unicode control characters.
 * All user input passes through these before being stored or broadcast.
 */

// Matches ASCII control chars (\x00-\x08, \x0B, \x0C, \x0E-\x1F, \x7F)
// plus Unicode zero-width, bidirectional overrides, and invisible format characters:
// \u0080-\u009F (C1 control codes), \u00AD (soft hyphen)
// \u200B-\u200F (zero-width spaces/marks), \u2028-\u202F (line/paragraph separators & formatting overrides)
// \u2060-\u206F (invisible word joiners/directional embeds), \uFEFF (zero-width no-break space)
const CONTROL_AND_INVISIBLE_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g;

export function sanitizeInput(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>?/gm, '')
    .replace(/javascript:/gi, '')
    .replace(CONTROL_AND_INVISIBLE_CHARS, '')
    .trim()
    .slice(0, maxLength);
}

/** Strip HTML tags from a string */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

/** Escape HTML special characters to prevent XSS */
export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
  };
  return input.replace(/[&<>"']/g, (char) => map[char] || char);
}

/** Truncate a string to a maximum length */
export function truncate(input: string, maxLength: number): string {
  return input.length > maxLength ? input.slice(0, maxLength) : input;
}

/** Full sanitization pipeline for user messages */
export function sanitizeMessage(input: string): string {
  return sanitizeInput(input, 500);
}

/** Sanitize a nickname (shorter limit, strict alphanumeric + common symbols) */
export function sanitizeNickname(input: string): string {
  const sanitized = sanitizeInput(input, 20);
  return sanitized.replace(/[^\w\s\-_.]/gi, '').trim() || 'Anonymous';
}

/** Sanitize a topic room name */
export function sanitizeRoomName(input: string): string {
  return sanitizeInput(input, 40).replace(/[^\w\s\-_&]/gi, '').trim() || 'General';
}

/** Sanitize an interest tag */
export function sanitizeTag(input: string): string {
  return sanitizeInput(input, 25).toLowerCase().replace(/[^a-z0-9_\-#]/g, '').trim();
}
