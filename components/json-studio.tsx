"use client";

import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { startTransition, useMemo, useState } from "react";
import {
  createInvisibleCharacterSample,
  createSampleJson,
  formatJsonInput,
  getAllContainerPaths,
  getNodePreview,
  minifyJsonInput,
  stringifyJsonValue,
  toPathLabel,
  type JsonValue,
  type TransformErrorResult,
  type TransformMode,
  type TransformSuccessResult,
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

type FloatingDockPosition = {
  x: number;
  y: number;
};

type FloatingDockDrag = {
  active: boolean;
  pointerId: number | null;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
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
  result: TransformSuccessResult | null;
}) {
  if (!result) {
    return null;
  }

  return (
    <div className="metricsStrip">
      <div className="metricChip">
        <span className="metricLabel">Mode</span>
        <strong className="metricValue">{result.mode === "minify" ? "Minify" : "Format"}</strong>
      </div>
      <div className="metricChip">
        <span className="metricLabel">Root</span>
        <strong className="metricValue">{result.rootType}</strong>
      </div>
      <div className="metricChip">
        <span className="metricLabel">Lines</span>
        <strong className="metricValue">{result.outputLineCount}</strong>
      </div>
      <div className="metricChip">
        <span className="metricLabel">Bytes</span>
        <strong className="metricValue">{result.output.length}</strong>
      </div>
      <div className="metricChip">
        <span className="metricLabel">Cleaned</span>
        <strong className="metricValue">{result.cleanedCount}</strong>
      </div>
    </div>
  );
}

