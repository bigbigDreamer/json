"use client";

import type { CSSProperties, ReactNode } from "react";
import { startTransition, useMemo, useState } from "react";
import {
  createInvisibleCharacterSample,
  createSampleJson,
  formatJsonInput,
  getAllContainerPaths,
  getNodePreview,
  stringifyJsonValue,
  toPathLabel,
  type FormatErrorResult,
  type FormatSuccessResult,
  type JsonValue,
} from "@/lib/json-tools";

type CopyState = {
  token: string;
  message: string;
} | null;

type JsonTreeNodeProps = {
  node: JsonValue;
  path: string;
  label: string;
  depth: number;
  collapsedPaths: Set<string>;
  onToggle: (path: string) => void;
  onCopy: (text: string, token: string, message: string) => Promise<void>;
  copyState: CopyState;
};

const initialInput = createInvisibleCharacterSample();
const initialResult = formatJsonInput(initialInput);

function isContainer(node: JsonValue): node is JsonValue[] | Record<string, JsonValue> {
  return typeof node === "object" && node !== null;
}

async function copyText(text: string) {
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const fallback = document.createElement("textarea");
  fallback.value = text;
  fallback.setAttribute("readonly", "true");
  fallback.style.position = "absolute";
  fallback.style.left = "-9999px";
  document.body.appendChild(fallback);
  fallback.select();
  document.execCommand("copy");
  document.body.removeChild(fallback);
}

