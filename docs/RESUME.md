# GeoFeedback Agent 简历描述

## 三行精简版

- 设计并实现 GeoFeedback Agent：面向地图、导航、航旅、智能交通和 GIS 场景的用户反馈批量诊断与问题清单工作台。
- 构建 AI 结构化诊断、Schema 校验、确定性 Guardrail、Human-in-the-loop 人工审核和标准问题单生成流程，确保正式问题单使用人工确认结果。
- 基于 15 条人工设计 Golden Set 完成 Prompt V1 真实评测：模块分类 13/15，问题类型 15/15，格式合规 15/15，并记录 V2 回归结果后保留稳定版本。

## 五条详细版

- 从地图产品经理工作场景出发，设计原始反馈到结构化反馈清单的完整流程，覆盖单条反馈、最多 20 条批量反馈、筛选、批量确认、CSV 下载和问题单导出。
- 设计地图业务分类体系，将反馈拆解为产品模块、问题类型、处理优先级、用户事实、AI 推测、待补充信息和不确定性，适配搜索与 POI、导航、定位、离线地图、航旅信息和 B 端 GIS 平台等场景。
- 使用 TypeScript、Zod 和 OpenAI 兼容 SDK 接入 DeepSeek API，同时保留 Mock 模式；通过 Schema 校验和确定性 Guardrail 约束模型输出，避免明显功能异常被过度归为“信息不足”。
- 实现 Human-in-the-loop 审核机制：AI 结果自动预填，产品经理可卡片式编辑或一键确认，系统记录人工修改字段，并只基于人工确认后的 reviewedDiagnosis 生成 Bug 单、数据问题单和产品需求单。
- 搭建 Golden Set 与 Badcase 评测结构，基于 15 条人工设计测试集记录 Prompt V1 历史基线：模块分类准确率 86.67%，问题类型准确率 100%，格式合规率 100%，平均接口处理耗时 8.52 秒；V2 回归后未强行宣称提升，正式 Demo 保留稳定 V1。

## 可放在项目经历中的补充说明

该项目技术骨架参考 OpenAI Structured Outputs Sample，并保留 MIT 许可证。地图业务分类、Prompt 设计、Human-in-the-loop、批量工作台、问题单生成、Golden Set 和评测体系为本项目独立设计。
