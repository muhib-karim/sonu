use log::error;
use std::sync::{Mutex, MutexGuard, PoisonError};

/// Extension trait for safe mutex locking with proper error handling
pub trait MutexExt<T> {
    /// Safely lock the mutex, converting poison errors to a recoverable result
    fn safe_lock(&self) -> Result<MutexGuard<T>, MutexError>;

    /// Try to lock the mutex, returning None if poisoned
    fn try_safe_lock(&self) -> Option<MutexGuard<T>>;
}

#[derive(Debug, Clone)]
pub enum MutexError {
    Poisoned(String),
    WouldBlock,
}

impl std::fmt::Display for MutexError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            MutexError::Poisoned(msg) => write!(f, "Mutex poisoned: {}", msg),
            MutexError::WouldBlock => write!(f, "Mutex would block"),
        }
    }
}

impl std::error::Error for MutexError {}

impl<T> MutexExt<T> for Mutex<T> {
    fn safe_lock(&self) -> Result<MutexGuard<T>, MutexError> {
        match self.lock() {
            Ok(guard) => Ok(guard),
            Err(PoisonError { guard, .. }) => {
                error!("Mutex was poisoned, recovering guard");
                Ok(guard)
            }
        }
    }

    fn try_safe_lock(&self) -> Option<MutexGuard<T>> {
        match self.try_lock() {
            Ok(guard) => Some(guard),
            Err(_) => {
                error!("Failed to acquire mutex lock");
                None
            }
        }
    }
}

/// Macro to safely lock a mutex and return early on error
#[macro_export]
macro_rules! safe_lock_or_return {
    ($mutex:expr, $error_value:expr) => {
        match $crate::utils::mutex::MutexExt::safe_lock($mutex) {
            Ok(guard) => guard,
            Err(e) => {
                log::error!("Failed to lock mutex: {}", e);
                return $error_value;
            }
        }
    };
}

/// Macro to safely lock a mutex with default value on error
#[macro_export]
macro_rules! safe_lock_or_default {
    ($mutex:expr) => {
        match $crate::utils::mutex::MutexExt::safe_lock($mutex) {
            Ok(guard) => guard,
            Err(e) => {
                log::error!("Failed to lock mutex: {}", e);
                return Default::default();
            }
        }
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
    fn test_safe_lock_poisoned() {
        let mutex = Mutex::new(42);

        // Poison the mutex
        let _ = std::panic::catch_unwind(|| {
            let _guard = mutex.lock().unwrap();
            panic!("Intentional panic to poison mutex");
        });

        // Should still be able to lock after poisoning
        let guard = mutex.safe_lock().unwrap();
        assert_eq!(*guard, 42);
    }
}
