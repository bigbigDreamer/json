"use client";

import type { CSSProperties, PointerEvent, ReactNode } from "react";
import { startTransition, useMemo, useState, useRef } from "react";
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
  className = "",
  style,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "primary" | "secondary" | "ghost";
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <button className={`actionButton ${tone} ${className}`} onClick={onClick} type="button" style={style}>
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
          <div className="treeActions">
            <button
              className={`actionIcon ${copyState?.token === `${token}:value` ? "success" : ""}`}
              onClick={() => onCopy(stringifyJsonValue(node), `${token}:value`, "已复制值")}
              title="Copy Value"
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
            <button
              className={`actionIcon ${copyState?.token === `${token}:path` ? "success" : ""}`}
              onClick={() => onCopy(path, `${token}:path`, "已复制路径")}
              title="Copy Path"
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
            </button>
          </div>
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
        <div className="treeActions">
          <button
            className={`actionIcon ${copyState?.token === `${token}:node` ? "success" : ""}`}
            onClick={() => onCopy(JSON.stringify(node, null, 2), `${token}:node`, "已复制节点")}
            title="Copy Object/Array"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button
            className={`actionIcon ${copyState?.token === `${token}:path` ? "success" : ""}`}
            onClick={() => onCopy(path, `${token}:path`, "已复制路径")}
            title="Copy Path"
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
          </button>
        </div>
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

const highlightJsonSyntax = (code: string) => {
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  
  let depth = 0;

  return escaped.replace(
    /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|[{}[\]]/g,
    (match, str, colon, boolNull) => {
      if (str) {
        if (colon) {
          return `<span class="hl-key">${str}</span>${colon}`;
        }
        return `<span class="hl-string">${str}</span>`;
      }
      if (boolNull) {
        return `<span class="hl-boolean">${match}</span>`;
      }
      if (match === "{" || match === "[") {
        const currentDepth = depth % 3;
        depth++;
        return `<span class="hl-bracket hl-bracket-${currentDepth}">${match}</span>`;
      }
      if (match === "}" || match === "]") {
        depth = Math.max(0, depth - 1);
        const currentDepth = depth % 3;
        return `<span class="hl-bracket hl-bracket-${currentDepth}">${match}</span>`;
      }
      return `<span class="hl-number">${match}</span>`;
    }
  );
};

