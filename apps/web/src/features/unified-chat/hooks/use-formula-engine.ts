"use client";

import { useMemo } from "react";

import * as formulajs from "@formulajs/formulajs";
import { translateFunctionName } from "@tabelin/shared";
import type { TableColumn } from "@tabelin/shared";

// ─── Tipos exportados ──────────────────────────────────────────────────────────

export type CellRef = { row: number; col: number };
export type CellRange = { from: CellRef; to: CellRef };
export type RowData = Record<string, string | number>;

// ─── Funções puras (module-scope, testáveis sem React) ─────────────────────────

/**
 * Converte referência A1 para índice numérico 0-based.
 * "A1" → { row: 0, col: 0 }, "B3" → { row: 2, col: 1 }, "Z10" → { row: 9, col: 25 }
 * Retorna null para referências inválidas.
 */
export function parseA1(ref: string): CellRef | null {
  const m = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!m) return null;
  const letters = m[1].toUpperCase();
  const col =
    letters.split("").reduce((acc, c) => acc * 26 + (c.charCodeAt(0) - 64), 0) - 1;
  const row = parseInt(m[2], 10) - 1;
  return { row, col };
}

/**
 * Converte referência de range "B1:C5" para { from, to } com índices 0-based.
 * Retorna null se o formato não é válido.
 */
export function parseRange(ref: string): CellRange | null {
  const parts = ref.split(":");
  if (parts.length !== 2) return null;
  const from = parseA1(parts[0]);
  const to = parseA1(parts[1]);
  if (!from || !to) return null;
  return { from, to };
}

/**
 * Extrai um sub-array 2D de uma tabela rows[][].
 * CRÍTICO (Pitfall 1): retorna (string|number)[][] — NUNCA flat — para que formulajs.VLOOKUP
 * receba table_array no formato esperado.
 */
export function extractRange(
  rows: (string | number)[][],
  range: CellRange
): (string | number)[][] {
  const result: (string | number)[][] = [];
  for (let r = range.from.row; r <= range.to.row; r++) {
    const row: (string | number)[] = [];
    for (let c = range.from.col; c <= range.to.col; c++) {
      row.push(rows[r]?.[c] ?? "");
    }
    result.push(row);
  }
  return result;
}

/**
 * Remove separador de milhar "." e converte decimal "," → "."
 * antes de fazer parseFloat.
 */
export function parseBRNumber(value: string): number {
  return parseFloat(value.replace(/\./g, "").replace(",", "."));
}

/**
 * Extrai o nome da função de uma fórmula "=NOMEFUNC(...)".
 * Inclui "." no charset para suportar "CONT.SE" (Pitfall 6).
 */
