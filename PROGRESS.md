# 🏠 Malaysia Ez Rent — 开发进度总结

> 最后更新：2026-05-23 (UTC+8)
> 状态：**前端可跑 · 后端已连接真实 DeepSeek API · Google OAuth + Magic Link 双登录完成 · 超级管理员面板完成 · 管理员联系方式从数据库读取 · 迁移脚本规范管理 · 支付凭证审核功能完成**

---

## 一、项目架构总览

```
Malaysia_Ez_rent/
├── frontend/          # Next.js 16.2 (App Router) — 学生端 + 管理端 SPA
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # 主入口，tab 路由切换，角色判断（admin_users 表），登出
│   │   │   ├── layout.tsx        # SEO metadata，Google Fonts <link>，Google Maps Script
│   │   │   ├── globals.css       # 全局 CSS 变量、动画、组件样式（含 Toast 动画）
│   │   │   ├── login/
│   │   │   │   └── page.tsx      # Google OAuth + Magic Link 双登录界面（Mock/Live自适应）
│   │   │   └── auth/
│   │   │       └── callback/
│   │   │           └── route.ts  # Supabase OAuth 回调处理器
│   │   ├── components/
│   │   │   ├── PropertyListings.tsx # 房源卡片列表（iProperty 风格）+ 详情抽屉
│   │   │   ├── AIChat.tsx        # AI 对话界面（SSE 流式 + 离线模拟器）
│   │   │   ├── MapAndCard.tsx    # 房源卡片 + SVG 通勤路线地图
│   │   │   ├── LeaseLedgerCard.tsx  # 租约台账 + DuitNow QR 支付弹窗
│   │   │   ├── StudentPortal.tsx # 学生门户（圆形倒计时环 + 台账）
│   │   │   └── AdminPanel.tsx    # 管理后台（房源管理 + 租约 + 收租核查，表单红框校验与Toast）
│   │   └── lib/
│   │       ├── supabase.ts       # Supabase 客户端（含完整 LocalStorage Mock）
│   │       ├── ThemeProvider.tsx  # 主题/语言 Context Provider
│   │       └── i18n.ts           # 中英双语翻译字典
│   ├── next.config.ts            # allowedDevOrigins 配置
│   ├── .env.local                # 环境变量（Supabase/DeepSeek/Google Maps/Tavily）
│   └── package.json
│
│── backend/           # Python FastAPI + OpenAI-compatible AI Agent
│   ├── app/
│   │   ├── main.py       # FastAPI 入口，CORS，SSE /api/chat 端点
│   │   ├── agent.py      # ReAct Agent（真实流式 API + Mock 模拟器）
│   │   ├── tools.py      # Agent 工具集（DB 语义检索、通勤计算、Tavily 搜索）
│   │   ├── config.py     # 环境变量读取
│   │   └── mock_data.py  # 离线 Mock 数据
│   ├── .env              # 后端环境变量（从 frontend/.env.local 同步）
│   ├── run.py            # uvicorn 启动入口
│   └── requirements.txt
│
└── supabase/          # 数据库 Schema（PostgreSQL + pgvector）
    ├── schema.sql        # 完整 Schema（含 auth 触发器、管理员上限触发器、RLS 策略）
    └── migrations/       # 增量迁移脚本（不删表，安全加字段）
        ├── 001_add_admin_contact.sql   # admin_users 加联系方式 + super_admin RLS
        └── 002_limit_admins_and_ui.sql # 管理员上限 5 人触发器
```

---

## 二、已完成功能 ✅

### 前端 (Next.js)

