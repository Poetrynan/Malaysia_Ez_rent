# 🏠 Malaysia Ez Rent

> 🇲🇾 马来西亚留学生智能租房平台 — AI Agent + 全栈 SaaS

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3FCF8E?logo=supabase)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-Deploy-000?logo=vercel)](https://vercel.com)
[![Render](https://img.shields.io/badge/Render-Deploy-46E3B7?logo=render)](https://render.com)

---

## ✨ 项目简介

**Malaysia Ez Rent** 是专为马来西亚国际留学生打造的一站式智能租房平台。集成 AI 助手（支持通勤测算、汇率换算、节假日查询、留学生活指南）、全流程租约管理、手机扫码缴租、多中介独立挂牌、合租意向系统等功能。

### 🎯 核心亮点

| 功能 | 描述 |
|------|------|
| 🤖 **AI 智能助手** | ReAct Agent + SSE 流式对话，支持 Google Maps 通勤测算、Frankfurter 汇率、Nager.Date 节假日、Tavily 实时搜索 |
| 🏘️ **智能房源浏览** | 卡片/列表双模式、图片 Lightbox、看房视频、GPS 地图定位 |
| 🚇 **动态通勤路线** | Google Maps Embed 自动绘制起点→终点路线，支持驾车/公交/步行切换 |
| 💳 **全流程缴租** | 12 个月台账、手机扫码上传凭证、首月→中介 / 后续→房东 分离收款 |
| 🏠 **合租系统** | Whole Unit 合租意向提交/取消、室友名单、联保退租警示、租约原子替换 |
| 🔧 **报修中心** | Agent↔Student 多轮对话工单、分类管理、图片上传 |
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
│  Tailwind CSS · Lucide Icons · Google Maps JS API  │
├─────────────────────────────────────────────────────┤
│                    BACKEND                          │
│  Python FastAPI · OpenAI-Compatible API (SSE)       │
│  Google Maps Geocoding + Distance Matrix            │
│  Tavily Search · Frankfurter Exchange · Nager.Date  │
├─────────────────────────────────────────────────────┤
│                   DATABASE                         │
│  Supabase (PostgreSQL + pgvector + Auth + Storage)  │
│  26+ migrations · RLS policies · RPC functions      │
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
│   │   │   ├── StudentPortal.tsx     # 👤 学生门户（租约 + 报修 + 个人资料）
│   │   │   ├── LeaseLedgerCard.tsx   # 💳 缴租台账 + 支付弹窗
│   │   │   └── AdminPanel.tsx        # ⚙️ 管理后台
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
│   └── migrations/              # 26+ 增量迁移脚本
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
-- ... 依次执行到 026
```

> 💡 详细部署步骤请参考 [docs/deployment-guide.md](docs/deployment-guide.md)

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
| 🌐 `get_web_realtime_info` | Tavily Search | 留学生活常识（排除 iProperty 等竞品） |
| 💱 `convert_currency_frankfurter` | Frankfurter API | MYR/CNY/USD 实时汇率换算 |
| 📅 `get_malaysia_holidays` | Nager.Date API | 马来西亚公众假期查询 |

> ⚠️ **硬性禁止**：不得搜索/推荐 iProperty、PropertyGuru、SpeedHome 等外部租房平台

---

## 🗄️ 数据库

### 核心表

| 表名 | 说明 |
|------|------|
| `users` | 学生用户（护照/IC、学校、公司、证件照） |
| `admin_users` | 管理员（角色、收款码、中介信息） |
| `communities` | 小区/公寓（GPS 坐标、配套设施） |
| `units` | 房源（房型、租金、状态、pgvector 向量） |
| `leases` | 租约（押金配置、合租组） |
| `payment_records` | 月账单（支付凭证、审核状态） |
| `tenant_interests` | 合租意向（interested/confirmed/left） |
| `maintenance_requests` | 报修工单（分类、对话线程） |
| `agent_registrations` | 中介注册申请（REN 验证） |

### Storage 结构

```
unit-media/
├── {unit_id}/           # 房源图片 + 看房视频
├── evidence/            # 支付凭证截图
├── qr/                  # 中介收款码
├── ren-tags/            # 中介 REN 牌照
└── documents/           # 学生证件照
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

共 **26+** 个增量迁移，覆盖：

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

---

## 🛡️ 安全设计

- **RLS 策略**：所有表均有 Row Level Security，学生只能操作自己的数据
- **Agent 隔离**：普通管理员只能看到自己录入的房源和租约
- **Service Role**：仅后端使用，前端不暴露高权限 Key
- **匿名上传**：手机缴租凭证通过 RPC + Storage Policy 安全写入
- **账户注销**：Server Action 彻底清理 5 张表数据，保留财务记录

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

- [AI 架构详解](docs/ai-architecture.md) — Agent 设计、工具链、开发规范
- [SaaS 发展路线图](docs/saas-roadmap.md) — 多租户改造、计费系统、白标方案
- [商业策略](docs/business-strategy.md) — 卖点分析、变现模式、销售策略
- [常见问题](docs/FAQ.md) — Supabase、手机上传、部署问题
- [前后端解释](docs/前后端解释.md) — SDK、RLS、HTTP 请求流程
- [部署指南](docs/deployment-guide.md) — Vercel + Render 部署步骤

---

## 📈 最近更新 (2026-05-30)

### 🧠 AI Agent 智能化改造

- **移除所有硬编码数据**：大学别名表、COMMUNITIES 匹配、Monash 默认回退全部删除
- **工具纯 API 化**：`calculate_commute` 现在只调 Google Geocoding + Distance Matrix，不做任何字符串匹配
- **LLM 意图解析**：系统提示要求 LLM 在调用工具前解析缩写（`UM` → `Universiti Malaya`），模糊地址主动追问
- **Google Geocoding**：新增 `_google_geocode()` 函数，任意文本地址 → 经纬度 + 格式化地址
- **错误引导**：工具返回 error 时，LLM 根据系统提示引导用户补充具体地址
- **CORS 修复**：支持多域名配置（`FRONTEND_URL` + `EXTRA_ORIGINS`）
- **认证容错**：未登录用户可正常使用 AI 助手（anonymous-user 回退）
- **前端错误信息**：区分网络错误、401 认证、其他错误，显示实际 API 地址

### 🗺️ MapAndCard 地图优化

- **通勤场景**：AI 回复通勤结果时，直接显示路线地图（不再需要点击"查看路线"）
- **房源列表**：保留"点击查看"按钮，节省 Google Maps API 配额
- **交通模式切换**：驾车/公交/步行切换时自动更新地图路线

---

## 📜 License

MIT © 2026 Malaysia Ez Rent

---

<p align="center">
  <b>🏠 Malaysia Ez Rent</b> — 让留学租房更简单 🇲🇾
</p>
