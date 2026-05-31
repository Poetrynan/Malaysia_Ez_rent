# 🏠 Malaysia Ez Rent — 开发进度总结

> 最后更新：2026-05-30 (UTC+8)
> 状态：**前端可跑 · 后端 Agent · Google OAuth + Magic Link · 超级管理员 · Supabase Storage（压缩+删除同步）· 手机上传凭证（007）· Whole Unit 合租意向 RPC（014/015）· 学生已租房源隐藏”我要租”并置灰显示”已承租” · 意向操作状态全面重构为 Glassmorphic 临时 Toast · 所有 Toast 升级为高级磨砂玻璃微光动效 · 缴租银行/微信/支付宝 · 首月付中介/后续付房东 · 禁止 iProperty 外部搜房 · Vercel & Render 部署 · 房源列表卡片/列表模式切换 · 智能租客选择器 · 登录页多语言与深色模式 · AI智能选房与Embedding自动向量检索同步 · 报修中心独立一级Tab（含折叠指示器） · AI欢迎语多语言动态切换 · 隐藏技术栈提示横幅 · 中介个人主页与详情面板 · 头像文件压缩防暴涨(30KB) · 移除社交外链以限定内部闭环 · 多中介独立挂牌（不共享行）· 复制挂牌 · agent_id 补写 · 非负数字输入 · 学生端列表加载重试 · 编辑保存=覆盖同一条 · 微信图标UI修复与WA链接优化 · 租客自主终止租约 RPC (018) + 押金扣除警告 · 整组联保合租退租继租变更 (019) · 继租人原子替换与天数比例折算分摊 · 存续押金转让/退还/没收方案 · 学生端合租室友名单及提前退租联保警示警告 · 数据库加载并行联表优化（消除加载延迟） · 进度流延伸与呼吸光点落点校准修复 · **中介注册系统与审核工作流（022）** · **个人信息扩展字段与证件上传（023）** · **账户注销 Server Action 彻底清理数据** · **Profile 跨实例同步与 Toast 通知** · **房源门牌号彻底移除与工单仅展示个人资料房号（026）** · **AI Agent 智能化改造（移除硬编码，LLM 意图解析）** · **管理端数据看板 Dashboard（recharts 图表）** · **MapAndCard 通勤地图直接渲染**


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
│   ├── FAQ.md                     # 常见问题答疑（Supabase Auth、手机上传、Logo 部署、Memory vs Storage、账户注销、中介注册）
│   ├── ai-architecture.md         # AI Agent 架构与后续开发指南
│   ├── 前后端解释.md               # 前端与后端协作原理详解（Supabase SDK、RLS、HTTP 请求流程）
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
| `PropertyListings.tsx` | ✅ 完成 | 列表/筛选/Lightbox/视频；**精准展示该房源对应 Agent 的联系方式**；卡片/行显示 **中介：display_name**；`loadListings` 失败可重试、登录后自动刷新；**Whole Unit 合租**：RPC 提交/取消意向、合租登记 X/Y、公开意向名单；学生详情 **所属中介** + 中介主页（WhatsApp/微信 **暂无** 兜底）；`getUnitsForAgent` 严格 `agent_id` + `UnitWithCommunity` 类型；**修复微信图标显示不全与 WhatsApp 链接格式兼容性问题**；**学生已租房源隐藏“我要租”按钮并显示“您已承租此房源”；意向状态反馈重构为临时 Toast 提醒以移除详情页内的持久化取消意向横幅，且所有 Toast 升级为高级磨砂玻璃微光设计；新增 ProgressFlow 通用组件实现循环延伸进度动画；修复合约终止后房源状态与意向同步重置 Bug** |
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
| `018_tenant_terminate_lease.sql` | **租客自主终止租约**：`tenant_terminate_lease` RPC (SECURITY DEFINER) 允许学生自主发起退租并释放房源 |
| `019_lease_transfer.sql` | **整组联保租约变更与退租替换**：`substitute_co_tenant` RPC 原子更替合租室友并生成接续账单与退/转押金 |
| `020_anon_property_upload.sql` | **移动端房源图片上传**：允许移动端匿名上传图片至 `property/` 目录，并创建 `mobile_upload_sessions` 表暂存上传批次 |
| `021_user_unit_number.sql` | **用户门牌号关联**：`users` 表新增 `unit_number` 字段，学生可绑定当前租住房号 |
| `022_agent_registrations.sql` | **中介注册系统**：`agent_registrations` 表（REN 验证 + 审核工作流）+ 马来西亚手机号/REN 编号标准化函数 + Storage `ren-tags/` 策略 |
| `023_user_profile_extended.sql` | **个人信息扩展**：`users` 表新增 `passport_number`、`school`、`company`、`local_id_number`、`document_url` 字段，支持外国人护照/本地人 IC 双轨填写 |
| `024_maintenance_conversation.sql` | **工单对话线程**：`admin_reply` TEXT 改为 `replies` JSONB（支持最多 3 轮 Agent↔Student 对话），移除 `rating` 列 |
| `025_fix_missing_public_users.sql` | **修复缺失用户行**：重建 `handle_new_auth_user` 触发器 + 补建所有缺失的 `public.users` 行（解决工单列表显示 UUID 问题） |
| `026_remove_unit_number_column.sql` | **删除房源列表房号**：从 units 表中彻底 DROP 掉 unit_number 字段以防止中介恶意竞争，并重构前端工单/报修系统仅展示用户个人信息的房间号 |

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
└── 018_tenant_terminate_lease.sql # 租客自主终止租约 RPC
└── 019_lease_transfer.sql       # 整组联保租约变更与退租替换 RPC
└── 020_anon_property_upload.sql # 移动端房源上传 session 表与 property 存储策略
└── 021_user_unit_number.sql    # users 表加 unit_number 字段
└── 022_agent_registrations.sql # 中介注册系统（REN验证 + 审核工作流）
└── 023_user_profile_extended.sql # 个人信息扩展（护照/IC/学校/公司/证件上传）
└── 024_maintenance_conversation.sql # 工单对话线程（admin_reply TEXT → replies JSONB，移除 rating）
    └── 025_fix_missing_public_users.sql # 修复缺失用户行（重建触发器 + 补建 public.users）
    └── 026_remove_unit_number_column.sql # 删除房源列表房号（彻底 DROP 掉 units.unit_number）
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

详见 `docs/FAQ.md`。

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

详见 `docs/FAQ.md`。

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


---

