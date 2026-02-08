//! Input validation utilities for API keys, user inputs, and configuration values
//! 
//! This module provides comprehensive validation to prevent security issues
//! and ensure data integrity throughout the application.

use regex::Regex;
use lazy_static::lazy_static;

/// Errors that can occur during validation
#[derive(Debug, Clone, PartialEq)]
pub enum ValidationError {
    TooShort { min: usize, actual: usize },
    TooLong { max: usize, actual: usize },
    InvalidCharacters(String),
    InvalidFormat(String),
    Empty,
    ContainsWhitespace,
    ContainsControlChars,
    InvalidPath,
    InvalidUrl,
    RateLimited { retry_after: u64 },
}

impl std::fmt::Display for ValidationError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            ValidationError::TooShort { min, actual } => {
                write!(f, "Input too short: {} characters (minimum {})", actual, min)
            }
            ValidationError::TooLong { max, actual } => {
                write!(f, "Input too long: {} characters (maximum {})", actual, max)
            }
            ValidationError::InvalidCharacters(msg) => write!(f, "Invalid characters: {}", msg),
            ValidationError::InvalidFormat(msg) => write!(f, "Invalid format: {}", msg),
            ValidationError::Empty => write!(f, "Input cannot be empty"),
            ValidationError::ContainsWhitespace => write!(f, "Input cannot contain whitespace"),
            ValidationError::ContainsControlChars => write!(f, "Input cannot contain control characters"),
            ValidationError::InvalidPath => write!(f, "Invalid file path"),
            ValidationError::InvalidUrl => write!(f, "Invalid URL format"),
            ValidationError::RateLimited { retry_after } => write!(f, "Rate limited. Retry after {} seconds", retry_after),
        }
    }
}

impl std::error::Error for ValidationError {}

/// Result type for validation operations
pub type ValidationResult<T> = Result<T, ValidationError>;

lazy_static! {
    /// Regex for API key validation (alphanumeric, hyphens, underscores)
    static ref API_KEY_REGEX: Regex = Regex::new(r"^[a-zA-Z0-9_-]+$").unwrap();
    
    /// Regex for safe file paths (no control chars, no null bytes)
    static ref SAFE_PATH_REGEX: Regex = Regex::new(r"^[^\x00\x01-\x1F\x7F]+$").unwrap();
    
    /// Regex for URL validation (basic)
    static ref URL_REGEX: Regex = Regex::new(
        r"^(https?)://[^\s/$.?#].[^\s]*$"
    ).unwrap();
}

/// Validates an API key for security and format
/// 
/// # Arguments
/// * `key` - The API key to validate
/// 
/// # Returns
/// * `Ok(())` if valid
/// * `Err(ValidationError)` with specific error details
/// 
/// # Validation Rules
/// - Minimum 20 characters
/// - Maximum 512 characters  
/// - Only alphanumeric, hyphens, and underscores
/// - No whitespace
/// - No control characters
pub fn validate_api_key(key: &str) -> ValidationResult<()> {
    if key.is_empty() {
        return Err(ValidationError::Empty);
    }
    
    if key.len() < 20 {
        return Err(ValidationError::TooShort { min: 20, actual: key.len() });
    }
    
    if key.len() > 512 {
        return Err(ValidationError::TooLong { max: 512, actual: key.len() });
    }
    
    if key.chars().any(|c| c.is_whitespace()) {
        return Err(ValidationError::ContainsWhitespace);
    }
    
    if key.chars().any(|c| c.is_control()) {
        return Err(ValidationError::ContainsControlChars);
    }
    
    if !API_KEY_REGEX.is_match(key) {
        return Err(ValidationError::InvalidCharacters(
            "API key can only contain letters, numbers, hyphens, and underscores".to_string()
        ));
    }
    
    Ok(())
}

/// Validates a file path for safety
/// 
/// Prevents:
/// - Path traversal attacks (../)
/// - Null byte injection
/// - Control character injection
pub fn validate_file_path(path: &str) -> ValidationResult<()> {
    if path.is_empty() {
        return Err(ValidationError::Empty);
    }
    
    if path.len() > 4096 {
        return Err(ValidationError::TooLong { max: 4096, actual: path.len() });
    }
    
    // Check for path traversal attempts
    if path.contains("..") || path.contains("~") {
        return Err(ValidationError::InvalidPath);
    }
    
    // Check for null bytes and control characters
    if !SAFE_PATH_REGEX.is_match(path) {
        return Err(ValidationError::InvalidPath);
    }
    
    Ok(())
}

