# 技术问题回顾与反思

> 记录时间：2026-06-05
> 背景：从零梳理 AI Agent 的 RAG 检索能力，逐步发现并解决了一系列问题

---

## 1. 以为没有 RAG，实际上有但有问题

**现象：** 以为项目没有任何 RAG 能力。

**实际情况：** 项目已经有一套基于 pgvector 的语义搜索管道：
- `units` 表有 `embedding VECTOR(1536)` 列
- `match_units` 存储过程做余弦相似度搜索
- `search_internal_db()` 工具函数可以被 Agent 调用

**但存在多个隐患（见下文）。**

**反思：** 不要凭感觉判断，先看代码再下结论。

---

## 2. Embedding 维度不匹配（严重）

**问题：** schema 定义 `VECTOR(1536)`，但实际使用的模型 `BAAI/bge-large-zh-v1.5` 输出 **1024 维**。

**影响：** 向量写入时维度不匹配，会导致运行时报错。这是个隐藏的定时炸弹。

**解决：** 换模型为 `BAAI/bge-m3`（1024 维），同时把 schema、migration、代码里的维度全部统一改为 1024。

**教训：**
- 换 embedding 模型时必须同步改 schema 维度
- 应该在 CI 里加维度一致性检查
- `.env`、`config.py`、`schema.sql`、`migration` 四处要联动修改

---

## 3. 没有向量索引

**问题：** `embedding` 列没有创建 IVFFlat 或 HNSW 索引，相似度搜索是全表顺序扫描。

**影响：** 数据量小的时候没问题，数据多了会明显变慢。

**状态：** ⚠️ 待解决（本次未处理）

---

## 4. 文档和代码不一致

**问题：**
- `architecture.md` 标注 `search_internal_db` 是 legacy，不暴露给 live agent
- 但 `agent.py` 里实际有它的 tool 定义，Agent 可以调用

**教训：** 文档要和代码同步更新，否则会误导开发判断。

---

## 5. 没有真实房源，也不能推荐外部平台

**问题：**
- 数据库只有 `mock_data.py` 里的 5 个假房源
- 系统 prompt 硬编码禁止搜索 iProperty、PropertyGuru 等平台
- Tavily 查询里加了 `-site:iproperty.com.my` 等排除规则
- Agent 既没有数据可推荐，也不能告诉用户去哪找

**解决思路：** 允许 Agent 搜索外部平台提取房源信息，但不暴露来源链接（不展示出处 URL）。

**状态：** ⚠️ 代码改动待完成（已放开知识库搜索，外部搜索限制尚未修改）

---

## 6. 合并 JSON 时去重逻辑错误

**问题：** 合并 `ultimate.json`（118 条）和 `expanded.json`（19 条）时，第一版去重逻辑用了全局 Set，把跨大学的共享小区也去掉了。

**实际原因：** Sunway、Monash、Taylor's 等大学都在 Bandar Sunway 片区，共享周边小区是合理的。同一个 Indah Villa 出现在 3 所大学下面是正确数据，不是重复。

**解决：** 改为只在同一大学内去重，跨大学的保留。

**教训：**
- 去重前要理解数据的业务含义
- "重复"在不同上下文含义不同：同校重复 = 错误，跨校共享 = 正确
- 最终数据：42 所大学，132 个小区条目（92 个独立小区）

---

## 7. JSON 字段和数据库 Schema 不匹配

**问题：** JSON 里有十几个丰富字段（price_range、tenant_rating、pros、cons、transportation 等），但 `communities` 表只有 name、address、lat、lng、amenities 五个字段。

**三个选项：**
1. 只导基础字段（丢失丰富数据）
2. 扩展现有表（影响 AdminPanel）
3. 新建独立知识库表（推荐）

**解决：** 选了方案 3 — 新建 `rental_knowledge_base` 表，用 JSONB 存完整数据，和现有 `communities`/`units` 表完全隔离。

**教训：** 数据导入前先对比 schema 兼容性，不要假设字段能对上。

---

## 8. Migration 文件编号冲突

**问题：** 创建 `007_embedding_bge_m3.sql` 时，`007` 编号已经被 `007_mobile_upload.sql` 占用。

**解决：** 重命名为 `039_embedding_bge_m3.sql`。

