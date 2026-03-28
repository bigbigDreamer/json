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

export type FormatSuccessResult = {
  ok: true;
  cleanedCount: number;
  cleaningDetails: CleaningDetail[];
  data: JsonValue;
  formatted: string;
  formattedLineCount: number;
  rootLabel: string;
  rootType: "array" | "object" | "primitive";
};

export type FormatErrorResult = {
  ok: false;
  message: string;
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

export function formatJsonInput(input: string): FormatSuccessResult | FormatErrorResult {
  const { cleaned, cleanedCount, cleaningDetails } = sanitizeJsonText(input);

  try {
    const data = normalizeJsonValue(JSON.parse(cleaned));
    const formatted = JSON.stringify(data, null, 2);

    return {
      ok: true,
      cleanedCount,
      cleaningDetails,
      data,
      formatted,
      formattedLineCount: formatted.split("\n").length,
      rootLabel: Array.isArray(data) ? "root[]" : typeof data === "object" ? "root{}" : "root",
      rootType:
        data === null || typeof data !== "object"
          ? "primitive"
          : Array.isArray(data)
            ? "array"
            : "object",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "未知 JSON 解析错误";
    return {
      ok: false,
      message:
        cleanedCount > 0
          ? `${message}。已自动移除 ${cleanedCount} 个隐形字符，但内容仍不是合法 JSON。`
          : message,
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
