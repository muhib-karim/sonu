use anyhow::{Context, Result};
use keyring::Entry;
use log::{debug, error, info};
use std::collections::HashMap;

/// Service name for keychain entries
const KEYCHAIN_SERVICE: &str = "com.sonu.desktop";

/// Secure keychain storage for sensitive data like API keys
pub struct Keychain {
    service: String,
}

impl Keychain {
    /// Create a new keychain instance
    pub fn new() -> Self {
        Self {
            service: KEYCHAIN_SERVICE.to_string(),
        }
    }

    /// Store a password securely in the OS keychain
    pub fn set_password(&self, account: &str, password: &str) -> Result<()> {
        let entry = Entry::new(&self.service, account)
            .with_context(|| format!("Failed to create keychain entry for account: {}", account))?;

        entry
            .set_password(password)
            .with_context(|| format!("Failed to store password for account: {}", account))?;

        info!(
            "Successfully stored password in keychain for account: {}",
            account
        );
        Ok(())
    }

    /// Retrieve a password from the OS keychain
    pub fn get_password(&self, account: &str) -> Result<Option<String>> {
        let entry = Entry::new(&self.service, account)
            .with_context(|| format!("Failed to create keychain entry for account: {}", account))?;

        match entry.get_password() {
            Ok(password) => {
                debug!(
                    "Successfully retrieved password from keychain for account: {}",
                    account
                );
                Ok(Some(password))
            }
            Err(keyring::Error::NoEntry) => {
                debug!("No password found in keychain for account: {}", account);
                Ok(None)
            }
            Err(e) => {
                error!(
                    "Failed to retrieve password from keychain for account {}: {}",
                    account, e
                );
                Err(e.into())
            }
        }
    }

    /// Delete a password from the OS keychain
    pub fn delete_password(&self, account: &str) -> Result<()> {
        let entry = Entry::new(&self.service, account)
            .with_context(|| format!("Failed to create keychain entry for account: {}", account))?;

        entry
            .delete_credential()
            .with_context(|| format!("Failed to delete password for account: {}", account))?;

        info!(
            "Successfully deleted password from keychain for account: {}",
            account
        );
        Ok(())
    }

    /// Store multiple API keys securely
    pub fn store_api_keys(&self, keys: &HashMap<String, String>) -> Result<()> {
        for (provider, api_key) in keys {
            let account = format!("api_key_{}", provider);
            self.set_password(&account, api_key)?;
        }
        Ok(())
    }

    /// Retrieve all stored API keys
    pub fn get_api_keys(&self, providers: &[String]) -> Result<HashMap<String, String>> {
        let mut keys = HashMap::new();

        for provider in providers {
            let account = format!("api_key_{}", provider);
            if let Some(api_key) = self.get_password(&account)? {
                keys.insert(provider.clone(), api_key);
            }
        }

        Ok(keys)
    }

    /// Check if the keychain is accessible
    pub fn is_available(&self) -> bool {
        // Try to create a test entry
        let test_account = "_sonu_test_";
        let test_password = "test";

        if let Ok(entry) = Entry::new(&self.service, test_account) {
            if entry.set_password(test_password).is_ok() {
                let _ = entry.delete_credential();
                return true;
            }
        }

        false
    }
}

impl Default for Keychain {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keychain_store_and_retrieve() {
        let keychain = Keychain::new();
        let account = "test_account";
        let password = "test_password_123";

        // Store password
        keychain.set_password(account, password).unwrap();

        // Retrieve password
        let retrieved = keychain.get_password(account).unwrap();
        assert_eq!(retrieved, Some(password.to_string()));

        // Delete password
        keychain.delete_password(account).unwrap();

        // Verify deletion
        let retrieved = keychain.get_password(account).unwrap();
        assert_eq!(retrieved, None);
    }

    #[test]
    fn test_keychain_nonexistent_account() {
        let keychain = Keychain::new();
        let account = "nonexistent_account_12345";

        let result = keychain.get_password(account).unwrap();
        assert_eq!(result, None);
    }
}
