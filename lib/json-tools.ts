export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

type CleaningRule = {
  char: string;
  label: string;
  replacement: string;
};

type CleaningDetail = {
  label: string;
  count: number;
};

type RootType = "array" | "object" | "primitive";

export type TransformMode = "format" | "minify";

export type TransformSuccessResult = {
  ok: true;
  mode: TransformMode;
  cleanedCount: number;
  cleaningDetails: CleaningDetail[];
  data: JsonValue;
  formatted: string;
  formattedLineCount: number;
  minified: string;
  output: string;
  outputLineCount: number;
  rootLabel: string;
  rootType: RootType;
};

export type TransformErrorResult = {
  ok: false;
  message: string;
};

export type FormatSuccessResult = TransformSuccessResult & {
  mode: "format";
};

export type MinifySuccessResult = TransformSuccessResult & {
  mode: "minify";
};

export type FormatErrorResult = TransformErrorResult;

export type RepairResult = {
  ok: boolean;
  repaired: string;
  fixes: string[];
  error?: string;
};

const cleaningRules: CleaningRule[] = [
  { char: "\uFEFF", label: "BOM", replacement: "" },
  { char: "\u200B", label: "零宽空格", replacement: "" },
  { char: "\u200C", label: "零宽非连接符", replacement: "" },
  { char: "\u200D", label: "零宽连接符", replacement: "" },
  { char: "\u2060", label: "词连接符", replacement: "" },
  { char: "\u00A0", label: "不间断空格", replacement: " " },
  { char: "\u2028", label: "行分隔符", replacement: "\n" },
  { char: "\u2029", label: "段分隔符", replacement: "\n" },
];

const cleaningMap = new Map(cleaningRules.map((rule) => [rule.char, rule]));

function sanitizeJsonText(input: string) {
  let cleaned = "";
  const stats = new Map<string, number>();

  for (const char of input) {
    const rule = cleaningMap.get(char);
    if (!rule) {
      cleaned += char;
      continue;
    }

    cleaned += rule.replacement;
    stats.set(rule.label, (stats.get(rule.label) ?? 0) + 1);
  }

  const cleaningDetails = Array.from(stats.entries()).map(([label, count]) => ({
    label,
    count,
  }));

  return {
    cleaned,
    cleaningDetails,
    cleanedCount: cleaningDetails.reduce((sum, detail) => sum + detail.count, 0),
  };
}

function normalizeJsonValue(value: unknown): JsonValue {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeJsonValue(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        normalizeJsonValue(item),
      ]),
    );
  }

  throw new Error("Only valid JSON values are supported.");
}

function getRootMetadata(data: JsonValue) {
  if (data === null || typeof data !== "object") {
    return {
      rootLabel: "root",
      rootType: "primitive" as RootType,
    };
  }

  if (Array.isArray(data)) {
    return {
      rootLabel: "root[]",
      rootType: "array" as RootType,
    };
  }

  return {
    rootLabel: "root{}",
    rootType: "object" as RootType,
  };
}

function createErrorResult(message: string, cleanedCount: number): TransformErrorResult {
  return {
    ok: false,
    message:
      cleanedCount > 0
        ? `${message}。已自动移除 ${cleanedCount} 个隐形字符，但内容仍不是合法 JSON。`
        : message,
  };
}