export function extractFunctionName(formula: string): string | null {
  const m = formula.match(/^=([A-Z][A-Z0-9._]*)\(/i);
  return m ? m[1].toUpperCase() : null;
}

/**
 * Faz o parse dos argumentos de uma fórmula, respeitando:
 * - strings entre aspas (não quebra no separador dentro de strings — Pitfall 5)
 * - parênteses aninhados (não quebra no separador dentro de chamadas internas)
 */
export function parseFormulaArgs(formula: string, separator: ";" | ","): string[] {
  // Remove "=NOME(" do início e ")" do final, lidando com parêntese externo aninhado
  const withoutEq = formula.replace(/^=[A-Z][A-Z0-9._]*\(/i, "");
  // Remove o parêntese de fechamento externo (respeitando aninhamento)
  let depth = 0;
  let inner = withoutEq;
  for (let i = withoutEq.length - 1; i >= 0; i--) {
    if (withoutEq[i] === ")") {
      if (depth === 0) {
        inner = withoutEq.slice(0, i);
        break;
      }
      depth++;
    } else if (withoutEq[i] === "(") {
      depth--;
    }
  }

  const args: string[] = [];
  let current = "";
  let parenDepth = 0;
  let inString = false;

  for (const char of inner) {
    if (char === '"') {
      inString = !inString;
    }
    if (!inString) {
      if (char === "(") parenDepth++;
      else if (char === ")") parenDepth--;
      else if (char === separator && parenDepth === 0) {
        args.push(current.trim());
        current = "";
        continue;
      }
    }
    current += char;
  }
  if (current.trim()) args.push(current.trim());
  return args;
}

/**
 * Avalia uma expressão de comparação simples como "1=1", "A>0", "1<>2".
 * Suporta critérios unários (">0", "=1", ">=100") onde o operador está na
 * posição 0 e o lado esquerdo é a string vazia.
 * Retorna o valor booleano (como true/false) ou o valor original se não for comparação.
 *
 * WR-01: corrigido `idx <= 0` → `idx < 0` para não bloquear operadores em posição 0
 * (critérios como ">0", "=1" têm idx === 0 e eram silenciosamente ignorados).
 */
function evaluateComparison(expr: string): unknown {
  // Tenta identificar operadores de comparação (ordem: >= <= <> antes de > < =)
  const ops = [">=", "<=", "<>", ">", "<", "="];
  for (const op of ops) {
    const idx = expr.indexOf(op);
    if (idx < 0) continue; // WR-01: idx==0 é válido (operador unário no início)
    const left = expr.slice(0, idx).trim();
    const right = expr.slice(idx + op.length).trim();

    // Critério unário: lado esquerdo vazio (ex: ">0", "=1")
    // Retorna o valor direito como referência de comparação para o chamador usar
    if (left === "") {
      return coerceSimpleValue(right);
    }

    const lv = coerceSimpleValue(left);
    const rv = coerceSimpleValue(right);

    switch (op) {
      case "=":
        return lv === rv;
      case "<>":
        return lv !== rv;
      case ">":
        return (lv as number) > (rv as number);
      case "<":
        return (lv as number) < (rv as number);
      case ">=":
        return (lv as number) >= (rv as number);
      case "<=":
        return (lv as number) <= (rv as number);
    }
  }
  return expr;
}

/** Converte string simples para number ou string sem aspas. */
function coerceSimpleValue(s: string): string | number | boolean {
  if (s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  if (s === "true") return true;
  if (s === "false") return false;
  const n = parseBRNumber(s);
  if (!isNaN(n)) return n;
  return s;
}

// ─── Avaliador de expressão aritmética (DEBUG: table-formulas-name-error) ───────
//
// O motor original só avaliava fórmulas no formato CHAMADA DE FUNÇÃO `=FUNCAO(...)`
// e o caso isolado `=A1`. A IA (gpt-5-mini), porém, gera naturalmente fórmulas de
// EXPRESSÃO ARITMÉTICA para colunas como "Total" (ex.: `=D{row}*E{row}` ou
// `=Quantidade*Preço`), que não começam com função → retornavam "#NAME?" em todas
// as linhas (confirmado no UAT da Phase 15, Test 6).
//
// Este avaliador trata expressões aritméticas seguras:
//   - operadores binários: + - * /
//   - menos unário (ex.: -D2, -(A1+B1))
//   - parênteses
//   - números BR (decimal com vírgula) e simples
//   - referências de célula (D2) e nomes de coluna (Quantidade)
// Resolução de operandos é delegada a `resolveOperand` (cell ref → grid; nome de
// coluna → valor da row). NÃO usa eval; tokeniza + shunting-yard explícito.

type ArithToken =
  | { kind: "num"; value: number }
  | { kind: "ref"; raw: string }
  | { kind: "op"; op: "+" | "-" | "*" | "/" }
  | { kind: "uminus" }
  | { kind: "lparen" }
  | { kind: "rparen" };

/**
 * Detecta se uma fórmula (já com {row} substituído, sem o "=" prefixo opcional)
 * é uma expressão aritmética — i.e. contém um operador aritmético binário fora de
 * strings e NÃO é uma chamada de função `=FUNC(...)`.
 */
export function isArithmeticExpression(formula: string): boolean {
  if (extractFunctionName(formula) !== null) return false;
  const body = formula.replace(/^=/, "");
  // Precisa conter ao menos um operador aritmético e nenhum caractere proibido
  // (aspas, ponto-e-vírgula, dois-pontos de range, ! de multi-planilha).
  if (/["';:!]/.test(body)) return false;
  return /[+\-*/]/.test(body);
}

/** Tokeniza uma expressão aritmética. Retorna null se encontrar token inválido. */
function tokenizeArithmetic(body: string): ArithToken[] | null {
  const tokens: ArithToken[] = [];
  let i = 0;
  const isOpChar = (c: string) => c === "+" || c === "-" || c === "*" || c === "/";

  while (i < body.length) {
    const c = body[i];
    if (c === " " || c === "\t") {
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ kind: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ kind: "rparen" });
      i++;
      continue;
    }
    if (isOpChar(c)) {
      // Menos/mais unário: no início, após outro operador ou após "("
      const prev = tokens[tokens.length - 1];
      const isUnaryPos =
        !prev || prev.kind === "op" || prev.kind === "lparen" || prev.kind === "uminus";
      if (c === "-" && isUnaryPos) {
        tokens.push({ kind: "uminus" });
        i++;
        continue;
      }
      if (c === "+" && isUnaryPos) {
        // mais unário é no-op
        i++;
        continue;
      }
      tokens.push({ kind: "op", op: c as "+" | "-" | "*" | "/" });
      i++;
      continue;
    }
    // Número (com vírgula decimal BR ou ponto) ou referência/nome de coluna.
    // Lemos uma sequência de caracteres "de operando" até um operador/paren/espaço.
    let j = i;
    while (j < body.length) {
      const cj = body[j];
      if (cj === " " || cj === "\t" || cj === "(" || cj === ")" || isOpChar(cj)) break;
      j++;
    }
    const chunk = body.slice(i, j);
    if (chunk === "") return null;
    // É um número puro?
    const num = parseBRNumber(chunk);
    const looksNumeric = /^\d[\d.,]*$/.test(chunk);
    if (looksNumeric && !isNaN(num)) {
      tokens.push({ kind: "num", value: num });
    } else {
      tokens.push({ kind: "ref", raw: chunk });
    }
    i = j;
  }
  return tokens.length > 0 ? tokens : null;
}

/**
 * Resolve um operando (cell ref ou nome de coluna) para um número.
 * Retorna null se não conseguir resolver para um número finito.
 */
function resolveArithmeticOperand(
  raw: string,
  rows: RowData[],
  columns: TableColumn[],
  rowIdx: number
): number | null {
  // Referência de célula A1
  const cellRef = parseA1(raw);
  if (cellRef) {
    const row = rows[cellRef.row];
    if (!row) return null;
    const colKeys = columns.map((c) => c.key ?? c.name);
    const key = colKeys[cellRef.col];
    if (!key) return null;
    return toNumber(row[key]);
  }
  // Nome de coluna (case-insensitive, contra name ou key) na MESMA linha (rowIdx)
  const row = rows[rowIdx];
  if (row) {
    const lower = raw.toLowerCase();
    const col = columns.find(
      (c) => c.name.toLowerCase() === lower || (c.key ?? "").toLowerCase() === lower
    );
    if (col) {
      const key = col.key ?? col.name;
      return toNumber(row[key]);
    }
  }
  return null;
}

/** Converte um valor de célula (string BR ou number) para number, ou null. */
function toNumber(v: string | number | undefined): number | null {
  if (v === undefined || v === "") return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  const n = parseBRNumber(String(v));
  return isNaN(n) ? null : n;
}

/**
 * Avalia uma expressão aritmética sobre rows/columns para uma linha específica.
 * Retorna number, ou um código de erro estilo Excel ("#VALUE!", "#DIV/0!", "#NAME?").
 *
 * `formula` deve já ter {row} substituído. Aceita com ou sem "=" no início.
 */
export function evaluateArithmetic(
  formula: string,
  rows: RowData[],
  columns: TableColumn[],
  rowIdx: number
): number | string {
  const body = formula.replace(/^=/, "");
  const tokens = tokenizeArithmetic(body);
  if (!tokens) return "#NAME?";

  // Shunting-yard → RPN
  const prec: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2 };
  const output: ArithToken[] = [];
  const opStack: ArithToken[] = [];

  for (const tok of tokens) {
    if (tok.kind === "num" || tok.kind === "ref") {
      output.push(tok);
    } else if (tok.kind === "uminus") {
      opStack.push(tok);
    } else if (tok.kind === "op") {
      while (opStack.length) {
        const top = opStack[opStack.length - 1];
        if (top.kind === "uminus") {
          output.push(opStack.pop()!);
        } else if (top.kind === "op" && prec[top.op] >= prec[tok.op]) {
          output.push(opStack.pop()!);
        } else break;
      }
      opStack.push(tok);
    } else if (tok.kind === "lparen") {
      opStack.push(tok);
    } else if (tok.kind === "rparen") {
      let matched = false;
      while (opStack.length) {
        const top = opStack.pop()!;
        if (top.kind === "lparen") {
          matched = true;
          break;
        }
        output.push(top);
      }
      if (!matched) return "#NAME?"; // parênteses desbalanceados
    }
  }
  while (opStack.length) {
    const top = opStack.pop()!;
    if (top.kind === "lparen") return "#NAME?";
    output.push(top);
  }

  // Avalia RPN
  const stack: number[] = [];
  for (const tok of output) {
    if (tok.kind === "num") {
      stack.push(tok.value);
    } else if (tok.kind === "ref") {
      const val = resolveArithmeticOperand(tok.raw, rows, columns, rowIdx);
      if (val === null) return "#NAME?"; // ref/nome de coluna não resolvido para número
      stack.push(val);
    } else if (tok.kind === "uminus") {
      const a = stack.pop();
      if (a === undefined) return "#NAME?";
      stack.push(-a);
    } else if (tok.kind === "op") {
      const b = stack.pop();
      const a = stack.pop();
      if (a === undefined || b === undefined) return "#NAME?";
      switch (tok.op) {
        case "+":
          stack.push(a + b);
          break;
        case "-":
          stack.push(a - b);
          break;
        case "*":
          stack.push(a * b);
          break;
        case "/":
          if (b === 0) return "#DIV/0!";
          stack.push(a / b);
          break;
      }
    }
  }
  if (stack.length !== 1) return "#NAME?";
  const result = stack[0];
  return isFinite(result) ? result : "#VALUE!";
}

/**
 * Resolve um argumento de fórmula para o valor que será passado ao formulajs.
 *
 * Precedência de resolução:
 * 1. String literal entre aspas → remove as aspas
 * 2. Range A1:B5 → extractRange() 2D (Pitfall 1 prevenido)
 * 3. Referência A1 → valor da célula em rows (quando rows é RowData[])
 * 4. Nome de variável → lookup no contexto de dados (data context)
 * 5. Número BR (com vírgula) → parseBRNumber
 * 6. Expressão de comparação → evaluateComparison
 * 7. Valor numérico simples → parseFloat
 * 8. Fallback → string original
 */
function resolveArgument(
  arg: string,
  dataContext: unknown,
  rowsData: RowData[],
  columns: TableColumn[],
  _separator: ";" | ","
): unknown {
  void _separator;
  const trimmed = arg.trim();

  // String literal
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }

  // Range A1:B5 → 2D array (necessário para VLOOKUP — Pitfall 1)
  const range = parseRange(trimmed);
  if (range) {
    // Construir matriz 2D a partir de rowsData/columns
    const grid = buildGrid(rowsData, columns);
    return extractRange(grid, range);
  }

  // Referência de célula A1
  const cellRef = parseA1(trimmed);
  if (cellRef) {
    const row = rowsData[cellRef.row];
    if (row) {
      const colKeys = columns.map((c) => c.key ?? c.name);
      const key = colKeys[cellRef.col];
      if (key) return row[key] ?? "";
    }
    return "";
  }

  // Nome de variável no contexto de dados
  if (dataContext !== null && typeof dataContext === "object") {
    if (Array.isArray(dataContext)) {
      // data é um array diretamente — qualquer identificador resolve para ele
      // (convencional: =PROCV("x"; rows; 2; 0) onde rows referencia o array passado)
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(trimmed)) {
        return dataContext;
      }
    } else {
      // data é um Record — lookup por nome
      const ctx = dataContext as Record<string, unknown>;
      if (trimmed in ctx) {
        return ctx[trimmed];
      }
    }
  }

  // Número com separador BR (tem vírgula como decimal)
  if (/^\d[\d.,]*$/.test(trimmed) && trimmed.includes(",")) {
    const n = parseBRNumber(trimmed);
    if (!isNaN(n)) return n;
  }

  // Número simples
  const num = parseFloat(trimmed);
  if (!isNaN(num) && String(num) === trimmed) return num;

  // Inteiro puro
  const int = parseInt(trimmed, 10);
  if (!isNaN(int) && String(int) === trimmed) return int;

  // Expressão de comparação (ex: "1=1", "A>0")
  if (/[=<>]/.test(trimmed) && !trimmed.startsWith("=")) {
    return evaluateComparison(trimmed);
  }

  // Fallback: string como está
  return trimmed;
}

