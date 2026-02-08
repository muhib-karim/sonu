//! Safe mutex locking utilities to replace unwrap() calls
//! 
//! This module provides safe alternatives to Mutex::lock().unwrap() patterns
//! that could cause panics if the mutex is poisoned.

use std::sync::{Mutex, MutexGuard, PoisonError};
use log::error;

/// Error type for mutex operations
#[derive(Debug, Clone)]
pub enum LockError {
    Poisoned(String),
    WouldBlock,
}

impl std::fmt::Display for LockError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            LockError::Poisoned(msg) => write!(f, "Mutex poisoned: {}", msg),
            LockError::WouldBlock => write!(f, "Mutex would block"),
        }
    }
}

impl std::error::Error for LockError {}

/// Trait for safe mutex operations
pub trait SafeLock<T> {
    /// Attempt to lock the mutex, returning an error instead of panicking
    fn safe_lock(&self) -> Result<MutexGuard<T>, LockError>;
    
    /// Attempt to lock the mutex, logging error and returning None on failure
    fn try_lock_logged(&self) -> Option<MutexGuard<T>>;
}

impl<T> SafeLock<T> for Mutex<T> {
    fn safe_lock(&self) -> Result<MutexGuard<T>, LockError> {
        match self.lock() {
            Ok(guard) => Ok(guard),
            Err(PoisonError { .. }) => {
                error!("Mutex has been poisoned - attempting recovery");
                // Try to recover by ignoring the poison
                match self.lock() {
                    Ok(guard) => {
                        log::warn!("Recovered from poisoned mutex");
                        Ok(guard)
                    }
                    Err(e) => Err(LockError::Poisoned(e.to_string())),
                }
            }
        }
    }
    
    fn try_lock_logged(&self) -> Option<MutexGuard<T>> {
        match self.safe_lock() {
            Ok(guard) => Some(guard),
            Err(e) => {
                error!("Failed to acquire lock: {}", e);
                None
            }
        }
    }
}

/// Macro for safe mutex locking with automatic error handling
#[macro_export]
macro_rules! safe_lock {
    ($mutex:expr) => {
        $mutex.safe_lock()
    };
}

/// Macro for safe mutex locking that returns early on error
#[macro_export]
macro_rules! safe_lock_or_return {
    ($mutex:expr, $ret:expr) => {
        match $mutex.safe_lock() {
            Ok(guard) => guard,
            Err(e) => {
                log::error!("Failed to acquire lock: {}", e);
                return $ret;
            }
        }
    };
    ($mutex:expr) => {
        safe_lock_or_return!($mutex, ())
    };
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_safe_lock_success() {
        let mutex = Mutex::new(42);
        let guard = mutex.safe_lock().unwrap();
        assert_eq!(*guard, 42);
    }
    
    #[test]
    fn test_try_lock_logged_success() {
        let mutex = Mutex::new(42);
        let guard = mutex.try_lock_logged().unwrap();
        assert_eq!(*guard, 42);
    }
}
