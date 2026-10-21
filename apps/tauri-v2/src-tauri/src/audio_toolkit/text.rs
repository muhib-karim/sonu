use natural::phonetics::soundex;
use strsim::levenshtein;

/// Applies custom word corrections to transcribed text using fuzzy matching
///
/// This function corrects words in the input text by finding the best matches
/// from a list of custom words using a combination of:
/// - Levenshtein distance for string similarity
/// - Soundex phonetic matching for pronunciation similarity
///
/// # Arguments
/// * `text` - The input text to correct
/// * `custom_words` - List of custom words to match against
/// * `threshold` - Maximum similarity score to accept (0.0 = exact match, 1.0 = any match)
///
/// # Returns
/// The corrected text with custom words applied
pub fn apply_custom_words(text: &str, custom_words: &[String], threshold: f64) -> String {
    if custom_words.is_empty() {
        return text.to_string();
    }

    // Pre-compute lowercase versions to avoid repeated allocations
    let custom_words_lower: Vec<String> = custom_words.iter().map(|w| w.to_lowercase()).collect();

    let words: Vec<&str> = text.split_whitespace().collect();
    let mut corrected_words = Vec::new();

    for word in words {
        let cleaned_word = word
            .trim_matches(|c: char| !c.is_alphabetic())
            .to_lowercase();

        if cleaned_word.is_empty() {
            corrected_words.push(word.to_string());
            continue;
        }

        // Skip extremely long words to avoid performance issues
        if cleaned_word.len() > 50 {
            corrected_words.push(word.to_string());
            continue;
        }

        let mut best_match: Option<&String> = None;
        let mut best_score = f64::MAX;

        for (i, custom_word_lower) in custom_words_lower.iter().enumerate() {
            // `natural::soundex` indexes the first character unconditionally,
            // so an empty entry (possible in a hand-edited settings file)
            // would panic and, with `panic = "abort"`, kill the app.
            if custom_word_lower.is_empty() {
                continue;
            }

            // Skip if lengths are too different (optimization)
            let len_diff = (cleaned_word.len() as i32 - custom_word_lower.len() as i32).abs();
            if len_diff > 5 {
                continue;
            }

            // Calculate Levenshtein distance (normalized by length)
            let levenshtein_dist = levenshtein(&cleaned_word, custom_word_lower);
            let max_len = cleaned_word.len().max(custom_word_lower.len()) as f64;
            let levenshtein_score = if max_len > 0.0 {
                levenshtein_dist as f64 / max_len
            } else {
                1.0
            };

            // Calculate phonetic similarity using Soundex
            let phonetic_match = soundex(&cleaned_word, custom_word_lower);

            // Combine scores: favor phonetic matches, but also consider string similarity
            let combined_score = if phonetic_match {
                levenshtein_score * 0.3 // Give significant boost to phonetic matches
            } else {
                levenshtein_score
            };

            // Accept if the score is good enough (configurable threshold)
            if combined_score < threshold && combined_score < best_score {
                best_match = Some(&custom_words[i]);
                best_score = combined_score;
            }
        }

        if let Some(replacement) = best_match {
            // Preserve the original case pattern as much as possible
            let corrected = preserve_case_pattern(word, replacement);

            // Preserve punctuation from original word
            let (prefix, suffix) = extract_punctuation(word);
            corrected_words.push(format!("{}{}{}", prefix, corrected, suffix));
        } else {
            corrected_words.push(word.to_string());
        }
    }

    corrected_words.join(" ")
}

/// Preserves the case pattern of the original word when applying a replacement
fn preserve_case_pattern(original: &str, replacement: &str) -> String {
    // Only alphabetic characters carry case information. Looking at the raw
    // `chars()` would let a leading emoji or CJK punctuation suppress the
    // uppercase detection entirely.
    let alphabetic: Vec<char> = original.chars().filter(|c| c.is_alphabetic()).collect();

    if !alphabetic.is_empty() && alphabetic.iter().all(|c| c.is_uppercase()) {
        replacement.to_uppercase()
    } else if alphabetic.first().is_some_and(|c| c.is_uppercase()) {
        let mut chars: Vec<char> = replacement.chars().collect();
        if let Some(first_char) = chars.get_mut(0) {
            *first_char = first_char.to_uppercase().next().unwrap_or(*first_char);
        }
        chars.into_iter().collect()
    } else {
        replacement.to_string()
    }
}