## 二十四、进度节点线条动态延伸动画（2026-05-27）

### 背景与需求
为了增强用户对进度流程的视觉感知，在进度节点之间的连接线上添加了动态延伸效果，让线条看起来像是在"生长"到下一个节点，提供更直观的进度反馈。

### 实现的动画效果

#### 1. **动态线条延伸**
- 连接线从左到右平滑"生长"到下一个节点
- 根据进度状态自动调整长度（0% → 50% → 100%）
- 使用缓动函数 `cubic-bezier(0.4, 0, 0.2, 1)` 实现自然的加速减速效果
- 持续时间：0.8秒（PropertyListings）/ 1.5秒（LeaseLedgerCard）

#### 2. **发光光点效果**
- 在线条末端添加脉动的光点
- 光点跟随线条延伸移动
- 持续的脉动发光效果（`pulse` 动画），吸引用户注意力
- 光点大小：6px 圆形，带有多层阴影

#### 3. **节点动画增强**
- 激活的节点会放大（scale 1.05-1.1倍）
- 添加发光阴影效果（`box-shadow: 0 0 12px var(--primary)`）
- 颜色和状态平滑过渡（transition: all 0.5s ease）

### 更新的组件

| 组件 | 位置 | 改动内容 |
|------|------|---------|
| **PropertyListings.tsx** | 合租模式进度流程（行 1010-1065） | 添加动态进度线 + 末端光点 + 节点缩放动画 |
| **PropertyListings.tsx** | 整租模式进度流程（行 1127-1160） | 同上 |
| **LeaseLedgerCard.tsx** | 租约进度流程（行 188-215） | 添加线条延伸动画 + 光点滑动效果 |
| **globals.css** | 文件末尾 | 新增 4 个 CSS 动画定义 |

### 新增的 CSS 动画

#### `@keyframes extendLine`
- 线条从 0 宽度延伸到 100%
- 透明度从 0 渐变到 0.6
- 用于 LeaseLedgerCard 的完整进度线

#### `@keyframes slideToEnd`
- 光点从起点滑动到终点
- 配合线条延伸同步移动
- 透明度渐入效果

#### `@keyframes glowPulse`
- 光点的脉动发光效果
- 阴影从 12px 扩展到 36px
- 缩放从 1.0 到 1.2
- 无限循环动画（1.5秒周期）

#### `@keyframes pulse`
- 简化版脉动效果
- 用于 PropertyListings 的进度光点
- 透明度和缩放变化
- 更柔和的视觉效果

### 技术细节

**动画参数：**
- **持续时间**：0.8秒（PropertyListings）/ 1.5秒（LeaseLedgerCard）
- **缓动函数**：`cubic-bezier(0.4, 0, 0.2, 1)` - 平滑的加速减速
- **变换原点**：`left center` - 从左侧开始延伸

**视觉效果：**
1. **基础灰线**：始终显示，表示完整路径
2. **动态蓝线**：根据进度状态动态延伸
3. **发光光点**：
   - 位于动态线条末端
   - 持续脉动发光
   - 跟随线条移动
4. **节点动画**：
   - 激活时放大 1.05-1.1 倍
   - 添加发光阴影
   - 颜色平滑过渡

**状态映射（PropertyListings）：**
- **0%**：仅显示"已发起"节点
- **50%**：延伸到"已同意"节点
- **100%**：延伸到"已生效"节点

### 响应式设计
- 所有动画都支持 `prefers-reduced-motion`
- 在用户设置减少动画时自动禁用
- 保持可访问性标准

### 用户体验改进
1. ✅ 清晰的进度可视化
2. ✅ 动态反馈增强参与感
3. ✅ 光点引导用户注意力
4. ✅ 平滑过渡避免突兀感
5. ✅ 脉动效果表示活跃状态

### 浏览器兼容性
- 现代浏览器完全支持
- CSS 动画和过渡效果
- backdrop-filter 已有良好支持
- 降级优雅（无动画时仍可用）

### 部署说明
**对线上部署的影响：零风险** ✅

1. **不需要数据库迁移** - 没有改 schema
2. **不需要重新配置环境变量** - 没有新的配置项
3. **不影响现有用户数据** - 纯前端视觉层
4. **向下兼容** - 旧浏览器不支持动画时会优雅降级（显示静态版本）
5. **性能影响微乎其微** - CSS 动画由 GPU 加速，不占用主线程

---

## 二十五、学生门户加载性能与网络延迟优化（2026-05-27）

### 背景与优化
在学生端登录后打开“我的租约”时，以前的代码采取串行多次请求：查租约 -> 查不到则查合租意向 -> 查到后再查房源与小区。这种串行等待导致页面切换有明显的白屏卡顿与渲染延迟。
- **并行合并请求**：重构 `StudentPortal.tsx` 的 `load` 数据接口，使用 `Promise.all` 将原本串行的 `leases` 和 `tenant_interests` 进行并行查询。
- **PostgREST 嵌套联表**：将 `tenant_interests` 的查询改用 PostgREST 的嵌套选择：
  ```typescript
  supabase.from('tenant_interests').select('*, units(*, communities(*))')
  ```
  这直接在一次数据库请求中将意向房源及其关联的小区信息一次性加载并解析完毕。
- **优化效果**：页面加载网络延迟大幅降低，从多次往返优化为仅 1 次并行联表网络往返，页面切换顺滑，无加载停顿。

---

## 二十六、进度流等分布局与呼吸光点圆心对齐校准（2026-05-27）

### 背景与优化
在此前进度流程（ProgressFlow）的布局设计中，由于各节点文本长度（特别是中英文切换下）存在差异，且采用 `justify-content: space-between` 布局，导致节点圆心的物理位置并不处于固定百分比位置，致使流光线条与呼吸光点的定位产生偏离或超出节点的视觉 Bug。
- **数学等分布局重构**：
  * 将 `ProgressFlow` 中每个节点容器重构为 `flex: 1`。
  * 精确标定 4 个节点圆心在容器宽度的：`12.5%`、`37.5%`、`62.5%`、`87.5%`。
  * 此布局在任何屏幕尺寸和多语言（中文/英文）下都具有 100% 完美的数学对称性，彻底免去了复杂的 `calc()` 计算。
- **呼吸光点中心校准**：
  * 为呼吸光点（宽度 6px）添加 `marginLeft: '-3px'` 的偏移，使光点本身的几何中心与进度位置精准对齐，且不与 `transform` 的缩放呼吸动画产生冲突。
