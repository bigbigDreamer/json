import { describe, expect, it } from "vitest";
import { formatJsonInput, minifyJsonInput } from "../../lib/json-tools";

describe("minifyJsonInput", () => {
  it("compresses objects and arrays into a stable single-line string", () => {
    const result = minifyJsonInput('{\n  "team": "design",\n  "items": [1, 2, 3]\n}');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.mode).toBe("minify");
    expect(result.minified).toBe('{"team":"design","items":[1,2,3]}');
    expect(result.output).toBe(result.minified);
    expect(result.outputLineCount).toBe(1);
  });

  it("supports top-level primitive JSON values", () => {
    const cases = [
      { input: "null", output: "null" },
      { input: "true", output: "true" },
      { input: "123", output: "123" },
      { input: '"hello"', output: '"hello"' },
    ];

    cases.forEach(({ input, output }) => {
      const result = minifyJsonInput(input);
      expect(result.ok).toBe(true);
      if (!result.ok) {
        return;
      }

      expect(result.minified).toBe(output);
      expect(result.rootType).toBe("primitive");
    });
  });

  it("keeps already minified JSON stable", () => {
    const input = '{"feature":"minify","enabled":true}';
    const result = minifyJsonInput(input);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.minified).toBe(input);
    expect(result.cleanedCount).toBe(0);
  });

  it("removes supported invisible characters before minifying", () => {
    const result = minifyJsonInput('\uFEFF{\u200B"status":"rea\u200Bdy"}');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.minified).toBe('{"status":"ready"}');
    expect(result.cleanedCount).toBe(3);
    expect(result.cleaningDetails).toEqual([
      { label: "BOM", count: 1 },
      { label: "零宽空格", count: 2 },
    ]);
  });

  it("returns a helpful error for invalid JSON", () => {
    const result = minifyJsonInput('{"team":"design",}');

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.message.length).toBeGreaterThan(0);
    expect(result.message).toContain("JSON");
  });

  it("mentions cleanup when sanitized input is still invalid", () => {
    const result = minifyJsonInput('\uFEFF{"team":"design",}');

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.message).toContain("已自动移除 1 个隐形字符");
  });
});

describe("formatJsonInput", () => {
  it("still returns formatted output for tree mode", () => {
    const result = formatJsonInput('{"team":"design","items":[1,2]}');

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.mode).toBe("format");
    expect(result.formatted).toContain('\n  "team": "design"');
    expect(result.output).toBe(result.formatted);
    expect(result.outputLineCount).toBeGreaterThan(1);
  });
});