function buildTransformResult(mode: TransformMode, input: string): TransformSuccessResult | TransformErrorResult {
  const { cleaned, cleanedCount, cleaningDetails } = sanitizeJsonText(input);

  try {
    const data = normalizeJsonValue(JSON.parse(cleaned));
    const formatted = JSON.stringify(data, null, 2);
    const minified = JSON.stringify(data);
    const { rootLabel, rootType } = getRootMetadata(data);

    return {
      ok: true,
      mode,
      cleanedCount,
      cleaningDetails,
      data,
      formatted,
      formattedLineCount: formatted.split("\n").length,
      minified,
      output: mode === "minify" ? minified : formatted,
      outputLineCount: mode === "minify" ? 1 : formatted.split("\n").length,
      rootLabel,
      rootType,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知 JSON 解析错误";
    return createErrorResult(message, cleanedCount);
  }
}

export function formatJsonInput(input: string): FormatSuccessResult | FormatErrorResult {
  return buildTransformResult("format", input) as FormatSuccessResult | FormatErrorResult;
}

export function minifyJsonInput(input: string): MinifySuccessResult | TransformErrorResult {
  return buildTransformResult("minify", input) as MinifySuccessResult | TransformErrorResult;
}

export function repairJsonInput(input: string): RepairResult {
  const sanitizeResult = sanitizeJsonText(input);
  let current = sanitizeResult.cleaned;
  const fixes: string[] = [];

  if (sanitizeResult.cleanedCount > 0) {
    fixes.push(`清理了 ${sanitizeResult.cleanedCount} 个高危隐藏字符`);
  }

  // 1. Chinese Quotes -> Double Quotes
  const chineseQuotesFixed = current.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  if (chineseQuotesFixed !== current) {
    current = chineseQuotesFixed;
    fixes.push("替换全角/中文引号");
  }

  // 2. Single Quotes -> Double Quotes (Restricted to token boundaries to avoid corrupting "It's")
  const singleQuoteRegex = /([:,\[{]\s*)'((?:[^'\\]|\\.)*)'(\s*[:,}\]])/g;
  let singleQuoteFixed = current;
  let prevSingleQuoteFixed = "";
  let sqChanged = false;
  // Loop to handle adjacent/overlapping tokens securely (e.g. ['a','b'])
  while (singleQuoteFixed !== prevSingleQuoteFixed) {
    prevSingleQuoteFixed = singleQuoteFixed;
    singleQuoteFixed = singleQuoteFixed.replace(singleQuoteRegex, (match, before, inner, after) => {
      sqChanged = true;
      return `${before}"${inner.replace(/"/g, '\\"')}"${after}`;
    });
  }
  if (sqChanged) {
    current = singleQuoteFixed;
    fixes.push("将单引号替换为双引号");
  }

  // 3. Unquoted Keys -> Quoted Keys
  const unquotedKeyRegex = /([{,]\s*)([A-Za-z_$][A-Za-z0-9_$]*)\s*:/g;
  const unquotedKeyFixed = current.replace(unquotedKeyRegex, '$1"$2":');
  if (unquotedKeyFixed !== current) {
    current = unquotedKeyFixed;
    fixes.push("为无引号的 Key 补充双引号");
  }

  // 4. Equal sign instead of colon
  const equalColonRegex = /("[^"]*"\s*)=\s*(["{\[\d\w])/g;
  const equalColonFixed = current.replace(equalColonRegex, '$1: $2');
  if (equalColonFixed !== current) {
    current = equalColonFixed;
    fixes.push("将错误赋值等号 '=' 替换为冒号 ':'");
  }

  // 4.5. Unclosed strings at the end of a line
  // Matches: `"value` or `"value,` hitting a newline or EOF, BUT restricts it to string openings by ensuring the quote is preceded by a line start, colon, comma, or bracket.
  const unclosedStringRegex = /(^|[\[{,:]\s*)("\s*(?:[^"\r\n\\]|\\.)*?)(,)?\s*(\r?\n|$)/gm;
  const unclosedStringFixed = current.replace(unclosedStringRegex, (match, before, inner, comma, newline) => {
    return `${before}${inner}"${comma || ''}${newline}`;
  });
  if (unclosedStringFixed !== current) {
    current = unclosedStringFixed;
    fixes.push("在行末补全缺失的双引号");
  }

  // 5. Trailing Commas
  const trailingCommaRegex = /,\s*([}\]])/g;
  const trailingCommaFixed = current.replace(trailingCommaRegex, '$1');
  if (trailingCommaFixed !== current) {
    current = trailingCommaFixed;
    fixes.push("移除尾随逗号");
  }

  // 6. Missing Commas between Elements
  // Replaces: `"value" "nextKey"`-> `"value", "nextKey"`
  // Replaces: `} {` -> `}, {`
  const missingCommaRegex = /("|true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[}\]])(\s+)(?=["{\[tfn0-9-])/g;
  const missingCommaFixed = current.replace(missingCommaRegex, '$1,$2');
  if (missingCommaFixed !== current) {
    current = missingCommaFixed;
    fixes.push("在相邻元素间补充缺失的逗号");
  }

  // 7. Missing Closing Brackets at End
  let stack: string[] = [];
  let inString = false;
  let escapeNext = false;
  for (let i = 0; i < current.length; i++) {
    const char = current[i];
    if (escapeNext) { escapeNext = false; continue; }
    if (char === '\\') { escapeNext = true; continue; }
    if (char === '"') { inString = !inString; continue; }
    if (!inString) {
      if (char === '{') stack.push('}');
      if (char === '[') stack.push(']');
      if (char === '}' && stack[stack.length - 1] === '}') stack.pop();
      if (char === ']' && stack[stack.length - 1] === ']') stack.pop();
    }
  }

  if (stack.length > 0 || inString) {
    if (inString) {
      current += '"';
      fixes.push("补充末尾缺失的双引号");
    }
    if (stack.length > 0) {
      const appended = stack.reverse().join("");
      current += appended;
      fixes.push(`在末尾补全闭合括号 "${appended}"`);
    }
  }

  try {
    const parsed = JSON.parse(current);
    return {
      ok: true,
      repaired: JSON.stringify(parsed, null, 2),
      fixes
    };
  } catch (e) {
    return {
      ok: false,
      repaired: current,
      fixes,
      error: e instanceof Error ? e.message : String(e)
    };
  }
}