- **唯一生效租约校验（一人一房限制）**：
  * 在 `PropertyListings.tsx` 的 `expressInterest` 与 `coRentJoin`（加入合租）点击事件中，新增已生效租约的校验机制。
  * 当检测到用户当前已有生效的租约合同（`myLeasedUnitIds.length > 0`）时，拦截其在新房源下发起意向的请求，并弹出玻璃拟态 Toast 警告提醒用户，避免一人承租多房的冲突。
- **修改组件**：同步更新 `PropertyListings.tsx` 与 `StudentPortal.tsx` 两处组件。

---

*文档更新：2026-05-27 · 并行联表消除加载延迟、进度条动画等分对齐、唯一生效租约校验*

- **2026-05-27 删除操作同步与全局确认 Modal 体验升级**
  - **Mock 数据库 delete 方法实现**：为 `MockQueryBuilder` (in `lib/supabase.ts`) 完整补全了 `.delete()` 方法与 `isDelete` 逻辑，确保系统在无 Supabase 凭证运行的 Mock 模式下，所有的删除操作也能正常同步清除 localStorage 数据，避免由于方法未定义导致的运行时报错。
  - **Supabase 删除语句同步校验**：核对并校验了管理员端与学生端所有的删除或取消操作（如删除管理员、删除房源、删除社区、删除/归档租约、清除缴费凭证、取消租约意向等），确保在联机模式下它们皆能按表结构规范同步执行 `delete()`/`update()` 对数据库进行持久化。
  - **确认框体验升级 (轻量化 Modal 升级)**：将管理员端中所有残存的浏览器原生原生弹窗 `confirm()` 彻底替换为符合项目设计规范的玻璃磨砂风格 Generic Confirmation Modal。

- **2026-05-27 级联删除机制实现**
  - **数据库级联删除依赖同步**：为管理员端的房源删除 (`deleteUnit`) 和租约删除 (`deleteLease`) 分别实现了深度级联清除逻辑（级联删除关联的付款账单 `payment_records` 与退租继租变更记录 `lease_transfers` 等），避免由于外键约束（`ON DELETE RESTRICT`）导致数据库静默失败或报错，确保前端点击删除时，数据库内容会被彻底同步清除。

- **2026-05-27 租约删除时自动物理清理付款凭证**
  - **账单凭证云端物理删除**：升级了 `deleteLease` 逻辑，在执行租约删除操作时，系统会自动提取该租约下所有账单关联的已上传汇款凭证图片（如 `evidence/{paymentId}.jpg` 等），并调用存储桶 API 将它们从云端 `unit-media` 存储中物理移除，确保无论在数据表还是多媒体存储桶里都不会留存任何冗余文件。

- **2026-05-27 管理员端数据库联机状态标识与模拟缓存重置功能**
  - **联机状态动态标识**：在管理员控制面板顶部添加了明显的“数据库连接状态”标识。如果用户使用的是无密码/沙盒测试模式登录，会显示黄色的“离线模拟模式 (LocalStorage)”，表明此时所有操作都只会作用于本地浏览器缓存，从而完美打消“删除了为什么真数据库还在”的误解。
  - **重置模拟数据缓存**：为离线模拟模式新增了“重置模拟缓存”快捷按钮，供测试时一键清空本地浏览器缓存数据（LocalStorage），恢复至初始状态。

- **2026-05-27 收款二维码删除/上传交互与数据库写入问题修复**
  - **添加操作反馈**：为二维码删除确认操作补全了 Toast 提示（“收款码已成功删除” / “Payment QR deleted successfully”）。
  - **解决重新上传无反应问题**：在二维码删除/上传后，重置 `<input type="file" />` 的 value 值，确保用户再次选择相同文件时能正常触发 `onChange` 上传事件。
  - **修复新注册管理员无法写入数据库问题**：
    - **修改 RLS 策略**：更新了 `admin_users` 表的安全策略（`Allow self insert/update admin`），允许新管理员安全注册以及更新属于自己的账户记录。
    - **动态绑定与自动初始化**：在 `AdminPanel` 初始化时引入了自动绑定与自注册逻辑。如超级管理员在后台以随机 UUID 和邮箱创建了管理员，当该邮箱首次登录时，系统会自动把它的 `admin_users.id` 变更为真实的 Supabase Auth 唯一 ID；若为全新的管理员邮箱登录，也会自动为其生成一条初始数据记录，从根本上解决由于 ID 不匹配、无对应数据行导致的数据库无法写入、更新失败等问题。

- **2026-05-27 门牌号校验提示文案同步更新**
  - **同步本地化翻译**：已更新中英双语的 `validationUnitRequired` 提示，移除废弃的“门牌号”必填文本，提示精简为“请选择小区和月租后再保存”（中国语）与“Please select a community and monthly rent before saving”（英语），使其与实际无需门牌号的校验机制逻辑完全吻合。

- **2026-05-27 管理员自注册安全性收紧与漏动修复**
  - **漏洞起因**：由于 React 挂载 `AdminPanel` 时，即使针对学生角色通过样式 `display: none` 进行了隐藏，其内部生命周期 `useEffect` 依然会针对所有已登录用户运行。这会导致普通学生用户登录时触发自注册逻辑，自动将自己写入 `admin_users` 表成为 editor 级别管理员。
  - **安全修复**：
    - **前端限制**：在 `AdminPanel.tsx` 初始化时，限制仅允许根超级管理员邮箱 `admin@ezrent.my` 执行缺省自注册插入，普通学生/其他邮箱不作任何自注册操作，只进行已有邮箱 ID 的绑定与匹配。
    - **后端 RLS 加固**：修改 `Allow self insert admin` 的 SQL 安全策略，强制仅允许 `admin@ezrent.my` 作为首位超级管理员在注册时插入记录，且只能设为 `super_admin` 角色，堵死通过该通道注册任何 `editor` 角色的可能性。
    - **安全映射策略**：为 `Allow self update admin` 策略增加基于 `email = auth.jwt()->>'email'` 的校验。支持普通管理员（由超级管理员手动添加了邮箱）在首次登录时通过自己绑定的邮箱，安全地将自己预存的随机 UUID 记录更新为自己的真实 `auth.uid()`。

