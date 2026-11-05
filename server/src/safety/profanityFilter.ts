/**
 * Server-side profanity filter.
 * Replaces known bad words with asterisks.
 * For production, consider a more comprehensive library like "bad-words".
 */

const PROFANITY_LIST: string[] = [
  'fuck', 'fucking', 'fucker', 'fucked', 'fucks',
  'shit', 'shitty', 'bullshit',
  'asshole', 'ass',
  'bitch', 'bitches',
  'dick', 'dickhead',
  'cock', 'cocksucker',
  'pussy',
  'cunt',
  'nigger', 'nigga',
  'faggot', 'fag',
  'retard', 'retarded',
  'whore', 'slut',
  'bastard',
  'damn', 'dammit',
  'piss', 'pissed',
  'crap',
  'wanker', 'twat',
  'motherfucker',
];

// Build regex patterns with word boundaries for accurate matching
const patterns = PROFANITY_LIST.map(word => {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'gi');
});

/** Replace profanity with asterisks of the same length */
export function filterProfanity(text: string): string {
  let filtered = text;
  for (const pattern of patterns) {
    filtered = filtered.replace(pattern, (match) => '*'.repeat(match.length));
  }
  return filtered;
}

/** Check if text contains any profanity */
export function containsProfanity(text: string): boolean {
  return patterns.some(pattern => {
    pattern.lastIndex = 0; // Reset regex state for global patterns
    return pattern.test(text);
  });
}
