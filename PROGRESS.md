# 🏠 Malaysia Ez Rent — 开发进度总结

> 最后更新：2026-05-26 (UTC+8)
> 状态：**前端可跑 · 后端 Agent · Google OAuth + Magic Link · 超级管理员 · Supabase Storage（压缩+删除同步）· 手机上传凭证（007）· Whole Unit 合租意向 RPC（014/015）· 学生已租房源隐藏“我要租”并置灰显示“已承租” · 意向操作状态全面重构为 Glassmorphic 临时 Toast · 所有 Toast 升级为高级磨砂玻璃微光动效 · 缴租银行/微信/支付宝 · 首月付中介/后续付房东 · 禁止 iProperty 外部搜房 · Vercel & Render 部署 · 房源列表卡片/列表模式切换 · 智能租客选择器 · 登录页多语言与深色模式 · AI智能选房与Embedding自动向量检索同步 · 报修中心独立一级Tab（含折叠指示器） · AI欢迎语多语言动态切换 · 隐藏技术栈提示横幅 · 中介个人主页与详情面板 · 头像文件压缩防暴涨(30KB) · 移除社交外链以限定内部闭环 · 多中介独立挂牌（不共享行）· 复制挂牌 · agent_id 补写 · 非负数字输入 · 学生端列表加载重试 · 编辑保存=覆盖同一条 · 微信图标UI修复与WA链接优化 · 租客自主终止租约 RPC (018) + 押金扣除警告 · 整组联保合租退租继租变更 (019) · 继租人原子替换与天数比例折算分摊 · 存续押金转让/退还/没收方案 · 学生端合租室友名单及提前退租联保警示警告**


---

## 一、项目架构总览