- **2026-05-27 微信/App内置浏览器环境检测与Google 403报错拦截引导**
  - **根本原因**：Google OAuth 官方安全策略规定禁止在嵌入式 WebView/内置浏览器中进行授权登录（防止钓鱼劫持），若在微信、QQ、抖音等 App 内部扫码打开直接点击 Google 登录，会报 `403: disallowed_useragent` 错误。
  - **优化方案**：在 `LoginPage` 中引入客户端 User-Agent 检测逻辑（覆盖 WeChat, QQ, Weibo, Lark/Feishu, DingTalk 以及 Android/iOS 各种嵌入式 Webviews），一旦检测到处于内置浏览器环境，登录页面的 Google 登录按钮上方会自动弹出红色警告提示卡，指引用户”点击右上角菜单选择「在浏览器中打开 / Open in Safari / Chrome」”，实现完美避坑。

---

## 二十七、中介注册系统与审核工作流（2026-05-28）

**目标：** 支持中介（REN）自助注册，经超级管理员审核后获得管理员权限。

**数据库迁移：** `022_agent_registrations.sql`
- 新建 `agent_registrations` 表：`full_name`、`phone`、`whatsapp`、`agency_name`、`ren_number`、`ren_tag_image_url`、`verification_status`（pending/approved/rejected/suspended/banned）
- 新增标准化函数：`normalize_my_phone()`（马来西亚手机号统一为 `601xxxxxxxx`）、`normalize_ren()`（REN 编号统一为 `REN12345` 格式）
- CHECK 约束：手机号 `^601[0-9]{8,9}`、REN `^REN[0-9]{4,7}`
- RLS 策略：匿名可 INSERT（注册页）、用户可读自己的、管理员可读/更新所有
- Storage 策略：`ren-tags/` 目录允许匿名上传 REN 牌照图片

**前端页面：** `frontend/src/app/register-agent/page.tsx`
- 登录后可见，未登录自动跳转 `/login`
- 表单字段：姓名、电话、WhatsApp（选填）、中介公司、REN 编号（自动大写）、REN 牌照图片（压缩后上传）
- 提交后显示”您的申请已提交，请等待审核”成功页面
- Mock 模式：存入 localStorage `ez_agent_registrations`

**登录页集成：** `frontend/src/app/login/page.tsx`
- 底部新增”🏠 申请成为中介（需审核）”链接，跳转 `/register-agent`

**管理端审核：** `AdminPanel.tsx` 新增 `admin-agent-reviews` Tab
- 超级管理员可见，显示待审核数量红点
- 列表展示所有申请：姓名、电话、中介公司、REN 编号、REN 牌照图片预览
- “批准”操作：更新 `verification_status = 'approved'`，自动创建 `admin_users` 记录
- “拒绝”操作：更新 `verification_status = 'rejected'`，需填写拒绝原因

**i18n 新增键：** `agentRegTitle`、`agentRegDesc`、`agentRegName`、`agentRegPhone`、`agentRegWhatsapp`、`agentRegAgency`、`agentRegREN`、`agentRegTagImage`、`agentRegSubmit`、`agentRegSuccess`、`agentRegPending` 等中英双语翻译

---

## 二十八、个人信息扩展字段与证件上传（2026-05-28）

**目标：** 支持学生填写更多个人信息（护照/IC、学校、公司），上传证件照片供中介参考。

**数据库迁移：** `023_user_profile_extended.sql`
- `users` 表新增：`passport_number VARCHAR(50)`、`school VARCHAR(120)`、`company VARCHAR(120)`、`local_id_number VARCHAR(50)`、`document_url TEXT`

**StudentPortal.tsx 扩展：**
- 新增状态变量：`profilePassport`、`profileSchool`、`profileCompany`、`profileLocalId`、`profileDocUrl`、`profileDocBase64`、`profileDocUploading`
- `loadProfile` 扩展读取 5 个新字段（Mock localStorage / Live Supabase 双模式）
- `saveProfile` 扩展：如有证件图片，先 `compressDataUrl`（1200×1200, JPEG 75%）压缩后上传至 `documents/{timestamp}.jpg`，URL 写入 `document_url`
- 证件选择：`handleDocChange` 读取文件 → 压缩 → 预览

**Profile 页面布局重构：**
- 从单列（maxWidth: 420）改为**两列 CSS Grid**（`gridTemplateColumns: '1fr 1fr'`），右侧空间充分利用
- 第一区：基本信息（姓名、电话、门牌号、学校、公司）
- 第二区：蓝色提示框”外国人请填护照号码，马来西亚本地人请填 IC 号码，至少填一项” + 护照/IC 双栏
- 第三区：证件上传（虚线边框上传按钮 + 预览）
- 第四区：保存按钮

**i18n 新增键：** `profileExtraHint`、`profileIdHint`、`profilePassport`、`profileSchool`、`profileCompany`、`profileLocalId`、`profileDocument`、`profileDocumentDesc`、`profileDocumentUpload` 等中英双语翻译

---

## 二十九、账户注销 Server Action 彻底清理数据（2026-05-28）

**目标：** 租客注销账户后，所有个人数据从数据库彻底删除，但不影响 Agent 的财务记录（leases、payment_records 保留）。

**数据清理策略：**
| 表 | 操作 | 原因 |
|---|---|---|
| `tenant_interests` | DELETE | 租客个人意向 |
| `maintenance_requests` | DELETE | 租客报修工单 |
| `agent_registrations` | DELETE | 如有中介申请记录 |
| `admin_users` | DELETE | 如有管理员记录 |
| `users` | DELETE | 租客个人资料 |
| `auth.users` | DELETE (Server Action) | Supabase 认证账户 |
| `leases` | **保留** | Agent 的财务台账 |
| `payment_records` | **保留** | Agent 的收款记录 |

**前端 Mock 模式：** `page.tsx` 的 `handleDeleteAccount` 清理 localStorage 中的 `users`、`tenant_interests`、`maintenance_requests`、`agent_registrations`、`admin_users`，保留 `leases` 和 `payment_records`

**前端 Live 模式：** 调用 Server Action `deleteAccountAction()` → 清除本地状态 → `auth.signOut()` → 跳转 `/login`

**Server Action：** `frontend/src/app/actions/deleteAccount.ts`
- `'use server'` 指令，在 Vercel 服务端执行
- 从 cookies 获取当前用户 → 依次删除 5 张表的用户数据
- 使用 `SUPABASE_SERVICE_ROLE_KEY` 创建 admin client → `auth.admin.deleteUser()` 删除认证账户
- Service Role Key 仅存于 Vercel 环境变量，不暴露给浏览器

---

## 三十、Profile 跨实例同步与 Toast 通知（2026-05-28）

