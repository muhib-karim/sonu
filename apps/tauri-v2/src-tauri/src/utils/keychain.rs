use anyhow::{Context, Result};
use keyring::Entry;
use log::{debug, error, info};
use std::collections::HashMap;
use std::sync::{Mutex, OnceLock};

/// Service name for keychain entries
const KEYCHAIN_SERVICE: &str = "com.sonu.desktop";

/// Process-wide cache of keychain reads, keyed by account.
///
/// Every `Keychain::get_password` call synchronously enters the OS credential
/// store (DPAPI on Windows, a Keychain Services round-trip on macOS). API keys
/// are re-read on *every* settings load to rebuild the `#[serde(skip)]` fields,
/// and settings are loaded on the dictation hot path — so a single recording
/// used to trigger several credential-store round-trips that each block the
/// calling thread. On macOS, where the store can prompt or take a lock, that is
/// directly perceptible as input latency.
///
/// Values are cached only after a successful read, and the cache is
/// write-through-invalidated: any `set_password` or `delete_password` drops the
/// affected entry so a stale secret can never be served after a change.
///
/// This is an in-memory cache of the *user's own* secrets held by the process
/// that already holds them in `AppSettings`; it does not widen exposure (the
/// secrets are never sent to the frontend, which is enforced separately by
/// `#[serde(skip)]`). Entries are never written to disk.
static KEYCHAIN_CACHE: OnceLock<Mutex<HashMap<String, Option<String>>>> = OnceLock::new();

fn cache() -> &'static Mutex<HashMap<String, Option<String>>> {
    KEYCHAIN_CACHE.get_or_init(|| Mutex::new(HashMap::new()))
}

/// Drop a single account from the cache. Called on every mutation.
fn invalidate(account: &str) {
    // A poisoned cache mutex must not take down the app: the cache is an
    // optimisation, and the worst case of continuing is one extra keychain
    // read. `panic = "abort"` makes an unwrap here a process kill.
    match cache().lock() {
        Ok(mut map) => {
            map.remove(account);
        }
        Err(poisoned) => {
            warn_cache_poison();
            poisoned.into_inner().remove(account);
        }
    }
}

fn warn_cache_poison() {
    log::warn!("Keychain cache mutex was poisoned; recovering");
}

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

        // The cached value is now stale. Invalidating after the write (rather
        // than updating it) means a concurrent reader cannot observe a value
        // that was never durably stored.
        invalidate(account);

        info!(
            "Successfully stored password in keychain for account: {}",
            account
        );
        Ok(())
    }

    /// Retrieve a password from the OS keychain.
    ///
    /// Served from the process-wide cache when available so the dictation hot
    /// path does not enter the OS credential store on every settings load.
    pub fn get_password(&self, account: &str) -> Result<Option<String>> {
        // Fast path: a previous read (including a confirmed absence) is reused.
        match cache().lock() {
            Ok(map) => {
                if let Some(cached) = map.get(account) {
                    return Ok(cached.clone());
                }
            }
            Err(poisoned) => {
                warn_cache_poison();
                if let Some(cached) = poisoned.into_inner().get(account) {
                    return Ok(cached.clone());
                }
            }
        }

        let entry = Entry::new(&self.service, account)
            .with_context(|| format!("Failed to create keychain entry for account: {}", account))?;

        let result = match entry.get_password() {
            Ok(password) => {
                debug!(
                    "Successfully retrieved password from keychain for account: {}",
                    account
                );
                Some(password)
            }
            Err(keyring::Error::NoEntry) => {
                debug!("No password found in keychain for account: {}", account);
                None
            }
            Err(e) => {
                error!(
                    "Failed to retrieve password from keychain for account {}: {}",
                    account, e
                );
                // Deliberately do not cache the failure: a transient
                // credential-store error must not be remembered as "no key".
                return Err(e.into());
            }
        };

        // Cache "absent" as well as "present". Most accounts have no key, and
        // an uncached miss would re-enter the store on every settings load.
        match cache().lock() {
            Ok(mut map) => {
                map.insert(account.to_string(), result.clone());
            }
            Err(poisoned) => {
                warn_cache_poison();
                poisoned
                    .into_inner()
                    .insert(account.to_string(), result.clone());
            }
        }

        Ok(result)
    }
    /// Delete a password from the OS keychain.
    ///
    /// Idempotent: deleting an entry that is not present is not an error, so a
    /// user can press "Remove" twice without a spurious failure.
    pub fn delete_password(&self, account: &str) -> Result<()> {
        let entry = Entry::new(&self.service, account)
            .with_context(|| format!("Failed to create keychain entry for account: {}", account))?;

        match entry.delete_credential() {
            Ok(()) => {
                info!("Deleted keychain entry for account: {}", account);
                invalidate(account);
                Ok(())
            }
            Err(keyring::Error::NoEntry) => {
                debug!("No keychain entry to delete for account: {}", account);
                invalidate(account);
                Ok(())
            }
            Err(e) => {
                error!(
                    "Failed to delete keychain entry for account {}: {}",
                    account, e
                );
                Err(e.into())
            }
        }
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

        // Clean up so the run is repeatable and the cache is not left dirty.
        keychain.delete_password(account).unwrap();
    }

    #[test]
    fn test_keychain_nonexistent_account() {
        let keychain = Keychain::new();
        let account = "nonexistent_account_12345";
        // Ensure a genuinely-absent account is queried rather than a cached one.
        invalidate(account);

        let result = keychain.get_password(account).unwrap();
        assert_eq!(result, None);
    }

    /// A write must invalidate the cached read for that account, otherwise a
    /// rotated key would keep being served from memory.
    #[test]
    fn test_cache_invalidated_on_write() {
        let keychain = Keychain::new();
        let account = "test_cache_write_account";
        invalidate(account);

        keychain.set_password(account, "first").unwrap();
        assert_eq!(
            keychain.get_password(account).unwrap(),
            Some("first".into())
        );

        keychain.set_password(account, "second").unwrap();
        assert_eq!(
            keychain.get_password(account).unwrap(),
            Some("second".into()),
            "cache must not serve the superseded secret"
        );

        keychain.delete_password(account).unwrap();
    }

    /// A delete must invalidate the cached read, so a removed key is reported
    /// as absent immediately rather than after the next real read.
    #[test]
    fn test_cache_invalidated_on_delete() {
        let keychain = Keychain::new();
        let account = "test_cache_delete_account";
        invalidate(account);

        keychain.set_password(account, "secret").unwrap();
        assert_eq!(
            keychain.get_password(account).unwrap(),
            Some("secret".into())
        );

        keychain.delete_password(account).unwrap();
        assert_eq!(
            keychain.get_password(account).unwrap(),
            None,
            "a deleted key must not be served from cache"
        );
    }

    /// Deleting twice is not an error (the UI can double-fire).
    #[test]
    fn test_delete_is_idempotent() {
        let keychain = Keychain::new();
        let account = "test_delete_idempotent";
        invalidate(account);

        keychain.set_password(account, "x").unwrap();
        keychain.delete_password(account).unwrap();
        keychain.delete_password(account).unwrap();
    }
}
