# GeoFeedback Agent

GeoFeedback Agent 是一个面向地图、导航、出行、航旅和 GIS 产品场景的用户反馈诊断与标准问题单生成工具。

它的目标不是自动替产品经理做最终决策，而是把非结构化用户反馈整理为可审核、可修改、可追踪的问题单草稿。

## 目标用户

- 需要处理地图类用户反馈的产品经理
- 地图、导航、出行、航旅和 GIS 产品实习生
- 需要把客服、测试或项目现场反馈整理为标准问题单的产品协作者

## MVP 核心流程

```text
用户输入反馈
  -> AI 结构化诊断
  -> 产品经理人工审核与修改
  -> 人工确认
  -> 标准问题单生成
  -> Markdown 复制或下载
```

当前 MVP 聚焦单条反馈处理，不做登录、数据库、历史后台、RAG、多 Agent 或工单平台集成。

## 已实现功能

- 单页工作台：反馈输入、环境补充、AI 诊断展示、人工审核、问题单生成在同一页面完成。
- 结构化诊断接口：`POST /api/diagnose` 返回符合 Zod Schema 的诊断结果。
- Mock 与 Gemini 双模式：默认可用 Mock 流程，本地无需模型密钥即可验证页面和构建。
- 地图业务分类：支持产品模块、问题类型、严重程度、优先级、缺失信息等字段。
- 事实与推测分离：用户明确事实、AI 推测、用户原话证据分开展示。
- Human-in-the-loop：产品经理可以修改关键诊断字段，并显式确认审核结果。
- 修改字段记录：系统会对比 AI 原始诊断和人工审核结果，记录被人工修改的字段。
- 标准问题单生成：支持 Bug 单、数据问题单、产品需求单三类 Markdown 模板。
- 导出能力：支持复制 Markdown、下载 `.md`、查看结构化 JSON。

## Human-in-the-loop 设计

系统会保留两份不同对象：

- `diagnosis`：AI 原始诊断结果。
- `reviewedDiagnosis`：产品经理人工审核后的结果。

问题单生成只使用 `reviewedDiagnosis`。当人工审核内容再次发生修改时，确认状态会回到 `reviewing`，问题单生成区会隐藏，必须重新确认后才能生成新的问题单。

确认时会记录：

- `modifiedFields`：人工修改过的字段。
- `confirmedAt`：人工确认时间。

## Mock 与 Gemini 双模式

诊断接口保留两种运行模式：

- Mock 模式：默认模式。只要 `USE_MOCK_AI` 不是明确的 `false`，系统就返回内置 Mock 诊断结果，不调用真实模型。
- Gemini 模式：当 `USE_MOCK_AI=false` 时，服务端使用 OpenAI SDK 兼容接口调用 Gemini，需要配置 `GEMINI_API_KEY`。

Mock 模式适合本地开发、页面验证、人工审核和问题单生成流程验证。Gemini 模式用于真实模型诊断测试。

## 技术栈

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- Zod
- OpenAI SDK
- lucide-react

## 本地运行

Windows PowerShell 环境中，优先使用 `.cmd` 命令，避免系统拦截 `npm.ps1` 或 `npx.ps1`。

1. 安装依赖：

   ```powershell
   npm.cmd install
   ```

2. 启动开发服务器：

   ```powershell
   npm.cmd run dev
   ```

3. 打开本地页面：

   ```text
   http://localhost:3000
   ```

4. 类型检查：

   ```powershell
   npx.cmd tsc --noEmit
   ```

5. 生产构建：

   ```powershell
   npm.cmd run build
   ```

## 环境变量配置

可参考 `.env.example`。

Mock 模式：

```env
USE_MOCK_AI=true
```

或不设置 `USE_MOCK_AI`，系统也会默认使用 Mock 模式。

Gemini 模式：

```env
USE_MOCK_AI=false
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

不要把真实密钥提交到 Git 仓库。

## 项目目录说明

```text
app/
  page.tsx                    单页工作台
  api/diagnose/route.ts        诊断接口，支持 Mock 与 Gemini 模式

components/
  human-review-form.tsx        产品经理人工审核表单
  ticket-generator.tsx         标准问题单生成、预览与导出

lib/
  diagnosis.ts                 反馈输入与诊断结果 Schema
  review.ts                    人工审核副本与修改字段计算
  ticket.ts                    确定性问题单生成逻辑
  prompts/diagnosis-prompt.ts  运行时 Prompt V1

prompts/
  prompt_v1.md                 Prompt V1 文档版

eval/
  golden_set.json              待完成：Golden Set 数据
  evaluation_results.csv       待完成：评测结果记录
  BADCASES.md                  待完成：Badcase 记录

docs/
  PRD.md
  DESIGN.md
  ARCHITECTURE.md
```

## 当前项目状态

已完成：

- 地图反馈输入与基础校验
- AI 结构化诊断 Schema
- Prompt V1
- Mock 诊断流程
- Gemini 模式接入
- AI 诊断结果展示
- 人工审核与修改记录
- 人工确认后的三类问题单生成
- Markdown 复制、下载和 JSON 查看
- 无模型密钥的本地构建验证

待完成：

- Golden Set 样例补充
- Badcase 记录与评测结果维护
- 截图上传与多模态理解能力
- 更完整的缺失信息编辑体验
- README 中补充真实部署说明，前提是已有实际部署地址
- 基于真实测试结果迭代 Prompt V2 或 V3

## 后续计划

- 建立首批 Golden Set，记录来源与人工标准答案。
- 使用 Prompt V1 跑评测，记录分类错误、格式错误和信息虚构 Badcase。
- 基于真实 Badcase 决定是否更新 Prompt V2。
- 完善缺失信息补充和问题单模板字段。
- 在完成真实部署后补充在线 Demo 地址。

以上计划不会预设准确率、用户数量、节省时间比例或未完成的测试结论。

## 开源来源说明

本项目技术骨架基于 OpenAI Structured Outputs Sample 改造，并保留原始 MIT 许可证。

在此基础上，地图业务分类体系、Prompt、Human-in-the-loop 人工审核流程、标准问题单生成逻辑和评测体系为 GeoFeedback Agent 项目独立设计。