```
Malaysia_Ez_rent/
├── frontend/          # Next.js 16.2 (App Router) — 学生端 + 管理端 SPA
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # 主入口，tab 路由切换，角色判断（admin_users 表），登出，侧边栏 Logo
│   │   │   ├── layout.tsx        # SEO metadata + favicon（/logo.png），Google Fonts，Google Maps Script
│   │   │   ├── globals.css       # 全局 CSS 变量、动画、组件样式（含 Logo / Toast 动画）
│   │   │   ├── login/
│   │   │   │   └── page.tsx      # Google OAuth + Magic Link 双登录（图标 Logo + 产品名）
│   │   │   ├── mobile-upload/
│   │   │   │   └── [id]/page.tsx # 手机扫码上传支付凭证（匿名 RPC + 图片压缩）
│   │   │   └── auth/
│   │   │       └── callback/
│   │   │           └── route.ts  # Supabase OAuth 回调处理器
│   │   ├── components/
│   │   │   ├── PropertyListings.tsx # 房源卡片列表（iProperty 风格）+ 详情抽屉
│   │   │   ├── AIChat.tsx        # AI 对话界面（SSE 流式 + 离线模拟器）
│   │   │   ├── MapAndCard.tsx    # 房源卡片 + SVG 通勤路线地图
│   │   │   ├── LeaseLedgerCard.tsx  # 租约台账 + 银行转账/收款码支付弹窗（首月→中介，后续→房东）
│   │   │   ├── StudentPortal.tsx # 学生门户（圆形倒计时环 + 台账）
│   │   │   └── AdminPanel.tsx    # 管理后台（房源/租约二级 Tab、收租核查表显示单元、小区删除、表单校验与 Toast）
│   │   └── lib/
│   │       ├── supabase.ts       # Supabase 客户端（含完整 LocalStorage Mock）
│   │       ├── numberInput.ts    # 数字输入非负校验（AdminPanel / PropertyListings）
│   │       ├── ThemeProvider.tsx  # 主题/语言 Context Provider
│   │       └── i18n.ts           # 中英双语翻译字典
│   │   ├── utils/
│   │   │   ├── supabase/         # @supabase/ssr 服务端/中间件工具
│   │   │   │   ├── client.ts
│   │   │   │   ├── middleware.ts
│   │   │   │   └── server.ts
│   │   │   └── compressImage.ts  # 上传前 Canvas 压缩（凭证/房源/收款码）
│   │   │   └── compressVideo.ts  # 浏览器 MediaRecorder 压缩看房视频（WebM）
│   │   └── middleware.ts         # Next.js 路由中间件，处理 Auth 状态和重定向
│   ├── public/
│   │   └── logo.png              # 产品 Logo（圆形图标版，侧边栏/登录/上传页/favicon 共用）
│   ├── next.config.ts            # allowedDevOrigins 配置
│   ├── .env.local                # 环境变量（Supabase/DeepSeek/Google Maps/Tavily）
│   └── package.json
│
│── backend/           # Python FastAPI + OpenAI-compatible AI Agent
│   ├── app/
│   │   ├── main.py       # FastAPI 入口，CORS，SSE /api/chat 端点
│   │   ├── agent.py      # ReAct Agent（真实流式 API + Mock 模拟器）
│   │   ├── tools.py      # Agent 工具集（Live 4 工具：通勤、Tavily 常识、汇率、假期；**禁止 iProperty 外部搜房**）
│   │   ├── config.py     # 环境变量读取
│   │   └── mock_data.py  # 离线 Mock 数据
│   ├── .env              # 后端环境变量（从 frontend/.env.local 同步）
│   ├── run.py            # uvicorn 启动入口
│   └── requirements.txt
│
├── docs/              # 项目文档
│   ├── auth-redirect-explained.md # Supabase Auth 重定向、手机上传、Logo 部署、Memory vs Storage
│   ├── ai-architecture.md         # AI Agent 架构与后续开发指南
│   └── deployment-guide.md        # 部署指南
│
└── supabase/          # 数据库 Schema（PostgreSQL + pgvector）
    ├── schema.sql        # 完整 Schema（含 auth 触发器、管理员上限触发器、RLS 策略）
    └── migrations/       # 增量迁移脚本（不删表，安全加字段）
        ├── 001_add_admin_contact.sql   # admin_users 加联系方式 + super_admin RLS
        ├── 002_limit_admins_and_ui.sql # 管理员上限 5 人触发器
        ├── 003_corenting.sql           # 合租功能（入住人数 + 意向名单）
        ├── 004_unit_media.sql          # 房源图片、配套设施、收款码、押金配置
        ├── 005_feedback.sql            # 学生意见箱 (feedback 表 + RLS 策略)
        ├── 006_bedrooms_bathrooms.sql  # units 加 bedrooms/bathrooms + match_units 更新
        ├── 007_mobile_upload.sql       # 手机匿名上传凭证 RPC + Storage evidence/ 策略
        ├── 008_whole_unit_room_type.sql # units.room_type 允许 Whole Unit（整租/合租）
        ├── 009_unit_video_url.sql       # units.video_url + Storage 看房视频
        ├── 013_landlord_payment_details.sql # 房东收款信息（后续月租）
        ├── 014_tenant_interests_user_update.sql # 学生 UPDATE 自己的 tenant_interests
        ├── 015_tenant_interest_rpc.sql  # submit/cancel_tenant_interest RPC
        ├── 016_maintenance_requests.sql # 维修工单系统 (替换旧意见箱表)
        └── 018_tenant_terminate_lease.sql # 租客自主终止租约 RPC (Security Definer)

---

## 二、已完成功能 ✅

### 前端 (Next.js)

| 组件 | 状态 | 说明 |
|------|------|------|
| `page.tsx` | ✅ 完成 | 统一 SPA 容器，侧边栏导航（**已集成 AdminPanel 冒泡上报的红点提示，显示未处理租约/意向及反馈数量**） + **图标 Logo + 产品名/副标题**，角色判断，**新增侧边栏报修一级菜单 Tab 独立导航与 Wrench 图标统一**，flex 布局修复 |
| `PropertyListings.tsx` | ✅ 完成 | 列表/筛选/Lightbox/视频；**精准展示该房源对应 Agent 的联系方式**；卡片/行显示 **中介：display_name**；`loadListings` 失败可重试、登录后自动刷新；**Whole Unit 合租**：RPC 提交/取消意向、合租登记 X/Y、公开意向名单；学生详情 **所属中介** + 中介主页（WhatsApp/微信 **暂无** 兜底）；`getUnitsForAgent` 严格 `agent_id` + `UnitWithCommunity` 类型；**修复微信图标显示不全与 WhatsApp 链接格式兼容性问题**；**学生已租房源隐藏“我要租”按钮并显示“您已承租此房源”；意向状态反馈重构为临时 Toast 提醒以移除详情页内的持久化取消意向横幅，且所有 Toast 升级为高级磨砂玻璃微光设计** |
| `AIChat.tsx` | ✅ 完成 | AI 对话界面，添加零依赖原生 Markdown 渲染器，添加动态 Supabase Auth 用户 ID 实时同步，解决个人租约身份对齐问题，**添加 useEffect 监听中英文语言切换，实时动态翻译更新首句 AI 欢迎语**。 |
| `MapAndCard.tsx` | ✅ 完成 | 房源卡片 + SVG 动画通勤路线，3 种交通模式切换，**支持谷歌地址自动联想建议与 Mock 降级兜底** |
| `LeaseLedgerCard.tsx` | ✅ 完成 | 12 个月台账格（按 billing_month 排序）+ 支付弹窗区分：**首月+押金交中介，后续月租交房东（含房东银行账户及动态 QR）**。若房东未提供信息，则显示明确的**“房东暂未上传”警告**，避免误导学生支付给中介，每账单唯一上传凭证二维码，已缴费不可点击 |
| `StudentPortal.tsx` | ✅ 完成 | 圆形 SVG 租约倒计时环，押金明细（从数据库读取月数），下一笔待缴，账单按月份排序，已缴费不可点击，提取房东收款信息，**重构支持 mode 属性以实现“我的租约”与“维修反馈”双 tab 的物理分离隔离，且历史工单列表支持 Chevron 展开折叠指示器；新增“终止租约 (Terminate Lease)”功能，集成 018 RPC 后端并包含押金扣除中英双语警告弹窗** |
| `AdminPanel.tsx` | ✅ 完成 | 二级Tab（红点 + Agent 隔离）；房东银行/QR（013）；**复制挂牌**（文本+房东收款，不含图/视频，保存为**新行**）；保存时写入 **`agent_id`**（旧数据可编辑保存补全）；个人资料全宽、仅头像上传压缩、去掉 iProperty 文案；**删除凭证/房源/删图同步 Storage**；数字输入非负；**编辑保存 = UPDATE 同 id，不新建**；**Toast 通知组件统一升级为高级磨砂玻璃 (Glassmorphic) 动效设计** |
| `mobile-upload/[id]/page.tsx` | ✅ 完成 | 手机匿名上传支付凭证（RPC），上传前压缩，Storage `evidence/` 路径 |
| `compressImage.ts` | ✅ 完成 | Canvas 压缩：凭证/房源/收款码 JPEG（见第十二节表） |
| `compressVideo.ts` | ✅ 完成 | MediaRecorder WebM：≤1280×720 ~1.2Mbps；>12MB 触发；`units.video_url` |
| `ThemeProvider.tsx` | ✅ 完成 | 主题/语言 Context，解决 Next.js 16 路由器初始化黑屏问题 |
| `i18n.ts` | ✅ 完成 | 中英双语；缴租/上传凭证支持 **银行转账、微信、支付宝**（不写具体银行品牌） |
| `supabase.ts` | ✅ 完成 | 双模式客户端（真实 Supabase SDK / LocalStorage Mock）|
| `globals.css` | ✅ 完成 | 设计 Token；**`app-container` 100vh + `.main-content` 滚动**；Logo / Toast 动画 |
| `layout.tsx` | ✅ 完成 | Google Fonts 通过 `<link>` 加载；**favicon 指向 `/logo.png`** |
| `public/logo.png` | ✅ 完成 | 圆形图标版品牌 Logo（源文件 `QQ20260524-170137.png`），**纯静态资源，不涉及数据库** |
| `next.config.ts` | ✅ 完成 | `allowedDevOrigins` 配置，解决跨域 HMR 警告 |
| `login/page.tsx` | ✅ 完成 | Google OAuth + Magic Link 双登录，**图标 Logo + 产品名**，白色简洁设计，Mock/Live 自适应 |
| `auth/callback/route.ts` | ✅ 完成 | 处理 Supabase OAuth 返回的 Code 交换 Session 回调路由 |

### 后端 (FastAPI)

| 模块 | 状态 | 说明 |
|------|------|------|
| `main.py` | ✅ 完成 | FastAPI + CORS，SSE `/api/chat` 端点 |
| `agent.py` | ✅ 完成 | **真实流式 API 调用**（`stream=True`），支持 SiliconFlow/DeepSeek/OpenAI 兼容 API；System Prompt 加入规则限制，禁止对用户念出或复述 ID。 |
| `tools.py` | ✅ 完成 | Live Agent **4 工具**：通勤、Tavily 常识（**排除** iProperty/PropertyGuru 等）、汇率、假期；`search_internal_db` 仅 Mock/遗留，**禁止** `search_iproperty_listings` |
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
| 18 | 管理员 Tab 闪现（学生登录后可见约 1 秒） | `role` 初始值改为 `null`，加载完成前显示 spinner |
| 19 | UUID 格式错误 `invalid input syntax for type uuid` | Live 模式用 `crypto.randomUUID()` 生成 ID |
| 20 | 图片上传后刷新丢失（显示 picsum 假图） | 改为上传至 Supabase Storage，URL 存入 `units.media_urls` |
| 21 | QR 码 base64 直接存数据库（几百 KB 文本） | 改为上传至 Supabase Storage `qr/` 目录，数据库只存 URL |
| 22 | `cancelInterest` 硬删除，管理员看不到历史 | 改为软删除（`update status = 'left'`） |
| 23 | PropertyListings 管理员联系方式/租客意向无 mock 模式读取 | 加 localStorage 回退分支 |
| 24 | 创建租约 `tenant_id` 硬编码 `'tenant-123'`，UUID 格式报错 | 改为管理员从已确认意向租客中选择，或手动输入 UUID |
| 25 | 管理端台账点击已缴费后无法切回待缴 | `markPaid` 改为 `togglePaid`，支持双向切换 |
| 26 | 管理端台账支付记录顺序混乱 | 按 `billing_month` 时间排序 |
| 27 | 学生端已缴费格子还能点击弹出支付弹窗 | `p.paid` 时 `onClick` 不触发 |
| 28 | 学生端支付弹窗不显示管理员收款码 | 弹窗上方显示管理员 DuitNow/Touch'n Go 收款码，下方显示上传凭证二维码 |
| 29 | 押金硬编码 2 个月 / 0.5 个月 | 改为管理员可配置月数（支持 0.5），存入 `leases.security_deposit_months` / `utility_deposit_months` |
| 30 | 押金明细标签重复显示"（2个月）" | i18n 标签去掉固定月数，由模板动态拼接 |
| 31 | AdminPanel 初始加载不读 interests | `loadFromSupabase` / `loadFromLocalStorage` 同时加载 interests |
| 32 | 切换 tab 不刷新数据 | leases tab 切换时调用 `loadAll()` 刷新 |
| 33 | `Multiple GoTrueClient instances` 冲突 | `@/lib/supabase` 和 `@/utils/supabase/client` 各创建一个客户端，`client.ts` 改为复用 `@/lib/supabase` 的实例 |
| 34 | `admin_users` 查询返回 400（列不存在） | `display_name`/`phone`/`whatsapp`/`wechat_id`/`payment_qr_code` 列合并到 `004_unit_media.sql` 迁移 |
| 35 | Storage RLS `EXISTS admin_users` 策略上传失败 | 改为 `TO authenticated` 策略，应用层做管理员校验 |
| 36 | `admin_users` 的 `FOR ALL` RLS 策略覆盖 SELECT，导致无法登录 | 拆成 SELECT/INSERT/UPDATE/DELETE 四条独立策略 |
| 37 | editor 管理员无法上传收款码（RLS 仅允许 super_admin） | 新增 `Admins can update payment QR` 策略，允许任意管理员更新收款码（全系统共享） |
| 38 | 收款码刷新后丢失 | 上传时同步存 localStorage，加载时优先数据库、fallback 到 localStorage |
| 39 | 删除收款码无确认提示 | 加 `confirm()` 弹窗："确定删除收款码？" |
| 40 | 部署时环境变量混乱，AIChat写死localhost导致线上失效 | 清理前后端 .env 文件，修改 AIChat.tsx 动态读取 NEXT_PUBLIC_AGENT_API_URL |
| 41 | 生产构建报错：AdminPanel.tsx 中 place.geometry 可能为 undefined | 修改 `AdminPanel.tsx` 逻辑，使用可选链 `place.geometry?.location?.lat()` 以及默认值，成功通过打包编译 |
| 42 | 安全隐患：backend/.env 包含高权限 key 被 Git 跟踪 | 根目录新增 `.gitignore` 并执行 git rm --cached，确保敏感密钥不上传 Github，仅留本地和 Render 环境变量中 |
| 43 | 前端 AIChat 输出原始 `##` Markdown | 在 `AIChat.tsx` 增加零依赖简易原生 Markdown 渲染，支持三级标题、加粗、无序列表及行内代码渲染。 |
| 44 | AI 对话查询租约报默认 tenant-123 数据错配 | 修复 `page.tsx` 和 `AIChat.tsx` 的 ID 传递链。现在真实登录用户的 Supabase UUID 会秒同步本地 `ez_tenant_id` 缓存，并在退出登录时清空。 |
| 45 | AI 念出或复述后台 UUID / tenant-123 乱码 | 后端 `agent.py` 添加第 8 条全局 Prompt 指导，严禁大模型对用户暴露和复述 ID 字符串。 |
| 46 | 智能 Agent 功能单一、无假期/汇率工具 | `tools.py` 新增并集成 Frankfurter 汇率换算与 Nager.Date 马来西亚公休假期查询。 |
| 47 | 手机扫码上传凭证报「未找到该账单记录」 | `payment_records` RLS 拒绝匿名 SELECT/UPDATE；新增 `007_mobile_upload.sql`：`get_mobile_upload_info` + `submit_mobile_payment_evidence` SECURITY DEFINER RPC，Storage `evidence/` 匿名写入策略 |
| 48 | 学生端台账已缴费月份排到后面 | `StudentPortal` 查询加 `order('billing_month')`，`LeaseLedgerCard` 防御性按月份排序 |
| 49 | 管理端审核凭证截图撑爆屏幕 | 审核弹窗与 Lightbox 加 `max-height: min(50vh, 420px)` / `85vh` + `object-fit: contain` |
| 50 | 原图上传快速占满 Supabase Storage | 新增 `compressImage.ts`，凭证/房源/收款码上传前 Canvas 压缩为 JPEG |
| 51 | Gemini API 高峰期 503 导致 Agent 无最终回复 | 工具调用已成功但 LLM 合成回复失败；属上游模型过载，需重试或换模型/加重试逻辑（待优化） |
| 52 | 管理端同一门牌号重复录入多条房源 | `units` 表无唯一约束 + 保存按钮无防连点；误操作会 INSERT 重复行，需手动删除多余记录（待加防重复） |
| 53 | 收租核查表头部不显示小区/门牌号 | 租约与 unit 关联不可靠且 UI 挤在一行；改为 Supabase `leases → units → communities` JOIN，**单独一行**显示 `小区 · 门牌 · (房型)` |
| 54 | 保存 Whole Unit 房型报 `units_room_type_check` | 数据库 CHECK 缺 `Whole Unit`；执行 `008_whole_unit_room_type.sql` 扩展约束 |
| 55 | 房源缩略图无法点开大图 | 详情抽屉仅切换预览；新增 **Lightbox 全屏**（点击大图/缩略图，←/→/Esc） |
| 56 | 看房视频未压缩且 Live 模式未上云 | 新增 `compressVideo.ts` + `units.video_url`（**009 迁移**）+ Storage 上传 |
| 57 | AI 找房返回 Mock 演示房源 Sunway Geo | `search_internal_db` 在 Supabase 已连接时不再回退 Mock；**Live Agent 不再搜房**，引导用户用「房源列表」Tab |
| 61 | 误接入 Tavily→iProperty 外部搜房 | **已禁止**；删除 `search_iproperty_listings`；Tavily 仅用于政策/交通常识，且排除竞品租房站 |
| 58 | 支付界面自动兜底显示中介二维码 | 移除第二个月后的中介 QR 兜底，增加房东信息缺失的显性警告提示框。 |
| 59 | 删除凭证/图片只清 DB 不清 Storage | `clearEvidence` / `removeQR` / 编辑房源删图 / `deleteUnit` 现同步 `storage.remove()` |
| 60 | 缴租文案写死 Maybank/DuitNow | 改为 **银行转账 / 微信 / 支付宝** 均可（`i18n.ts`） |
| 62 | 「跳过，直接提交」不提交 | 按钮误关表单；已改为调用 `expressInterest(unitId, '')` |
| 63 | 提交后人数仍 0/6 | 原只统计 `confirmed`；现 **合租登记 = 意向中 + 已确认** |
| 64 | 提交成功仍显示「我要租」 | `myInterest` 与列表不同步；改由 `authUserId` + 列表推导，顶部/行内双「取消意向」 |
| 65 | 学生无法自行取消意向 | 缺 UPDATE 权限；**014** + **`cancel_tenant_interest` RPC（015）**；无需等管理员拒绝 |
| 66 | 合租意向 insert/update 静默失败 | **015** RPC `submit_tenant_interest`（ON CONFLICT upsert）；前端有成功/失败提示 |
| 67 | 中介端租客 UUID 复制繁琐且易错 | 租约创建表单改用下拉列表选择租客，分为“已确认合租意向人”与“全系统注册房客”，同时保留手动输入 UUID 兼容模式并解决 unmount 闪退 Bug。 |
| 68 | 登录页布局拥挤，且缺乏多语言与深色模式 | 重新编排登录页间距，添加多语言与深色模式切换；针对 SMTP 延迟增加高亮警告，移除所有面向用户的“沙盒(Sandbox)”词汇以适应正式环境。 |
| 69 | 房源列表默认大图卡片占用空间，缺乏精简模式 | 在筛选 Bar 增加网格/列表（Grid / List）模式切换按钮，缩小网格卡片以使其更紧凑精致，并新增横向排版的 `PropertyRow` 组件。 |
| 70 | 英文模式下 AI 欢迎语仍显示中文 | 在 `AIChat.tsx` 中使用 `useEffect` 监听 `lang`/`t` 状态变化，实时动态翻译更新第一条欢迎语。 |
| 71 | 顶部数据库状态泄漏技术栈名词且过于冗长 | 统一重构并在 `i18n.ts` 中将文案简化为最纯净的中英声明：`数据库已连通` / `Database Connected`。 |
| 72 | 报修功能藏在租约下，缺乏一级导航曝光且管理端不一致 | 将维修工单作为独立一级菜单（`Wrench`图标），重构 `StudentPortal` 支持 `mode` 参数分别呈现租约和工单；同步修改管理端侧边栏和按钮，统一图标和翻译文案。 |