/**
 * Converte rows (Record<key, value>[]) + columns para uma grade 2D
 * usada por extractRange() quando há referências de célula A1/range.
 */
function buildGrid(rows: RowData[], columns: TableColumn[]): (string | number)[][] {
  return rows.map((row) =>
    columns.map((col) => {
      const key = col.key ?? col.name;
      return row[key] ?? "";
    })
  );
}

/**
 * Mapeia erros do formulajs para códigos estilo Excel.
 */
function mapFormulaError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toUpperCase();
    if (msg.includes("DIV") || msg.includes("DIVISION")) return "#DIV/0!";
    if (msg.includes("REF")) return "#REF!";
    if (msg.includes("NAME")) return "#NAME?";
    if (msg.includes("N/A") || msg.includes("NA")) return "#N/A";
    if (msg.includes("VALUE")) return "#VALUE!";
    return "#ERRO!";
  }
  // formulajs retorna objetos de erro com name property
  if (typeof err === "object" && err !== null) {
    const e = err as Record<string, unknown>;
    const name = String(e.name ?? e.message ?? "");
    if (name.includes("DIV")) return "#DIV/0!";
    if (name.includes("REF")) return "#REF!";
    if (name.includes("NA") || name.includes("N/A")) return "#N/A";
    if (name.includes("NAME")) return "#NAME?";
    if (name.includes("VALUE")) return "#VALUE!";
    if (name.includes("CIRC")) return "#CIRC!";
    return "#ERRO!";
  }
  return "#ERRO!";
}

