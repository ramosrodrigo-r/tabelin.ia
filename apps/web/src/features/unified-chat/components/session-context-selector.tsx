"use client";

import {
  FORMULA_LANGUAGES,
  FORMULA_PLATFORMS,
  SQL_DIALECTS,
  type FormulaLanguage,
  type FormulaPlatform,
  type SqlDialect,
} from "@tabelin/shared";

export function SessionContextSelector({
  platform,
  formulaLanguage,
  separator,
  sqlDialect,
  onPlatformChange,
  onFormulaLanguageChange,
  onSeparatorChange,
  onSqlDialectChange,
}: {
  platform: FormulaPlatform;
  formulaLanguage: FormulaLanguage;
  separator: ";" | ",";
  sqlDialect: SqlDialect;
  onPlatformChange: (platform: FormulaPlatform) => void;
  onFormulaLanguageChange: (language: FormulaLanguage) => void;
  onSeparatorChange: (separator: ";" | ",") => void;
  onSqlDialectChange: (dialect: SqlDialect) => void;
}) {
  return (
    <div className="unified-context-selector" aria-label="Contexto da sessão">
      <div className="unified-context-group">
        <span className="unified-context-label">Plataforma</span>
        <div className="chat-mode-tabs" role="tablist" aria-label="Plataforma">
          {FORMULA_PLATFORMS.map((item) => (
            <button
              key={item.id}
              role="tab"
              type="button"
              aria-selected={platform === item.id}
              className="chat-mode-tab"
              onClick={() => onPlatformChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="unified-context-group">
        <span className="unified-context-label">Idioma da fórmula</span>
        <div className="chat-lang-toggle" role="group" aria-label="Idioma da fórmula">
          {FORMULA_LANGUAGES.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={formulaLanguage === item.id}
              className="chat-lang-btn"
              onClick={() => onFormulaLanguageChange(item.id)}
            >
              {item.id === "pt-BR" ? "pt-BR" : "English"}
            </button>
          ))}
        </div>
      </div>

      <label className="unified-context-group">
        <span className="unified-context-label">Separador</span>
        <select
          className="chat-compact-select"
          value={separator}
          aria-label="Separador"
          onChange={(e) => onSeparatorChange(e.target.value as ";" | ",")}
        >
          <option value=";">;</option>
          <option value=",">,</option>
        </select>
      </label>

      <label className="unified-context-group">
        <span className="unified-context-label">Dialeto SQL</span>
        <select
          className="chat-compact-select"
          value={sqlDialect}
          aria-label="Dialeto SQL"
          onChange={(e) => onSqlDialectChange(e.target.value as SqlDialect)}
        >
          {SQL_DIALECTS.map((dialect) => (
            <option key={dialect.id} value={dialect.id}>
              {dialect.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