**目标：** 解决 `page.tsx` 中两个独立 `<StudentPortal>` 实例（mode='profile' 和 mode='maintenance'）状态不同步问题，保存个人信息后自动刷新维修模块的用户数据。

**问题根因：** 两个 `<StudentPortal>` 各自独立 mount，有各自的 `loadProfile` 调用和本地 state。在 profile tab 保存个人信息后，maintenance tab 的 StudentPortal 不知道数据已更新。

**解决方案：** `window.dispatchEvent` + `addEventListener` 事件同步
- `saveProfile` 成功后 dispatch `new Event('ez_profile_updated')`
- 每个 StudentPortal 实例 mount 时 `addEventListener('ez_profile_updated', loadProfile)`
- 卸载时 `removeEventListener` 清理

**Toast 通知组件：**
- 保存成功/失败时显示顶部居中浮层（`position: fixed; top: 24; left: 50%; transform: translateX(-50%)`）
- 成功绿色（`var(--success)`）、失败红色（`var(--danger)`）
- 3 秒后自动消失（`setTimeout` 清空 `toastMsg`）
- 无需引入第三方库，零依赖实现

---

## 三十二、Toast 全局统一优化（2026-05-29）

**目标：** 所有 Toast 组件风格、位置、图标完全统一，消除空白和 emoji。

**改动：**
- 三个组件（AdminPanel、PropertyListings、StudentPortal）Toast 全部统一：
  - 顶部居中（`position: fixed; top: 24; left: 50%; transform: translateX(-50%)`）
  - 磨砂玻璃质感（`backdrop-filter: blur(16px)` + `var(--glass-bg)`）
  - Lucide 图标（`CheckCircle2` / `XCircle` / `AlertTriangle`），不用 emoji
  - 文字居中（`justify-content: center`）
  - 宽度自适应内容（`width: fit-content`），消除多余空白
  - 入场动画 `slideDown 0.3s cubic-bezier(0.16,1,0.3,1)`
- 工单 enrichment 查询加详细错误日志（`console.error` 每一步），方便 F12 调试
- 024 迁移未执行时自动 fallback：读取 `admin_reply` → 转为 `replies` 格式显示

---

## 三十三、中介注册页去除登录前置（2026-05-29）

**目标：** 未登录用户也能先填写中介注册表单，提交时再要求登录。

**改动：**
- 移除 `register-agent` 页面的登录拦截（原来未登录直接显示"请先登录"）
- 表单始终可见，未登录时顶部显示蓝色提示"您可以先填写表单，提交时会要求您登录"
- 提交时如果未登录：将表单数据（含 REN 执照 data URL）保存到 `localStorage('ez_agent_draft')`，跳转 `/login`
- 登录后返回 `/register-agent`：`checkAuth` 自动从 localStorage 恢复表单数据，用户只需再点一次提交
- 修复验证逻辑：draft 恢复后 `renTagFile` 为 null，改为同时检查 `renTagFile || renTagImage`
- 修复上传逻辑：draft 恢复后从 data URL 转 blob 上传（`fetch(dataUrl).blob()`）

---

## 三十一、工单对话线程重构与评分移除（2026-05-28）

**目标：** 工单系统支持 Agent↔Student 最多 3 轮对话，答复不再自动归档，移除鸡肋的星级评分。

**问题：**
- 原设计：Agent 点"答复"后自动 `status = 'resolved'` 归档，学生无法继续沟通
- 原设计：仅支持单条 `admin_reply`，无对话能力
- 原设计：有星级评分功能，实际无人使用

**数据库迁移：** `024_maintenance_conversation.sql`
- `admin_reply TEXT` → `replies JSONB DEFAULT '[]'`，存储格式：`[{role: 'agent'|'student', content: '...', at: '...'}]`
- 迁移旧数据：现有 `admin_reply` 自动转为 `[{role:'agent', content:..., at:...}]`
- 删除 `rating` 列
- 新增 `updated_at` 自动更新触发器

**AdminPanel 改动：**
- `replyFeedback` → `sendFeedbackReply`：追加到 `replies` 数组，设 `status = 'in_progress'`（不自动归档）
- 显示对话线程：Agent 消息靠右（蓝色背景），Student 消息靠左（中性背景）
- 回复计数：显示 `(0/3)`、`(1/3)` 等，达到 3 次后禁用输入
- "解决并归档"按钮始终可用，由 Agent 手动触发
- 移除星级评分显示
- 侧边栏红点改为检测新 Student 回复（`feedbackHasNewReply`）

**StudentPortal 改动：**
- 移除 `submitRating` 函数和星级评分 UI
- 新增 `sendStudentReply`：追加到 `replies` 数组
- 显示对话线程：Agent 消息靠左（蓝色背景），Student 消息靠右（中性背景）
- 回复输入框：仅在工单未关闭且 Agent 已回复时显示，Student 回复数不能超过 Agent 回复数
- 侧边栏通知：检测新 Agent 回复

**Toast 统一：**
- 所有三个组件（AdminPanel、PropertyListings、StudentPortal）的 Toast 统一为：顶部居中、磨砂玻璃、Lucide 图标（`CheckCircle2`/`XCircle`/`AlertTriangle`）

## 三十五、工单列表用户名修复 — 缺失 users 行补建（2026-05-29）

**问题：** 工单列表显示 UUID 前 8 位而非用户姓名。原因：`handle_new_auth_user` 触发器若未在数据库中创建，Auth 注册不会自动写入 `public.users` 行，导致 enrichment 查询 `users` 表时找不到对应记录。

**数据库迁移：** `025_fix_missing_public_users.sql`
- 重建 `handle_new_auth_user` 触发器（确保未来新用户自动创建 `public.users` 行）
- 补建所有缺失的 `public.users` 行：从 `auth.users` 的 `raw_user_meta_data` 提取 `full_name` 和 `avatar_url`

**AdminPanel 改动：**
- `users` 查询移除不存在的 `email` 字段
- 新增日志：当 `users` 查询返回空或部分缺失时，在 console 输出缺失 of user_id 列表
- 名称 fallback：`u?.full_name || u?.email || uuid.slice(0,8)` → `u?.full_name || "未找到用户 (xxx)"`，明确标识数据缺失

**执行方式：** 在 Supabase Dashboard → SQL Editor 中执行 `025_fix_missing_public_users.sql`，或通过 CLI `supabase db push`

---

## 三十六、历史工单关联补丁与未读提醒数优化（2026-05-29）

**目标：** 解决历史工单房源和姓名丢失问题，并重构学生端未读工单的红圈数字提醒机制。