function ActionButton({
  children,
  onClick,
  tone = "primary",
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button className={`actionButton ${tone}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

function JsonTreeNode({
  node,
  path,
  label,
  depth,
  collapsedPaths,
  onToggle,
  onCopy,
  copyState,
}: JsonTreeNodeProps) {
  const container = isContainer(node);
  const isArray = Array.isArray(node);
  const collapsed = container ? collapsedPaths.has(path) : false;
  const token = `copy:${path}`;
  const copyLabel = copyState?.token === token ? copyState.message : "复制";

  if (!container) {
    return (
      <div className="treeNode" style={{ "--depth": depth } as CSSProperties}>
        <div className="treeLine primitive">
          <div className="treeLead" />
          <div className="treeContent">
            <span className="treeKey">{label}</span>
            <span className={`typeBadge ${node === null ? "null" : typeof node}`}>
              {node === null ? "null" : typeof node}
            </span>
            <span className="levelBadge">L{depth}</span>
            <code className="treePath">{path}</code>
            <code className="treeValue">{stringifyJsonValue(node)}</code>
          </div>
          <button
            className="miniButton"
            onClick={() => onCopy(stringifyJsonValue(node), token, "已复制值")}
            type="button"
          >
            {copyLabel}
          </button>
        </div>
      </div>
    );
  }

  const entries = isArray
    ? node.map((value, index) => ({
        childLabel: `[${index}]`,
        childPath: `${path}[${index}]`,
        value,
      }))
    : Object.entries(node).map(([key, value]) => ({
        childLabel: key,
        childPath: `${path}${toPathLabel(key)}`,
        value,
      }));

  return (
    <div className="treeNode" style={{ "--depth": depth } as CSSProperties}>
      <div className={`treeLine ${collapsed ? "collapsed" : ""}`}>
        <button
          aria-label={collapsed ? `展开 ${label}` : `收起 ${label}`}
          className="toggleButton"
          onClick={() => onToggle(path)}
          type="button"
        >
          <span>{collapsed ? "+" : "-"}</span>
        </button>
        <div className="treeContent">
          <span className="treeKey">{label}</span>
          <span className={`typeBadge ${isArray ? "array" : "object"}`}>
            {isArray ? "array" : "object"}
          </span>
          <span className="levelBadge">L{depth}</span>
          <code className="treePath">{path}</code>
          <span className="treeMeta">
            {entries.length} {isArray ? "items" : "keys"}
          </span>
          {collapsed ? <span className="treePreview">{getNodePreview(node)}</span> : null}
        </div>
        <button
          className="miniButton"
          onClick={() => onCopy(JSON.stringify(node, null, 2), token, "已复制节点")}
          type="button"
        >
          {copyLabel}
        </button>
      </div>

      {!collapsed ? (
        <div className="treeChildren">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <JsonTreeNode
                collapsedPaths={collapsedPaths}
                copyState={copyState}
                depth={depth + 1}
                key={entry.childPath}
                label={entry.childLabel}
                node={entry.value}
                onCopy={onCopy}
                onToggle={onToggle}
                path={entry.childPath}
              />
            ))
          ) : (
            <div className="treeEmpty" style={{ "--depth": depth + 1 } as CSSProperties}>
              Empty {isArray ? "array" : "object"}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Metrics({
  result,
}: {
  result: FormatSuccessResult | null;
}) {
  if (!result) {
    return null;
  }

  return (
    <div className="metricsGrid">
      <div className="metricCard">
        <span className="metricLabel">Root</span>
        <strong className="metricValue">{result.rootType}</strong>
      </div>
      <div className="metricCard">
        <span className="metricLabel">Lines</span>
        <strong className="metricValue">{result.formattedLineCount}</strong>
      </div>
      <div className="metricCard">
        <span className="metricLabel">Bytes</span>
        <strong className="metricValue">{result.formatted.length}</strong>
      </div>
      <div className="metricCard">
        <span className="metricLabel">Cleaned</span>
        <strong className="metricValue">{result.cleanedCount}</strong>
      </div>
    </div>
  );
}

export function JsonStudio() {
  const [input, setInput] = useState(initialInput);
  const [result, setResult] = useState<FormatSuccessResult | null>(
    initialResult.ok ? initialResult : null,
  );
  const [error, setError] = useState<FormatErrorResult | null>(
    initialResult.ok ? null : initialResult,
  );
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [copyState, setCopyState] = useState<CopyState>(null);

  const cleanedSummary = useMemo(() => {
    if (!result || result.cleaningDetails.length === 0) {
      return "未发现需要清理的隐形字符";
    }

    return result.cleaningDetails
      .map((detail) => `${detail.label} × ${detail.count}`)
      .join(" / ");
  }, [result]);

  const handleFormat = (nextInput = input) => {
    startTransition(() => {
      const nextResult = formatJsonInput(nextInput);
      setCollapsedPaths(new Set());

      if (nextResult.ok) {
        setResult(nextResult);
        setError(null);
        return;
      }

      setResult(null);
      setError(nextResult);
    });
  };

  const handleCopy = async (text: string, token: string, message: string) => {
    try {
      await copyText(text);
      setCopyState({ token, message });
      window.setTimeout(() => {
        setCopyState((current) => (current?.token === token ? null : current));
      }, 1400);
    } catch {
      setCopyState({ token, message: "复制失败" });
    }
  };

  const collapseAll = () => {
    if (!result) {
      return;
    }

    setCollapsedPaths(new Set(getAllContainerPaths(result.data).filter((path) => path !== "$")));
  };

  const expandAll = () => {
    setCollapsedPaths(new Set());
  };

  const loadSample = () => {
    const sample = createSampleJson();
    setInput(sample);
    handleFormat(sample);
  };

  const loadInvisibleSample = () => {
    const sample = createInvisibleCharacterSample();
    setInput(sample);
    handleFormat(sample);
  };

  const togglePath = (path: string) => {
    setCollapsedPaths((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  return (
    <main className="pageShell">
      <div className="backgroundOrb orbOne" />
      <div className="backgroundOrb orbTwo" />
      <div className="backgroundGrid" />

      <section className="heroPanel">
        <div className="heroCopy">
          <span className="eyebrow">NEXT / JSON / TREE VIEW</span>
          <h1>Aura JSON Studio</h1>
          <p>
            把原始 JSON 变成可读、可收缩、可复制的结构化视图，同时自动清理零宽空格、BOM
            和其他常见隐形字符。
          </p>
        </div>

        <Metrics result={result} />
      </section>

      <section className="workspaceGrid">
        <article className="glassCard inputCard">
          <div className="cardHeader">
            <div>
              <span className="cardKicker">Input</span>
              <h2>粘贴原始 JSON</h2>
            </div>
            <div className="cardActions">
              <ActionButton onClick={loadSample} tone="secondary">
                标准示例
              </ActionButton>
              <ActionButton onClick={loadInvisibleSample} tone="ghost">
                隐形字符示例
              </ActionButton>
            </div>
          </div>

          <label className="editorFrame">
            <span className="editorHint">支持粘贴后直接格式化，快捷键为 Ctrl / Cmd + Enter</span>
            <textarea
              className="editor"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault();
                  handleFormat();
                }
              }}
              placeholder='例如：{"team":"design","features":["format","copy"]}'
              spellCheck={false}
              value={input}
            />
          </label>

          <div className="toolbar">
            <ActionButton onClick={() => handleFormat()}>格式化 JSON</ActionButton>
            <span className="toolbarMeta">{input.length} chars</span>
          </div>

          {error ? (
            <div className="statusCard error">
              <strong>解析失败</strong>
              <p>{error.message}</p>
            </div>
          ) : (
            <div className="statusCard ok">
              <strong>清理摘要</strong>
              <p>{cleanedSummary}</p>
            </div>
          )}
        </article>

        <article className="glassCard outputCard">
          <div className="cardHeader">
            <div>
              <span className="cardKicker">Output</span>
              <h2>结构化格式化结果</h2>
            </div>

            <div className="cardActions">
              <ActionButton onClick={expandAll} tone="ghost">
                全部展开
              </ActionButton>
              <ActionButton onClick={collapseAll} tone="ghost">
                全部收起
              </ActionButton>
              <ActionButton
                onClick={() =>
                  result
                    ? handleCopy(result.formatted, "copy:all", "已复制全部")
                    : Promise.resolve()
                }
                tone="secondary"
              >
                {copyState?.token === "copy:all" ? copyState.message : "复制全部"}
              </ActionButton>
            </div>
          </div>

          {result ? (
            <>
              <div className="outputIntro">
                <p>
                  格式化后的树视图支持任意节点折叠与单节点复制。路径采用 JSON 风格表达，方便你定位并复制局部结构。
                </p>
                <code className="rootBadge">{result.rootLabel}</code>
              </div>

              <div className="treePanel">
                <JsonTreeNode
                  collapsedPaths={collapsedPaths}
                  copyState={copyState}
                  depth={0}
                  label={result.rootLabel}
                  node={result.data}
                  onCopy={handleCopy}
                  onToggle={togglePath}
                  path="$"
                />
              </div>
            </>
          ) : (
            <div className="emptyState">
              <h3>等待可解析的 JSON</h3>
              <p>左侧格式化成功后，这里会显示一份可浏览、可复制、可折叠的 JSON 结构树。</p>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
