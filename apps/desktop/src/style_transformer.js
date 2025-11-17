/**
 * Style Transformation Module for SONU
 * Transforms transcribed text based on selected style and category
 * Uses rule-based transformations for instant, offline processing
 */

/**
 * Apply style transformation to text
 * @param {string} text - The transcribed text to transform
 * @param {string} style - The style to apply: 'formal', 'casual', 'very_casual', 'excited', or 'none'
 * @param {string} category - The category: 'personal', 'work', 'email', 'other'
 * @returns {string} - The transformed text
 */
function applyStyle(text, style = 'none', category = 'personal') {
  if (!text || !text.trim()) {
    return text;
  }

  // If style is 'none' or not recognized, return original text
  if (!style || style === 'none') {
    return text;
  }

  let transformed = text.trim();

  switch (style.toLowerCase()) {
    case 'formal':
      transformed = applyFormalStyle(transformed, category);
      break;
    case 'casual':
      transformed = applyCasualStyle(transformed, category);
      break;
    case 'very_casual':
      transformed = applyVeryCasualStyle(transformed, category);
      break;
    case 'excited':
      transformed = applyExcitedStyle(transformed, category);
      break;
    default:
      // Unknown style, return original
      return text;
  }

  return transformed;
}

/**
 * Apply formal style: Proper capitalization + punctuation
 * Example: "Hey, are you free for lunch tomorrow? Let's do 12 if that works for you."
 */
function applyFormalStyle(text, category = 'personal') {
  // Ensure proper sentence capitalization
  let result = capitalizeSentences(text);
  
  // Ensure proper punctuation at the end
  result = ensurePunctuation(result);
  
  // Ensure commas are properly placed (basic rules)
  result = ensureCommas(result);
  
  return result;
}

/**
 * Apply casual style: Capitalization + less punctuation
 * Example: "Hey are you free for lunch tomorrow? Let's do 12 if that works for you"
 */
function applyCasualStyle(text, category = 'personal') {
  // Ensure proper sentence capitalization
  let result = capitalizeSentences(text);
  
  // Remove trailing periods (but keep question marks and exclamation marks)
  result = result.replace(/\.$/g, '');
  
  // Keep question marks and exclamation marks
  // Don't add punctuation if it doesn't exist
  
  return result;
}

/**
 * Apply very casual style: No capitalization + less punctuation
 * Example: "hey are you free for lunch tomorrow? let's do 12 if that works for you"
 */
function applyVeryCasualStyle(text, category = 'personal') {
  // Convert to lowercase
  let result = text.toLowerCase();
  
  // Remove trailing periods (but keep question marks and exclamation marks)
  result = result.replace(/\.$/g, '');
  
  // Keep question marks and exclamation marks for natural flow
  
  return result;
}

/**
 * Apply excited style: More exclamations
 * Example: "Hey, if you're free, let's chat about the great results!"
 */
function applyExcitedStyle(text, category = 'personal') {
  // Ensure proper sentence capitalization
  let result = capitalizeSentences(text);
  
  // Replace trailing periods with exclamation marks
  result = result.replace(/\.$/g, '!');
  
  // If no punctuation at end, add exclamation
  if (!/[.!?]$/.test(result.trim())) {
    result = result.trim() + '!';
  }
  
  return result;
}

/**
 * Capitalize the first letter of each sentence
 */
function capitalizeSentences(text) {
  if (!text || text.length === 0) {
    return text;
  }

  // First, ensure the first character is capitalized
  let result = text.trim();
  if (result.length > 0 && /[a-z]/.test(result[0])) {
    result = result[0].toUpperCase() + result.slice(1);
  }

  // Then capitalize after sentence-ending punctuation (., !, ?)
  // Match: period/exclamation/question mark followed by space and lowercase letter
  result = result.replace(/([.!?]\s+)([a-z])/g, (match, punc, letter) => {
    return punc + letter.toUpperCase();
  });

  return result;
}

