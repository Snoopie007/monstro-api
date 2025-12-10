/**
 * Curated list of well-supported emojis for reactions and messaging
 * Focused on pre-2020 emojis for maximum compatibility across platforms
 */

// ============================================
// CHAT REACTIONS (Full set for group chat)
// ============================================

// Quick reactions for chat messages (most commonly used) - matches mobile
export const CHAT_QUICK_REACTIONS = [
  { name: "thumbsup", display: "👍" },
  { name: "heart", display: "❤️" },
  { name: "joy", display: "😂" },
  { name: "astonished", display: "😮" },
  { name: "sad", display: "😢" },
  { name: "pray", display: "🙏" },
  { name: "hot", display: "🔥" },
  { name: "party", display: "🎉" },
  { name: "muscle", display: "💪" },
  { name: "openhand", display: "🤜" },
  { name: "brokenheart", display: "💔" },
  { name: "cry", display: "😭" },
  { name: "angry", display: "😠" },
  { name: "clap", display: "👏" },
  { name: "rock", display: "🤘" },
] as const;

// ============================================
// POST REACTIONS (Limited set for posts)
// ============================================

// Quick access emojis for posts (inline buttons - just 2)
export const POST_QUICK_REACTIONS = [
  { name: "thumbsup", display: "👍" },
  { name: "fire", display: "🔥" },
] as const;

// Fixed set of reaction emojis for posts dialog (11 emojis)
export const POST_REACTIONS = [
  { name: 'fire', display: '🔥' },
  { name: 'thumbsup', display: '👍' },
  { name: 'thumbsdown', display: '👎' },
  { name: 'muscle', display: '💪' },
  { name: 'heart', display: '❤️' },
  { name: 'broken_heart', display: '💔' },
  { name: 'clap', display: '👏' },
  { name: 'raised_hands', display: '🙌' },
  { name: 'rock_on', display: '🤘' },
  { name: 'party', display: '🎉' },
  { name: 'joy', display: '😂' },
] as const;

// ============================================
// EMOJI CATEGORIES (Full picker for chat)
// ============================================

const SMILEYS = [
  { name: "grin", display: "😀" },
  { name: "biggrin", display: "😃" },
  { name: "smilegrin", display: "😄" },
  { name: "beaming", display: "😁" },
  { name: "squintgrin", display: "😆" },
  { name: "sweatgrin", display: "😅" },
  { name: "rofl", display: "🤣" },
  { name: "joy", display: "😂" },
  { name: "slight", display: "🙂" },
  { name: "upsidedown", display: "🙃" },
  { name: "wink", display: "😉" },
  { name: "smile", display: "😊" },
  { name: "halo", display: "😇" },
  { name: "hearts", display: "🥰" },
  { name: "lovely", display: "😍" },
  { name: "starstruck", display: "🤩" },
  { name: "kiss", display: "😘" },
  { name: "kissing", display: "😗" },
  { name: "kissclosed", display: "😚" },
  { name: "kisssmile", display: "😙" },
  { name: "tear", display: "🥲" },
  { name: "yum", display: "😋" },
  { name: "tongue", display: "😛" },
  { name: "crazytongue", display: "😜" },
  { name: "zany", display: "🤪" },
  { name: "squinttongue", display: "😝" },
  { name: "money", display: "🤑" },
  { name: "hug", display: "🤗" },
  { name: "oops", display: "🤭" },
  { name: "shush", display: "🤫" },
  { name: "think", display: "🤔" },
  { name: "zipper", display: "🤐" },
  { name: "skeptic", display: "🤨" },
  { name: "neutral", display: "😐" },
  { name: "blank", display: "😑" },
  { name: "silent", display: "😶" },
  { name: "smirk", display: "😏" },
  { name: "unamused", display: "😒" },
  { name: "eyeroll", display: "🙄" },
  { name: "grimace", display: "😬" },
  { name: "exhale", display: "😮‍💨" },
  { name: "lie", display: "🤥" },
  { name: "relief", display: "😌" },
  { name: "pensive", display: "😔" },
  { name: "sleepy", display: "😪" },
  { name: "drool", display: "🤤" },
  { name: "sleep", display: "😴" },
  { name: "mask", display: "😷" },
  { name: "sick", display: "🤒" },
  { name: "bandage", display: "🤕" },
  { name: "nausea", display: "🤢" },
  { name: "vomit", display: "🤮" },
  { name: "sneeze", display: "🤧" },
  { name: "hot", display: "🥵" },
  { name: "cold", display: "🥶" },
  { name: "woozy", display: "🥴" },
] as const;

