import type { Classification } from "../../types/classification";
import { getLanguage, type Language } from "../data/languages";

const languageNames = ["SimplifiedChinese", "TraditionalChinese", "English", "Japanese", "Korean", "French", "German", "Spanish", "Russian"];
const desktopNames = new Set(languageNames.map((name) => getLanguage(name).desktopClassification));
const defaultNames = new Set(languageNames.map((name) => getLanguage(name).defaultClassification));

/** Translate only names still matching a built-in default. */
export function getLocalizedClassificationName(
  classification: Classification,
  language: Language
): string | null {
  if (
    classification.parentId === null &&
    classification.type === 3 &&
    classification.name &&
    desktopNames.has(classification.name)
  ) {
    return language.desktopClassification;
  }
  if (
    classification.data.desktopUncategorized &&
    classification.name &&
    defaultNames.has(classification.name)
  ) {
    return language.defaultClassification;
  }
  return classification.name;
}
