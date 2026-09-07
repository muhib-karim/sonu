import type { TFunction } from "i18next";
import type { ModelInfo } from "@/bindings";

/**
 * Get the translated name or description for a model
 * @param model - The model info object
 * @param t - The translation function from useTranslation
 * @param field - Which field to translate
 * @returns The translated field, or the original value if no translation exists
 */
export function getTranslatedModelField(
  model: ModelInfo,
  t: TFunction,
  field: "name" | "description",
): string {
  const translationKey = `onboarding.models.${model.id}.${field}`;
  const translated = t(translationKey, { defaultValue: "" });
  return translated !== "" ? translated : model[field];
}
