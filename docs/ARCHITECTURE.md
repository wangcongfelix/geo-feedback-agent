# GeoFeedback Agent Architecture

> 版本：v0.1
> 对应文档：PRD v0.1、DESIGN v0.1
> 项目阶段：MVP技术架构定义
> 技术原则：单体应用、结构化输出、人工审核、低复杂度、可评测

---

## 1. 架构目标

GeoFeedback Agent的首版架构需要支持以下完整流程：

```text
输入原始用户反馈
        ↓
前端校验与信息整理
        ↓
服务端调用模型
        ↓
模型返回结构化诊断结果
        ↓
前端展示AI建议
        ↓
产品经理人工修改与确认
        ↓
生成标准化问题单
        ↓
复制、下载或记录评测数据
```

MVP架构重点不是处理大规模并发，而是保证：

1. 数据流清晰；
2. AI输出结构稳定；
3. 未知信息不被虚构；
4. 人工可以修改全部关键判断；
5. Prompt可以版本化；
6. 测试结果可以复现；
7. 项目可以部署为在线Demo；
8. 每个模块都能被项目负责人讲清楚。

---

## 2. 核心架构原则

### 2.1 使用单体应用

MVP采用Next.js单体应用。

同一个项目负责：

* 页面展示；
* 表单交互；
* 服务端API；
* 模型调用；
* 问题单生成；
* 本地状态保存。

暂不拆分：

* 独立前端项目；
* 独立后端服务；
* 微服务；
* 消息队列；
* 多个部署服务。

选择单体架构的原因：

* 项目规模小；
* 开发和部署简单；
* 适合个人求职Demo；
* 减少跨服务调试成本；
* 便于理解完整数据流。

---

### 2.2 模型调用只能发生在服务端

模型API Key不能出现在浏览器代码中。

正确流程：

```text
浏览器
  ↓ 发送反馈内容
Next.js服务端API
  ↓ 使用环境变量中的API Key
模型服务
  ↓ 返回结构化结果
Next.js服务端API
  ↓
浏览器
```

禁止流程：

```text
浏览器直接携带API Key调用模型
```

原因：

* API Key可能被用户查看；
* 容易被盗用；
* 无法统一控制Prompt；
* 无法进行服务端校验；
* 不利于错误记录和后续迭代。

---

### 2.3 业务逻辑与页面展示分离

页面组件不直接拼接复杂Prompt，也不直接定义所有分类规则。

不同职责需要分开存放：

```text
页面组件
负责展示和交互

Schema
负责规定AI必须返回哪些字段

Prompt
负责告诉模型如何判断

业务规则
负责严重程度、问题单模板和人工确认逻辑

API Route
负责接收请求、调用模型和返回结果
```

这样修改页面时不会破坏Prompt，修改Prompt时也不需要重写界面。

---

### 2.4 AI建议与人工确认结果分离

系统需要保存两个不同对象：

```text
AI原始诊断结果
```

和：

```text
产品经理最终确认结果
```

不能直接在AI原始对象上覆盖修改，否则后续无法计算：

* 人工修改了哪些字段；
* 人工修改率；
* AI分类是否正确；
* Prompt不同版本的表现；
* 哪些字段最容易出错。

---

### 2.5 优先使用确定性代码处理确定性任务

不是所有功能都需要模型完成。

适合使用普通代码的任务：

* 表单必填校验；
* 字段状态管理；
* 人工修改记录；
* 问题单Markdown拼接；
* JSON下载；
* 复制到剪贴板；
* 耗时计算；
* 格式检查；
* Prompt版本记录。

适合使用模型的任务：

* 理解自然语言反馈；
* 识别用户场景；
* 判断产品模块；
* 判断问题类型；
* 提取事实；
* 识别缺失信息；
* 生成诊断建议；
* 提供严重程度和优先级建议。

原则：

> 可以用普通代码稳定实现的功能，不交给大模型自由生成。

---

## 3. 技术选型

### 3.1 Web框架

使用：

```text
Next.js
```

主要原因：