export function JsonStudio() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
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
  const [leftWidthPercent, setLeftWidthPercent] = useState<number | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [repairStatus, setRepairStatus] = useState<{ active: boolean; message: string; success: boolean } | null>(null);
  const [dockPosition, setDockPosition] = useState<FloatingDockPosition>({ x: 0, y: 0 });
  const [dockDrag, setDockDrag] = useState<FloatingDockDrag>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");

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

  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

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
        // Switch to output tab on mobile when successful
        if (window.innerWidth <= 768) {
          setActiveTab("output");
        }
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

  const handleAutoFix = async () => {
    const { repairJsonInput } = await import("@/lib/json-tools");
    startTransition(() => {
      const repairResult = repairJsonInput(input);
      
      // ALONG AS IT CHANGED, APPLY IT! Even if imperfect, partial auto-fix is great UX
      if (repairResult.repaired !== input) {
        setInput(repairResult.repaired);
      }

      if (repairResult.ok) {
        setRepairStatus({ 
          active: true, 
          message: repairResult.fixes.length > 0 ? `完美修复：${repairResult.fixes.join(" / ")}` : "代码很健康，已帮你重新格式化。", 
          success: true 
        });
        runTransform(activeMode, repairResult.repaired);
      } else {
        setRepairStatus({ 
          active: true, 
          message: `部分修复成功但仍有错误 (${repairResult.error})。已为您执行：${repairResult.fixes.join(" / ")}。`, 
          success: false 
        });
        // Still try to run transform to trigger the standard error display
        runTransform(activeMode, repairResult.repaired);
      }
      
      setTimeout(() => setRepairStatus(null), 5000);
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

  const clearInput = () => {
    setInput("");
    setResult(null);
    setError(null);
    if (window.innerWidth <= 768) {
      setActiveTab("input");
    }
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

  const handleResizePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsResizing(true);
  };

  const handleResizePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isResizing) return;
    const container = event.currentTarget.parentElement;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    let newWidth = (offsetX / rect.width) * 100;
    if (newWidth < 20) newWidth = 20;
    if (newWidth > 80) newWidth = 80;
    setLeftWidthPercent(newWidth);
  };

  const handleResizePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsResizing(false);
  };

  return (
    <main className="pageShell">
      <div className="backgroundOrb orbOne" />
      <div className="backgroundOrb orbTwo" />
      <div className="backgroundGrid" />

      <div className="mobileBottomNav">
        <button 
          className={`navItem ${activeTab === "input" ? "active" : ""}`} 
          onClick={() => setActiveTab("input")}
        >
          <div className="navIconWrapper">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v14"></path><path d="M5 10l7 7 7-7"></path></svg>
          </div>
          <span>EDITOR</span>
        </button>
        <button 
          className={`navItem ${activeTab === "output" ? "active" : ""}`} 
          onClick={() => setActiveTab("output")}
        >
          <div className="navIconWrapper">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            {result && <span className="navDot" />}
          </div>
          <span>RESULT</span>
        </button>
      </div>

      <div className="mobileStickyActions">
        <button className="mobileActionBtn iconOnly" onClick={handleAutoFix} title="Auto Fix">✨</button>
        <button className="mobileActionBtn primary" onClick={() => handleFormat()}>Format</button>
        <button className="mobileActionBtn secondary" onClick={() => handleMinify()}>Minify</button>
        <button className="mobileActionBtn iconOnly" onClick={clearInput} title="Clear">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        </button>
      </div>

      <aside
        className={`floatingDock ${dockDrag.active ? "dragging" : ""}`}
        onPointerMove={handleDockPointerMove}
        onPointerUp={handleDockPointerUp}
        onPointerCancel={handleDockPointerUp}
        style={{ transform: `translate(${dockPosition.x}px, ${dockPosition.y}px)` }}
      >
        <div className="floatingDockHandle" onPointerDown={handleDockPointerDown} role="button" tabIndex={0}>
          <div className="dockIcon">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
          </div>
          <span className="floatingDockTitle">SAMPLES</span>
          <span className="floatingDockHint">hover/tap</span>
        </div>
        <div className="floatingDockBody">
          <div className="floatingDockActions">
            <button className="sampleButton" onClick={() => { loadSample(); if(window.innerWidth <= 768) setActiveTab("input"); }} type="button">
              Clean
            </button>
            <button className="sampleButton" onClick={() => { loadInvisibleSample(); if(window.innerWidth <= 768) setActiveTab("input"); }} type="button">
              Dirty
            </button>
          </div>
        </div>
      </aside>

      <section className="topBar">
        <div className="brandBlock">
          <div className="brandLogo">
            <div className="logoOrb" />
            <span className="eyebrow">AURA</span>
          </div>
          <span className="topNote">JSON WORKBENCH</span>
        </div>
        <div className="topActions">
          <Metrics result={result} />
        </div>
      </section>

      <section
        className={`workspaceGrid ${isResizing ? "resizing" : ""} mobile-tab-${activeTab}`}
        style={leftWidthPercent ? { "--left-width": `${leftWidthPercent}%` } as CSSProperties: undefined}
      >
        <article className="studioPanel inputPanel">
          <div className="panelHeader">
            <div className="panelTitle">
              <span className="cardKicker">Input</span>
              <ActionButton 
                onClick={handleAutoFix} 
                tone={repairStatus?.active && repairStatus.success ? "primary" : "ghost"} 
                className={repairStatus?.active && repairStatus.success ? "success" : ""}
                style={{ marginLeft: "12px" }}
              >
                Auto-Fix ✨
              </ActionButton>
            </div>
          </div>

          <div className="panelMetaBar">
            <div className="metaGroup">
              <span className="metaChip">Samples live in floating dock</span>
              <span className="metaChip">{input.length} chars</span>
              <span className="metaChip">Cmd/Ctrl + Enter</span>
            </div>
          </div>

          <div className={`statusBar ${repairStatus?.active ? (repairStatus.success ? "ok" : "error") : statusTone}`}>
            <strong>{repairStatus?.active ? (repairStatus.success ? "魔术修复已执行" : "修复失败") : statusTitle}</strong>
            <p>{repairStatus?.active ? repairStatus.message : statusBody}</p>
          </div>

          <div className="panelBody">
            <label className="editorShell">
              <div className="editorHint">
                Paste JSON here. Format 和 Minify 都只基于当前输入执行。
              </div>
              <div className="editorContainer">
                <textarea
                  ref={textareaRef}
                  className="editor"
                  onChange={(event) => setInput(event.target.value)}
                  onScroll={handleScroll}
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
                <pre ref={highlightRef} className="editorHighlight" aria-hidden="true">
                  <code dangerouslySetInnerHTML={{ __html: highlightJsonSyntax(input) + (input.endsWith('\n') ? ' ' : '') }} />
                </pre>
              </div>
            </label>
          </div>
        </article>

        <div
          className={`resizer ${isResizing ? "resizing" : ""}`}
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerUp}
        >
          <div className="resizerLine" />
        </div>

        <article className="studioPanel outputPanel">
          <div className="panelHeader">
            <div className="panelTitle">
              <span className="cardKicker">Output</span>
              <div className="topPrimaryActions" style={{ marginLeft: "12px" }}>
                <ActionButton onClick={() => handleFormat()} tone={activeMode === "format" ? "primary" : "ghost"}>Format</ActionButton>
                <ActionButton onClick={() => handleMinify()} tone={activeMode === "minify" ? "primary" : "ghost"}>
                  Minify
                </ActionButton>
              </div>
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
                className={copyState?.token === "copy:formatted" ? "success" : ""}
              >
                {copyFormattedLabel}
              </ActionButton>
              {result?.mode === "minify" ? (
                <ActionButton
                  onClick={() => handleCopy(result.minified, "copy:minified", "已复制压缩")}
                  tone="secondary"
                  className={copyState?.token === "copy:minified" ? "success" : ""}
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
