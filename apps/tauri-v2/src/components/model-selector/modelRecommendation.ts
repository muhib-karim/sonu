import type { ModelInfo } from "@/bindings";

/**
 * Whether the model is marked as recommended in the catalog.
 */
export function isRecommendedModel(model: ModelInfo): boolean {
  return model.recommended;
}

/**
 * Raw language coverage codes for the model (e.g. ["en"] or many codes).
 */
export function getModelLanguages(model: ModelInfo): string[] {
  return model.languages;
}