const GESTURES = [
  { name: "wave", display: "👋" },
  { name: "palmup", display: "🤚" },
  { name: "handspread", display: "🖐️" },
  { name: "handstop", display: "✋" },
  { name: "vulcan", display: "🖖" },
  { name: "ok", display: "👌" },
  { name: "pinched", display: "🤌" },
  { name: "pinch", display: "🤏" },
  { name: "peace", display: "✌️" },
  { name: "crossfingers", display: "🤞" },
  { name: "ily", display: "🤟" },
  { name: "rockon", display: "🤘" },
  { name: "callme", display: "🤙" },
  { name: "left", display: "👈" },
  { name: "right", display: "👉" },
  { name: "up", display: "👆" },
  { name: "middle", display: "🖕" },
  { name: "down", display: "👇" },
  { name: "pointup", display: "☝️" },
  { name: "thumbsup", display: "👍" },
  { name: "thumbsdown", display: "👎" },
  { name: "fist", display: "✊" },
  { name: "punch", display: "👊" },
  { name: "leftpunch", display: "🤛" },
  { name: "rightpunch", display: "🤜" },
  { name: "clap", display: "👏" },
  { name: "celebrate", display: "🙌" },
  { name: "openhands", display: "👐" },
  { name: "cupped", display: "🤲" },
  { name: "handshake", display: "🤝" },
  { name: "pray", display: "🙏" },
  { name: "write", display: "✍️" },
  { name: "muscle", display: "💪" },
  { name: "robotarm", display: "🦾" },
  { name: "robotleg", display: "🦿" },
  { name: "leg", display: "🦵" },
  { name: "foot", display: "🦶" },
  { name: "ear", display: "👂" },
  { name: "hearing", display: "🦻" },
  { name: "nose", display: "👃" },
  { name: "brain", display: "🧠" },
  { name: "tooth", display: "🦷" },
  { name: "bone", display: "🦴" },
  { name: "eyes", display: "👀" },
  { name: "eye", display: "👁️" },
  { name: "tongue", display: "👅" },
  { name: "mouth", display: "👄" },
  { name: "kiss", display: "💋" },
  { name: "santa", display: "🎅" },
  { name: "mrsclaus", display: "🤶" },
  { name: "claus", display: "🧑‍🎄" },
] as const;

const ANIMALS = [
  { name: "dog", display: "🐶" },
  { name: "cat", display: "🐱" },
  { name: "mouse", display: "🐭" },
  { name: "hamster", display: "🐹" },
  { name: "rabbit", display: "🐰" },
  { name: "fox", display: "🦊" },
  { name: "bear", display: "🐻" },
  { name: "panda", display: "🐼" },
  { name: "koala", display: "🐨" },
  { name: "tiger", display: "🐯" },
  { name: "lion", display: "🦁" },
  { name: "cow", display: "🐮" },
  { name: "pig", display: "🐷" },
  { name: "frog", display: "🐸" },
  { name: "monkey", display: "🐵" },
  { name: "chicken", display: "🐔" },
  { name: "penguin", display: "🐧" },
  { name: "bird", display: "🐦" },
  { name: "chick", display: "🐤" },
  { name: "duck", display: "🦆" },
  { name: "eagle", display: "🦅" },
  { name: "owl", display: "🦉" },
  { name: "bat", display: "🦇" },
  { name: "wolf", display: "🐺" },
  { name: "boar", display: "🐗" },
  { name: "horse", display: "🐴" },
  { name: "unicorn", display: "🦄" },
  { name: "bee", display: "🐝" },
  { name: "worm", display: "🪱" },
  { name: "bug", display: "🐛" },
  { name: "butterfly", display: "🦋" },
  { name: "snail", display: "🐌" },
  { name: "ladybug", display: "🐞" },
  { name: "ant", display: "🐜" },
  { name: "mosquito", display: "🦟" },
  { name: "cricket", display: "🦗" },
  { name: "spider", display: "🕷️" },
  { name: "scorpion", display: "🦂" },
  { name: "turtle", display: "🐢" },
  { name: "snake", display: "🐍" },
  { name: "lizard", display: "🦎" },
  { name: "trex", display: "🦖" },
  { name: "sauropod", display: "🦕" },
  { name: "octopus", display: "🐙" },
  { name: "squid", display: "🦑" },
  { name: "shrimp", display: "🦐" },
  { name: "lobster", display: "🦞" },
  { name: "crab", display: "🦀" },
  { name: "puffer", display: "🐡" },
  { name: "tropical", display: "🐠" },
  { name: "fish", display: "🐟" },
  { name: "dolphin", display: "🐬" },
  { name: "whale", display: "🐳" },
  { name: "whaleblue", display: "🐋" },
  { name: "shark", display: "🦈" },
  { name: "crocodile", display: "🐊" },
  { name: "tigerwild", display: "🐅" },
  { name: "leopard", display: "🐆" },
  { name: "zebra", display: "🦓" },
  { name: "gorilla", display: "🦍" },
  { name: "orangutan", display: "🦧" },
  { name: "mammoth", display: "🦣" },
  { name: "elephant", display: "🐘" },
  { name: "hippo", display: "🦛" },
  { name: "raccoon", display: "🦝" },
  { name: "skunk", display: "🦨" },
  { name: "badger", display: "🦡" },
  { name: "beaver", display: "🦫" },
  { name: "otter", display: "🦦" },
  { name: "sloth", display: "🦥" },
  { name: "rat", display: "🐁" },
  { name: "mouse2", display: "🐀" },
  { name: "squirrel", display: "🐿️" },
  { name: "hedgehog", display: "🦔" },
  { name: "deer", display: "🦌" },
] as const;

