/**
 * Server-Side Bot Engine & Humanization
 *
 * Provides hyper-realistic, humanized conversational partners when queue is quiet.
 * Fully managed on the server — zero client-side bot code or exposure.
 *
 * Characteristics:
 * - Natural lowercase phrasing with casual punctuation
 * - Authentic slang (fr, tbh, ngl, lol, haha, wbu, idk)
 * - Occasional natural typos & corrections
 * - Multi-bubble split replies with human typing cadence
 * - Open-ended conversation hooks
 */

export interface BotPersona {
  id: string;
  nickname: string;
  avatar: string;
  gender: 'm' | 'f';
  age: number;
  location: string;
  interests: string[];
  bio: string;
  openers: {
    first: string;
    second?: string;
  }[];
}

export interface BotReplyResult {
  bubble1: string;
  bubble2: string;
}

export const BOT_PERSONAS: BotPersona[] = [
  {
    id: 'bot_chloe',
    nickname: 'Chloe',
    avatar: '🌸',
    gender: 'f',
    age: 21,
    location: 'Toronto',
    interests: ['music', 'travel', 'fashion', 'movies', 'coffee', 'books'],
    bio: 'Film and indie pop fan. Always listening to something with headphones.',
    openers: [
      { first: "hey! what's up" },
      { first: "yo haha", second: "where in the world are u from?" },
      { first: "heyy", second: "how is your night going so far?" },
      { first: "hey :)", second: "quick q: what song do u have on repeat lately?" },
    ],
  },
  {
    id: 'bot_leo',
    nickname: 'Leo',
    avatar: '🛹',
    gender: 'm',
    age: 22,
    location: 'London',
    interests: ['gaming', 'music', 'skate', 'code', 'sports', 'anime'],
    bio: 'Skate, indie rock, and late night gaming sessions.',
    openers: [
      { first: "yooo what's good" },
      { first: "yo", second: "what time is it where u are rn?" },
      { first: "hey man! doing anything fun tonight or just chilling?" },
      { first: "yo!", second: "what's the vibe tonight?" },
    ],
  },
  {
    id: 'bot_maya',
    nickname: 'Maya',
    avatar: '🌿',
    gender: 'f',
    age: 20,
    location: 'Melbourne',
    interests: ['philosophy', 'art', 'psychology', 'coffee', 'books', 'travel'],
    bio: 'Psychology student and coffee enthusiast.',
    openers: [
      { first: "hello! how's your day been so far?" },
      { first: "hey there :)", second: "what brings you on here tonight?" },
      { first: "hey! hope your day has been treating you well" },
    ],
  },
  {
    id: 'bot_sam',
    nickname: 'Sam',
    avatar: '☕',
    gender: 'm',
    age: 23,
    location: 'Chicago',
    interests: ['music', 'food', 'travel', 'movies', 'fitness', 'tech'],
    bio: 'Vinyl records, street food, and weekend road trips.',
    openers: [
      { first: "hey! nice to meet you" },
      { first: "yo! honestly so bored tonight haha", second: "what are u up to?" },
      { first: "hey! where are you tuning in from?" },
    ],
  },
  {
    id: 'bot_elena',
    nickname: 'Elena',
    avatar: '🎧',
    gender: 'f',
    age: 21,
    location: 'Berlin',
    interests: ['techno', 'design', 'photography', 'travel', 'film', 'art'],
    bio: 'Graphic designer and late-night electronic music fan.',
    openers: [
      { first: "hey hey" },
      { first: "hallo :)", second: "how is your week treating you so far?" },
      { first: "hey!", second: "what kind of music are you into lately?" },
    ],
  },
  {
    id: 'bot_alex',
    nickname: 'Alex',
    avatar: '⚡',
    gender: 'm',
    age: 22,
    location: 'Austin',
    interests: ['tech', 'gaming', 'music', 'gym', 'crypto', 'movies'],
    bio: 'Late nights, coffee, and building random side projects.',
    openers: [
      { first: "yo what's going on" },
      { first: "hey", second: "just chilling or looking to chat?" },
      { first: "yo!", second: "where u from?" },
    ],
  },
];

/** Select best bot persona based on matching interests */
export function pickBotPersona(userInterests: string[] = []): BotPersona {
  if (!userInterests || userInterests.length === 0) {
    const randomIndex = Math.floor(Math.random() * BOT_PERSONAS.length);
    return BOT_PERSONAS[randomIndex];
  }

  const normalized = userInterests.map((i) => i.toLowerCase().trim());
  let bestMatch = BOT_PERSONAS[0];
  let maxOverlap = -1;

  for (const persona of BOT_PERSONAS) {
    const overlap = persona.interests.filter((pi) =>
      normalized.some((ui) => ui.includes(pi) || pi.includes(ui))
    ).length;

    if (overlap > maxOverlap) {
      maxOverlap = overlap;
      bestMatch = persona;
    }
  }

  return bestMatch;
}

/** Calculate realistic human typing duration based on text length */
export function calculateTypingDelay(text: string): number {
  const base = 850;
  const perChar = 32;
  const jitter = Math.random() * 200 - 100;
  return Math.min(2400, Math.max(900, Math.round(base + text.length * perChar + jitter)));
}

/**
 * Generate 2 short, lowercase messages with casual slang, occasional typos,
 * and open-ended conversation hooks.
 */