| 73 | 租约二级导航逻辑不合理、待审核没有独立入口 | 重构 `AdminPanel` 二级导航顺序为「租客意向」->「有效租约」->「待审核凭证」->「收租核查表」；并将待审核凭证单独拆为二级 Tab 且运用 Grid 样式美化，有效租约列表在「有效租约」和「收租核查表」中皆可见。 |

| 74 | 租客选择列表允许手动输入且包含管理员 | 彻底移除租约创建表单中手动输入 UUID 的入口与相应状态；并在加载数据时拉取 `admin_users` 所有 ID，在渲染房客选择列表时进行排除过滤，避免管理员（如 Chris）出现在租客备选中。 |
| 75 | Vercel 构建 `currentEnquiryUnit.community` 类型错误 | `getUnitsForAgent` 改为 `UnitWithCommunity[]`，与主列表 join 的 `community` 一致 |
| 76 | 学生登录后房源列表空白 | `loadListings`/`loadAdmins` 抽离 + 错误重试；`middleware` anon key 回退；`SIGNED_IN` 时重新拉取 |
| 77 | 旧房源无 `agent_id` 中介主页不显示 | 管理端 **编辑 → 保存** 同一条记录即可写入当前用户 `agent_id`（UPDATE，非新建） |

---

## 四、下一步开发计划 📋

### 短期（本周）