**问题：**
- **历史房间信息丢失**：系统加载房源时只查询 `status = 'active'`（活跃）的租约。一旦租客到期、退租或发生转租，其工单对应的租约变为非活跃，导致在管理端和学生端显示房间号为空白。
- **学生端全局租约覆盖**：学生端原渲染逻辑全局使用统一的当前活跃房源，导致退租学生历史工单全白，或换房学生历史工单显示错误的房源。
- **姓名显示为 UUID**：如果数据库触发器 `handle_new_auth_user` 缺失或创建滞后，租客注册时在 `public.users` 中没有自动建行，导致联查名字失败，退回 UUID。
- **未读提醒机制局限**：
  - 侧边栏导航未渲染通知角标：学生侧边栏“维修与反馈”Tab上根本没有消息角标。
  - 折叠按钮只有纯红点：折叠按钮上的提醒硬编码为 7x7px 纯红点，不带数字。
  - 异步状态 Bug：计算未读消息时，误读了未完成异步更新的 `myFeedbacks` 空状态数组，导致红圈/红点在页面初次挂载时永远无法被点亮。

**AdminPanel 改动：**
- 重构了 `fetchFeedbacks` 函数，提取所有工单中记录的 `lease_id`，并**直接按 ID 查询历史租约**（不再过滤 `status = 'active'`），以确保即便租约已失效或已转租，依然能准确查到当时对应的房源。
- 增加以“租客活跃租约”作为第一层回退；并增加第二层回退：直接读取租客个人资料中的 `unit_number`（房间号）字段。

**StudentPortal 改动：**
- 增加 `onUnreadFeedbackCountChange` 回调函数，同步未读数量给外层侧边栏。
- 重构 `loadMyFeedbacks` 的未读计算，使用当前最新获取的数据，彻底避免 React 异步更新 stale state Bug。
- 在 `myFeedbacks` 的状态类型定义中补全了 `unit_info?: string` 字段，更新折叠页提醒为包裹数字的精美通知角标（`feedbackUnreadCount > 0`）。
- 将列表渲染从全局租约变量改为每条工单中独立的 `f.unit_info`。

**page.tsx 改动：**
- 在学生端“维修与反馈”侧边栏菜单挂载了精美红色数字角标，并在学生点击进入该 Tab 时自动消除未读提醒。

**执行方式：**
- Supabase SQL Editor 中执行 `025_fix_missing_public_users.sql`，重建 `handle_new_auth_user` 触发器并补全缺失的历史用户行。

---

## 三十七、AI 聊天上下文记忆与离线模拟器移除（2026-05-30）

**目标：** 解决 AI Agent 无上下文历史记忆导致看起来“不聪明”的问题，移除干扰真实请求的离线 Mock 模拟器，并优化报错提示与地图智能渲染。

**改动：**
- **上下文记忆（Conversation Memory）**：
  - 前端 `AIChat.tsx` 发送新消息时，将当前浏览器内存中的会话历史记录（过滤掉初始的 👋 欢迎消息）映射后，通过 `history` 字段传入 API 请求体。
  - 后端 `main.py` 新增 `ChatMessage` Pydantic 验证模型，并在 `ChatRequest` 中支持可选的 `history` 数组接收。
  - 后端 `agent.py` 接收到 `history` 列表后，在 ReAct 循环前将其动态注入到 `system` 设定之后、最新提问之前，使大模型具备完整的连续对话指代消解与追问上下文理解能力。
- **纯内存运行，不入数据库**：
  - 彻底删除了后端保存聊天对话到 `agent_conversations` 数据库表的所有写库代码，对话上下文传输完全在请求周期的内存中进行，保证用户隐私和数据无冗余存留。
- **移除前端离线模拟器**：
  - 移除了 `simulateOffline` 和 `typewriter` 两个虚假的离线随机回复触发机制，前端始终尝试向真实的 `/api/chat` 发送网络请求。
  - 网络请求失败或返回状态非 `200` 时，展示精心调优的、适配双语翻译的“连接错误 / 异常提示”气泡卡片。
- **自动触发地图通勤测算**：
  - 后端 `calculate_commute` 工具调用成功后，会向前端推送 `ui_component` 事件。
  - 前端收到后会自动渲染并绘制该路线上起终点的小区-学校通勤路线折线地图 (`MapAndCard`)，无需手动点击。

---

## 三十八、AI Agent 智能化改造 — 移除硬编码，LLM 做意图解析（2026-05-30）

**目标：** 彻底移除工具层的所有写死数据（大学别名表、COMMUNITIES 匹配、Monash 默认回退），让 LLM 承担全部意图解析职责，工具只做纯 Google API 调用。

### 问题根因

此前 `calculate_commute` 工具内部维护了一张 `_UNIVERSITY_ALIASES` 别名表（覆盖 UM、Monash、Taylor's 等缩写/中英文名），并在匹配失败时回退到 Monash 默认坐标。这导致：

1. LLM 传入 `"University of Malaya"`，工具在别名表中找不到精确匹配 → 回退 Monash
2. LLM 看到返回结果说 `"Monash University Malaysia (Default)"`，误以为工具失败 → 道歉
3. 用户说 "从公司出发"，工具回退到 Sunway Geo 坐标 → 路线完全错误

### 改动内容

#### 1. tools.py — 工具纯 API 化

- **删除** `_UNIVERSITY_ALIASES` 别名表（原 20+ 条硬编码映射）
- **删除** `_UNIVERSITY_SHORT_NAMES` 缩写映射
- **删除** 出发地对 `COMMUNITIES` 列表的循环匹配
- **删除** 目的地对 `UNIVERSITIES` 列表的循环匹配
- **删除** Monash / Sunway Geo 默认回退坐标
- **新增** `_google_geocode(address)` 函数：调用 Google Maps Geocoding API，将任意文本地址解析为 `lat`/`lng` + `formatted_address`
- **重写** `calculate_commute`：
  - 参数从 `university_name` 改为 `destination_address`（语义更通用）
  - 流程：`_google_geocode(origin)` → `_google_geocode(destination)` → Google Distance Matrix（驾车/公交/步行三种模式）
  - Geocoding 失败时返回 `{"error": True, "message": "...", "failed_address": "..."}`，不再回退默认坐标
  - 离线 fallback：仅在 Google API 不可用时，使用 haversine 公式估算直线距离 ×1.3 作为路程

#### 2. agent.py — LLM 意图解析

