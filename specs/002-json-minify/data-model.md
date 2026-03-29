# Data Model: JSON 一键压缩

## 1. SourceJsonDocument

- **Purpose**: 表示用户在输入区提供的原始 JSON 文本，是所有转换操作的唯一输入。
- **Fields**:
  - `rawText`: 用户输入的完整文本
  - `charCount`: 文本长度，用于辅助状态展示
  - `origin`: 输入来源，手动粘贴或示例填充
- **Validation Rules**:
  - 允许为空字符串，但空字符串不能进入成功转换状态
  - 在进入压缩或格式化流程前，必须先执行可预测字符清理

## 2. SanitizationReport

- **Purpose**: 记录输入在解析前经历的安全清理结果，保证用户知道系统做了哪些确定性的预处理。
- **Fields**:
  - `cleanedText`: 清理后的文本
  - `cleanedCount`: 被清理字符总数
  - `cleaningDetails[]`: 每种字符类型对应的计数明细
- **Validation Rules**:
  - 仅允许记录 `speckit.constitution` 中已定义的可预测字符类型
  - 任何清理都不得改变合法 JSON 的数据语义

## 3. ParsedJsonValue

- **Purpose**: 代表经过清理和解析后的标准 JSON 值，是格式化和压缩结果的共同基础。
- **Fields**:
  - `data`: 标准 JSON 值，可为 object、array、string、number、boolean 或 null
  - `rootType`: 根节点类型
  - `rootLabel`: 根节点展示标签
- **Validation Rules**:
  - 仅接受标准 JSON 值
  - 非 JSON 语法必须直接失败，不做猜测式修复

## 4. CompressionResult

- **Purpose**: 表示一次压缩操作的成功输出，供展示、复制和状态识别使用。
- **Fields**:
  - `compressed`: 无多余空格和换行的 JSON 文本
  - `byteLength`: 结果长度
  - `cleanedCount`: 本次压缩前执行的清理数量
  - `sourceRootType`: 对应根节点类型
- **Validation Rules**:
  - 必须由成功解析的 `ParsedJsonValue` 生成
  - 与源 JSON 语义保持一致
  - 对已压缩输入重复执行时，结果仍应稳定

## 5. TransformFeedback

- **Purpose**: 聚合用户可见的状态反馈，覆盖成功、失败与清理说明。
- **Fields**:
  - `status`: `idle` | `success` | `error`
  - `mode`: `format` | `minify`
  - `message`: 主提示文案
  - `details`: 补充说明，例如清理摘要或解析失败原因
- **Validation Rules**:
  - `error` 状态不得同时暴露过期的成功结果
  - `mode` 必须与最近一次用户操作一致，确保用户知道当前结果来自格式化还是压缩

## Relationships

- `SourceJsonDocument` 经过清理后生成 `SanitizationReport`
- `SanitizationReport.cleanedText` 成功解析后生成 `ParsedJsonValue`
- `ParsedJsonValue` 可派生 `CompressionResult`
- 用户界面始终通过 `TransformFeedback` 呈现当前操作状态

## State Transitions

- `idle -> success(minify)`: 用户触发压缩且输入为合法 JSON
- `idle -> error(minify)`: 用户触发压缩且输入不可解析
- `success(format) -> success(minify)`: 用户在已有格式化结果基础上再次执行压缩
- `success(minify) -> success(format)`: 用户切回格式化操作，源输入不变
- `error(minify) -> success(minify)`: 用户修正输入并重新压缩成功