- [x] **Google OAuth + Magic Link 双登录**：Supabase 配置完成，前端按钮 + 回调路由就绪
- [x] **角色区分**：admin_users 表 + RLS 策略，首页从数据库读取角色
- [x] **超级管理员面板**：super_admin 可在前端添加/删除管理员（最多 5 人）
- [x] **联系管理员弹窗**：从数据库读取联系方式，折叠展开 UI
- [x] **数据库迁移脚本**：`supabase/migrations/` 目录，ALTER TABLE 安全加字段
- [x] **支付凭证审核**：管理员可查看学生上传的转账截图，批准/驳回，填写备注；待审核数量角标提醒
- [x] **合租功能**：Whole Unit 支持多人入住，学生表达意向 + 备注，管理员确认/移除；单房间直接"我要租"
- [x] **配套设施**：小区支持勾选健身房、游泳池、洗衣房等，学生端详情展示
- [x] **图片上传至 Supabase Storage**：房源图片、QR 码不再存 base64，改为 Storage + URL
- [x] **房源/租约删除**：管理员可删除已登记房源和租约，硬删除同步清理 Storage 和关联数据
- [x] **登录页白色简洁设计**：去除黑色/紫色 AI 风格，改为白色背景
- [x] **管理员 Tab 闪现修复**：role 初始值 null，加载完成前不显示任何导航
- [x] **AIChat 完整流程测试**：房源搜索 → 地图渲染、租约查询 → 台账渲染（真实 Agent）
- [ ] **PropertyListings 数据刷新**：Admin 添加房源后，学生端列表自动刷新（目前需手动刷新页面）

### 中期（接入真实服务）

- [x] **Supabase 配置**：URL/Key 已填入 `.env.local`，Google OAuth Provider 已开启
- [x] **运行 schema.sql**：建表 + 触发器 + RLS 策略已执行
- [ ] **pgvector 向量化**：用 `BAAI/bge-large-zh-v1.5` 对房源描述生成 1024 维向量
- [ ] **手机号 OTP 登录**：接入 Vonage 或 Twilio
- [ ] **Google Maps Places API**：替换 AdminPanel 中的 Mock Places 搜索

### 长期（生产部署）

- [x] **Vercel 部署前端**：`git push` → Vercel 自动构建
- [x] **Railway/Render 部署后端**：FastAPI 容器化
- [x] **Supabase RLS 策略**：已启用，admin_users / users / units / leases / payment_records 均已配置

---

## 五、环境变量配置

> ⚠️ **安全警告**：由于含有高权限密钥和个人凭证，包含具体值的 `.env` 和 `.env.local` 配置文件**已被 `.gitignore` 过滤屏蔽，不会上传至 GitHub**。在云端生产环境部署（如 Vercel 和 Render）时，请必须在平台控制台以环境变量形式安全配置。

### 前端 (`frontend/.env.local`)

| 变量名 | 当前值 | 用途 |
|--------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://legiyebykxmztaewlmhv.supabase.co` | Supabase 云项目域名端点 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 已配置 | 客户端匿名 API Key（浏览器安全公开） |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 同上（已配置） | 部分 SSR/中间件组件习惯命名的相同 anon key |
| `NEXT_PUBLIC_AGENT_API_URL` | `http://localhost:8000` | 后端 Python FastAPI 服务的连接接口 |
| `NEXT_PUBLIC_AGENT_MODEL` | `deepseek-ai/DeepSeek-V3` | 前端界面展示的 AI 驱动大脑名称 |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | 已配置 | 谷歌地图前端 JS 渲染和 Places 输入建议 Key |

### 后端 (`backend/.env` — 云端部署在 Render 的 Environment 环境变量组中配置)

| 变量名 | 当前值 | 用途 |
|--------|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | 同前端 | Supabase 项目地址 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 同前端 | 客户端公开 Key |
| `SUPABASE_SERVICE_ROLE_KEY` | 已配置（安全特权密钥） | **管理员超级权限 Key**（后端 Agent 查真实用户租约与记录日志时绕过 RLS 策略） |
| `GOOGLE_MAPS_API_KEY` | 已配置 | 后台根据 GPS 坐标做通勤距离计算的 Key |
| `OPENAI_API_KEY` | 已配置（SiliconFlow） | 后台 AI 对话驱动大模型的密钥 |
| `OPENAI_API_BASE` | `https://api.siliconflow.cn/v1` | 兼容 OpenAI 格式的第三方接口端点 |
| `NEXT_PUBLIC_AGENT_MODEL` | `deepseek-ai/DeepSeek-V3` | 推理大脑模型名称 |
| `AI_EMBEDDING_MODEL` | `BAAI/bge-large-zh-v1.5` | 房源描述语义检索使用的向量模型 |
| `TAVILY_API_KEY` | 已配置 | Tavily 联网搜索 API Key（Agent 实时检索校车/政策用） |

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
| `admin_users` | 管理员账号（姓名、电话、WhatsApp、微信号、收款二维码，最多 5 人）|
| `communities` | 小区/公寓楼（含经纬度、配套设施 amenities[]）|
| `units` | 房间单元（类型、租金、状态、最大入住人数、图片 URL 数组、pgvector 向量）|
| `leases` | 租约合同（租客 ID、单元 ID、起止日期、押金、安全押金月数、水电押金月数）|
| `payment_records` | 每月账单记录（paid 状态、支付日期、凭证 URL、审核状态）|
| `tenant_interests` | 合租意向（unit_id、user_id、note 备注、status: interested/confirmed/left）|
| `universities` | 马来西亚大学 GPS 坐标 |
| `agent_conversations` | AI 对话历史记录 |
| `feedback` | 学生意见箱（user_id、content、status: pending/resolved、admin_reply、resolved_at） |

触发器：
- `on_auth_user_created` — 新用户注册自动创建 users 记录
- `limit_admin_count` — 管理员上限 5 人
- `after_lease_insert` — 创建租约自动生成月账单

Storage Bucket：
- `unit-media` — 房源图片 + 管理员收款码（公开访问，管理员可上传/删除）

迁移脚本：`supabase/migrations/` 目录，按编号管理，不删表重建

| 文件 | 内容 |
|------|------|
| `001_add_admin_contact.sql` | admin_users 加联系方式字段 + super_admin RLS |
| `002_limit_admins_and_ui.sql` | 管理员上限 5 人触发器 |
| `003_corenting.sql` | 合租功能：units.max_occupants + tenant_interests 表（含 note） |
| `004_unit_media.sql` | **完整迁移**：admin_users 联系方式 + 收款码 + units.media_urls + communities.amenities + leases 押金月数 + Storage bucket + 全部 RLS 策略 |
| `005_feedback.sql` | 意见箱：feedback 表（user_id、content、status、admin_reply）+ RLS 策略（学生插入/查看自己的，管理员查看/更新/删除所有） |
| `006_bedrooms_bathrooms.sql` | units 加 bedrooms/bathrooms 字段 + 更新 match_units RPC 返回值 |
| `007_mobile_upload.sql` | **手机匿名上传凭证**：`get_mobile_upload_info(uuid)` + `submit_mobile_payment_evidence(uuid, text)` RPC；Storage `unit-media/evidence/` 匿名 INSERT/UPDATE 策略 |
| `008_whole_unit_room_type.sql` | `units.room_type` CHECK 增加 `Whole Unit`，修复整租/合租房型保存报错 |
| `009_unit_video_url.sql` | `units.video_url TEXT` — 看房视频 Storage URL（`{unitId}/walkthrough.webm`） |
| `010_agent_qr_separation.sql` | **收款码与审核隔离**：`units`表新增`agent_id`外键；重构`get_mobile_upload_info`匿名RPC，自动拉取房源专属录入Agent收款码，提供Agent级别账单独立审核与列表过滤。 |
| `011_optional_unit_number.sql` | **门牌号可选化**：在 `units` 表中将 `unit_number` 的 `NOT NULL` 约束去掉（DROP NOT NULL），在后台录入表单中移除该输入框，并适配前端让其完美自适应渲染。 |
| `012_remove_unit_number_display.sql` | 彻底隐藏门牌号：RPC 返回 `room_type` 替代 `unit_number` |
| `013_landlord_payment_details.sql` | `units.landlord_qr_code` / `landlord_bank_info`；后续月租付房东 |
| `014_tenant_interests_user_update.sql` | RLS：学生可 **UPDATE** 自己的 `tenant_interests`（取消/重新提交） |
| `015_tenant_interest_rpc.sql` | RPC **`submit_tenant_interest`** / **`cancel_tenant_interest`**（SECURITY DEFINER upsert） |
| `016_maintenance_requests.sql` | **维修工单系统**：`maintenance_requests` 表（category 校验、RLS 权限控制、图片存储、认领状态） |
| `017_agent_profile_fields.sql` | **中介个人主页扩展**：为 `admin_users` 新增 `job_title`, `agency_name`, `agency_license`, `agency_address`, `bio`, `experience_years`, `experience_months`, `area_expertise`, `property_types` 中介信息字段，并限制只在平台内部维护、移除外部社交链接引流 |

