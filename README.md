# 🏠 Malaysia Ez Rent

> 🇲🇾 马来西亚智能租房平台 — AI Agent + 全栈 Web 应用

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000?logo=vercel)](https://vercel.com)
[![Render](https://img.shields.io/badge/Render-Deploy-46E3B7?logo=render)](https://render.com)

---

## ✨ 项目简介

**Malaysia Ez Rent** 是专为马来西亚打造的智能租房平台，面向所有国际租客（留学生、外派员工、外籍人士等）提供一站式租房服务。集成 AI 助手（支持通勤测算、汇率换算、节假日查询）、全流程租约管理、手机扫码缴租、多中介独立挂牌、合租意向系统等功能。

### 🎯 核心亮点

| 功能 | 描述 |
|------|------|
| 🤖 **AI 智能助手** | ReAct Agent + SSE 流式对话，支持 Google Maps 通勤测算、Frankfurter 汇率、Nager.Date 节假日、Tavily 实时搜索 |
| 🏘️ **智能房源浏览** | 卡片/列表双模式、图片 Lightbox、看房视频、GPS 地图定位 |
| 🚇 **动态通勤路线** | Google Maps Embed 自动绘制起点→终点路线，支持驾车/公交/步行切换 |
| 💳 **全流程缴租** | 月度台账、手机扫码上传凭证、首月→中介 / 后续→房东 分离收款 |
| 🏠 **合租系统** | Whole Unit 合租意向提交/取消、室友名单、联保退租警示、租约原子替换 |
| 🔧 **报修中心** | 中介↔租客多轮对话工单、分类管理、图片上传 |
| 📊 **数据看板** | 中介端 Dashboard：出租率、收租率、月收入趋势、房源分布、意向转化、报修概览 |
| 👨‍💼 **多中介管理** | 独立挂牌、复制挂牌、Agent 级收款码与数据隔离 |
| 📱 **手机匿名上传** | 扫码即传支付凭证，无需登录，图片自动压缩 |
| 🌐 **中英双语** | 完整 i18n 支持，深色/浅色主题切换 |
| 🔐 **安全认证** | Google OAuth + Magic Link、Supabase RLS、Server Action 账户注销 |

---

## 🏗️ 技术栈

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                         │
│  Next.js 16 (App Router) · React 19 · TypeScript   │
│  Tailwind CSS · Lucide Icons · Recharts · Maps API  │
├─────────────────────────────────────────────────────┤
│                    BACKEND                          │
│  Python FastAPI · OpenAI-Compatible API (SSE)       │
│  Google Maps Geocoding + Distance Matrix            │
│  Tavily Search · Frankfurter Exchange · Nager.Date  │
├─────────────────────────────────────────────────────┤
│                   DATABASE                         │
│  Supabase (PostgreSQL + pgvector + Auth + Storage)  │
│  33 migrations · RLS policies · RPC functions       │
├─────────────────────────────────────────────────────┤
│                  DEPLOYMENT                        │
│  Vercel (Frontend) · Render (Backend)               │
│  Environment variables on both platforms            │
└─────────────────────────────────────────────────────┘
```

---

## 📁 项目结构

```
Malaysia_Ez_rent/
├── frontend/                    # 🖥️ Next.js 16 前端
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx              # 主入口 SPA，侧边栏导航
│   │   │   ├── login/page.tsx        # Google OAuth + Magic Link 登录
│   │   │   ├── register-agent/       # 中介注册页（REN 验证）
│   │   │   ├── mobile-upload/[id]/   # 手机匿名上传凭证
│   │   │   └── auth/callback/        # OAuth 回调处理
│   │   ├── components/
│   │   │   ├── PropertyListings.tsx  # 🏘️ 房源列表 + 详情 + 合租
│   │   │   ├── AIChat.tsx            # 🤖 AI 对话界面 (SSE)
│   │   │   ├── MapAndCard.tsx        # 🗺️ 通勤路线地图
│   │   │   ├── TenantPortal.tsx      # 👤 租客门户（租约 + 报修 + 个人资料）
│   │   │   ├── LeaseLedgerCard.tsx   # 💳 缴租台账 + 支付弹窗
│   │   │   ├── Dashboard.tsx         # 📊 数据看板 (recharts)
│   │   │   ├── AdminPanel.tsx        # ⚙️ 管理后台
│   │   │   └── Inbox.tsx             # 📬 消息收件箱
│   │   ├── lib/
│   │   │   ├── supabase.ts           # 双模式客户端 (Live / Mock)
│   │   │   ├── ThemeProvider.tsx      # 主题 + 语言 Context
│   │   │   └── i18n.ts               # 中英双语翻译
│   │   └── utils/
│   │       ├── compressImage.ts      # 📸 图片压缩 (Canvas JPEG)
│   │       └── compressVideo.ts      # 🎬 视频压缩 (MediaRecorder WebM)
│   └── public/logo.png               # 品牌 Logo
│
├── backend/                     # ⚙️ Python FastAPI 后端
│   └── app/
│       ├── main.py              # FastAPI 入口 + CORS + SSE 端点
│       ├── agent.py             # 🧠 ReAct Agent (Tool Calling Loop)
│       ├── tools.py             # 🔧 工具集 (Google Maps / Tavily / Frankfurter)
│       ├── config.py            # 环境变量管理
│       └── mock_data.py         # 离线 Mock 数据
│
├── supabase/                    # 🗄️ 数据库
│   ├── schema.sql               # 完整 Schema
│   └── migrations/              # 33 个增量迁移脚本
│
├── 售卖策略/                     # 💼 商业文档
│   ├── README.md                # 目录索引
│   ├── 盈利模式.md               # 变现方式
│   ├── SaaS模式.md              # 软件即服务方案
│   ├── 系统功能.md               # 功能清单
│   ├── 技术架构.md               # 技术栈说明
│   ├── 部署指南.md               # 部署步骤
│   ├── 交接清单.md               # 代码交付事项
│   ├── 定价策略.md               # 收费方案
│   ├── 市场分析.md               # 市场分析
│   └── 竞品对比.md               # 竞品分析
│
└── docs/                        # 📚 文档
    ├── ai-architecture.md       # AI Agent 架构详解
    ├── FAQ.md                   # 常见问题
    └── deployment-guide.md      # 部署指南
```

---

## 🚀 快速启动

### 环境要求

- **Node.js** ≥ 18
- **Python** ≥ 3.10
- **Supabase** 项目（免费层即可）

### 1️⃣ 克隆项目

```bash
git clone https://github.com/Poetrynan/Malaysia_Ez_rent.git
cd Malaysia_Ez_rent
```

### 2️⃣ 启动前端

```bash
cd frontend
cp .env.example .env.local    # 填入你的环境变量
npm install
npx next dev --webpack -p 3000
```

### 3️⃣ 启动后端

```bash
cd backend
cp .env.example .env           # 填入你的环境变量
pip install -r requirements.txt
python run.py
```

### 4️⃣ 数据库初始化

在 [Supabase Dashboard](https://supabase.com/dashboard) → SQL Editor 中依次执行：

```sql
-- 1. 基础 Schema
\i supabase/schema.sql

-- 2. 迁移脚本 (按编号顺序)
\i supabase/migrations/001_add_admin_contact.sql
\i supabase/migrations/002_limit_admins_and_ui.sql
-- ... 依次执行到 033
```

> 💡 详细部署步骤请参考 [售卖策略/部署指南.md](售卖策略/部署指南.md)

---

## 🤖 AI Agent 架构

```
用户提问 → 前端 AIChat.tsx
    ↓ (POST /api/chat + history)
后端 FastAPI → agent.py (ReAct Loop)
    ↓
LLM 意图解析 (Gemini / DeepSeek / GPT-4o)
    ↓
Tool Calling:
    ├── calculate_commute     → Google Maps Geocoding + Distance Matrix
    ├── get_web_realtime_info → Tavily Search (排除竞品租房站)
    ├── convert_currency      → Frankfurter API
    └── get_malaysia_holidays → Nager.Date API
    ↓
SSE 流式返回:
    ├── thinking    → AI 推理过程
    ├── tool_call   → 工具调用参数
    ├── tool_result → 工具返回结果
    ├── text        → 自然语言回复 (逐字流式)
    └── ui_component → MapAndCard 地图组件
    ↓
前端实时渲染 (Markdown + 地图 + 交互动画)
```

### 🧠 LLM 智能设计原则

- **工具不做智能**：`calculate_commute` 只调 Google API，不做地址匹配
- **LLM 做意图解析**：缩写/别名由 LLM 在调用前解析（如 `UM` → `Universiti Malaya`）
- **模糊地址追问**：用户说"公司"或"那边"时，LLM 主动追问具体地址
- **禁止猜坐标**：工具返回 error 时，LLM 引导用户补充信息

---

## 🔧 工具列表 (Live Agent)

| 工具 | API | 用途 |
|------|-----|------|
| 🚇 `calculate_commute` | Google Maps Geocoding + Distance Matrix | 任意两地址间通勤测算 |
| 🌐 `get_web_realtime_info` | Tavily Search | 生活常识搜索（排除竞品租房站） |
| 💱 `convert_currency_frankfurter` | Frankfurter API | MYR/CNY/USD 实时汇率换算 |
| 📅 `get_malaysia_holidays` | Nager.Date API | 马来西亚公众假期查询 |

> ℹ️ **外部搜索策略**：Tavily 可搜索任意平台（iProperty、PropertyGuru 等）提取房源信息，但不得向用户暴露来源链接/平台名称。知识库 + 联网搜索双引擎回答。

---

## 🗄️ 数据库

### 核心表（18 张）

| 表名 | 说明 |
|------|------|
| `users` | 租客用户（护照/IC、学校、公司、证件照） |
| `admin_users` | 管理员/中介（角色、收款码、REN牌照） |
| `communities` | 小区/公寓（GPS 坐标、配套设施） |
| `units` | 房源（房型、租金、状态、pgvector 向量） |
| `leases` | 租约（押金配置、合租组） |
| `payment_records` | 月账单（支付凭证、审核状态） |
| `lease_groups` | 合租组 |
| `lease_transfers` | 租约转移记录 |
| `tenant_interests` | 合租意向（interested/confirmed/left） |
| `maintenance_requests` | 报修工单（分类、对话线程） |
| `agent_registrations` | 中介注册申请（REN 验证） |
| `agent_conversations` | AI 对话历史 |
| `universities` | 马来西亚大学 GPS |
| `user_notifications` | 系统通知/收件箱 |

### Storage 结构

```
unit-media/
├── {unit_id}/           # 房源图片 + 看房视频
├── evidence/            # 支付凭证截图
├── qr/                  # 中介收款码
├── ren-tags/            # 中介 REN 牌照
└── documents/           # 租客证件照
```

---

## 🌐 部署

### 前端 → Vercel

1. 连接 GitHub 仓库
2. 设置环境变量（见下方表格）
3. `git push` 自动构建部署

### 后端 → Render

1. 连接 GitHub 仓库
2. 设置环境变量
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `python run.py`

### 环境变量

**前端** (`frontend/.env.local`)：

| 变量 | 说明 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 Key |
| `NEXT_PUBLIC_AGENT_API_URL` | 后端 API 地址 (`https://xxx.onrender.com`) |
| `NEXT_PUBLIC_AGENT_MODEL` | AI 模型名称（仅 UI 展示） |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps 前端 Key |

**后端** (Render Environment)：

| 变量 | 说明 |
|------|------|
| `SUPABASE_URL` / `SUPABASE_ANON_KEY` | Supabase 连接 |
| `SUPABASE_SERVICE_ROLE_KEY` | 管理员特权 Key（绕过 RLS） |
| `GEMINI_API_KEY` / `OPENAI_API_KEY` | LLM API Key |
| `GOOGLE_MAPS_API_KEY` | Google Maps 后端 Key |
| `TAVILY_API_KEY` | Tavily 搜索 Key |
| `FRONTEND_URL` | CORS 允许的前端域名 |

---

## 📊 迁移脚本

共 **33** 个增量迁移，覆盖：

| 迁移 | 功能 |
|------|------|
| 001-002 | 管理员联系方式 + 上限触发器 |
| 003-006 | 合租功能 + 房源媒体 + 意见箱 + 卧室浴室 |
| 007-009 | 手机上传凭证 + Whole Unit 房型 + 看房视频 |
| 010-013 | Agent 收款码隔离 + 门牌号可选 + 房东收款 |
| 014-015 | 合租意向 RPC（submit/cancel） |
| 016-019 | 报修工单 + 中介主页 + 租约终止 + 联保替换 |
| 020-023 | 移动端房源上传 + 用户门牌号 + 中介注册 + 个人信息扩展 |
| 024-026 | 工单对话线程 + 用户行补建 + 门牌号字段删除 |
| 027-030 | 租约 RLS + 通知系统 + 管理员上限 + 中介清理 |
| 031-032 | 用户邮箱 + 中介预审批 + 学生证件照 + 租约门牌号 |
| 033 | Ensuite 房型 + 租约支付自动触发器 |

---

## 🛡️ 安全设计

- **RLS 策略**：所有表均有 Row Level Security，租客只能操作自己的数据
- **Agent 隔离**：普通管理员只能看到自己录入的房源和租约
- **Service Role**：仅后端使用，前端不暴露高权限 Key
- **匿名上传**：手机缴租凭证通过 RPC + Storage Policy 安全写入
- **账户注销**：Server Action 按角色清理数据，中介保留财务记录

---

## 📝 开发备忘

```bash
# 前端开发（必须 --webpack，SWC 在 Windows 不可用）
cd frontend && npx next dev --webpack -p 3000

# 后端开发
cd backend && python run.py

# TypeScript 类型检查
cd frontend && npx tsc --noEmit

# 清缓存重启
rm -rf frontend/.next && cd frontend && npx next dev --webpack -p 3000
```

> ⚠️ Windows 注意：`python` 指向 Windows Store 占位符（exit code 49），需用 Anaconda 路径

---

## 📄 文档

- [售卖策略](售卖策略/README.md) — 商业文档、盈利模式、定价策略
- [AI 架构详解](docs/ai-architecture.md) — Agent 设计、工具链、开发规范
- [常见问题](docs/FAQ.md) — Supabase、手机上传、部署问题
- [部署指南](售卖策略/部署指南.md) — 完整部署步骤

---

## 📈 最近更新 (2026-06-02)

### 🏠 租客门户重构
- **TenantPortal 组件独立渲染**：个人资料和维修反馈中心不再依赖租约状态
- **历史租约收租核查表**：与中介端完全一致的付款网格，支持展开查看
- **删除历史租约功能**：租客可删除不需要的历史记录
- **AI 错误信息优化**：503 等错误显示友好提示而非技术细节

### 💼 商业文档
- **新增售卖策略文件夹**：包含盈利模式、SaaS方案、定价策略、市场分析等完整商业文档
- **数据库触发器迁移**：033 号迁移文件支持 Ensuite 房型和自动账单生成

---

## 📜 License

MIT © 2026 Malaysia Ez Rent

---

<p align="center">
  <b>🏠 Malaysia Ez Rent</b> — 让租房更简单 🇲🇾
</p>