**教训：** 创建 migration 前先检查已有编号，用最大编号 +1。

---

## 9. Python 在 Windows 上不可用

**问题：** `python` 和 `python3` 指向 WindowsApps 的 Store 占位符（exit code 49），不是真正的 Python。

**解决：** 找到 Anaconda 安装路径 `/c/Users/Administrator/anaconda3/python.exe`。

**教训：** Windows 开发环境要确认 Python 真实安装路径，`where python` 不一定返回可用的。

---

## 10. Windows GBK 编码导致 Unicode 打印崩溃

**问题：** 脚本里用了 `✓` 和 `✗` Unicode 字符做 print 输出，Windows 默认 GBK 编码无法渲染，直接报 `UnicodeEncodeError`。

**解决：** 改用 ASCII 安全的 `[OK]` 和 `[FAIL]`。

**教训：** Windows 脚本的 print 输出避免使用 Unicode 特殊字符，或者设置 `PYTHONIOENCODING=utf-8`。

---

## 11. Supabase API Key 是占位符

**问题：** `.env` 里的 `SUPABASE_SERVICE_ROLE_KEY` 是 `sb_secret_6VxO87KeGefgbw1872g-Ag_uOquixV_`（占位符格式），不是真实的 JWT token。真实的 key 是 `eyJ...` 开头的长字符串。

**影响：** 所有依赖 Supabase service client 的功能都无法工作（导入脚本、embedding 同步等）。

**教训：**
- `.env` 里的 key 要定期验证是否有效
- 部署前跑一次连接测试
- 占位符应该用明显的格式（如 `your-xxx-here`），不要用看起来像真的假 key

---

## 总结：核心教训

| 类别 | 教训 |
|------|------|
| **维度一致性** | 换 embedding 模型必须同步改 schema + migration + 代码 + mock fallback |
| **数据合并** | 去重前先理解业务语义，不要盲目用 Set |
| **Schema 兼容** | 导入数据前先对比字段，不匹配就建新表 |
| **环境验证** | API key、Python 路径、编码都要实际测试，不要假设 |
| **文档同步** | 代码改了文档必须跟着改，否则自相矛盾 |
| **Migration 管理** | 编号不能冲突，先查再建 |

---

## 2026-06-06：Guest 页面污染 + 进度条闪烁 + 网格列数问题

### 问题 1：Guest 页面显示侧边栏/顶栏

**现象：** 登录用户访问 `/guest`，页面仍显示侧边栏、顶栏、注销按钮、数据库状态。

**根因：** `isGuest` 判断依赖 `!loading && !role && pathname === '/guest'`。登录用户 `role` 不为 null，导致 `isGuest = false`。

**修复：** `isGuest = pathname === '/guest'`，只看路径不看登录状态。

### 问题 2：中间件重定向不一致

**现象：** Mock 模式 `/` → `/guest`，Live 模式 `/` → `/listings`（登录用户）。

**根因：** Live 模式中间件检查 Supabase session，登录用户被重定向到 `/listings`。

**修复：** `/` 一律重定向到 `/guest`，统一入口。

### 问题 3：进度条闪烁

**现象：** 未登录用户访问 `/listings`，进度条闪一下才跳转到 `/guest`。

**根因：** `if (loading || !role)` 条件下显示进度条，未登录时 `!role` 为 true，进度条先渲染再跳转。

**修复：** `if (!loading && !role) return null`，未登录直接返回空，避免 UI 闪烁。

### 问题 4：网格列数不固定

**现象：** 租客/中介端网格视图列数随容器宽度变化，无法保证 5 列。

**根因：** `repeat(auto-fill, minmax(260px, 1fr))` 在窄容器中只能放 3-4 列。

**修复：** 非 guest 端使用 `repeat(5, 1fr)` 固定 5 列。

### 教训

| 类别 | 教训 |
|------|------|
| **状态判断** | 页面显示逻辑不应依赖登录状态，应依赖路由路径 |
| **中间件一致性** | Mock/Live 模式的重定向逻辑必须保持一致 |
| **UI 闪烁** | 跳转前不要渲染无关 UI，先判断再决定是否渲染 |
| **网格布局** | 固定列数用 `repeat(N, 1fr)`，自适用 `repeat(auto-fill, minmax(...))` |