| 组件 | 状态 | 说明 |
|------|------|------|
| `page.tsx` | ✅ 完成 | 统一 SPA 容器，侧边栏导航，角色判断（查 admin_users 表），flex 布局修复 |
| `PropertyListings.tsx` | ✅ 完成 | iProperty 风格房源卡片列表，搜索/筛选/排序，详情抽屉（图片画廊、通勤地图、同小区推荐），联系管理员弹窗（从数据库读取联系方式，折叠展开）|
| `AIChat.tsx` | ✅ 完成 | AI 对话界面，ReAct 思维链展示，SSE 流式调用真实 Agent + 离线模拟器降级 |
| `MapAndCard.tsx` | ✅ 完成 | 房源卡片 + SVG 动画通勤路线，3 种交通模式切换 |
| `LeaseLedgerCard.tsx` | ✅ 完成 | 12 个月台账格 + DuitNow 模拟支付弹窗 |
| `StudentPortal.tsx` | ✅ 完成 | 圆形 SVG 租约倒计时环，押金明细，下一笔待缴 |
| `AdminPanel.tsx` | ✅ 完成 | 房源管理 + 单元管理 + 租约创建 + 收租核查表格 + **管理员管理面板**（super_admin 专属，添加/删除管理员，最多 5 人）+ **支付凭证审核**（查看截图、批准/驳回、备注，Live/Mock 双模式数据源，空状态提示）|
| `ThemeProvider.tsx` | ✅ 完成 | 主题/语言 Context，解决 Next.js 16 路由器初始化黑屏问题 |
| `i18n.ts` | ✅ 完成 | 中英双语翻译，修复重复 `perMonth` 属性 |
| `supabase.ts` | ✅ 完成 | 双模式客户端（真实 Supabase SDK / LocalStorage Mock）|
| `globals.css` | ✅ 完成 | 暗色玻璃风格 CSS，全套设计 Token，动画系统（包含 Toast 弹出与下滑动画） |
| `layout.tsx` | ✅ 完成 | Google Fonts 通过 `<link>` 加载（不再用 CSS `@import`）|
| `next.config.ts` | ✅ 完成 | `allowedDevOrigins` 配置，解决跨域 HMR 警告 |
| `login/page.tsx` | ✅ 完成 | Google OAuth + Magic Link 双登录按钮，Google 彩色图标，分隔线 UI，Mock/Live 自适应 |
| `auth/callback/route.ts` | ✅ 完成 | 处理 Supabase OAuth 返回的 Code 交换 Session 回调路由 |

### 后端 (FastAPI)

| 模块 | 状态 | 说明 |
|------|------|------|
| `main.py` | ✅ 完成 | FastAPI + CORS，SSE `/api/chat` 端点 |
| `agent.py` | ✅ 完成 | **真实流式 API 调用**（`stream=True`），支持 SiliconFlow/DeepSeek/OpenAI 兼容 API；Mock 模拟器延迟优化 |
| `tools.py` | ✅ 完成 | 4 个工具：语义数据库检索、通勤计算、Tavily 网络搜索、租约状态查询 |
| `config.py` | ✅ 完成 | 环境变量统一管理 |
| `run.py` | ✅ 完成 | uvicorn 热重载启动，监听 `127.0.0.1:8000` |

| npm 依赖安装 | ✅ `node_modules` 已就绪 |
| Next.js 开发服务器 | ✅ 运行在 `http://localhost:3000`（Webpack 模式）|
| AI 模型 | ✅ `deepseek-ai/DeepSeek-V3` via SiliconFlow API（流式输出）|

---

## 三、已修复的 Bug ✅