/**
 * Avalia uma fórmula pt-BR com dados de contexto.
 *
 * @param formula    String de fórmula começando com "=" (ex: "=PROCV(\"x\";dados;2;0)")
 * @param data       Contexto de dados: array 2D, objeto com arrays nomeados, ou {}
 * @param opts       Opções extras: { circularRef?: boolean, separator?: ";" | "," }
 * @param evaluating Set de chaves em avaliação (detecção de ciclo — WR-04: por invocação)
 * @returns          Valor calculado (string|number) ou código de erro estilo Excel
 *
 * WR-04: evaluating é criado por invocação de recalcAll (não mais module-scope).
 * evaluateFormula cria seu próprio Set local se chamado sem o parâmetro.
 */
export function evaluateFormula(
  formula: string,
  data: unknown,
  opts?: Record<string, unknown>,
  evaluating: Set<string> = new Set<string>()
): string | number {
  // Opção de ciclo forçado (usada em testes de detecção de ciclo)
  if (opts?.circularRef === true) return "#CIRC!";

  const separator = (opts?.separator as ";" | "," | undefined) ?? ";";

  // Extrai nome da função
  const fnName = extractFunctionName(formula);
  if (!fnName) {
    // Pode ser referência simples de célula como "=A1"
    const cellFormula = formula.replace(/^=/, "");
    const cellRef = parseA1(cellFormula);
    if (cellRef) {
      // Detectar ciclo por referência de célula
      const cycleKey = `cell:${cellRef.row}:${cellRef.col}`;
      if (evaluating.has(cycleKey)) return "#CIRC!";
      // Retornar valor da grade, mas sem rowsData/columns aqui
      // — referência de célula simples sem contexto de rows retorna erro de ref
      return "#REF!";
    }
    return "#NOME?";
  }

  // Traduz PT-BR → EN
  const enFnName = translateFunctionName(fnName);
  if (!enFnName) return "#NAME?";

  // Verifica que a função existe no formulajs
  const fn = (formulajs as Record<string, unknown>)[enFnName];
  if (typeof fn !== "function") return "#NAME?";

  // Detecta ciclo
  const cycleKey = `fn:${fnName}`;
  if (evaluating.has(cycleKey)) return "#CIRC!";
  evaluating.add(cycleKey);

  try {
    // Parse dos argumentos com separador BR
    const rawArgs = parseFormulaArgs(formula, separator);

    // Resolve cada argumento
    const resolvedArgs = rawArgs.map((arg) =>
      resolveArgument(arg, data, [], [], separator)
    );

    // Chama o formulajs
    const result = (fn as (...args: unknown[]) => unknown)(...resolvedArgs);

    // Verifica se o resultado é um erro
    if (result instanceof Error) return mapFormulaError(result);
    if (
      typeof result === "object" &&
      result !== null &&
      "name" in result &&
      typeof (result as Record<string, unknown>).name === "string" &&
      (result as Record<string, unknown>).name !== ""
    ) {
      const name = String((result as Record<string, unknown>).name);
      if (name.startsWith("#") || name.match(/^[A-Z_/!?]+$/)) {
        return mapFormulaError(result);
      }
    }

    return result as string | number;
  } catch (err) {
    return mapFormulaError(err);
  } finally {
    evaluating.delete(cycleKey);
  }
}