* 官方示例已经使用；
* 同时支持前端页面和服务端API；
* TypeScript支持较好；
* 可直接部署到Vercel；
* 适合轻量AI应用；
* 不需要额外搭建后端项目。

---

### 3.2 开发语言

使用：

```text
TypeScript
```

主要原因：

* 可以定义反馈输入和诊断结果的字段类型；
* 减少字段拼写和类型错误；
* 前端、API和Schema共用类型；
* 方便解释数据结构；
* 适合结构化AI输出。

---

### 3.3 页面框架

使用：

```text
React
```

React由Next.js提供。

页面将通过组件组合完成：

* 反馈输入组件；
* 诊断结果组件；
* 缺失信息组件；
* 人工审核组件；
* 问题单预览组件。

---

### 3.4 页面样式

使用：

```text
Tailwind CSS
```

主要原因：

* 官方示例已有配置；
* 适合快速调整页面；
* 不需要额外维护大量CSS文件；
* 适合Vibe Coding；
* 便于保持统一间距、颜色和响应式布局。

---

### 3.5 UI组件

优先复用项目现有组件。

后续根据需要使用基础组件：

* Button；
* Input；
* Textarea；
* Select；
* Checkbox；
* Card；
* Badge；
* Alert；
* Accordion；
* Skeleton；
* Tabs。

MVP不引入大型UI框架，避免样式和依赖过重。

---

### 3.6 数据校验

使用：

```text
Zod
```

Zod用于：

* 定义AI结构化输出Schema；
* 校验服务端请求；
* 校验模型返回值；
* 生成TypeScript类型；
* 判断输出是否格式合规。

---

### 3.7 模型调用

通过服务端模型SDK调用支持结构化输出的模型。

模型需要具备：

* 中文自然语言理解；
* 结构化JSON输出；
* 较稳定的指令遵循能力；
* 后续可选的图片理解能力。

具体模型在技术验证后决定，不在架构文档中提前锁死。

模型名称需要通过环境变量配置，避免写死在多个文件中。

---

### 3.8 数据保存

MVP暂不使用正式数据库。

首版可使用：

* React页面状态；
* LocalStorage；
* 浏览器下载JSON；
* 仓库中的离线评测文件。

原因：

* 首版处理单条反馈；
* 不做用户登录；
* 不做多人协作；
* 不需要长期保存生产数据；
* 可以显著减少开发复杂度。

当出现以下需求时，再考虑Supabase或其他数据库：

* 需要保存历史问题单；
* 需要跨设备访问；
* 需要多人测试；
* 需要用户登录；
* 需要统计真实使用数据；
* LocalStorage不足以支持评测。

---

## 4. 系统模块

系统分为六个主要模块。

### 4.1 反馈输入模块

职责：

* 接收原始反馈；
* 接收可选产品信息；
* 接收使用环境；
* 接收截图；
* 校验必填字段；
* 记录诊断开始时间；
* 发起诊断请求。

输入数据示例：

```json
{
  "feedbackText": "开车去机场时，导航一直让我走一条已经封闭的路。",
  "productName": "",
  "productType": "导航与出行",
  "device": "",
  "operatingSystem": "",
  "appVersion": "",
  "occurredAt": "",
  "location": "",
  "additionalContext": ""
}
```

未提供的信息使用空字符串或明确的空值表示，不能由前端自动猜测。

---

### 4.2 服务端诊断API模块

职责：

1. 接收前端请求；
2. 校验请求格式；
3. 读取Prompt版本；
4. 拼接系统规则和用户输入；
5. 调用模型；
6. 校验模型结构化输出；
7. 返回标准结果；
8. 处理模型错误和格式错误。

服务端API不负责：

* 页面展示；
* 人工编辑；
* 自动决定最终单据类型；
* 自动创建正式工单。

---

### 4.3 AI诊断模块

职责：

* 生成问题摘要；
* 识别用户场景；
* 判断产品模块；
* 判断问题类型；
* 提取用户明确提供的事实；
* 给出可能的推测；
* 检查缺失信息；
* 给出严重程度建议；
* 给出优先级建议；
* 输出不确定性说明。

