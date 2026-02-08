/**
 * Core TypeScript type definitions for SONU Tauri v2 Application
 * 
 * This file contains all shared interfaces and types used across the frontend
 * to ensure type safety when communicating with the Rust backend.
 */

// ==================== SETTINGS TYPES ====================

export interface AppSettings {
  // Audio Settings
  microphone_mode: MicrophoneMode;
  selected_microphone: string | null;
  selected_output_device: string | null;
  clamshell_microphone: string | null;
  audio_feedback: boolean;
  audio_feedback_volume: number;
  sound_theme: string;
  mute_while_recording: boolean;
  
  // Transcription Settings
  selected_language: string;
  translate_to_english: boolean;
  model_unload_timeout: number;
  
  // Shortcut Settings
  shortcuts: ShortcutBinding[];
  push_to_talk: boolean;
  
  // UI Settings
  start_hidden: boolean;
  show_overlay: boolean;
  overlay_position: OverlayPosition;
  theme: string;
  app_language: string;
  
  // Post-Processing
  post_process_enabled: boolean;
  post_process_provider: string;
  post_process_api_key: string | null;
  post_process_base_url: string | null;
  post_process_model: string | null;
  post_process_prompts: PostProcessPrompt[];
  post_process_selected_prompt: string | null;
  
  // System Settings
  autostart_enabled: boolean;
  update_checks_enabled: boolean;
  debug_mode: boolean;
  log_level: LogLevel;
  
  // Clipboard & Output
  paste_method: PasteMethod;
  clipboard_handling: ClipboardHandling;
  append_trailing_space: boolean;
  
  // History Settings
  history_limit: number;
  recording_retention_period: number;
  
  // Custom Words
  custom_words: string[];
  word_correction_threshold: number;
}

export interface ShortcutBinding {
  id: string;
  action: ShortcutAction;
  keys: string[];
  enabled: boolean;
  hold_mode: boolean;
}

export type ShortcutAction = 
  | 'start_recording'
  | 'stop_recording'
  | 'toggle_recording'
  | 'cancel_transcription'
  | 'show_settings'
  | 'paste_last_transcription';

export type MicrophoneMode = 'auto' | 'manual';

export type OverlayPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';

export type PasteMethod = 'clipboard' | 'direct_input' | 'keystrokes';

export type ClipboardHandling = 'restore' | 'clear' | 'keep';

export type LogLevel = 'off' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

// ==================== MODEL TYPES ====================

export interface WhisperModel {
  id: string;
  name: string;
  size: string;
  description: string;
  download_url: string;
  version: string;
  is_recommended: boolean;
  requirements: ModelRequirements;
  languages: string[];
}

export interface ModelRequirements {
  min_ram_gb: number;
  recommended_ram_gb: number;
  supports_gpu: boolean;
  gpu_memory_gb?: number;
}

export interface ModelDownloadProgress {
  model_id: string;
  downloaded_bytes: number;
  total_bytes: number;
  progress_percentage: number;
  status: DownloadStatus;
  speed_mbps: number;
  eta_seconds: number;
}

export type DownloadStatus = 
  | 'not_downloaded'
  | 'downloading'
  | 'verifying'
  | 'ready'
  | 'failed'
  | 'cancelled';

export interface ModelStatus {
  current_model: string | null;
  is_loading: boolean;
  is_loaded: boolean;
  available_models: string[];
  downloaded_models: string[];
  loading_progress?: number;
}

// ==================== TRANSCRIPTION TYPES ====================

export interface TranscriptionResult {
  id: string;
  text: string;
  confidence: number;
  language: string;
  processing_time_ms: number;
  audio_duration_ms: number;
  timestamp: Date;
}

export interface TranscriptionOptions {
  language?: string;
  translate_to_english: boolean;
  use_vad: boolean;
  post_process_enabled: boolean;
}

export interface RecordingState {
  is_recording: boolean;
  start_time: Date | null;
  duration_ms: number;
  audio_level: number;
  is_voice_detected: boolean;
}

// ==================== HISTORY TYPES ====================

export interface HistoryEntry {
  id: string;
  text: string;
  timestamp: Date;
  duration_ms: number;
  language: string;
  is_saved: boolean;
  audio_file_path?: string;
  transcription_confidence: number;
}