/**
 * Recalcula todas as colunas de fórmula para cada linha.
 * Retorna novo array — nunca muta rawRows (Pitfall 2 prevenido).
 *
 * WR-04: cria evaluating Set localmente (por invocação) em vez de usar
 * o Set module-scope. Isso previne falsos positivos de ciclo em React 18
 * concorrente e quando múltiplos TableGridPanel estão montados.
 */
export function recalcAll(
  rows: RowData[],
  columns: TableColumn[],
  separator: ";" | "," = ";"
): RowData[] {
  const formulaCols = columns.filter((c) => c.type === "formula");
  if (formulaCols.length === 0) return rows;

  // WR-04: Set de ciclo local por invocação — nunca compartilhado entre instâncias
  const evaluating = new Set<string>();

  return rows.map((row, rowIdx) => {
    const updated: RowData = { ...row };
    for (const col of formulaCols) {
      const template = col.formula ?? "";
      // Substitui {row} pelo número 1-based
      const formula = template.replace(/\{row\}/g, String(rowIdx + 1));
      if (!formula.startsWith("=")) {
        continue;
      }
      try {
        const result = evaluateFormulaCells(
          formula,
          rows,
          columns,
          separator,
          evaluating,
          rowIdx
        );
        const key = col.key ?? col.name;
        updated[key] = result;
      } catch {
        const key = col.key ?? col.name;
        updated[key] = "#ERRO!";
      }
    }
    return updated;
  });
}