AI输出必须满足预定义Schema。

AI不能：

* 自行填写设备型号；
* 自行填写产品版本；
* 自行填写发生地点；
* 自行假设用户规模；
* 自行断言技术根因；
* 自动生成最终正式工单；
* 自动决定研发排期。

---

### 4.4 人工审核模块

职责：

* 展示AI原始结果；
* 允许修改关键字段；
* 记录被修改的字段；
* 保存人工确认结果；
* 选择最终问题单类型；
* 完成人工确认。

人工审核模块是系统的决策控制层。

AI结果必须经过人工确认后，才能进入问题单生成模块。

---

### 4.5 问题单生成模块

职责：

* 根据人工确认结果选择模板；
* 将字段转换为Markdown；
* 保留待补充和待验证状态；
* 生成JSON结构；
* 支持复制与下载。

问题单生成优先使用确定性代码，不再次调用模型。

原因：

* 字段已经完成审核；
* 模板格式应该稳定；
* 避免模型再次改写事实；
* 可以保证格式合规；
* 降低调用成本。

---

### 4.6 评测模块

职责：

* 保存Golden Set；
* 保存Prompt版本；
* 记录模型输出；
* 记录人工标准答案；
* 记录修改字段；
* 记录处理耗时；
* 记录Badcase；
* 计算评测指标。

MVP阶段的评测主要在本地和仓库文件中完成，不需要制作在线评测后台。

---

## 5. 目标目录结构

目标项目结构如下：

```text
geo-feedback-agent/
├── app/
│   ├── api/
│   │   └── diagnose/
│   │       └── route.ts
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
│
├── components/
│   ├── feedback-form.tsx
│   ├── diagnosis-overview.tsx
│   ├── evidence-card.tsx
│   ├── missing-info-list.tsx
│   ├── human-review-form.tsx
│   ├── ticket-preview.tsx
│   └── ui/
│
├── lib/
│   ├── schemas/
│   │   ├── feedback-input.ts
│   │   └── diagnosis.ts
│   ├── prompts/
│   │   └── diagnosis-prompt.ts
│   ├── constants/
│   │   ├── issue-types.ts
│   │   ├── product-modules.ts
│   │   └── priority-levels.ts
│   ├── ticket-generator.ts
│   ├── modification-tracker.ts
│   └── utils.ts
│
├── docs/
│   ├── PRD.md
│   ├── DESIGN.md
│   └── ARCHITECTURE.md
│
├── prompts/
│   ├── prompt_v1.md
│   ├── prompt_v2.md
│   └── prompt_v3.md
│
├── eval/
│   ├── golden_set.json
│   ├── evaluation_results.csv
│   └── BADCASES.md
│
├── public/
├── .env.example
├── .gitignore
├── LICENSE
├── README.md
├── package.json
└── tsconfig.json
```

目录结构会根据现有官方示例的真实文件情况逐步调整，不要求一次性全部创建。

原则：

* 先保留可运行状态；
* 每次只改一个小模块；
* 修改后立即运行和测试；
* 不一次性重构全部文件。

---

## 6. 核心数据模型

### 6.1 反馈输入对象

反馈输入对象保存用户明确提供的信息。

建议字段：

```typescript
type FeedbackInput = {
  feedbackText: string;
  productName?: string;
  productType?: string;
  device?: string;
  operatingSystem?: string;
  appVersion?: string;
  occurredAt?: string;
  location?: string;
  startPoint?: string;
  endPoint?: string;
  travelMode?: string;
  networkStatus?: string;
  locationPermission?: string;
  reproducibility?: string;
  additionalContext?: string;
  screenshotName?: string;
};
```

输入对象中的空字段表示用户没有提供。

---

### 6.2 AI诊断对象

AI诊断对象保存模型原始输出。

建议包含：

```typescript
type DiagnosisResult = {
  summary: string;
  userScenario: string;
  productModule: string;
  issueType: string;
  actualResult: string;
  expectedResult: string;
  severitySuggestion: string;
  prioritySuggestion: string;
  confidenceLevel: string;
  userFacts: string[];
  aiInferences: string[];
  missingInformation: MissingInformationItem[];
  evidenceQuotes: string[];
  uncertainty: string;
  recommendedNextAction: string;
  promptVersion: string;
};
```