const FOOD = [
  { name: "apple", display: "🍎" },
  { name: "orange", display: "🍊" },
  { name: "lemon", display: "🍋" },
  { name: "banana", display: "🍌" },
  { name: "watermelon", display: "🍉" },
  { name: "grape", display: "🍇" },
  { name: "strawberry", display: "🍓" },
  { name: "blueberry", display: "🫐" },
  { name: "melon", display: "🍈" },
  { name: "cherry", display: "🍒" },
  { name: "peach", display: "🍑" },
  { name: "mango", display: "🥭" },
  { name: "pineapple", display: "🍍" },
  { name: "coconut", display: "🥥" },
  { name: "kiwi", display: "🥝" },
  { name: "tomato", display: "🍅" },
  { name: "eggplant", display: "🍆" },
  { name: "avocado", display: "🥑" },
  { name: "broccoli", display: "🥦" },
  { name: "lettuce", display: "🥬" },
  { name: "cucumber", display: "🥒" },
  { name: "chili", display: "🌶️" },
  { name: "bellpepper", display: "🫑" },
  { name: "corn", display: "🌽" },
  { name: "carrot", display: "🥕" },
  { name: "olive", display: "🫒" },
  { name: "garlic", display: "🧄" },
  { name: "onion", display: "🧅" },
  { name: "potato", display: "🥔" },
  { name: "sweetpotato", display: "🍠" },
  { name: "croissant", display: "🥐" },
  { name: "pancakes", display: "🥞" },
  { name: "waffle", display: "🧇" },
  { name: "bacon", display: "🥓" },
  { name: "steak", display: "🥩" },
  { name: "chickenleg", display: "🍗" },
  { name: "meat", display: "🍖" },
  { name: "hotdog", display: "🌭" },
  { name: "burger", display: "🍔" },
  { name: "fries", display: "🍟" },
  { name: "pizza", display: "🍕" },
  { name: "flatbread", display: "🫓" },
  { name: "sandwich", display: "🥪" },
  { name: "wrap", display: "🥙" },
  { name: "falafel", display: "🧆" },
  { name: "taco", display: "🌮" },
  { name: "burrito", display: "🌯" },
  { name: "tamale", display: "🫔" },
  { name: "salad", display: "🥗" },
  { name: "stew", display: "🥘" },
  { name: "fondue", display: "🫕" },
  { name: "canned", display: "🥫" },
  { name: "spaghetti", display: "🍝" },
  { name: "ramen", display: "🍜" },
  { name: "soup", display: "🍲" },
  { name: "sushi", display: "🍣" },
  { name: "bento", display: "🍱" },
  { name: "dumpling", display: "🥟" },
  { name: "oyster", display: "🦪" },
  { name: "friedshrimp", display: "🍤" },
  { name: "riceball", display: "🍙" },
  { name: "rice", display: "🍚" },
  { name: "ricecracker", display: "🍘" },
  { name: "shavedice", display: "🍧" },
  { name: "cupcake", display: "🧁" },
  { name: "cake", display: "🍰" },
  { name: "birthdaycake", display: "🎂" },
  { name: "custard", display: "🍮" },
  { name: "lollipop", display: "🍭" },
] as const;

const SPORTS = [
  { name: "soccer", display: "⚽" },
  { name: "basketball", display: "🏀" },
  { name: "football", display: "🏈" },
  { name: "baseball", display: "⚾" },
  { name: "softball", display: "🥎" },
  { name: "tennis", display: "🎾" },
  { name: "volleyball", display: "🏐" },
  { name: "rugby", display: "🏉" },
  { name: "frisbee", display: "🥏" },
  { name: "billiards", display: "🎱" },
  { name: "yoyo", display: "🪀" },
  { name: "pingpong", display: "🏓" },
  { name: "badminton", display: "🏸" },
  { name: "hockey", display: "🏒" },
  { name: "fieldhockey", display: "🏑" },
  { name: "lacrosse", display: "🥍" },
  { name: "cricket", display: "🏏" },
  { name: "boomerang", display: "🪃" },
  { name: "goal", display: "🥅" },
  { name: "golf", display: "⛳" },
  { name: "kite", display: "🪁" },
  { name: "archery", display: "🏹" },
  { name: "fishing", display: "🎣" },
  { name: "diving", display: "🤿" },
] as const;