迁移原则：
- 用 `ALTER TABLE ... ADD COLUMN` 加字段，不删表
- 用 `IF NOT EXISTS` / `IF EXISTS` 防止重复执行报错
- 先更新现有数据，再加约束（避免 `23514` 约束冲突）
- 每次迁移后同步更新 `schema.sql`（保持 schema 文件 = 最终状态）
- RLS 策略用 `DROP POLICY IF EXISTS` + `CREATE POLICY`，可反复运行
- Storage RLS 用 `TO authenticated`，避免 `EXISTS (SELECT FROM admin_users)` 子查询在 Storage 上下文失败
- `FOR ALL` 策略会覆盖 SELECT，拆成 INSERT/UPDATE/DELETE 各一条更安全

---

## 八、数据库迁移规范

项目采用**增量迁移脚本**管理数据库结构变更，不删表重建：

```bash
supabase/migrations/
├── 001_add_admin_contact.sql   # admin_users 加联系方式字段 + super_admin RLS
├── 002_limit_admins_and_ui.sql # 管理员上限 5 人触发器
├── 003_corenting.sql           # 合租功能：units.max_occupants + tenant_interests 表（含 note）
├── 004_unit_media.sql          # 图片存储：units.media_urls + Storage Bucket + amenities + payment_qr_code
├── 005_feedback.sql            # 意见箱：feedback 表 + RLS 策略
├── 006_bedrooms_bathrooms.sql  # units bedrooms/bathrooms + match_units
├── 007_mobile_upload.sql       # 手机匿名上传凭证 RPC + Storage evidence/ 策略
└── 008_whole_unit_room_type.sql # Whole Unit 房型 CHECK 约束
└── 009_unit_video_url.sql       # units.video_url 看房视频
└── 010_agent_qr_separation.sql  # 房源收款码与审核权限 Agent 级隔离
└── 011_optional_unit_number.sql # 门牌号字段设为可选 (DROP NOT NULL)
└── 012_remove_unit_number_display.sql # 隐藏门牌号
└── 013_landlord_payment_details.sql # 房东收款（后续月租）
└── 014_tenant_interests_user_update.sql # 合租意向 UPDATE RLS
└── 015_tenant_interest_rpc.sql  # 合租 submit/cancel RPC
└── 016_maintenance_requests.sql # 维修工单系统 (替换旧意见箱表)
└── 017_agent_profile_fields.sql # 中介个人主页扩展字段
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
| 手机扫码报「未找到该账单记录」 | 未跑 `007_mobile_upload.sql`，匿名用户被 RLS 拒绝 | Supabase SQL Editor 执行 `supabase/migrations/007_mobile_upload.sql` |
| 手机扫码打不开网页 | `localhost` 只指向本机，手机访问的是自己的 localhost | 用 `ipconfig` 查电脑局域网 IP，改用 `http://192.168.x.x:3000` 访问，手机和电脑连同一 WiFi |
| 部署后手机扫码有问题吗 | 没有，`window.location.origin` 自动变为正式域名 | 无需处理，仅本地开发有此问题 |
| AI 找房报 503 | Gemini/LLM API 高峰期过载，工具可能已成功 | 稍后重试；或换模型 / 加重试逻辑 |
| Memory usage 显示 ~400 MB 是不是数据库满了 | 这是 **RAM 内存**图表，不是磁盘；Postgres 缓存占 RAM 是正常现象 | 看 Settings → Usage 的 **Database size** 和 **Storage size**；详见 auth 文档第 14 节 |
| Storage 配额涨太快 | 原图直传 | 已加 `compressImage.ts` 上传前压缩；旧大文件需手动清理 |
| 同一门牌号出现多条重复房源 | `units` 无唯一约束 + **误点「新增」或「复制挂牌」** | 删除多余行；**改信息用「编辑」→ 保存（覆盖同 id）**；多中介各挂一行是业务设计，见下文 |
| 编辑后什么都不改再点保存 | 会 **UPDATE** 同一条，**不会 INSERT** | 仍会写库并 `embedding=null` 触发向量重算；不会多一条 |
| 复制挂牌 vs 编辑保存 | 复制填表后点「保存为新房源」→ **新 UUID 新行** | 编辑保存始终 **覆盖原 id** |
| Whole Unit 保存报 `units_room_type_check` | 未跑 `008_whole_unit_room_type.sql` | Supabase SQL Editor 执行 `008_whole_unit_room_type.sql` |
| 收租核查表看不到门牌号 | 旧版 UI 或未关联 unit | 刷新前端；若显示「单元信息缺失」则检查租约 `unit_id` |
| Logo 上线要不要动数据库 | Logo 是 `frontend/public/logo.png` 静态文件 | **不用**；`git push` 后 Vercel 自动部署即可 |
| 在租房源很多会挤占页面吗 | 已固定 `app-container` 高度 + `.main-content` 独立滚动 | 卡片增多时出现**右侧滚动条**，侧边栏/topbar 不动 |
| 删除后 Storage 文件还在吗 | Live 模式管理员删除凭证/房源/收款码/编辑删图 | 会同步删 Storage；Mock 模式只清 localStorage |
| 视频有没有压缩 | 有：`compressVideo.ts`（WebM，>12MB 触发） | Live 模式需跑 **`009_unit_video_url.sql`** 才有 `video_url` 字段 |
| 支付凭证有没有压缩 | 有：`EVIDENCE_IMAGE_PRESET`（≤1080×2400 JPEG 80%） | 手机上传页 + Mock 模式均走 `compressImage` |
| 合租提交后数字不变 / 无法取消 | 未跑 **014/015** 或前端旧版 | 执行 `014`+`015` 迁移；`git push` 部署后 Ctrl+F5；见第十九节 |
| PowerShell 运行 `start.bat` 报错 | PowerShell 不加 `.\` 前缀找不到当前目录的脚本 | 改为 `.\start.bat` |

详见 `docs/auth-redirect-explained.md` 第 8–20 节。

---

## 十一、AI 大模型与向量模型切换指南

后端采用 **OpenAI 兼容协议（OpenAI-Compatible API）**，已支持**将 Agent 对话大脑与 Embedding 向量检索模型进行 API 密钥和 Base URL 的物理拆离**。您可以分别配置它们，也可以只配置一组通用设置。

### 核心配置环境变量

| 变量分类 | 变量名 | 作用与示例 | 默认回退 |
|--------|--------|------------|--------|
| **全局/嵌入配置** | `OPENAI_API_KEY` | 用于 Embedding 向量检索的密钥 (如 SiliconFlow) | 必填 (若使用真实向量检索) |
| | `OPENAI_API_BASE` | 向量模型的 API Base 地址 | 默认为 `https://api.openai.com/v1` |
| | `AI_EMBEDDING_MODEL` | 向量生成模型名称 (如 `BAAI/bge-large-zh-v1.5`) | 默认为 `text-embedding-3-small` |
| **独立 Agent 配置** | `AGENT_API_KEY` | 对话大脑专属 API Key | 若留空，自动回退到 `OPENAI_API_KEY` |
| | `AGENT_API_BASE` | 对话大脑专属 API Base 地址 | 若留空，自动回退到 `OPENAI_API_BASE` |
| | `NEXT_PUBLIC_AGENT_MODEL` | 对话大脑模型名称 (如 `deepseek-ai/DeepSeek-V3`) | 默认为 `gpt-4o-mini` |

> 修改位置：Render 后端控制台 → Environment，或本地 `backend/.env`。修改后服务会自动重启。

### 各提供商切换示例

**OpenAI 官方：**
```
OPENAI_API_KEY=sk-proj-xxxxxx
OPENAI_API_BASE=https://api.openai.com/v1
NEXT_PUBLIC_AGENT_MODEL=gpt-4o
```

**DeepSeek 官方：**
```
OPENAI_API_KEY=sk-xxxxxx
OPENAI_API_BASE=https://api.deepseek.com/v1
NEXT_PUBLIC_AGENT_MODEL=deepseek-chat
```

**阿里通义千问（DashScope）：**
```
OPENAI_API_KEY=sk-xxxxxx
OPENAI_API_BASE=https://dashscope.aliyuncs.com/compatible-mode/v1
NEXT_PUBLIC_AGENT_MODEL=qwen-plus
```

**月之暗面 Kimi（Moonshot）：**
```
OPENAI_API_KEY=sk-xxxxxx
OPENAI_API_BASE=https://api.moonshot.cn/v1
NEXT_PUBLIC_AGENT_MODEL=moonshot-v1-8k
```