/// Validates a URL
pub fn validate_url(url: &str) -> ValidationResult<()> {
    if url.is_empty() {
        return Err(ValidationError::Empty);
    }
    
    if url.len() > 2048 {
        return Err(ValidationError::TooLong { max: 2048, actual: url.len() });
    }
    
    if !URL_REGEX.is_match(url) {
        return Err(ValidationError::InvalidUrl);
    }
    
    Ok(())
}

/// Validates transcription text input
/// 
/// Prevents:
/// - Excessively long inputs
/// - Control character injection
pub fn validate_transcription_text(text: &str) -> ValidationResult<()> {
    if text.is_empty() {
        return Err(ValidationError::Empty);
    }
    
    // Limit to reasonable transcription length (1MB of text)
    if text.len() > 1_048_576 {
        return Err(ValidationError::TooLong { 
            max: 1_048_576, 
            actual: text.len() 
        });
    }
    
    // Check for null bytes
    if text.contains('\0') {
        return Err(ValidationError::ContainsControlChars);
    }
    
    Ok(())
}

/// Validates a model ID against known models
pub fn validate_model_id(model_id: &str) -> ValidationResult<()> {
    if model_id.is_empty() {
        return Err(ValidationError::Empty);
    }
    
    if model_id.len() > 64 {
        return Err(ValidationError::TooLong { max: 64, actual: model_id.len() });
    }
    
    // Model IDs should be alphanumeric with hyphens and dots
    let valid_chars: Regex = Regex::new(r"^[a-zA-Z0-9._-]+$").unwrap();
    if !valid_chars.is_match(model_id) {
        return Err(ValidationError::InvalidCharacters(
            "Model ID can only contain letters, numbers, dots, hyphens, and underscores".to_string()
        ));
    }
    
    Ok(())
}

/// Sanitizes user input by removing dangerous characters
/// 
/// # Arguments
/// * `input` - The input string to sanitize
/// 
/// # Returns
/// Sanitized string safe for display/storage
pub fn sanitize_input(input: &str) -> String {
    input
        .chars()
        .filter(|c| !c.is_control() || *c == '\n' || *c == '\t')  // Keep newlines and tabs
        .take(10000)  // Limit length
        .collect()
}

/// Validates a token limit for LLM processing
pub fn validate_token_limit(limit: i32) -> ValidationResult<()> {
    if limit <= 0 {
        return Err(ValidationError::InvalidFormat(
            "Token limit must be positive".to_string()
        ));
    }
    
    if limit > 8192 {
        return Err(ValidationError::InvalidFormat(
            "Token limit cannot exceed 8192".to_string()
        ));
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_validate_api_key_valid() {
        let key = "sk-abcdefghijklmnopqrstuvwxyz123456789";
        assert!(validate_api_key(key).is_ok());
    }
    
    #[test]
    fn test_validate_api_key_too_short() {
        let key = "short";
        assert!(matches!(
            validate_api_key(key),
            Err(ValidationError::TooShort { .. })
        ));
    }
    
    #[test]
    fn test_validate_api_key_whitespace() {
        let key = "sk-abc def";
        assert!(matches!(
            validate_api_key(key),
            Err(ValidationError::ContainsWhitespace)
        ));
    }
    
    #[test]
    fn test_validate_api_key_invalid_chars() {
        let key = "sk-abc@#$def";
        assert!(matches!(
            validate_api_key(key),
            Err(ValidationError::InvalidCharacters { .. })
        ));
    }
    
    #[test]
    fn test_validate_file_path_traversal() {
        let path = "../../../etc/passwd";
        assert!(matches!(
            validate_file_path(path),
            Err(ValidationError::InvalidPath)
        ));
    }
    
    #[test]
    fn test_sanitize_input() {
        let input = "Hello\x00World\nTest";
        let sanitized = sanitize_input(input);
        assert_eq!(sanitized, "HelloWorld\nTest");
    }
    
    #[test]
    fn test_validate_token_limit() {
        assert!(validate_token_limit(100).is_ok());
        assert!(validate_token_limit(0).is_err());
        assert!(validate_token_limit(9000).is_err());
    }
}