---

### 6.3 缺失信息对象

```typescript
type MissingInformationItem = {
  field: string;
  reason: string;
  status: "provided" | "missing" | "unknown" | "not_applicable";
  value?: string;
};
```

---

### 6.4 人工确认对象

人工确认对象在AI结果基础上增加：

```typescript
type ReviewedDiagnosis = {
  originalDiagnosis: DiagnosisResult;
  reviewedValues: DiagnosisResult;
  modifiedFields: string[];
  selectedTicketType: "bug" | "data_issue" | "product_requirement";
  reviewStatus: "not_reviewed" | "reviewing" | "confirmed";
  confirmedAt?: string;
};
```

---

### 6.5 问题单对象

问题单对象由人工确认结果确定性生成。

```typescript
type GeneratedTicket = {
  ticketType: string;
  title: string;
  markdownContent: string;
  structuredData: Record<string, unknown>;
  promptVersion: string;
  humanConfirmed: boolean;
  generatedAt: string;
};
```

---

## 7. AI结构化输出设计

模型不能只返回一段自然语言。

需要返回符合Schema的结构化JSON。

示例：

```json
{
  "summary": "驾车导航持续规划经过已封闭道路",
  "userScenario": "用户驾车前往机场并使用路线规划与导航",
  "productModule": "路线规划与导航",
  "issueType": "地图或业务数据问题",
  "actualResult": "导航规划并持续推荐已封闭道路",
  "expectedResult": "导航应避开不可通行道路",
  "severitySuggestion": "S2",
  "prioritySuggestion": "待人工判断",
  "confidenceLevel": "中",
  "userFacts": [
    "用户正在驾车前往机场",
    "导航推荐了一条用户描述为已封闭的道路",
    "重新规划后仍推荐该道路"
  ],
  "aiInferences": [
    "可能与道路通行数据未更新有关",
    "也可能与路线规划未正确使用道路限制条件有关"
  ],
  "missingInformation": [
    {
      "field": "发生时间",
      "reason": "用于判断是否为临时封路和实时信息延迟",
      "status": "missing"
    }
  ],
  "evidenceQuotes": [
    "导航一直让我走一条已经封闭的路",
    "重新规划后还是走这里"
  ],
  "uncertainty": "当前无法确认是道路数据问题还是路线规划Bug",
  "recommendedNextAction": "补充发生时间、具体道路、起点和终点后再次判断",
  "promptVersion": "v1"
}
```

---

## 8. Prompt管理

### 8.1 Prompt不能只存在于代码中

Prompt需要同时存在两个位置。

#### 运行版本

用于程序实际调用：

```text
lib/prompts/diagnosis-prompt.ts
```

#### 文档版本

用于项目展示和版本记录：

```text
prompts/prompt_v1.md
prompts/prompt_v2.md
prompts/prompt_v3.md
```

每次修改Prompt时，需要同步更新：

* 运行代码；
* Markdown版本；
* Prompt版本号；
* Badcase原因；
* 评测结果。

---

### 8.2 Prompt版本规则

版本命名：

```text
v1
v2
v3
```

每个版本需要记录：

* 修改日期；
* 修改原因；
* 对应Badcase；
* 新增规则；
* 删除规则；
* 预期改善指标；
* 实际测试结果；
* 是否出现新副作用。

不能为了展示版本数量而无依据地创建Prompt V2或V3。

---

### 8.3 Prompt职责

Prompt负责告诉模型：

* 角色；
* 输入内容；
* 分类体系；
* 字段定义；
* 判断规则；
* 禁止事项；
* 信息不足时如何处理；
* 事实和推测如何区分；
* 输出格式要求。

Prompt不负责：

* 页面样式；
* Markdown下载；
* 人工修改记录；
* 最终问题单模板拼接。

---

## 9. 数据流

完整数据流如下：