const TRANSPORTATION = [
  { name: "car", display: "🚗" },
  { name: "bus", display: "🚌" },
  { name: "racecar", display: "🏎️" },
  { name: "policecar", display: "🚓" },
  { name: "ambulance", display: "🚑" },
  { name: "firetruck", display: "🚒" },
  { name: "truck", display: "🚚" },
  { name: "tractor", display: "🚜" },
  { name: "wheelchair", display: "🦽" },
  { name: "scooter", display: "🛴" },
  { name: "bicycle", display: "🚲" },
  { name: "motorbike", display: "🏍️" },
  { name: "autorickshaw", display: "🛺" },
  { name: "siren", display: "🚨" },
  { name: "cablecar", display: "🚡" },
  { name: "tram", display: "🚃" },
  { name: "bullettrain", display: "🚄" },
  { name: "train", display: "🚂" },
  { name: "subway", display: "🚇" },
  { name: "station", display: "🚉" },
  { name: "airplane", display: "✈️" },
  { name: "smallplane", display: "🛩️" },
  { name: "satellite", display: "🛰️" },
  { name: "rocket", display: "🚀" },
] as const;

const NUMBERS = [
  { name: "0", display: "0️⃣" },
  { name: "1", display: "1️⃣" },
  { name: "2", display: "2️⃣" },
  { name: "3", display: "3️⃣" },
  { name: "4", display: "4️⃣" },
  { name: "5", display: "5️⃣" },
  { name: "6", display: "6️⃣" },
  { name: "7", display: "7️⃣" },
  { name: "8", display: "8️⃣" },
  { name: "9", display: "9️⃣" },
  { name: "10", display: "🔟" },
  { name: "100", display: "💯" },
] as const;

const SYMBOLS = [
  { name: "heart", display: "❤️" },
  { name: "heartbeat", display: "💓" },
  { name: "heartpulse", display: "💗" },
  { name: "heartbroken", display: "💔" },
  { name: "diamond", display: "💎" },
  { name: "star", display: "⭐" },
  { name: "star2", display: "🌟" },
  { name: "star3", display: "🌠" },
  { name: "moon", display: "🌙" },
  { name: "sun", display: "🌞" },
  { name: "cloud", display: "🌥️" },
  { name: "rain", display: "🌧️" },
  { name: "snow", display: "❄️" },
  { name: "fire", display: "🔥" },
  { name: "sparkles", display: "✨" },
  { name: "check", display: "✅" },
  { name: "x", display: "❌" },
  { name: "question", display: "❓" },
  { name: "exclamation", display: "❗" },
  { name: "warning", display: "⚠️" },
] as const;

// All emoji categories (array format for easy iteration)
export const EMOJI_CATEGORIES = [
  { name: 'Quick Reactions', emojis: CHAT_QUICK_REACTIONS },
  { name: 'Smileys', emojis: SMILEYS },
  { name: 'Gestures', emojis: GESTURES },
  { name: 'Animals', emojis: ANIMALS },
  { name: 'Food & Drink', emojis: FOOD },
  { name: 'Sports', emojis: SPORTS },
  { name: 'Transportation', emojis: TRANSPORTATION },
  { name: 'Numbers', emojis: NUMBERS },
  { name: 'Symbols', emojis: SYMBOLS },
] as const;

// ============================================
// Type Helpers
// ============================================

export type EmojiData = {
  name: string;
  display: string;
};

export type EmojiCategory = (typeof EMOJI_CATEGORIES)[number];
export type ChatQuickReaction = (typeof CHAT_QUICK_REACTIONS)[number];
export type PostReaction = (typeof POST_REACTIONS)[number];
export type PostQuickReaction = (typeof POST_QUICK_REACTIONS)[number];

// ============================================
// Helper Functions
// ============================================

// Helper function to get all emojis as a flat array
export const getAllEmojis = (): EmojiData[] => {
  return EMOJI_CATEGORIES.flatMap(cat => [...cat.emojis]);
};

// Helper to convert to API format (value/name/type)
export const toEmojiData = (display: string, name: string) => ({
  value: display,
  name,
  type: 'emoji' as const,
});

// Helper to find emoji by display value
export const findEmojiByDisplay = (display: string): EmojiData | undefined => {
  for (const category of EMOJI_CATEGORIES) {
    const found = category.emojis.find(e => e.display === display);
    if (found) return found;
  }
  return undefined;
};