export interface HistoryFilter {
  start_date?: Date;
  end_date?: Date;
  language?: string;
  saved_only?: boolean;
  search_query?: string;
}

// ==================== AUDIO TYPES ====================

export interface AudioDevice {
  id: string;
  name: string;
  is_default: boolean;
  is_input: boolean;
  sample_rate: number;
  channels: number;
}

export interface AudioLevel {
  level: number;
  peak: number;
  is_clipping: boolean;
}

// ==================== OFFLINE LLM TYPES ====================

export interface OfflineLLMModel {
  id: string;
  name: string;
  size_gb: number;
  description: string;
  download_url: string;
  quantization: string;
  context_length: number;
}

export interface OfflineLLMStatus {
  current_model: string | null;
  is_loaded: boolean;
  is_downloading: boolean;
  enabled: boolean;
}

// ==================== POST-PROCESSING TYPES ====================

export interface PostProcessPrompt {
  id: string;
  name: string;
  prompt: string;
  is_default: boolean;
}

export interface PostProcessConfig {
  enabled: boolean;
  provider: string;
  api_key: string | null;
  base_url: string | null;
  model: string | null;
  selected_prompt: string | null;
}

// ==================== SYSTEM TYPES ====================

export interface SystemInfo {
  device: string;
  os: string;
  os_version: string;
  cpu: string;
  cpu_cores: number;
  cpu_threads: number;
  ram_gb: number;
  gpu: string | null;
  gpu_memory_gb: number | null;
  architecture: string;
  app_version: string;
}

export interface AppDirectoryPaths {
  app_data: string;
  logs: string;
  models: string;
  recordings: string;
  config: string;
}

// ==================== API RESPONSE TYPES ====================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: ErrorCode;
  message: string;
  details?: Record<string, unknown>;
}

export type ErrorCode =
  | 'NETWORK_ERROR'
  | 'MICROPHONE_ERROR'
  | 'MODEL_LOAD_ERROR'
  | 'AUDIO_DEVICE_ERROR'
  | 'INVALID_SETTINGS'
  | 'DOWNLOAD_ERROR'
  | 'PERMISSION_DENIED'
  | 'INSUFFICIENT_STORAGE'
  | 'TRANSCRIPTION_ERROR'
  | 'UNKNOWN_ERROR';

// ==================== EVENT TYPES ====================

export interface RecordingStartedEvent {
  timestamp: Date;
  microphone_id: string;
}

export interface RecordingStoppedEvent {
  timestamp: Date;
  duration_ms: number;
  audio_file_path?: string;
}

export interface TranscriptionProgressEvent {
  transcription_id: string;
  progress: number;
  partial_text?: string;
  status: 'processing' | 'completed' | 'failed';
}

export interface DownloadProgressEvent {
  model_id: string;
  progress: ModelDownloadProgress;
}

export interface SettingsChangedEvent {
  settings: Partial<AppSettings>;
  changed_keys: string[];
}

// ==================== THEME TYPES ====================

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  text_secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
}

// ==================== NOTIFICATION TYPES ====================

export interface NotificationOptions {
  title: string;
  message: string;
  type: NotificationType;
  duration?: number;
  actions?: NotificationAction[];
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface NotificationAction {
  label: string;
  action: () => void;
}

// ==================== UPDATE TYPES ====================

export interface UpdateInfo {
  version: string;
  release_date: Date;
  release_notes: string;
  download_url: string;
  is_required: boolean;
  size_mb: number;
}

export interface UpdateCheckResult {
  update_available: boolean;
  current_version: string;
  latest_version?: string;
  update_info?: UpdateInfo;
}

// ==================== CUSTOM WORDS TYPES ====================

export interface CustomWordEntry {
  word: string;
  replacement: string;
  is_regex: boolean;
  is_case_sensitive: boolean;
}

// ==================== SNIPPETS TYPES ====================

export interface Snippet {
  id: string;
  name: string;
  content: string;
  shortcut: string;
  category: string;
  is_enabled: boolean;
}

// ==================== DICTIONARY TYPES ====================

export interface DictionaryEntry {
  word: string;
  pronunciation: string;
  definition: string;
  part_of_speech: string;
}

// Re-export all types
export * from './types';