```text
用户填写反馈表单
        ↓
前端生成FeedbackInput对象
        ↓
前端执行基础校验
        ↓
POST /api/diagnose
        ↓
服务端校验FeedbackInput
        ↓
服务端读取Prompt V1和Diagnosis Schema
        ↓
服务端调用模型
        ↓
模型返回结构化JSON
        ↓
服务端执行Schema校验
        ↓
返回DiagnosisResult
        ↓
前端保存originalDiagnosis
        ↓
复制一份作为reviewedValues
        ↓
产品经理编辑reviewedValues
        ↓
系统对比并记录modifiedFields
        ↓
产品经理确认
        ↓
ticket-generator使用确定性模板生成问题单
        ↓
复制、下载或保存评测记录
```

---

## 10. API设计

MVP只需要一个核心接口：

```text
POST /api/diagnose
```

### 请求

```json
{
  "feedbackText": "用户反馈原文",
  "productName": "",
  "productType": "导航与出行",
  "environment": {
    "device": "",
    "operatingSystem": "",
    "appVersion": "",
    "occurredAt": "",
    "location": ""
  },
  "additionalContext": ""
}
```

### 成功响应

```json
{
  "success": true,
  "data": {
    "summary": "",
    "userScenario": "",
    "productModule": "",
    "issueType": "",
    "missingInformation": []
  }
}
```

### 失败响应

```json
{
  "success": false,
  "error": {
    "code": "MODEL_OUTPUT_INVALID",
    "message": "AI返回结果格式不完整"
  }
}
```

---

## 11. 错误处理

需要处理以下错误类型。

### 11.1 输入错误

例如：

* 反馈为空；
* 字段超过限制；
* 文件类型不支持。

由前端优先提示。

---

### 11.2 网络错误

例如：

* 用户网络断开；
* 模型请求超时；
* 部署服务不可用。

处理方式：

* 保留用户输入；
* 显示重新诊断按钮；
* 不清空页面；
* 不生成不完整结果。

---

### 11.3 模型错误

例如：

* 模型拒绝响应；
* 模型服务异常；
* API额度不足；
* 模型名称无效。

页面显示用户可理解的提示，技术错误记录在服务端日志。

---

### 11.4 Schema校验错误

模型返回内容不符合结构时：

* 不直接展示残缺结果；
* 返回格式错误状态；
* 允许重新诊断；
* 记录为格式Badcase；
* 纳入格式合规率评测。

---

### 11.5 图片错误

截图上传失败时：

* 文字反馈仍然保留；
* 允许只使用文字继续；
* 不阻断整个流程。

---

## 12. 安全与隐私

### 12.1 API Key

API Key存放在：

```text
.env.local
```

`.env.local`必须被`.gitignore`忽略。

仓库只提交：

```text
.env.example
```

示例：

```text
OPENAI_API_KEY=
MODEL_NAME=
```

禁止：

* 把API Key写进代码；
* 把API Key发到聊天或截图中；
* 把`.env.local`提交到GitHub；
* 在浏览器端暴露API Key。

---

### 12.2 用户反馈隐私

在线Demo应提示：

* 不要输入真实姓名；
* 不要输入电话号码；
* 不要输入精确住址；
* 不要输入企业内部敏感信息；
* 上传前需要对截图进行脱敏。

MVP不承诺企业级数据合规能力。

---

### 12.3 日志

服务端日志不能默认打印完整用户反馈和API Key。

可以记录：

* 请求是否成功；
* 模型名称；
* Prompt版本；
* 错误类型；
* 请求耗时。

不应公开记录：

* 完整密钥；
* 用户敏感信息；
* 未脱敏截图内容。

---

## 13. 截图能力

首版将截图能力设计为可选模块。

阶段一：

* 页面保留上传入口；
* 可以显示截图预览；
* 不一定立即发送给模型。

阶段二：

* 接入支持图片理解的模型；
* 将截图与反馈文字共同发送；
* 让模型提取页面文字和基础界面信息。

模型不能仅凭截图：

* 判断真实地图数据是否正确；
* 判断道路是否真实封闭；
* 确认技术根因；
* 自动识别完整地理位置；
* 代替人工验证。