| # | 问题 | 修复方案 |
|---|------|----------|
| 1 | `supabase.table is not a function` | `supabase.ts` 中 `isRealSupabase = false` 硬编码，强制 Mock 模式 |
| 2 | Lucide `Walking` 图标不存在 | 改为 `Footprints` |
| 3 | AIChat `payments` 未定义变量 | 改为 `mockPayments` |
| 4 | `i18n.ts` 重复 `perMonth` 属性 | 删除 `zh` 和 `en` 中的重复项 |
| 5 | ThemeProvider 返回 `null` 导致黑屏 | 移除 `mounted` 状态检查，始终渲染 children |
| 6 | CSS `@import` 在 Webpack banner 后失效 | 字体改用 `<link>` 在 `layout.tsx` 中加载 |
| 7 | Agent 不走流式输出 | `live_agent_stream` 改为 `stream=True`，token 边生成边推送 |
| 8 | Agent 模型名称错误 `Pro/deepseek-ai/DeepSeek-V3.2` | 改为 `deepseek-ai/DeepSeek-V3` |
| 9 | Mock 模拟器延迟过大（8+ 秒） | 降低 `asyncio.sleep` 到 0.2~0.4 秒 |
| 10 | 文字打字机效果太慢 | 每次 3 字符、8ms 间隔（原 1 字符/10ms）|
| 11 | Chat 输入框被内容挤走 | `chat-layout` 使用 `flex: 1; min-height: 0`，消息区独立滚动 |
| 12 | 跨域 HMR 警告 | `next.config.ts` 添加 `allowedDevOrigins` |
| 13 | 角色切换按钮在真实模式下暴露 | 加 `{isMockDatabase && ...}` 条件渲染，仅沙盒模式显示 |
| 14 | "联系管理员预约"按钮无响应 | 添加 onClick 弹窗，从数据库读取管理员联系方式 |
| 15 | SQL 迁移脚本约束冲突 | 先更新现有数据再加 CHECK 约束，避免 `23514` 错误 |
| 16 | AdminPanel Live 模式读不到数据 | `loadAll` 改为自动检测模式：Live 从 Supabase 读，Mock 从 localStorage 读 |
| 17 | 待审核区无数据时整个区域隐藏 | 改为始终显示，无数据时提示"暂无待审核的支付凭证" |

---

## 四、下一步开发计划 📋

### 短期（本周）

- [x] **Google OAuth + Magic Link 双登录**：Supabase 配置完成，前端按钮 + 回调路由就绪
- [x] **角色区分**：admin_users 表 + RLS 策略，首页从数据库读取角色
- [x] **超级管理员面板**：super_admin 可在前端添加/删除管理员（最多 5 人）
- [x] **联系管理员弹窗**：从数据库读取联系方式，折叠展开 UI
- [x] **数据库迁移脚本**：`supabase/migrations/` 目录，ALTER TABLE 安全加字段
- [x] **支付凭证审核**：管理员可查看学生上传的转账截图，批准/驳回，填写备注；待审核数量角标提醒
- [ ] **AIChat 完整流程测试**：房源搜索 → 地图渲染、租约查询 → 台账渲染（真实 Agent）
- [ ] **PropertyListings 数据刷新**：Admin 添加房源后，学生端列表自动刷新（目前需手动刷新页面）

### 中期（接入真实服务）

- [x] **Supabase 配置**：URL/Key 已填入 `.env.local`，Google OAuth Provider 已开启
- [x] **运行 schema.sql**：建表 + 触发器 + RLS 策略已执行
- [ ] **pgvector 向量化**：用 `BAAI/bge-large-zh-v1.5` 对房源描述生成 1024 维向量
- [ ] **手机号 OTP 登录**：接入 Vonage 或 Twilio
- [ ] **Google Maps Places API**：替换 AdminPanel 中的 Mock Places 搜索

### 长期（生产部署）

- [ ] **Vercel 部署前端**：`git push` → Vercel 自动构建
- [ ] **Railway/Render 部署后端**：FastAPI 容器化
- [x] **Supabase RLS 策略**：已启用，admin_users / users / units / leases / payment_records 均已配置

---

## 五、环境变量配置

### 前端 (`frontend/.env.local`)

| 变量名 | 当前值 | 用途 |
|--------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://legiyebykxmztaewlmhv.supabase.co` | Supabase 项目 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 已配置 | Supabase 公开 Key |
| `NEXT_PUBLIC_AGENT_API_URL` | `http://localhost:8000` | FastAPI 服务地址 |
| `NEXT_PUBLIC_AGENT_MODEL` | `deepseek-ai/DeepSeek-V3` | AI 模型名称 |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 已配置 | Google Maps |

### 后端 (`backend/.env`)

