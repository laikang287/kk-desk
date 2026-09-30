import type { Classification } from "../../types/classification";
import type { Language } from "../data/languages";

export function getLocalizedClassificationName(
  classification: Classification,
  language: Language
): string | null;