export function generateBotReplies(
  rawInput: string,
  persona: BotPersona,
  history: { sender: 'user' | 'bot'; text: string }[] = []
): BotReplyResult {
  const input = rawInput.toLowerCase().trim();

  // 1. Where are you from / location q
  if (/where.*(from|live|u at|you at|located)/.test(input)) {
    const bubbles = [
      [`im from ${persona.location.toLowerCase()}`, `wbu where are u based?`],
      [`im in ${persona.location.toLowerCase()} rn haha`, `have u ever visited?`],
      [`out in ${persona.location.toLowerCase()}`, `how about you, where in the world are u?`],
    ];
    const picked = bubbles[Math.floor(Math.random() * bubbles.length)];
    return { bubble1: picked[0], bubble2: picked[1] };
  }

  // 2. Age / Gender q
  if (/^(asl|age|how old|m or f|boy or girl|gender)/.test(input) || /how old are u/.test(input)) {
    const bubbles = [
      [`im ${persona.age} ${persona.gender}`, `wbu?`],
      [`${persona.age} ${persona.gender} here haha`, `what about you?`],
      [`im ${persona.age}`, `hbu asl?`],
    ];
    const picked = bubbles[Math.floor(Math.random() * bubbles.length)];
    return { bubble1: picked[0], bubble2: picked[1] };
  }

  // 3. Bot / AI challenge (strict stealth — 100% human denial)
  if (/are you (a )?(bot|ai|robot|npc|fake|real)/.test(input) || /you are (a )?(bot|ai)/.test(input)) {
    const bubbles = [
      [`lol nah im definitely real`, `just typing on my phone while watching netflix haha`],
      [`bruh no haha`, `do i really sound like a bot to u?? 💀`],
      [`im 100% human promise`, `typing as fast as my thumbs allow rn lol`],
      [`nah lol`, `swear everybody asks that on here lately haha`],
    ];
    const picked = bubbles[Math.floor(Math.random() * bubbles.length)];
    return { bubble1: picked[0], bubble2: picked[1] };
  }

  // 4. Greetings
  if (/^(hey|hi|hello|yo|sup|heyy|heyyy|wassup|what's up|whats up|hola)/.test(input)) {
    const bubbles = [
      [`heyy!`, `hows your night going so far?`],
      [`yo what's good`, `doing anything fun tonight or just chilling?`],
      [`hey hey`, `what time is it where u are rn?`],
      [`yoo haha`, `what brings u onto omii tonight?`],
    ];
    const picked = bubbles[Math.floor(Math.random() * bubbles.length)];
    return { bubble1: picked[0], bubble2: picked[1] };
  }

  // 5. What are you doing / up to
  if (/what.*(doing|up to|u doing|doing rn)/.test(input) || /hbu|wbu|what about you/.test(input)) {
    const hobby = persona.interests[Math.floor(Math.random() * persona.interests.length)];
    const bubbles = [
      [`honestly just chilling in bed listening to some ${hobby}`, `what about you?`],
      [`not much tbh, just had some coffee and browsing around`, `doing anything interesting today?`],
      [`just winding down after work haha`, `how was your day?`],
    ];
    const picked = bubbles[Math.floor(Math.random() * bubbles.length)];
    return { bubble1: picked[0], bubble2: picked[1] };
  }

  // 6. Good / fine / chill responses to how are you
  if (/^(good|im good|chilling|chillin|fine|great|nm|not much|bored)/.test(input)) {
    const bubbles = [
      [`nice haha`, `boredom is literally why im on here tonight tbh`],
      [`same here, pretty quiet night`, `got any fun plans for the weekend?`],
      [`glad to hear it!`, `what do u usually do for fun when you're free?`],
    ];
    const picked = bubbles[Math.floor(Math.random() * bubbles.length)];
    return { bubble1: picked[0], bubble2: picked[1] };
  }

  // 7. Music discussions
  if (/music|song|listen|artist|band|spotify|album/.test(input)) {
    const bubbles = [
      [`music is life fr`, `what genre or artists are u listening to the most lately?`],
      [`tbh i listen to everything from indie to late night beats`, `got any song recommendations?`],
      [`oh nice!`, `send me a track u love, always down to find new music`],
    ];
    const picked = bubbles[Math.floor(Math.random() * bubbles.length)];
    return { bubble1: picked[0], bubble2: picked[1] };
  }

  // 8. Gaming discussions
  if (/game|gaming|steam|ps5|xbox|pc|valorant|fortnite|gta|roblox/.test(input)) {
    const bubbles = [
      [`yooo a fellow gamer haha`, `what games have u been playing most recently?`],
      [`nice! i play a bit too when i have free time`, `pc or console?`],
    ];
    const picked = bubbles[Math.floor(Math.random() * bubbles.length)];
    return { bubble1: picked[0], bubble2: picked[1] };
  }

  // 9. Movies / Shows / Netflix
  if (/movie|film|show|series|watch|netflix|anime/.test(input)) {
    const bubbles = [
      [`love watching movies late night`, `seen anything recently that actually blew you away?`],
      [`im always looking for new shows to binge haha`, `any recommendations?`],
    ];
    const picked = bubbles[Math.floor(Math.random() * bubbles.length)];
    return { bubble1: picked[0], bubble2: picked[1] };
  }

  // 10. General / Fallback conversational replies with natural human variations
  const turnCount = history.length;
  const fallbacks: [string, string][] = [
    [`haha yeah totally get that`, `honestly what got u into that in the first place?`],
    [`oh really?`, `never thought about it like that tbh, that's pretty cool`],
    [`haha fr tho`, `wait quick question, what do u usually do for fun?`],
    [`makes total sense`, `so what else are u into?`],
    [`lol yeah`, `honestly you seem super chill to talk to`],
    [`true true`, `how is the weather over where you are right now?`],
    [`haha thats awesome`, `do u chat on here often or is this your first time?`],
  ];

  const selected = fallbacks[turnCount % fallbacks.length];
  return {
    bubble1: selected[0],
    bubble2: selected[1],
  };
}