export function stringifyJsonValue(value: JsonValue) {
  return JSON.stringify(value);
}

export function toPathLabel(key: string) {
  return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)
    ? `.${key}`
    : `["${key.replaceAll('"', '\\"')}"]`;
}

export function getAllContainerPaths(value: JsonValue, basePath = "$"): string[] {
  if (value === null || typeof value !== "object") {
    return [];
  }

  const next = [basePath];

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      next.push(...getAllContainerPaths(item, `${basePath}[${index}]`));
    });
    return next;
  }

  Object.entries(value).forEach(([key, item]) => {
    next.push(...getAllContainerPaths(item, `${basePath}${toPathLabel(key)}`));
  });

  return next;
}

export function getNodePreview(node: JsonValue[] | Record<string, JsonValue>) {
  if (Array.isArray(node)) {
    if (node.length === 0) {
      return "[]";
    }

    const preview = node
      .slice(0, 3)
      .map((item) => {
        if (item === null) {
          return "null";
        }
        if (typeof item === "object") {
          return Array.isArray(item) ? "[...]" : "{...}";
        }
        return JSON.stringify(item);
      })
      .join(", ");

    return node.length > 3 ? `[${preview}, ...]` : `[${preview}]`;
  }

  const keys = Object.keys(node);
  if (keys.length === 0) {
    return "{}";
  }

  const preview = keys.slice(0, 3).join(", ");
  return keys.length > 3 ? `{ ${preview}, ... }` : `{ ${preview} }`;
}

export function createSampleJson() {
  return JSON.stringify(
    {
      brand: "Aura",
      team: {
        owner: "Design Platform",
        mode: "review",
        locales: ["zh-CN", "en-US"],
      },
      features: [
        {
          name: "invisible-char-cleanup",
          status: "ready",
          notes: ["BOM", "zero-width space", "non-breaking space"],
        },
        {
          name: "granular-copy",
          status: "ready",
          scopes: ["full-json", "single-node", "primitive-value"],
        },
      ],
      release: {
        date: "2026-03-28",
        metrics: {
          formattingMs: 13,
          treeDepth: 5,
        },
      },
    },
    null,
    2,
  );
}

export function createInvisibleCharacterSample() {
  const sample = createSampleJson();
  return `\uFEFF${sample.replace('{\n', '{\u200B\n').replace('"features"', '\u2060"features"').replace('"ready"', '"rea\u200Bdy"')}`;
}