| 变量名 | 当前值 | 用途 |
|--------|--------|------|
| `OPENAI_API_KEY` | 已配置（SiliconFlow） | AI 模型 API |
| `OPENAI_API_BASE` | `https://api.siliconflow.cn/v1` | API 端点 |
| `NEXT_PUBLIC_AGENT_MODEL` | `deepseek-ai/DeepSeek-V3` | 模型名称 |
| `TAVILY_API_KEY` | 已配置 | 联网搜索 |
| `GOOGLE_MAPS_API_KEY` | 已配置 | 通勤计算 |

---

## 六、快速启动命令

```bash
# 一键启动前端 + 后端（双击 start.bat 即可）
start.bat

# 或手动分别启动：
# 终端 1 — 后端 FastAPI
cd backend && C:\Users\Administrator\anaconda3\python.exe run.py

# 终端 2 — 前端 Next.js
cd frontend && npx next dev --webpack -p 3000

# 清除缓存后重启
rm -rf frontend/.next && cd frontend && npx next dev --webpack -p 3000
```

---

## 七、数据库 Schema 概览

`supabase/schema.sql` 包含以下表：

| 表名 | 说明 |
|------|------|
| `users` | 学生用户（手机号 + 头像），auth 触发器自动创建 |
| `admin_users` | 管理员账号（姓名、电话、WhatsApp、微信号，最多 5 人）|
| `communities` | 小区/公寓楼（含经纬度）|
| `units` | 房间单元（类型、租金、状态、pgvector 向量）|
| `leases` | 租约合同（租客 ID、单元 ID、起止日期、押金）|
| `payment_records` | 每月账单记录（paid 状态、支付日期、凭证 URL、审核状态）|
| `universities` | 马来西亚大学 GPS 坐标 |
| `agent_conversations` | AI 对话历史记录 |

触发器：
- `on_auth_user_created` — 新用户注册自动创建 users 记录
- `limit_admin_count` — 管理员上限 5 人
- `after_lease_insert` — 创建租约自动生成月账单

迁移脚本：`supabase/migrations/` 目录，按编号管理，不删表重建

---

## 八、数据库迁移规范

项目采用**增量迁移脚本**管理数据库结构变更，不删表重建：

```bash
supabase/migrations/
├── 001_add_admin_contact.sql   # admin_users 加联系方式字段 + super_admin RLS
└── 002_limit_admins_and_ui.sql # 管理员上限 5 人触发器
```

迁移原则：
- 用 `ALTER TABLE ... ADD COLUMN` 加字段，不删表
- 用 `IF NOT EXISTS` / `IF EXISTS` 防止重复执行报错
- 先更新现有数据，再加约束（避免 `23514` 约束冲突）
- 每次迁移后同步更新 `schema.sql`（保持 schema 文件 = 最终状态）
- 跨账号迁移用 `supabase db dump` 完整导出（含 auth.users）

---

## 九、Windows 平台注意事项

- **SWC 原生绑定失效**：Next.js 16 的 `@next/swc-win32-x64-msvc` 在当前环境不可用，必须使用 `--webpack` 模式启动
- **Python 路径**：系统 `python` 指向 Windows Store 存根（exit code 49），需使用 Anaconda 路径：`/c/Users/Administrator/anaconda3/python.exe`
- **Turbopack 不可用**：`next build` 会失败，需用 `next build --webpack`

---

## 十、开发常见问题

| 问题 | 原因 | 解决方法 |
|------|------|----------|
| 手机扫码打不开网页 | `localhost` 只指向本机，手机访问的是自己的 localhost | 用 `ipconfig` 查电脑局域网 IP，改用 `http://192.168.x.x:3000` 访问，手机和电脑连同一 WiFi |
| 部署后手机扫码有问题吗 | 没有，`window.location.origin` 自动变为正式域名 | 无需处理，仅本地开发有此问题 |
| PowerShell 运行 `start.bat` 报错 | PowerShell 不加 `.\` 前缀找不到当前目录的脚本 | 改为 `.\start.bat` |

详见 `docs/auth-redirect-explained.md` 第 8、9 节。

---

*由 Antigravity AI 辅助生成 · Malaysia Ez Rent Project*