/// Extracts the punctuation prefix and suffix surrounding a word.
///
/// Offsets are computed from `char_indices` so they are always valid **byte**
/// boundaries. The previous implementation counted characters but sliced
/// bytes, which panicked on any multi-byte non-alphabetic character (emoji,
/// CJK punctuation) and — because the release profile sets `panic = "abort"` —
/// killed the whole process.
fn extract_punctuation(word: &str) -> (&str, &str) {
    let start = word
        .char_indices()
        .find(|(_, c)| c.is_alphabetic())
        .map(|(i, _)| i);

    let Some(start) = start else {
        // No alphabetic characters at all. Report the whole word as prefix
        // rather than as both prefix and suffix (which would duplicate it).
        return (word, "");
    };

    let end = word
        .char_indices()
        .rev()
        .find(|(_, c)| c.is_alphabetic())
        .map(|(i, c)| i + c.len_utf8())
        .unwrap_or(start);

    (&word[..start], &word[end..])
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_apply_custom_words_exact_match() {
        let text = "hello world";
        let custom_words = vec!["Hello".to_string(), "World".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "Hello World");
    }

    #[test]
    fn test_apply_custom_words_fuzzy_match() {
        let text = "helo wrold";
        let custom_words = vec!["hello".to_string(), "world".to_string()];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "hello world");
    }

    #[test]
    fn test_preserve_case_pattern() {
        assert_eq!(preserve_case_pattern("HELLO", "world"), "WORLD");
        assert_eq!(preserve_case_pattern("Hello", "world"), "World");
        assert_eq!(preserve_case_pattern("hello", "WORLD"), "WORLD");
    }

    #[test]
    fn test_extract_punctuation() {
        assert_eq!(extract_punctuation("hello"), ("", ""));
        assert_eq!(extract_punctuation("!hello?"), ("!", "?"));
        assert_eq!(extract_punctuation("...hello..."), ("...", "..."));
    }

    /// Regression: offsets were previously counted in chars but used as byte
    /// indices, so any multi-byte non-alphabetic character panicked. With
    /// `panic = "abort"` in the release profile that aborted the process.
    #[test]
    fn test_extract_punctuation_multibyte_does_not_panic() {
        assert_eq!(extract_punctuation("😀hello"), ("😀", ""));
        assert_eq!(extract_punctuation("hello😀"), ("", "😀"));
        assert_eq!(extract_punctuation("😀hello😀"), ("😀", "😀"));
        assert_eq!(extract_punctuation("「hello」"), ("「", "」"));
        assert_eq!(extract_punctuation("—hello…"), ("—", "…"));
        // Fully non-alphabetic input must not duplicate the word as both
        // prefix and suffix.
        assert_eq!(extract_punctuation("😀"), ("😀", ""));
        assert_eq!(extract_punctuation(""), ("", ""));
    }

    #[test]
    fn test_apply_custom_words_with_emoji_does_not_panic() {
        let custom_words = vec!["hello".to_string()];

        let result = apply_custom_words("😀helo", &custom_words, 0.5);
        assert_eq!(result, "😀hello");

        let result = apply_custom_words("helo😀", &custom_words, 0.5);
        assert_eq!(result, "hello😀");

        let result = apply_custom_words("「helo」", &custom_words, 0.5);
        assert_eq!(result, "「hello」");
    }

    #[test]
    fn test_preserve_case_pattern_ignores_non_alphabetic_prefix() {
        assert_eq!(preserve_case_pattern("😀HELLO", "world"), "WORLD");
        assert_eq!(preserve_case_pattern("😀Hello", "world"), "World");
        assert_eq!(preserve_case_pattern("😀hello", "world"), "world");
    }

    #[test]
    fn test_empty_custom_words() {
        let text = "hello world";
        let custom_words = vec![];
        let result = apply_custom_words(text, &custom_words, 0.5);
        assert_eq!(result, "hello world");
    }

    /// Regression: `natural::soundex` indexes `chars[0]`, so comparing against
    /// an empty custom word panicked (and aborted the release build).
    #[test]
    fn test_empty_custom_word_entry_does_not_panic() {
        let custom_words = vec![String::new(), "hello".to_string()];
        let result = apply_custom_words("helo there", &custom_words, 0.5);
        assert_eq!(result, "hello there");
    }

    #[test]
    fn test_threshold_zero_disables_correction() {
        // The comparison is strict (`score < threshold`), so 0.0 turns the
        // feature off even for words that differ only in case.
        let custom_words = vec!["Hello".to_string()];
        assert_eq!(
            apply_custom_words("hello helo", &custom_words, 0.0),
            "hello helo"
        );
    }

    #[test]
    fn test_phonetic_match_is_preferred_at_default_threshold() {
        // 0.18 is the shipped default (`default_word_correction_threshold`).
        let custom_words = vec!["Smith".to_string()];
        // "smyth" sounds like "smith" (Soundex S530): 1/5 edits * 0.3 = 0.06.
        assert_eq!(apply_custom_words("smyth", &custom_words, 0.18), "Smith");
        // "smitz" is also one edit away but sounds different (S532): 0.2 is
        // above the threshold, so it is left alone.
        assert_eq!(apply_custom_words("smitz", &custom_words, 0.18), "smitz");
    }

    #[test]
    fn test_overlong_words_are_not_corrected() {
        let long = "a".repeat(60);
        let custom_words = vec![long.to_uppercase()];
        assert_eq!(apply_custom_words(&long, &custom_words, 0.5), long);
    }
}
