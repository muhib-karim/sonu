/**
 * Cloud Transcription Types
 *
 * These types mirror the Rust structs defined in commands/cloud_transcription.rs
 * and will be auto-generated in bindings.ts by tauri-specta on next build.
 *
 * This file provides the types for use in the frontend before regeneration.
 */

export interface CloudProviderInfo {
  id: string;
  label: string;
  api_endpoint: string;
  allow_endpoint_edit: boolean;
  has_api_key: boolean;
}

export interface CloudTranscriptionStatus {
  enabled: boolean;
  provider_id: string;
  provider_label: string;
  has_api_key: boolean;
}

export interface CloudTranscriptionEvent {
  event_type: string;
  message: string | null;
  error: string | null;
}

export interface CloudTranscriptionProvider {
  id: string;
  label: string;
  api_endpoint: string;
  allow_endpoint_edit: boolean;
}

export interface CloudTranscriptionSettings {
  enabled: boolean;
  provider_id: string;
  providers: CloudTranscriptionProvider[];
  api_keys: Record<string, string>;
  selected_language: string;
  translate_to_english: boolean;
}
