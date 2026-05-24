export const FORMULA_PLATFORMS = [
  {
    id: "excel",
    label: "Microsoft Excel",
    promptName: "Microsoft Excel",
    supportsPortugueseFunctions: true
  },
  {
    id: "google_sheets",
    label: "Google Sheets",
    promptName: "Google Sheets",
    supportsPortugueseFunctions: true
  },
  {
    id: "airtable",
    label: "Airtable",
    promptName: "Airtable",
    supportsPortugueseFunctions: false
  },
  {
    id: "libreoffice_calc",
    label: "LibreOffice Calc",
    promptName: "LibreOffice Calc",
    supportsPortugueseFunctions: true
  }
] as const;

export const FORMULA_PLATFORM_IDS = FORMULA_PLATFORMS.map((platform) => platform.id) as [
  "excel",
  "google_sheets",
  "airtable",
  "libreoffice_calc"
];

export type FormulaPlatform = (typeof FORMULA_PLATFORM_IDS)[number];

export const FORMULA_LANGUAGES = [
  {
    id: "pt-BR",
    label: "Portugues (Brasil)",
    separator: ";",
    exampleFunction: "SE"
  },
  {
    id: "en-US",
    label: "English",
    separator: ",",
    exampleFunction: "IF"
  }
] as const;

export const FORMULA_LANGUAGE_IDS = FORMULA_LANGUAGES.map((language) => language.id) as ["pt-BR", "en-US"];

export type FormulaLanguage = (typeof FORMULA_LANGUAGE_IDS)[number];

export function getPlatformLabel(platform: FormulaPlatform) {
  return FORMULA_PLATFORMS.find((item) => item.id === platform)?.label ?? platform;
}

export function getFormulaLanguageLabel(language: FormulaLanguage) {
  return FORMULA_LANGUAGES.find((item) => item.id === language)?.label ?? language;
}

export function getSeparatorForLanguage(language: FormulaLanguage) {
  return FORMULA_LANGUAGES.find((item) => item.id === language)?.separator ?? ";";
}