---

## 14. 问题单生成策略

问题单生成采用代码模板，而不是第二次模型调用。

### Bug单

由以下字段拼接：

* 标题；
* 使用场景；
* 环境信息；
* 复现步骤；
* 实际结果；
* 预期结果；
* 严重程度；
* 优先级；
* 缺失信息；
* 附件说明。

### 数据问题单

由以下字段拼接：

* 标题；
* 数据对象；
* 问题位置；
* 当前错误信息；
* 建议正确信息；
* 发生时间；
* 佐证信息；
* 影响范围；
* 缺失信息。

### 产品需求单

由以下字段拼接：

* 标题；
* 用户场景；
* 用户问题；
* 当前解决方式；
* 用户期望；
* 需求价值假设；
* 替代方案；
* 待验证问题；
* 优先级建议。

未提供的信息统一输出：

```text
待补充
```

推测信息统一输出：

```text
待验证
```

---

## 15. 人工修改记录

系统需要比较：

```text
originalDiagnosis
```

与：

```text
reviewedValues
```

当字段值发生变化时，将字段名写入：

```text
modifiedFields
```

示例：

```json
{
  "modifiedFields": [
    "issueType",
    "prioritySuggestion",
    "expectedResult"
  ]
}
```

人工修改率可以基于该记录计算。

MVP不需要复杂的文本差异算法，先采用字段级比较。

---

## 16. 评测架构

### 16.1 Golden Set

存放于：

```text
eval/golden_set.json
```

每条案例建议包含：

```json
{
  "id": "case_001",
  "sourceType": "公开反馈",
  "feedbackText": "",
  "expectedProductModule": "",
  "expectedIssueType": "",
  "expectedMissingInformation": [],
  "notes": ""
}
```

---

### 16.2 Evaluation Results

存放于：

```text
eval/evaluation_results.csv
```

建议字段：

```text
case_id
prompt_version
predicted_module
expected_module
module_correct
predicted_issue_type
expected_issue_type
issue_type_correct
format_valid
hallucination_found
modified_field_count
processing_time_seconds
tester
test_date
```

---

### 16.3 Badcase

存放于：

```text
eval/BADCASES.md
```

每个Badcase需要记录：

* 案例ID；
* 原始反馈；
* AI输出；
* 标准答案；
* 错误类型；
* 可能原因；
* Prompt修改建议；
* 是否已修复；
* 修复后是否出现副作用。

---

## 17. 部署架构

MVP优先部署为：

```text
GitHub
  ↓
Vercel
  ↓
Next.js在线Demo
```

部署环境变量由部署平台保存。

在线Demo不保存长期用户数据。

如果模型接口或网络环境限制Vercel部署，再选择其他支持Next.js服务端函数的平台。

---

## 18. 开源代码使用策略

项目技术骨架来源于：

```text
OpenAI Structured Outputs Sample
```

处理方式：

* 保留原始MIT许可证；
* README中说明基础来源；
* 不声称所有代码从零编写；
* 逐步删除与简历提取无关的业务代码；
* 独立完成地图反馈业务Schema；
* 独立完成Prompt；
* 独立完成人工审核；
* 独立完成问题单模板；
* 独立完成Golden Set与评测；
* 保留真实Git提交记录。

项目价值主要来自：

* 地图业务定义；
* AI产品流程；
* Human-in-the-loop；
* Prompt迭代；
* 评测体系；
* 用户测试；
* 产品决策。

---

## 19. 官方示例改造策略

改造遵循：

```text
先运行
→ 再理解
→ 小步修改
→ 每步验证
→ 每步提交
```

预计保留：

* Next.js基础配置；
* TypeScript配置；
* Tailwind配置；
* UI基础组件；
* 服务端模型调用方式；
* 结构化输出思路；
* 加载和错误处理的一部分。

预计删除或替换：

* 简历上传文案；
* 简历字段Schema；
* 简历提取Prompt；
* 简历结果组件；
* 简历示例数据；
* 与PDF简历解析强相关的逻辑；
* 与地图反馈无关的图片和说明。