/**
 * Versão interna de evaluateFormula que resolve referências de célula
 * contra rows/columns reais (usada por recalcAll).
 *
 * WR-04: recebe evaluating Set por parâmetro (criado por invocação em recalcAll)
 * em vez de usar o Set module-scope anterior.
 *
 * DEBUG (table-formulas-name-error): quando a fórmula NÃO é uma chamada de função
 * `=FUNC(...)` mas é uma EXPRESSÃO ARITMÉTICA (ex.: `=D2*E2`, `=Quantidade*Preço`),
 * delega para evaluateArithmetic em vez de retornar "#NOME?"/"#NAME?".
 */
function evaluateFormulaCells(
  formula: string,
  rows: RowData[],
  columns: TableColumn[],
  separator: ";" | ",",
  evaluating: Set<string>,
  rowIdx: number
): string | number {
  const fnName = extractFunctionName(formula);
  if (!fnName) {
    // Não é chamada de função. Tenta expressão aritmética sobre cell refs / nomes de coluna.
    if (isArithmeticExpression(formula)) {
      return evaluateArithmetic(formula, rows, columns, rowIdx);
    }
    return "#NOME?";
  }

  const enFnName = translateFunctionName(fnName);
  if (!enFnName) return "#NAME?";

  const fn = (formulajs as Record<string, unknown>)[enFnName];
  if (typeof fn !== "function") return "#NAME?";

  const cycleKey = `fn:${fnName}`;
  if (evaluating.has(cycleKey)) return "#CIRC!";
  evaluating.add(cycleKey);

  try {
    const rawArgs = parseFormulaArgs(formula, separator);
    const resolvedArgs = rawArgs.map((arg) =>
      resolveArgument(arg, null, rows, columns, separator)
    );
    const result = (fn as (...args: unknown[]) => unknown)(...resolvedArgs);
    if (result instanceof Error) return mapFormulaError(result);
    return result as string | number;
  } catch (err) {
    return mapFormulaError(err);
  } finally {
    evaluating.delete(cycleKey);
  }
}

// ─── Hook React ────────────────────────────────────────────────────────────────

/**
 * Hook que recebe rows + columns e retorna displayRows com fórmulas calculadas.
 * Usa useMemo — displayRows é derivado, rawRows NUNCA sobrescritos (Pitfall 2 prevenido).
 */
export function useFormulaEngine(
  rows: RowData[],
  columns: TableColumn[],
  separator?: ";" | ","
): { displayRows: RowData[] } {
  const displayRows = useMemo(
    () => recalcAll(rows, columns, separator ?? ";"),
    [rows, columns, separator]
  );
  return { displayRows };
}