- **系统提示重写**（`live_agent_stream` 的 system message）：
  - 新增 `## TOOL USAGE RULES (CRITICAL)` 段落
  - 要求 LLM 在调用工具前解析缩写（`UM` → `Universiti Malaya`，`KLCC` → `Petronas Twin Towers`）
  - 要求传入完整地址字符串，不传缩写
  - 模糊地址（"公司"、"那边"）必须追问用户，不得猜测
  - 工具返回 error 时，引导用户补充信息
- **工具定义更新**（`tools_definitions`）：
  - `calculate_commute` 描述改为："Calculate travel times between ANY two locations. Resolve abbreviations to full names before calling."
  - 参数从 `university_name` 改为 `destination_address`
- **mock_agent_stream 同步**：通勤段落改用 `destination_address` 字段

#### 3. CORS 与认证修复（main.py）

- **CORS 改进**：`allow_origins` 从硬编码单域名改为 `Config.get_allowed_origins()`，支持 `FRONTEND_URL` + `EXTRA_ORIGINS`（逗号分隔多域名）
- **认证容错**：`verify_supabase_token` 不再对缺失/过期/无效 token 抛 401，统一回退到 `"anonymous-user"`，确保未登录用户也能使用 AI 助手

#### 4. config.py — CORS 配置

- 新增 `EXTRA_ORIGINS` 环境变量（逗号分隔的额外允许域名）
- 新增 `get_allowed_origins()` 类方法，返回主域名 + 额外域名列表

#### 5. 前端 MapAndCard 地图优化（MapAndCard.tsx）

- **新增 Props**：`destination_name`、`destination_lat`、`destination_lng`
- **通勤模式**：当 destination props 存在时，直接显示路线地图（iframe auto-load），不再显示输入框和"点击查看路线"按钮
- **房源列表模式**：保留"点击查看路线地图"按钮，点击前不加载 iframe（节省 Google Maps API 配额）
- **交通模式切换**：驾车/公交/步行按钮在通勤模式和房源+出发地模式下均可见，切换即更新地图

#### 6. 前端错误信息优化（AIChat.tsx）

- 区分网络错误（`Failed to fetch`）、401 认证错误、其他错误
- 网络错误显示实际 API 地址（`apiUrl`），方便排查
- `apiUrl` 变量提升到 try 块外，确保 catch 块可访问

### 设计原则

```
之前（工具做智能）:
  用户: "从um到KLCC要多久"
  → 工具硬编码匹配 "um" → "Universiti Malaya" → 匹配失败 → 回退 Monash

之后（LLM 做智能，工具只做 API 调用）:
  用户: "从公司到um要多久"
  → LLM: "um" = "Universiti Malaya"，但"公司"不明确
  → LLM 追问: "请问您公司在哪个地址？"
  → 用户: "KLCC Twin Towers"
  → LLM 调用: calculate_commute("Petronas Twin Towers KLCC", "Universiti Malaya")
  → 工具: Geocoding → 坐标 → Distance Matrix → 真实数据
  → LLM: 组织自然语言回复 + 地图
```

### 影响范围

| 文件 | 改动 |
|------|------|
| `backend/app/tools.py` | 删除别名表 + 重写 calculate_commute + 新增 _google_geocode |
| `backend/app/agent.py` | 重写系统提示 + 更新工具定义 + 同步字段名 |
| `backend/app/main.py` | CORS 多域名 + 认证容错 |
| `backend/app/config.py` | EXTRA_ORIGINS + get_allowed_origins() |
| `frontend/src/components/MapAndCard.tsx` | 通勤模式直接显示地图 + 资源懒加载 |
| `frontend/src/components/AIChat.tsx` | 错误分类 + apiUrl 可访问 |

### 部署说明

- 后端：推送到 GitHub，Render 自动重新部署
- 前端：确认 `NEXT_PUBLIC_AGENT_API_URL` 环境变量已设置，重新部署

---

## 三十九、管理端数据看板 Dashboard（2026-05-30）

**目标：** 为中介/管理员提供可视化数据看板，实时掌握出租率、收租率、月收入趋势等关键业务指标。

### 功能模块

| 模块 | 数据来源 | 展示方式 |
|------|---------|---------|
| 出租率 | `units` 表 status | KPI 卡片 + 渐变进度条 |
| 有效租约 | `leases` 表 status='active' | KPI 卡片 + 即将到期提示 |
| 收租率 | `payment_records` 表 paid 状态 | KPI 卡片 + 进度条 + 金额汇总 |
| 逾期账单 | `payment_records` 未付且过期 | KPI 卡片 + 红色警示 |
| 月收入趋势 | `payment_records` 按月聚合 | recharts 柱状图（已收 vs 应收） |
| 房源分布 | `units` 按 room_type 分组 | recharts 饼图（环形） |
| 小区分布 | `units` → `communities` 关联 | 横向条形图（Top 6） |
| 意向转化 | `tenant_interests` 状态分组 | 漏斗进度条（意向中→已确认） |
| 报修概览 | `maintenance_requests` 状态统计 | 三列网格（待处理/已解决/平均天数） |
| 待办事项 | 汇总逾期/未回复/即将到期 | 红色左边框警示卡片 |

### 时间筛选

- 快捷选项：1个月 / 6个月 / 1年
- 自定义区间：起止日期选择器
- 所有图表和 KPI 根据时间范围动态过滤

### 权限控制

- 复用 AdminPanel 的 `visibleUnitIds` / `visibleLeaseIds`
- Super Admin：看到所有数据
- Editor（Agent）：只看到自己名下的房源和租约

### UI 设计（ui-ux-pro-max skill）

- 使用 ui-ux-pro-max skill 生成设计系统
- 风格：Data-Dense Dashboard（数据密集型看板）
- 图标：Lucide SVG（禁止 emoji 作为结构图标）
- 动画：进度条 `cubic-bezier(0.4, 0, 0.2, 1)` 缓动，0.6s
- 颜色：语义化 token（--primary, --success, --danger, --warning）
- 数字：`fontVariantNumeric: tabular-nums` 等宽数字

### 新增文件

| 文件 | 说明 |
|------|------|
| `frontend/src/components/Dashboard.tsx` | 看板组件（425 行），recharts 图表 |

### 修改文件

| 文件 | 改动 |
|------|------|
| `frontend/src/components/AdminPanel.tsx` | 新增 'dashboard' Tab + 导入 Dashboard 组件 |
| `frontend/src/app/page.tsx` | 侧边栏新增 Dashboard 入口 + defaultTab 映射 |
| `frontend/package.json` | 新增 recharts 依赖 |