不能一次删除全部旧代码。

每删除或替换一个模块后，需要执行：

```text
npm run dev
```

确认项目仍然可以运行。

---

## 20. 开发顺序

建议按照以下顺序开发：

### 阶段一：静态页面改造

* 修改产品名称；
* 修改页面标题；
* 将简历上传改为反馈文本框；
* 保留假数据展示诊断卡片；
* 暂不调用模型。

### 阶段二：定义数据结构

* 创建FeedbackInput；
* 创建DiagnosisResult；
* 创建缺失信息类型；
* 创建人工审核类型；
* 创建问题单类型。

### 阶段三：Prompt V1

* 编写系统角色；
* 定义分类体系；
* 加入禁止虚构规则；
* 加入事实与推测区分；
* 加入信息不足规则。

### 阶段四：接入模型

* 创建诊断API；
* 调用模型；
* 校验结构化输出；
* 展示真实诊断结果。

### 阶段五：人工审核

* 复制AI结果；
* 支持字段修改；
* 记录修改字段；
* 添加人工确认。

### 阶段六：问题单生成

* 创建三种模板；
* 生成Markdown；
* 支持复制和下载。

### 阶段七：评测

* 建立Golden Set；
* 运行Prompt V1；
* 记录Badcase；
* 迭代Prompt V2。

### 阶段八：部署与用户测试

* 部署在线Demo；
* 进行真实任务测试；
* 记录处理耗时和人工修改；
* 更新README。

---

## 21. 架构明确不做

MVP架构不包括：

* 微服务；
* Docker集群；
* Kubernetes；
* 消息队列；
* Redis；
* 向量数据库；
* RAG；
* 多Agent框架；
* LangChain复杂工作流；
* 独立Python后端；
* 用户认证；
* 权限系统；
* 企业工单系统集成；
* 实时协作；
* 大规模数据分析；
* 自动抓取用户反馈；
* 在线评测后台。

---

## 22. 架构验收标准

架构实现后应满足：

1. 页面可以独立启动；
2. 模型调用只发生在服务端；
3. API Key不会进入Git仓库；
4. AI输出受到Schema约束；
5. AI原始结果和人工结果分开保存；
6. 所有关键字段可以人工修改；
7. 问题单由确定性代码生成；
8. Prompt有明确版本；
9. 输出格式错误可以被捕获；
10. 用户输入在接口失败后不会丢失；
11. 项目不依赖数据库即可完成核心流程；
12. 项目可以部署为在线Demo；
13. 开源骨架来源有明确说明；
14. 每一步修改都有对应Git提交。

---

## 23. 当前技术决策记录

### 决策一：使用官方示例作为骨架

原因：

* 减少重复搭建工程；
* 复用结构化输出思路；
* 将精力集中在地图业务和AI产品设计上。

### 决策二：使用Next.js单体应用

原因：

* 项目体量小；
* 前后端可以放在同一个仓库；
* 部署简单；
* 适合个人Demo。

### 决策三：首版不使用数据库

原因：

* 不做登录和历史记录；
* 当前重点是验证诊断流程；
* LocalStorage和评测文件足够支持MVP。

### 决策四：最终问题单不用模型生成

原因：

* 模板格式应稳定；
* 人工确认结果不能被模型再次修改；
* 降低幻觉和成本；
* 方便评测格式合规率。

### 决策五：首版不使用RAG和多Agent

原因：

* 暂无真实企业知识库；
* 当前问题可以通过Prompt和Schema验证；
* 复杂框架不会直接提升核心价值；
* 不利于一周内完成和面试讲解。

---

## 24. 当前待验证事项

* 官方示例当前使用的具体模型调用方式；
* 官方示例是否包含PDF解析逻辑；
* 当前页面组件之间的数据关系；
* 现有Schema文件的位置；
* 现有服务端API的位置；
* 是否保留流式结构化输出；
* 当前依赖是否需要升级；
* 图片上传在MVP中是否立即接入；
* LocalStorage需要保存哪些字段；
* 在线部署环境是否能稳定调用所选模型。