**智谱 GLM（ZhipuAI）：**
```
OPENAI_API_KEY=xxxxxx.xxxxxx
OPENAI_API_BASE=https://open.bigmodel.cn/api/paas/v4
NEXT_PUBLIC_AGENT_MODEL=glm-4-plus
```

### ⚠️ 注意事项：Tool Calling 兼容性

本项目的 AI Agent 依赖 **Function Calling / Tool Use** 能力。Live 模式当前暴露 **4 个工具**（通勤计算、网页常识、汇率换算、假期查询）。**找房/查账单不在 AI 范围内**，须引导用户使用页面 Tab。切换模型前务必确认新模型支持 `tools` 参数。

| ✅ 确认支持 Tool Calling 的模型 | ❌ 不支持的模型 |
|------|------|
| GPT-4o / GPT-4o-mini | 部分开源小模型（如 Llama 3 原版） |
| DeepSeek-V3 / DeepSeek-Chat | 一些早期或轻量级模型 |
| Qwen-Plus / Qwen-Max | — |
| GLM-4-Plus | — |
| Moonshot-v1 | — |

Storage Bucket：
- `unit-media` — 房源图片 + 管理员收款码 + **支付凭证**（`evidence/` 子目录，公开读、匿名可写凭证）

---

## 十二、手机扫码上传支付凭证（2026-05-24）

### 流程

```
PC 学生端点击某月账单 → 弹窗显示两个二维码
    ├── 左：收款二维码 / 房东银行转账信息（首月→中介 QR；后续月→房东 QR 或 bank info）
    └── 右：上传凭证码 → /mobile-upload/{payment_records.id}（每账单唯一 UUID）
              ↓
手机浏览器打开（无需登录，middleware 放行 /mobile-upload/）
              ↓
RPC get_mobile_upload_info(payment_id) 读取账单信息（不暴露门牌号）
              ↓
客户端 compressImage 压缩截图 → Storage unit-media/evidence/{id}.jpg
              ↓
RPC submit_mobile_payment_evidence → status = pending_review
              ↓
管理端待审核列表 → 批准/驳回；可「删除凭证」（DB + Storage 同步清除）
```

### 缴租文案（i18n）

产品文案统一为 **银行转账**，不绑定具体银行或第三方支付品牌：

| 键 | 中文 | English |
|----|------|---------|
| `duitnowWarning` | 请使用银行转账完成支付。 | Please complete payment by bank transfer. |
| `scanToUploadDesc` | 请用手机扫描下方二维码，上传银行转账截图。 | Scan with your phone to upload your bank transfer screenshot. |
| `uploadQR` | 上传收款二维码 | Upload collection QR code |

### 两种二维码的区别（重要）

| 二维码 | URL / 内容 | 是否唯一 | 用途 |
|--------|-----------|---------|------|
| **收款码**（左） | 中介/房东上传的收款 QR 或银行转账文字信息 | 首月共享中介码；后续月用房东信息 | 学生完成银行转账 |
| **上传凭证码**（右） | `{origin}/mobile-upload/{payment_uuid}` | ✅ **每个账单一条** | 学生上传该月银行转账截图 |

### 必须在 Supabase 执行的迁移

在 **Supabase Dashboard → SQL Editor** 运行 `supabase/migrations/007_mobile_upload.sql`（只需一次）。

未执行时：手机端仍会报「未找到该账单记录」或无法写入 Storage。

### 图片压缩策略（`frontend/src/utils/compressImage.ts`）

| 场景 | 最大尺寸 | 质量 | 典型体积 |
|------|---------|------|---------|
| 支付凭证 | 1080×2400 | JPEG 80% | 150–400 KB |
| 房源照片 | 1920×1920 | JPEG 88% | 200–500 KB |
| 收款码 | 800×800 | JPEG 92% | 50–150 KB |
| 中介头像 | 300×300 | JPEG 85% | ≤ 30 KB |

小于 `skipBelowBytes` 的原图**不重复压缩**。详情页点击缩略图/大图 → **Lightbox 全屏查看**（`PropertyListings.tsx`）。

### 视频压缩与上传（`frontend/src/utils/compressVideo.ts`）

| 项 | 说明 |
|----|------|
| 方式 | 浏览器 Canvas + **MediaRecorder** 重编码为 WebM |
| 参数 | 最长边 ≤1280×720，~1.2 Mbps |
| 触发 | 原文件 **> 12MB** 才压缩；否则直传 |
| 存储 | Supabase Storage `unit-media/{unitId}/walkthrough.webm` |
| 数据库 | `units.video_url`（需执行 **`009_unit_video_url.sql`**） |
| 限制 | 浏览器不支持时回退原文件；**不含音频轨**（看房视频通常无音轨） |

### 在租房源列表滚动

布局：`app-container` 固定 `height: 100vh` → `main-content` `overflow-y: auto`。

房源卡片再多也只在**主内容区**滚动，**不会把侧边栏/topbar 顶出屏幕**。

---

## 十三、AI Agent 工具与数据来源说明

### 找房用什么？

**AI 不找房。** 用户问「帮我找 Studio / 附近有什么房」时，Live Agent 直接引导去 **「房源列表」** Tab（管理员录入的平台库存）。

| 用户问题类型 | Agent 行为 | 数据来源 |
|-------------|-----------|---------|
| 「帮我找 Monash 附近的 Studio」 | ❌ **不调用任何搜房工具** → 引导打开「房源列表」 | 仅 `PropertyListings.tsx` 展示 Supabase `units` |
| 「我的租约/账单怎么样了」 | ❌ **不查库** → 引导打开「我的租约」 | `StudentPortal` / `LeaseLedgerCard` |
| 「马来西亚押金怎么退」「Sunway 有 shuttle 吗」 | `get_web_realtime_info` | Tavily 常识搜索（**排除** iProperty/PropertyGuru 等竞品站） |
| 「RM 1350 等于多少人民币」 | `convert_currency_frankfurter` | Frankfurter API |
| 「从 XX 到莫纳什要多久」 | `calculate_commute` | Google Maps / 几何估算 |
| 「2026 年马来西亚公共假期」 | `get_malaysia_holidays` | Nager.Date API |

**硬性禁止：** 不得通过 Tavily 或任何方式搜索/推荐 **iProperty、PropertyGuru、SpeedHome** 等外部租房平台链接。`get_web_realtime_info` 的 query 已带 `-site:iproperty.com.my` 等排除项。

### Storage 删除生命周期（Live 模式）

| 操作 | 数据库 | Storage `unit-media` |
|------|--------|---------------------|
| 管理员「删除凭证」 | 清空 `evidence_url` 等 | ✅ 删 `evidence/{paymentId}.jpg` |
| 删除整套房源 | 删 `units` 行 | ✅ 删 `media_urls` + `video_url` 对应文件 |
| 编辑房源时去掉某张图并保存 | 更新 `media_urls` | ✅ 删被移除的 URL 对应对象 |
| 删除收款码 | `payment_qr_code = null` | ✅ 删 `qr/{adminId}.jpg` |
| 学生端 | 只能上传凭证，**不能自行删除** | — |

### 503 错误说明

若推理过程里工具已成功（如 `CALCULATE_COMMUTE`、`GET_WEB_REALTIME_INFO`），但最终报：

```
Error communicating with AI Brain: 503 - This model is currently experiencing high demand
```

这是 **上游 LLM API（如 Gemini）高峰期过载**，不是数据库或 Tavily 故障。工具结果已拿到，只是最后「组织语言回复」那一步失败。稍后重试即可。

---

## 十四、Supabase 资源占用说明（Memory ≠ 磁盘）

### 三个指标不要混

| 指标 | 位置 | 含义 | 本项目 |
|------|------|------|--------|
| **Memory usage** | Database → Memory usage | Postgres **RAM**（Used + Cache + Buffers） | ~400 MB 为实例正常基线，**不是数据满了** |
| **Database size** | Settings → Usage | 表数据 **磁盘**占用 | 通常几 MB～几十 MB（URL、租约、账单、向量） |
| **Storage size** | Storage → `unit-media` | **图片文件**磁盘占用 | 凭证/房源/收款码；压缩前易暴涨 |

Postgres Free 内存只剩 ~10% 是缓存策略，Healthy，不代表磁盘告警。

### 数据存哪

- 图片 → **Storage**（`evidence/`、`{unitId}/`、`qr/`）
- 数据库 TEXT/数组 → **只存 URL**（`evidence_url`、`media_urls`、`payment_qr_code`）
- 例外：早期 base64 收款码直接写 DB 会撑大 Database size → 重新上传收款码覆盖