/**
 * Ensure text ends with proper punctuation
 */
function ensurePunctuation(text) {
  if (!text || text.length === 0) {
    return text;
  }

  const trimmed = text.trim();
  const lastChar = trimmed[trimmed.length - 1];
  
  // If it doesn't end with punctuation, add a period
  if (!/[.!?]/.test(lastChar)) {
    return trimmed + '.';
  }

  return text;
}

/**
 * Ensure basic comma placement (simple rules)
 */
function ensureCommas(text) {
  // This is a simplified version - can be enhanced later
  // For now, we'll keep the text as-is since Whisper usually handles commas well
  return text;
}

/**
 * Get style description for UI
 */
function getStyleDescription(style, category = 'personal') {
  const descriptions = {
    'formal': 'Caps + Punctuation',
    'casual': 'Caps + Less punctuation',
    'very_casual': 'No Caps + Less punctuation',
    'excited': 'More exclamations',
    'none': 'No transformation'
  };
  return descriptions[style] || descriptions['none'];
}

/**
 * Get style example for UI based on category
 */
function getStyleExample(style, category = 'personal') {
  const examples = {
    'personal': {
      'formal': 'Hey, are you free for lunch tomorrow? Let\'s do 12 if that works for you.',
      'casual': 'Hey are you free for lunch tomorrow? Let\'s do 12 if that works for you',
      'very_casual': 'hey are you free for lunch tomorrow? let\'s do 12 if that works for you',
      'excited': 'Hey, are you free for lunch tomorrow? Let\'s do 12 if that works for you!'
    },
    'work': {
      'formal': 'Hey, if you\'re free, let\'s chat about the great results.',
      'casual': 'Hey, if you\'re free let\'s chat about the great results',
      'very_casual': 'hey if you\'re free let\'s chat about the great results',
      'excited': 'Hey, if you\'re free, let\'s chat about the great results!'
    },
    'email': {
      'formal': 'Hi Alex,\n\nIt was great talking with you today. Looking forward to our next chat.\n\nBest,\nMary',
      'casual': 'Hi Alex, it was great talking with you today. Looking forward to our next chat.\n\nBest,\nMary',
      'very_casual': 'hi alex it was great talking with you today looking forward to our next chat\n\nbest\nmary',
      'excited': 'Hi Alex,\n\nIt was great talking with you today. Looking forward to our next chat!\n\nBest,\nMary'
    },
    'other': {
      'formal': 'So far, I am enjoying the new workout routine. I am excited for tomorrow\'s workout, especially after a full night of rest.',
      'casual': 'So far I am enjoying the new workout routine. I am excited for tomorrow\'s workout especially after a full night of rest',
      'very_casual': 'so far i am enjoying the new workout routine i am excited for tomorrow\'s workout especially after a full night of rest',
      'excited': 'So far, I am enjoying the new workout routine. I am excited for tomorrow\'s workout, especially after a full night of rest!'
    }
  };
  
  const categoryExamples = examples[category] || examples['personal'];
  return categoryExamples[style] || 'Original transcription';
}

/**
 * Get available styles for a category
 */
function getAvailableStyles(category) {
  if (category === 'personal') {
    return ['formal', 'casual', 'very_casual'];
  } else {
    return ['formal', 'casual', 'excited'];
  }
}

/**
 * Get category banner text
 */
function getCategoryBannerText(category) {
  const banners = {
    'personal': 'This style applies in personal messengers. Available on desktop in English.',
    'work': 'This style applies in workplace messengers. Available on desktop in English.',
    'email': 'This style applies in all major email apps. Available on desktop in English.',
    'other': 'This style applies in all other apps. Available on desktop in English.'
  };
  return banners[category] || banners['personal'];
}

module.exports = {
  applyStyle,
  getStyleDescription,
  getStyleExample,
  getAvailableStyles,
  getCategoryBannerText
};