export function JsonStudio() {
  const [input, setInput] = useState(initialInput);
  const [result, setResult] = useState<TransformSuccessResult | null>(
    initialResult.ok ? initialResult : null,
  );
  const [error, setError] = useState<TransformErrorResult | null>(
    initialResult.ok ? null : initialResult,
  );
  const [activeMode, setActiveMode] = useState<TransformMode>(
    initialResult.ok ? initialResult.mode : "format",
  );
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [copyState, setCopyState] = useState<CopyState>(null);
  const [dockPosition, setDockPosition] = useState<FloatingDockPosition>({ x: 0, y: 0 });
  const [dockDrag, setDockDrag] = useState<FloatingDockDrag>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  const cleanedSummary = useMemo(() => {
    if (!result || result.cleaningDetails.length === 0) {
      return "未发现需要清理的隐形字符";
    }

    return result.cleaningDetails
      .map((detail) => `${detail.label} × ${detail.count}`)
      .join(" / ");
  }, [result]);

  const statusTone = error ? "error" : result?.mode === "minify" ? "minify" : "ok";

  const statusTitle = useMemo(() => {
    if (error) {
      return activeMode === "minify" ? "压缩失败" : "解析失败";
    }

    if (result?.mode === "minify") {
      return "压缩结果已就绪";
    }

    return "格式化结果已就绪";
  }, [activeMode, error, result]);

  const statusBody = useMemo(() => {
    if (error) {
      return error.message;
    }

    if (result?.mode === "minify") {
      return `${cleanedSummary}。当前为单行压缩结果，原始输入不会被覆盖。`;
    }

    return `${cleanedSummary}。当前为结构化格式化结果，可直接浏览与复制。`;
  }, [cleanedSummary, error, result]);

  const outputHeading = result?.mode === "minify" ? "压缩结果与结构树" : "结构树结果";

  const outputDescription =
    result?.mode === "minify"
      ? "先复制单行结果，再继续浏览下方结构树。"
      : "结构树支持折叠、路径定位和节点复制。";

  const runTransform = (mode: TransformMode, nextInput = input) => {
    startTransition(() => {
      const nextResult = mode === "minify" ? minifyJsonInput(nextInput) : formatJsonInput(nextInput);

      setActiveMode(mode);
      setCollapsedPaths(new Set());
      setCopyState(null);

      if (nextResult.ok) {
        setResult(nextResult);
        setError(null);
        return;
      }

      setResult(null);
      setError(nextResult);
    });
  };

  const handleFormat = (nextInput = input) => {
    runTransform("format", nextInput);
  };

  const handleMinify = (nextInput = input) => {
    runTransform("minify", nextInput);
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

  const copyFormattedLabel =
    copyState?.token === "copy:formatted"
      ? copyState.message
      : result?.mode === "minify"
        ? "复制格式化"
        : "复制全部";

  const copyMinifiedLabel =
    copyState?.token === "copy:minified" ? copyState.message : "复制压缩";

  const handleDockPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDockDrag({
      active: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: dockPosition.x,
      originY: dockPosition.y,
    });
  };

  const handleDockPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dockDrag.active || dockDrag.pointerId !== event.pointerId) {
      return;
    }

    setDockPosition({
      x: dockDrag.originX + event.clientX - dockDrag.startX,
      y: dockDrag.originY + event.clientY - dockDrag.startY,
    });
  };

  const handleDockPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dockDrag.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture(event.pointerId);
    setDockDrag({
      active: false,
      pointerId: null,
      startX: 0,
      startY: 0,
      originX: dockPosition.x,
      originY: dockPosition.y,
    });
  };

  return (
    <main className="pageShell">
      <div className="backgroundOrb orbOne" />
      <div className="backgroundOrb orbTwo" />
      <div className="backgroundGrid" />

      <aside
        className={`floatingDock ${dockDrag.active ? "dragging" : ""}`}
        onPointerMove={handleDockPointerMove}
        onPointerUp={handleDockPointerUp}
        onPointerCancel={handleDockPointerUp}
        style={{ transform: `translate(${dockPosition.x}px, ${dockPosition.y}px)` }}
      >
        <div className="floatingDockHandle" onPointerDown={handleDockPointerDown} role="button" tabIndex={0}>
          <span className="floatingDockTitle">Samples</span>
          <span className="floatingDockHint">hover to expand</span>
        </div>
        <div className="floatingDockBody">
          <p>
            `Clean` 载入普通合法 JSON。
            <br />
            `Dirty` 载入带 BOM / 零宽字符的脏样例，用来验证清理链路。
          </p>
          <div className="floatingDockActions">
            <button className="sampleButton" onClick={loadSample} type="button">
              Clean
            </button>
            <button className="sampleButton" onClick={loadInvisibleSample} type="button">
              Dirty
            </button>
          </div>
        </div>
      </aside>

      <section className="topBar">
        <div className="brandBlock">
          <span className="eyebrow">AURA / JSON WORKBENCH</span>
          <span className="topNote">format · minify · inspect · copy</span>
        </div>
        <div className="topActions">
          <div className="topPrimaryActions">
            <ActionButton onClick={() => handleFormat()}>Format</ActionButton>
            <ActionButton onClick={() => handleMinify()} tone="secondary">
              Minify
            </ActionButton>
          </div>
          <Metrics result={result} />
        </div>
      </section>

      <section className="workspaceGrid">
        <article className="studioPanel inputPanel">
          <div className="panelHeader">
            <div className="panelTitle">
              <span className="cardKicker">Input</span>
              <h2>RAW JSON</h2>
            </div>
          </div>

          <div className="panelMetaBar">
            <div className="metaGroup">
              <span className="metaChip">Samples live in floating dock</span>
              <span className="metaChip">{input.length} chars</span>
              <span className="metaChip">Cmd/Ctrl + Enter</span>
            </div>
          </div>

          <div className={`statusBar ${statusTone}`}>
            <strong>{statusTitle}</strong>
            <p>{statusBody}</p>
          </div>

          <div className="panelBody">
            <label className="editorShell">
              <span className="editorHint">
                Paste JSON here. Format 和 Minify 都只基于当前输入执行。
              </span>
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
          </div>
        </article>

        <article className="studioPanel outputPanel">
          <div className="panelHeader">
            <div className="panelTitle">
              <span className="cardKicker">Output</span>
              <h2>{result?.mode === "minify" ? "MINIFIED RESULT" : "STRUCTURE VIEW"}</h2>
            </div>
            <div className="panelActions">
              <ActionButton onClick={expandAll} tone="ghost">
                Expand
              </ActionButton>
              <ActionButton onClick={collapseAll} tone="ghost">
                Collapse
              </ActionButton>
              <ActionButton
                onClick={() =>
                  result
                    ? handleCopy(result.formatted, "copy:formatted", "已复制格式化")
                    : Promise.resolve()
                }
                tone="ghost"
              >
                {copyFormattedLabel}
              </ActionButton>
              {result?.mode === "minify" ? (
                <ActionButton
                  onClick={() => handleCopy(result.minified, "copy:minified", "已复制压缩")}
                  tone="secondary"
                >
                  {copyMinifiedLabel}
                </ActionButton>
              ) : null}
            </div>
          </div>

          {result ? (
            <div className="outputSummary">
              <p>{outputDescription}</p>
              <div className="metaGroup">
                <span className="metaChip">{result.rootLabel}</span>
                <span className="metaChip">{result.mode === "minify" ? "MINIFY" : "FORMAT"}</span>
                <span className="metaChip">{result.output.length} chars</span>
              </div>
            </div>
          ) : null}

          <div className="panelBody outputBody">
            {result ? (
              <>
                {result.mode === "minify" ? (
                  <section className="resultSurface">
                    <div className="resultSurfaceHeader">
                      <div>
                        <span className="resultKicker">Compressed</span>
                        <h3>单行压缩结果</h3>
                      </div>
                      <code className="resultMeta">{result.minified.length} chars</code>
                    </div>
                    <pre className="resultCode">{result.minified}</pre>
                  </section>
                ) : null}

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
                <h3>{activeMode === "minify" ? "等待可压缩的 JSON" : "等待可解析的 JSON"}</h3>
                <p>
                  {activeMode === "minify"
                    ? "压缩成功后，这里会显示单行结果和一份仍可继续浏览的结构树。"
                    : "格式化成功后，这里会显示结构树，支持折叠和节点复制。"}
                </p>
              </div>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}
