use anyhow::Result;
use chrono::{DateTime, Local, Utc};
use log::{debug, error, info};
use rusqlite::{params, Connection, OptionalExtension};
use rusqlite_migration::{Migrations, M};
use serde::{Deserialize, Serialize};
use specta::Type;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{Mutex, MutexGuard};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

use crate::audio_toolkit::save_wav_file;

/// Database migrations for transcription history.
/// Each migration is applied in order. The library tracks which migrations
/// have been applied using SQLite's user_version pragma.
///
/// Note: For users upgrading from tauri-plugin-sql, migrate_from_tauri_plugin_sql()
/// converts the old _sqlx_migrations table tracking to the user_version pragma,
/// ensuring migrations don't re-run on existing databases.
static MIGRATIONS: &[M] = &[
    M::up(
        "CREATE TABLE IF NOT EXISTS transcription_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            saved BOOLEAN NOT NULL DEFAULT 0,
            title TEXT NOT NULL,
            transcription_text TEXT NOT NULL
        );",
    ),
    M::up("ALTER TABLE transcription_history ADD COLUMN post_processed_text TEXT;"),
    M::up("ALTER TABLE transcription_history ADD COLUMN post_process_prompt TEXT;"),
];

#[derive(Clone, Debug, Serialize, Deserialize, Type)]
pub struct HistoryEntry {
    pub id: i64,
    pub file_name: String,
    pub timestamp: i64,
    pub saved: bool,
    pub title: String,
    pub transcription_text: String,
    pub post_processed_text: Option<String>,
    pub post_process_prompt: Option<String>,
}

pub struct HistoryManager {
    app_handle: AppHandle,
    recordings_dir: PathBuf,
    db_path: PathBuf,
    /// Single shared database connection.
    ///
    /// Every operation used to open a brand-new `Connection`, and two of them
    /// (`delete_entry`, and the cleanup helpers via `delete_entries_and_files`)
    /// opened a *second* connection while still holding the first. Under
    /// concurrent writes that produced `SQLITE_BUSY` ("database is locked")
    /// surfaced to the user as a raw command error. One connection with WAL and
    /// a busy timeout removes both the contention and the per-call open cost.
    ///
    /// The mutex is **not** reentrant: a method that already holds a guard must
    /// pass `&Connection` down rather than calling `conn()` again.
    conn: Mutex<Connection>,
}

impl HistoryManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self> {
        // Create recordings directory in app data dir
        let app_data_dir = app_handle.path().app_data_dir()?;
        let recordings_dir = app_data_dir.join("recordings");
        let db_path = app_data_dir.join("history.db");

        // Ensure recordings directory exists
        if !recordings_dir.exists() {
            fs::create_dir_all(&recordings_dir)?;
            debug!("Created recordings directory: {:?}", recordings_dir);
        }

        // Open the shared connection before moving `db_path` into the struct.
        let conn = Self::open_connection(&db_path)?;

        let manager = Self {
            app_handle: app_handle.clone(),
            recordings_dir,
            db_path,
            conn: Mutex::new(conn),
        };

        // Initialize database and run migrations synchronously
        manager.init_database()?;