### 自查 SQL

```sql
-- 数据库磁盘总大小
SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;

-- 是否还有 base64 大字段（qr_len > 1000 说明可能是 base64 而非 URL）
SELECT id, length(payment_qr_code) AS qr_len
FROM admin_users
WHERE payment_qr_code IS NOT NULL AND length(payment_qr_code) > 1000;
```

Storage 占用：Dashboard → Storage → `unit-media`，可删测试文件。

详见 `docs/auth-redirect-explained.md` 第 14 节。

---

## 十五、品牌 Logo 与前端部署（2026-05-24）

### 文件位置

| 文件 | 用途 |
|------|------|
| `frontend/public/logo.png` | 线上实际使用的 Logo（圆形图标版） |
| `QQ20260524-170137.png`（项目根目录） | 源文件，可选提交 Git |

### 引用位置

- 侧边栏：`page.tsx` — 52×52 图标 + `appName` / `appTagline` 文字
- 登录页：`login/page.tsx` — 88×88 图标 + 产品名
- 手机上传页：`mobile-upload/[id]/page.tsx` — 72×72 图标
- 浏览器标签：`layout.tsx` → `icons: { icon: "/logo.png" }`

### 是否需要同步数据库？

**不需要。** Logo 是纯前端静态资源 + 样式改动，与 Supabase 无关。

### 如何上线

```bash
git add frontend/public/logo.png frontend/src/app/ ...
git commit -m "品牌 Logo + 收租核查表显示单元"
git push
```

Vercel 检测到 push 后自动 build 并部署。favicon 若未更新，浏览器强制刷新（Ctrl+F5）或清缓存。

### 与 SQL 迁移的关系

| 变更类型 | 是否需要 Supabase SQL |
|---------|----------------------|
| Logo / 前端 UI | ❌ 不需要 |
| 手机上传凭证 | ✅ `007_mobile_upload.sql` |
| Whole Unit 房型 | ✅ `008_whole_unit_room_type.sql` |
| 房源收款码与审核隔离 | ✅ `010_agent_qr_separation.sql` |
| 门牌号可选化 | ✅ `011_optional_unit_number.sql` |
| 房东收款信息（后续月租） | ✅ `013_landlord_payment_details.sql` |
| Whole Unit 合租提交/取消 | ✅ `014_tenant_interests_user_update.sql` + **`015_tenant_interest_rpc.sql`** |

---

## 十六、房源收款码与各自审核权限隔离（2026-05-24）

### 背景与逻辑
房源是由不同的 Agent 挂载的。根据业务场景，首月租金等费用应当进入该挂牌 Agent 自己的钱包。因此：
1. **收款码隔离**：房源绑定 `units.agent_id`；**首月**账单展示挂牌 Agent 收款码；**后续月**展示 `landlord_qr_code` / `landlord_bank_info`（013 迁移）。房东信息缺失时显示警告，**不再**误显示中介码。
2. **列表数据过滤**：普通管理员（Agent 角色，`adminRole !== 'super_admin'`) 登录后台时，系统会自动对其进行界面过滤，使其**只看到自己录入名下的房源、租期账单、待审核凭证**。超级管理员（`super_admin`）具有全局最高可见与操作权。
3. **随时追溯与清除凭证**：
   - 账单一旦被审核（Approved/Rejected），不会被物理删除，而是永久存储凭证 URL。
   - 优化了台账核查网格（Ledger Grid）的点击行为：现在点击任何**有凭证历史的账单格子**都会重新打开详情审核弹窗，显示当前的审核状态、当初的凭证截图以及管理员备注。
   - 提供一键 **“清除凭证 (Clear Evidence)”** 选项，用于快速作废错误截图，并会自动从 Supabase Storage 物理删除对应的原图文件。
4. **Toast 友好提示**：审核操作执行后，系统会展示 Toast 强引导：“审核已通过/驳回！可在下方‘有效租约 & 收租核查表’展开该租约查看详情”，解决界面刷新后记录“消失”的疑惑。

---

## 十七、动态地图通勤路线规划与房源单点定位（2026-05-24）

### 背景与逻辑
学生端在查看房源时，此前默认硬编码了莫纳什大学（Monash University）作为目的地的通勤路线规划。这并不符合全部学生（如双威、泰莱、马大等其他学校）的真实需求。本次优化：
1. **默认单点定位**：学生打开房源详情时，谷歌地图默认使用 **Place Mode**，直观显示且仅显示该房源小区的坐标大头针（Single Place Pin），而不再渲染默认的通勤折线。
2. **多学校聚合选择器**：
   - 动态合并 Supabase 数据库 `universities` 表与本地精选的马来西亚热门大学列表（Monash, Sunway, Taylor's, INTI, APU, UCSI, UM），确保即使数据库未录入任何数据，前端也有完整的数据源兜底。
   - 界面上提供下拉选择器，学生可以一键切换目的地。
3. **自定义目的地输入**：
   - 提供“自定义输入目的地...”选项。学生输入任何地标、商场或地址（如 "Sunway Pyramid"），点击“计算通勤”后，系统会自动调用 Google Directions API，在 Iframe 中绘制专属路线图。
4. **通勤模式与重置**：
   - 仅在定位了目的地后，才会渲染出行模式切换按钮（驾车、公交、步行），并显示清除定位重置回单点地图的选项。

---

## 十八、学生端通勤起点自动联想与地图导航（2026-05-25）

### 背景与逻辑
学生在房源详情页查看通勤路线时，手动输入目的地不够便捷，并且缺乏拼写纠错。本次优化：
1. **Google Places Autocomplete 自动联想**：
   - 接入谷歌 Places 自动完成服务。学生输入出发地关键词（例如 "monash"、"sunway"）时，输入框下方会自动浮现出精确的大马本地建筑、商场和道路联想列表。
2. **Mock 降级兜底方案**：
   - 如果网络环境无法成功加载 Google Maps API 脚本，系统会自动降级采用本地精选的一组马来西亚经典地标列表（Monash, Sunway, Taylor's, Sunway Pyramid 等）进行模糊搜索联想，保证界面高可用、不报错。
3. **选择自动计算**：
   - 用户点击联想到的地点后，系统会自动更新输入框并渲染出发点到房源的通勤路线折线图。

---

## 十九、Whole Unit 合租意向提交与自行取消（2026-05-25）

### 流程（学生端 `PropertyListings.tsx`）

```
Whole Unit 详情 → 「我要租」
    ├── 填写「自我介绍 & 室友期望」→ 「提交意向」
    └── 或 「跳过，直接提交」（空备注，同样写入 DB）
              ↓
RPC submit_tenant_interest(unit_id, note)   ← 015 迁移
              ↓
status = interested；界面显示「合租登记 1/Y（已确认入住 0 · 意向中 1）」
              ↓
下方公开名单：姓名、邮箱、备注（可展开）、状态标签
              ↓
学生随时点「取消意向」（顶部或自己那一行）→ RPC cancel_tenant_interest
              ↓
status = left（软删除）；数字归零；**无需管理员拒绝**
              ↓
管理员在 AdminPanel「租客意向」可 confirm / remove
```

### 人数怎么算？

| 显示 | 含义 |
|------|------|
| **合租登记 X/Y** | X = `interested` + `confirmed`；Y = `units.max_occupants` |
| **已确认入住** | 仅 `confirmed`（管理员点确认后） |
| **意向中** | `interested`，含刚提交未审核的 |

满员判断仍以 **`confirmed >= max_occupants`** 为准（意向中不占硬名额）。

### 其他人能看到我的意向吗？

**能。** 同一 Whole Unit 详情页内，所有登录/未登录浏览者均可看到该房源下 `status != left` 的意向名单（姓名、邮箱、备注、状态）。RLS：`Anyone can view interests`。

### 必须在 Supabase 执行的迁移

| 文件 | 作用 |
|------|------|
| `003_corenting.sql` | 建表 `tenant_interests` + 基础 RLS |
| `014_tenant_interests_user_update.sql` | 学生 UPDATE 自己的行（取消/重提 fallback） |
| **`015_tenant_interest_rpc.sql`** | **`submit_tenant_interest` / `cancel_tenant_interest`**（推荐，upsert 更稳） |

未跑 015 时，前端会 fallback 直写表，但重复提交/取消可能因 RLS 失败。

---