### 依赖

- ~~`recharts` 3.8.1~~（已移除，改用纯 CSS 图表）

---

## 四十、登录页角色选择器重设计（2026-05-30）

**目标：** 使用 ui-ux-pro-max skill 重写登录页，让中介注册入口更醒目。

### 改动

- 新增角色选择器（我是学生 / 我是中介）作为第一步
- 学生和中介各有独立登录页面
- 中介页面底部有醒目的"申请成为中介"按钮（虚线边框 + 填充色）
- 所有 emoji 替换为 Lucide SVG 图标
- 输入框添加 `<label>` 标签（skill 规则：禁止 placeholder-only）
- 所有按钮添加 hover 过渡效果（0.2s ease）
- focus 状态添加蓝色光晕（box-shadow: 0 0 0 3px）
- Mock modal 角色选择也改用 Lucide 图标

### 设计系统来源

```
python .claude/skills/ui-ux-pro-max/scripts/search.py \
  "login page authentication SaaS professional trust" \
  --design-system -p "Malaysia Ez Rent Login"
```

---

## 四十一、中介注册流程全面修复（2026-05-30）

**目标：** 修复中介注册→审核→登录全流程的问题。

### 问题与修复

| 问题 | 修复 |
|------|------|
| 注册表单没有邮箱字段 | 表单顶部显示当前登录邮箱（只读），提示"审核通过后用此邮箱登录中介管理后台" |
| 超级管理员看不到注册记录 | 检查 RLS 策略 + 确保 mock 模式按用户过滤 |
| 审批后注册记录和图片残留 | 审批后自动：1) 创建 admin_users 记录 2) 删除 Storage REN 图片 3) 删除 agent_registrations 记录 |
| REN 执照图片未压缩 | 新增 `REN_TAG_PRESET`（1200×800, quality 0.88），替换 `EVIDENCE_IMAGE_PRESET` |
| 管理员列表只显示邮箱电话 | 新增显示公司名称 + REN 编号 |
| "管理后台"用词不准确 | 全部改为"中介管理后台" |
| "学生界面"用词不准确 | 全部改为"租客界面" |
| REN 编号读写逻辑 | 通过审核的 → 只读；超级管理员手动添加的 → 可编辑 |
| 所有人登录都显示申请状态 banner | Mock 模式按 `auth_user_id` 过滤；Live 模式已有 `.eq('auth_user_id', user.id)` |

### 数据库迁移

`027_agent_registration_cleanup.sql`：
- `admin_users` 新增 `ren_number` + `ren_tag_url` 字段
- 新增 DELETE 策略：admins 可删除 `agent_registrations` 记录
- 新增 Storage DELETE 策略：admins 可删除 `ren-tags/` 图片

### 审批后流程

```
中介提交注册 → REN 图片压缩后上传到 Storage ren-tags/
    ↓
超级管理员审核 → 点击"批准"
    ↓
自动执行：
  1. 创建 admin_users 记录（含 ren_number + ren_tag_url）
  2. 删除 Storage 中的 REN 图片
  3. 删除 agent_registrations 记录
    ↓
中介重新登录 → 自动进入中介管理后台 → REN 编号已填入（只读）
```

---

## 四十二、Dashboard 改用纯 CSS 图表（2026-05-30）

**目标：** 移除 recharts 依赖，用纯 CSS 实现图表，解决 React error #185。

### 改动

- 移除 `recharts` 依赖（-727 行）
- 柱状图：CSS flex + height% + 渐变色
- 饼图/环形图：CSS `conic-gradient`
- 进度条：CSS width% + transition
- 图例：纯 HTML
- Dashboard 组件从 542 行精简到 230 行

---

## 四十三、收款设置移入租约 Tab + 房源编辑器美化（2026-05-30）

**目标：** 优化管理后台 Tab 结构和房源编辑器 UI。

### 改动

| 改动 | 说明 |
|------|------|
| 收款设置从顶级 Tab 移入租约子 Tab | Leases 子Tab：意向 \| 新建租约 \| 💳 收款设置 \| 审核凭证 \| 台账 \| 退租 |
| 房源编辑器分区标题 | 🏠基本信息 / 💰租金与配置 / 📱房东收款 / 📷图片与视频 |
| 必填字段红色星号 | 小区选择、月租加了 `*` 标记 |
| 图片上传区加 "必须上传" 提示 | 无图片时标题显示红色"* 必须上传" |
| Toast 加无障碍属性 | `role="alert"` + `aria-live="assertive"` |
| 图片拖拽区 hover 效果 | 鼠标悬停变色 + 背景色变化 |
| 移除顶级"收款设置" Tab | page.tsx 侧边栏删除，AdminPanel 移除 'payment' 类型 |

---

## 四十四、中介审核卡片重排版 + 删除功能 + 房源浏览（2026-05-30）

**目标：** 优化中介审核 UI，支持删除记录，管理端可浏览房源。

### 中介审核卡片重排版

- Header 区：头像 + 姓名 + 公司 + 邮箱 + 状态徽章 + 删除按钮
- Info grid：手机号/WhatsApp/REN编号/提交时间，2列布局 + 图标
- REN 执照图片：hover 放大效果（scale 1.02）
- 拒绝原因：`role="alert"` 无障碍提示
- 所有状态（pending/approved/rejected）都有删除按钮
- 删除前有 `confirm()` 确认弹窗

### 删除功能

- 新增 `deleteAgentRegistration` 函数
- 删除时同时清理 Storage 中的 REN 图片
- 删除注册记录（admin_users 中的不受影响）
- 支持 mock 模式和 live 模式

### 管理端房源浏览

- 侧边栏新增 "👁️ 房源浏览" 入口（admin-listings）
- 复用 `PropertyListings` 组件，传入 `readOnly` prop
- 只读模式下隐藏 "我要租" 按钮和咨询表单
- 显示中介名称（getListingAgentLabel），方便看到竞争
- 租客端 PropertyListings 不受影响（readOnly 默认 false）

### 文件改动

| 文件 | 改动 |
|------|------|
| `AdminPanel.tsx` | 审核卡片重写 + deleteAgentRegistration + 移除顶级 payment tab |
| `page.tsx` | 侧边栏加"房源浏览"入口 + 移除"收款设置"入口 + admin-listings 视图 |
| `PropertyListings.tsx` | 新增 readOnly prop，隐藏操作按钮 |

