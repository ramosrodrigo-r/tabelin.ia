import "server-only";

// SQL: padrões destrutivos conforme D-08 do CONTEXT.md
// DROP, TRUNCATE, DELETE sem WHERE, UPDATE sem WHERE

// Scripts (VBA, Apps Script, Airtable): padrões destrutivos conforme D-09 do CONTEXT.md
const SCRIPT_DESTRUCTIVE_PATTERNS = [
  /\bDeleteFile\b/i,
  /\bKill\b/i,
  /\.Rows\.Delete\b/i,
  /DriveApp\.remove/i,
  /\.deleteSheet\b/i,
  /\.deleteRecord\b/i,
  /\.deleteRecords\b/i
] as const;

/**
 * Verifica DELETE sem WHERE analisando cada instrução SQL separadamente.
 * Divide por ponto-e-vírgula para isolar cada instrução antes de verificar.
 */
function hasSqlDestructiveDelete(code: string): boolean {
  const statements = code.split(/;/);
  return statements.some((stmt) => {
    const trimmed = stmt.trim().toUpperCase();
    return trimmed.startsWith("DELETE") && !trimmed.includes("WHERE");
  });
}

/**
 * Classifica se um código gerado contém operações destrutivas.
 * Chamado no servidor após geração, antes de montar o event stream.
 * O campo isDestructive da resposta AI é o sinal primário;
 * este classificador é o fallback determinístico.
 */
export function classifyDestructive(code: string, toolKind: "sql" | "script"): boolean {
  if (toolKind === "sql") {
    // Verificar DROP, TRUNCATE, UPDATE sem WHERE
    const hasOtherDestructive = [
      /\bDROP\b/i,
      /\bTRUNCATE\b/i,
      /\bUPDATE\b(?![^;]*\bWHERE\b)/i
    ].some((pattern) => pattern.test(code));

    // Verificar DELETE sem WHERE com análise por instrução
    return hasOtherDestructive || hasSqlDestructiveDelete(code);
  }

  // toolKind === "script"
  return SCRIPT_DESTRUCTIVE_PATTERNS.some((pattern) => pattern.test(code));
}

/**
 * Retorna a mensagem de warning específica para o tipo de operação destrutiva detectada.
 * Mensagens conforme UI-SPEC.md Safety Warning Contract.
 */
export function getDestructiveMessage(code: string, toolKind: "sql" | "script"): string {
  if (toolKind === "sql") {
    if (/\bDROP\b/i.test(code) || /\bTRUNCATE\b/i.test(code)) {
      return "Este script apaga dados permanentemente. Faca um backup antes de executar.";
    }
    if (hasSqlDestructiveDelete(code)) {
      return "DELETE sem WHERE apaga todas as linhas da tabela. Verifique a clausula WHERE antes de executar.";
    }
    if (/\bUPDATE\b(?![^;]*\bWHERE\b)/i.test(code)) {
      return "UPDATE sem WHERE altera todos os registros. Adicione uma clausula WHERE para limitar o impacto.";
    }
    return "Esta operacao pode modificar ou apagar dados permanentemente. Revise antes de executar.";
  }

  // script
  if (/\bDeleteFile\b/i.test(code) || /\bKill\b/i.test(code)) {
    return "Este script exclui arquivos do sistema. Confirme os caminhos antes de executar.";
  }
  return "Esta operacao remove dados da planilha ou base permanentemente. Nao pode ser desfeita.";
}