        Ok(manager)
    }

    /// Open the history database and apply the pragmas every connection needs.
    fn open_connection(db_path: &Path) -> Result<Connection> {
        let conn = Connection::open(db_path)?;

        // WAL lets readers proceed while a write is in flight. A busy timeout
        // makes a concurrent writer wait rather than failing immediately with
        // SQLITE_BUSY. `synchronous = NORMAL` is the standard pairing with WAL.
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;",
        )?;
        conn.busy_timeout(Duration::from_secs(5))?;

        Ok(conn)
    }

    /// Borrow the shared connection.
    ///
    /// Do not call this while already holding a guard — the mutex is not
    /// reentrant. Pass the existing `&Connection` down instead.
    fn conn(&self) -> Result<MutexGuard<'_, Connection>> {
        self.conn
            .lock()
            .map_err(|e| anyhow::anyhow!("History database lock poisoned: {e}"))
    }

    fn init_database(&self) -> Result<()> {
        info!("Initializing database at {:?}", self.db_path);

        let mut conn = self.conn()?;

        // Handle migration from tauri-plugin-sql to rusqlite_migration
        // tauri-plugin-sql used _sqlx_migrations table, rusqlite_migration uses user_version pragma
        self.migrate_from_tauri_plugin_sql(&conn)?;

        // Create migrations object and run to latest version
        let migrations = Migrations::new(MIGRATIONS.to_vec());

        // Validate migrations in debug builds
        #[cfg(debug_assertions)]
        migrations.validate().expect("Invalid migrations");

        // Get current version before migration
        let version_before: i32 =
            conn.pragma_query_value(None, "user_version", |row| row.get(0))?;
        debug!("Database version before migration: {}", version_before);

        // Apply any pending migrations
        migrations.to_latest(&mut conn)?;

        // Get version after migration
        let version_after: i32 = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;

        if version_after > version_before {
            info!(
                "Database migrated from version {} to {}",
                version_before, version_after
            );
        } else {
            debug!("Database already at latest version {}", version_after);
        }

        Ok(())
    }

    /// Migrate from tauri-plugin-sql's migration tracking to rusqlite_migration's.
    /// tauri-plugin-sql used a _sqlx_migrations table, while rusqlite_migration uses
    /// SQLite's user_version pragma. This function checks if the old system was in use
    /// and sets the user_version accordingly so migrations don't re-run.
    fn migrate_from_tauri_plugin_sql(&self, conn: &Connection) -> Result<()> {
        // Check if the old _sqlx_migrations table exists
        let has_sqlx_migrations: bool = conn
            .query_row(
                "SELECT COUNT(*) > 0 FROM sqlite_master WHERE type='table' AND name='_sqlx_migrations'",
                [],
                |row| row.get(0),
            )
            .unwrap_or(false);

        if !has_sqlx_migrations {
            return Ok(());
        }

        // Check current user_version
        let current_version: i32 =
            conn.pragma_query_value(None, "user_version", |row| row.get(0))?;

        if current_version > 0 {
            // Already migrated to rusqlite_migration system
            return Ok(());
        }

        // Get the highest version from the old migrations table
        let old_version: i32 = conn
            .query_row(
                "SELECT COALESCE(MAX(version), 0) FROM _sqlx_migrations WHERE success = 1",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);

        if old_version > 0 {
            info!(
                "Migrating from tauri-plugin-sql (version {}) to rusqlite_migration",
                old_version
            );

            // Set user_version to match the old migration state
            conn.pragma_update(None, "user_version", old_version)?;

            // Optionally drop the old migrations table (keeping it doesn't hurt)
            // conn.execute("DROP TABLE IF EXISTS _sqlx_migrations", [])?;

            info!(
                "Migration tracking converted: user_version set to {}",
                old_version
            );
        }

        Ok(())
    }

    /// Build a WAV filename that does not collide with an existing recording.
    ///
    /// The previous implementation used a second-resolution timestamp, so two
    /// transcriptions finishing in the same second wrote to the same file: the
    /// second silently overwrote the first while the database kept two rows
    /// pointing at one recording.
    fn unique_recording_file_name(&self, timestamp_ms: i64) -> String {
        let base = format!("sonu-{timestamp_ms}");
        for suffix in 0..10_000u32 {
            let candidate = if suffix == 0 {
                format!("{base}.wav")
            } else {
                format!("{base}-{suffix}.wav")
            };
            if !self.recordings_dir.join(&candidate).exists() {
                return candidate;
            }
        }
        // Practically unreachable. Last resort so a name is never reused.
        format!("{base}-{}.wav", Utc::now().timestamp_subsec_nanos())
    }

    /// Save a transcription to history (both database and WAV file).
    ///
    /// `saved` marks the entry as a starred note and must be applied at insert
    /// time. Callers cannot reliably "star it afterwards": matching on text
    /// fails whenever post-processing changes the wording, and picking the
    /// newest row is racy under concurrent inserts.
    ///
    /// Returns the id of the inserted row.
    pub async fn save_transcription(
        &self,
        audio_samples: Vec<f32>,
        transcription_text: String,
        post_processed_text: Option<String>,
        post_process_prompt: Option<String>,
        saved: bool,
    ) -> Result<i64> {
        let now = Utc::now();
        let timestamp = now.timestamp();
        let title = self.format_timestamp_title(timestamp);
        let file_name = self.unique_recording_file_name(now.timestamp_millis());

        // Save WAV file
        let file_path = self.recordings_dir.join(&file_name);
        save_wav_file(&file_path, &audio_samples).await?;

        // Save to database. If the insert fails, the WAV written above would
        // be orphaned — remove it before propagating the error.
        let id = match self.save_to_database(
            file_name.clone(),
            timestamp,
            title,
            transcription_text,
            post_processed_text,
            post_process_prompt,
            saved,
        ) {
            Ok(id) => id,
            Err(e) => {
                if let Err(remove_err) = fs::remove_file(&file_path) {
                    error!(
                        "Failed to remove orphaned recording {}: {}",
                        file_name, remove_err
                    );
                }
                return Err(e);
            }
        };

        // Clean up old entries
        self.cleanup_old_entries()?;

        // Emit history updated event
        if let Err(e) = self.app_handle.emit("history-updated", ()) {
            error!("Failed to emit history-updated event: {}", e);
        }

        Ok(id)
    }

    #[allow(clippy::too_many_arguments)]
    fn save_to_database(
        &self,
        file_name: String,
        timestamp: i64,
        title: String,
        transcription_text: String,
        post_processed_text: Option<String>,
        post_process_prompt: Option<String>,
        saved: bool,
    ) -> Result<i64> {
        let conn = self.conn()?;
        conn.execute(
            "INSERT INTO transcription_history (file_name, timestamp, saved, title, transcription_text, post_processed_text, post_process_prompt) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![file_name, timestamp, saved, title, transcription_text, post_processed_text, post_process_prompt],
        )?;

        let id = conn.last_insert_rowid();
        debug!("Saved transcription to database (id={id}, saved={saved})");
        Ok(id)
    }

    pub fn cleanup_old_entries(&self) -> Result<()> {
        let retention_period = crate::settings::get_recording_retention_period(&self.app_handle);

        match retention_period {
            crate::settings::RecordingRetentionPeriod::Never => {
                // Don't delete anything
                Ok(())
            }
            crate::settings::RecordingRetentionPeriod::PreserveLimit => {
                // Use the old count-based logic with history_limit
                let limit = crate::settings::get_history_limit(&self.app_handle);
                self.cleanup_by_count(limit)
            }
            _ => {
                // Use time-based logic
                self.cleanup_by_time(retention_period)
            }
        }
    }

    /// Delete the given rows and their WAV files.
    ///
    /// Takes the connection as a parameter because both callers already hold a
    /// guard; calling `self.conn()` here would re-enter the non-reentrant mutex
    /// and deadlock.
    fn delete_entries_and_files(
        &self,
        conn: &Connection,
        entries: &[(i64, String)],
    ) -> Result<usize> {
        if entries.is_empty() {
            return Ok(0);
        }

        let mut deleted_count = 0;

        for (id, file_name) in entries {
            // Delete database entry
            conn.execute(
                "DELETE FROM transcription_history WHERE id = ?1",
                params![id],
            )?;

            // Delete WAV file
            let file_path = self.recordings_dir.join(file_name);
            if file_path.exists() {
                if let Err(e) = fs::remove_file(&file_path) {
                    error!("Failed to delete WAV file {}: {}", file_name, e);
                } else {
                    debug!("Deleted old WAV file: {}", file_name);
                    deleted_count += 1;
                }
            }
        }

        Ok(deleted_count)
    }

    fn cleanup_by_count(&self, limit: usize) -> Result<()> {
        let conn = self.conn()?;

        // Get all entries that are not saved, ordered by timestamp desc
        let mut stmt = conn.prepare(
            "SELECT id, file_name FROM transcription_history WHERE saved = 0 ORDER BY timestamp DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok((row.get::<_, i64>("id")?, row.get::<_, String>("file_name")?))
        })?;

        let mut entries: Vec<(i64, String)> = Vec::new();
        for row in rows {
            entries.push(row?);
        }

        if entries.len() > limit {
            let entries_to_delete = &entries[limit..];
            let deleted_count = self.delete_entries_and_files(&conn, entries_to_delete)?;

            if deleted_count > 0 {
                debug!("Cleaned up {} old history entries by count", deleted_count);
            }
        }

        Ok(())
    }

    fn cleanup_by_time(
        &self,
        retention_period: crate::settings::RecordingRetentionPeriod,
    ) -> Result<()> {
        let conn = self.conn()?;

        // Calculate cutoff timestamp (current time minus retention period)
        let now = Utc::now().timestamp();
        let cutoff_timestamp = match retention_period {
            crate::settings::RecordingRetentionPeriod::Days3 => now - (3 * 24 * 60 * 60), // 3 days in seconds
            crate::settings::RecordingRetentionPeriod::Weeks2 => now - (2 * 7 * 24 * 60 * 60), // 2 weeks in seconds
            crate::settings::RecordingRetentionPeriod::Months3 => now - (3 * 30 * 24 * 60 * 60), // 3 months in seconds (approximate)
            _ => unreachable!("Should not reach here"),
        };

        // Get all unsaved entries older than the cutoff timestamp
        let mut stmt = conn.prepare(
            "SELECT id, file_name FROM transcription_history WHERE saved = 0 AND timestamp < ?1",
        )?;

        let rows = stmt.query_map(params![cutoff_timestamp], |row| {
            Ok((row.get::<_, i64>("id")?, row.get::<_, String>("file_name")?))
        })?;

        let mut entries_to_delete: Vec<(i64, String)> = Vec::new();
        for row in rows {
            entries_to_delete.push(row?);
        }

        let deleted_count = self.delete_entries_and_files(&conn, &entries_to_delete)?;

        if deleted_count > 0 {
            debug!(
                "Cleaned up {} old history entries based on retention period",
                deleted_count
            );
        }

        Ok(())
    }

    pub async fn get_history_entries(&self) -> Result<Vec<HistoryEntry>> {
        let conn = self.conn()?;
        let mut stmt = conn.prepare(
            "SELECT id, file_name, timestamp, saved, title, transcription_text, post_processed_text, post_process_prompt FROM transcription_history ORDER BY timestamp DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            Ok(HistoryEntry {
                id: row.get("id")?,
                file_name: row.get("file_name")?,
                timestamp: row.get("timestamp")?,
                saved: row.get("saved")?,
                title: row.get("title")?,
                transcription_text: row.get("transcription_text")?,
                post_processed_text: row.get("post_processed_text")?,
                post_process_prompt: row.get("post_process_prompt")?,
            })
        })?;

        let mut entries = Vec::new();
        for row in rows {
            entries.push(row?);
        }

        Ok(entries)
    }

    pub async fn toggle_saved_status(&self, id: i64) -> Result<()> {
        let conn = self.conn()?;

        // Get current saved status
        let current_saved: bool = conn.query_row(
            "SELECT saved FROM transcription_history WHERE id = ?1",
            params![id],
            |row| row.get("saved"),
        )?;

        let new_saved = !current_saved;

        conn.execute(
            "UPDATE transcription_history SET saved = ?1 WHERE id = ?2",
            params![new_saved, id],
        )?;

        debug!("Toggled saved status for entry {}: {}", id, new_saved);

        // Emit history updated event
        if let Err(e) = self.app_handle.emit("history-updated", ()) {
            error!("Failed to emit history-updated event: {}", e);
        }

        Ok(())
    }

    pub fn get_audio_file_path(&self, file_name: &str) -> PathBuf {
        self.recordings_dir.join(file_name)
    }

    pub async fn delete_entry(&self, id: i64) -> Result<()> {
        // Look up the file name and release the lock before touching the
        // filesystem, then re-acquire to delete the row.
        //
        // This used to hold a connection guard across `get_entry_by_id`, which
        // takes the same non-reentrant mutex. That was harmless only while
        // every call opened its own connection; with a shared connection it
        // would deadlock on the first delete.
        let file_name: Option<String> = {
            let conn = self.conn()?;
            conn.query_row(
                "SELECT file_name FROM transcription_history WHERE id = ?1",
                params![id],
                |row| row.get(0),
            )
            .optional()?
        };

        if let Some(file_name) = file_name {
            // Delete the audio file first, preserving the original ordering: if
            // the row deletion then fails, the entry is still playable.
            let file_path = self.get_audio_file_path(&file_name);
            if file_path.exists() {
                if let Err(e) = fs::remove_file(&file_path) {
                    error!("Failed to delete audio file {}: {}", file_name, e);
                    // Continue with database deletion even if file deletion fails
                }
            }
        }

        {
            let conn = self.conn()?;
            conn.execute(
                "DELETE FROM transcription_history WHERE id = ?1",
                params![id],
            )?;
        }

        debug!("Deleted history entry with id: {}", id);

        // Emit history updated event
        if let Err(e) = self.app_handle.emit("history-updated", ()) {
            error!("Failed to emit history-updated event: {}", e);
        }

        Ok(())
    }

    fn format_timestamp_title(&self, timestamp: i64) -> String {
        if let Some(utc_datetime) = DateTime::from_timestamp(timestamp, 0) {
            // Convert UTC to local timezone
            let local_datetime = utc_datetime.with_timezone(&Local);
            local_datetime.format("%B %e, %Y - %l:%M%p").to_string()
        } else {
            format!("Recording {}", timestamp)
        }
    }
}