## 二十、智能 AI 选房推荐与 Embedding 自动向量检索（2026-05-26）

### 业务背景与逻辑
为了让 AI 助手真正具备智能找房和推荐的能力，打通了 Supabase pgvector 向量检索与 AI Agent 系统的实战功能：
1. **自动同步与重置 Embedding（On-Demand Sync）**：
   * **保存时重置**：当管理员在后台 `AdminPanel.tsx` 中创建房源（`insert`）或更新房源信息（`update`）时，前端会自动将 `embedding` 列显式置为 `null`。这确保了只要房源描述、房型、租金等信息发生变化，旧有的失效向量就会被自动清空。
   * **查询时生成**：当用户在 AI Chat 中提出找房或推荐偏好时，后端 `search_internal_db` 会自动扫描数据库中所有 `embedding` 为 `null` 的可用房源，提取其 `小区名 + 房型 + 描述文本` 调用 `AI_EMBEDDING_MODEL`（如 `BAAI/bge-large-zh-v1.5`）生成全新向量，并由免 RLS 校验的 `supabase_service_client` 自动更新写回。
2. **位置坐标与媒体图片补全 (Data Enrichment)**：
   * Supabase 的 RPC 函数 `match_units` 检索相似房源后，后端会自动联查该房源的真实**小区 GPS 经纬度 (`lat`/`lng`)** 以及关联的**媒体图片列表 (`media_urls`)**。
3. **工具激活与系统提示更新**：
   * 解除了 AI 助手原本“禁止推荐房源”的硬编码限制，将 `search_internal_db` 搜房工具正式注册并暴露给 Live Agent 的 ReAct 决策循环。
4. **流式推送 `MapAndCard` 视觉地图组件**：
   * 当 AI 选房检索到高度匹配的房源后，流式接口会立即下发一条 `type: "ui_component"` 事件。
   * 前端 `AIChat.tsx` 动态接收该事件，并在聊天对话中原地渲染出专属的 `MapAndCard` 重交通地图组件（绘制房源起点至莫纳什大学终点的自适应路线及步行/公交/驾车测算）与房源富媒体卡片，实现文本问答与视觉地图的交互体验。

---

## 二十一、多中介独立挂牌、复制挂牌与保存语义（2026-05-26）

### 业务模型

- 同一物理房源可由**多个中介各建一条 `units` 记录**（文案可重复，**互不同步**）。
- 学生看到的联系人、收款码、房东信息，均来自**当前点击的那一行**的 `agent_id` 与 `landlord_*` 字段。
- 中介个人主页只展示 `agent_id === 该中介.id` 的房源（严格匹配）。

### 管理端三种操作

| 操作 | `editingUnitId` | 数据库行为 |
|------|-----------------|------------|
| **新增房源** | `null` | `INSERT` 新行，新 UUID |
| **编辑 → 保存**（含内容未改） | 有值 | `UPDATE` **同一条**，覆盖字段；**不新建** |
| **复制挂牌 → 保存为新房源** | `null`（`isCopyDraft`） | `INSERT` **新行**；复制文字+房东收款，**不复制**图片/视频 |

### 给运营的一句话

- 只想补 `agent_id` 或改租金：**点编辑，保存** → 还是原来那条。
- 想给自己再挂一套相同信息：**用复制挂牌**，保存后才是新记录。

---

## 二十二、整组联保合租租约变更与退租替换 (2026-05-26)

### 业务场景
合租整个 Unit（Whole Unit）的连带责任条款与单间不同。在整组联保租约中，若某一人退租，除非退租人或其余室友在退出前找到合法的继租人并完成更替，否则将被视作整组合约违约。
本项目支持对整组租约中的单个成员进行**原子替换与租期无缝更替**，既保护了其余室友的正常承租权，又留存了历史财务台账。

### 开发实现与逻辑

1. **数据库原子事务设计 (`019_lease_transfer.sql` Migration)**:
   * 采用 `substitute_co_tenant` 数据库 RPC 函数以保障数据的完整性和一致性。
   * **起止日期无缝衔接**：将退租人的原租约状态标记为 `'transferred'`，其结束日期更新为 `生效日前一日 (transfer_date - 1)`；新继租人的租约状态设为 `'active'`，起止时间自 `生效日 (transfer_date)` 至原租约的 `end_date`。
   * **租金按整月核算（无天数比例折算）**：根据“当月一旦交租，住满任意天数均按整月计”的原则，不对更替发生月租金进行拆分分摊：
     * 原退租人承担变更生效当月（更替发生的那个自然月）的整月租金。
     * 新继租房客从生效日次月（若生效日正好是该月1日，则为当月）起开始生成标准整月租金账单。
     * 自动清理原退租人尚未支付的所有未来月份账单。
   * **押金流向方案**：提供 3 种模式：
     1. `transfer_to_new` (押金直接转让给新继租人)
     2. `refunded` (全额退还给原房客，新房客需另行交纳)
     3. `forfeited` (没收违约退租人押金，新房客需另行交纳)
   * **意向人状态切换**：退租人的合租意向状态更新为 `'left'`，新房客的状态转为 `'confirmed'`。

2. **管理端变更操作向导 (`AdminPanel.tsx` 租约变更 Modal)**:
   * 仅在 active 状态且房型为 `Whole Unit` 的有效租约行旁，展示 `RefreshCw` 变更替换按钮。
   * 打开 Glassmorphic 主题风格的向导弹窗，管理员可：
     * **选择新继租房客**：分类展示“已确认意向的替换房客候选人”和“所有其他注册房客”。
     * **设定替换生效日期**：限制在原租约有效期内，并提示当月整月租金归属说明。
     * **选择原押金处理方案**：单选转让/退还/没收。
     * **添加变更备注说明**。
   * 提供 Live 模式 (Supabase RPC) 与 Sandbox 模式 (LocalStorage Mock) 的双轨兼容执行。

3. **学生端室友展示与退租联保警告 (`StudentPortal.tsx` 动态警告板)**:
   * **合租室友名单**：当学生承租的是 `Whole Unit` 房型时，系统自动联动加载同组 `lease_group_id` 的所有其他合租人名单、起止期限和租约状态。
   * **室友退租/违约风险警示**：如果名单中出现已办理退租变更（状态为 `transferred`）的成员，系统将立即挂载醒目的 **合租联保退租警示 (Joint Tenancy Breach Warning)** 红色卡片，提醒留守室友连带责任风险，催促其尽快寻找替换继租人，并提供管理员 Nick Chan 的一键联系渠道。

---

## 二十三、学生端意向取消机制优化与微信图标渲染修正 (2026-05-26)

1. **意向取消按钮去重**：
   * 在整组联保（Whole Unit）合租详情中，移除了顶部标题栏中多余重复的“取消意向”按钮。
   * 仅保留室友卡片列表中当前用户自身（带有 “我 / Me” 标签）卡片内的“取消意向”按钮，布局层次更明确，逻辑操作更有针对性。

2. **UI 弹窗向 Glassmorphic Modal 升级**：
   * 移除了传统的浏览器原生 `window.confirm` 和 `alert` 确认弹窗。
   * 在 `PropertyListings.tsx` 中开发了轻量级、响应式的 **磨砂玻璃质感确认模态框 (`confirmDialog` Modal)**，完美融合整体的 Glassmorphism 设计规范，并在所有合租/租房意向取消时平滑弹出。

3. **微信图标完整性修复**：
   * 发现由于原 `WeChatIcon` 的 SVG 矢量路径只包含单边气泡（微信双气泡中的右侧部分）且 viewBox 不匹配，导致图标看起来像“被白色容器遮挡了一半”。
   * 替换为了官方标准的 24x24 微信双气泡完整矢量路径，彻底解决了微信图标显示残缺的视觉 Bug。

4. **收银台模态框关闭按钮与遮罩层点击关闭优化 (`LeaseLedgerCard.tsx`)**：
   * 针对学生端账单支付（缴纳租金）弹窗在暗色遮罩背景下关闭按钮（X）不明显的问题，将其移至外层并用圆形的纯白实体背景包裹（`width/height: 36px`, `background: #ffffff`, `color: #374151`, 带有精致的柔和阴影），使其极具可读性和点击亲和力。
   * 同时为外层 `modal-overlay` 增加了点击关闭事件，并对 `.modal-content` 设定了防穿透的 `e.stopPropagation()`，支持点击空白处快速退出的便捷交互。

---

*由 Antigravity AI 辅助生成 · Malaysia Ez Rent Project*
