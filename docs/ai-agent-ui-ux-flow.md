# AI Agent 工具调用卡片 UI/UX 技术文档

> 完整记录 AI Chat 的工具调用卡片从后端到前端的实现细节。
> 包括 SSE 事件系统、前端渲染逻辑、CSS 设计系统、交互流程。

---

## 〇、通俗版：这个 UI 是怎么工作的？

> 用大白话解释整个流程，不涉及代码。

### 核心思路：不要让用户干等，要让用户看到"AI 在做什么"

你问了一个问题，AI 不是一下子把答案甩出来，而是像人一样**一步步做给你看**。就像你去银行办事，柜员告诉你"正在查你的账户"比你对着一个空白屏幕干等体验好一百倍。

### 第一步：AI 先想一想

你点发送后，屏幕上先出现一个小圆点在跳动，旁边写着"🔍 正在理解你的问题..."。这就像是 AI 在说"让我想想你问的是什么"。

同时右边有个计时器在跳：`1s` `2s` `3s`... 让你知道它没卡死，是在干活。

### 第二步：AI 决定要用工具

想完之后，AI 发现自己需要查数据。比如你问"Sunway 附近有什么小区"，它知道自己没有实时数据，得去搜。

这时候屏幕上弹出一张**工具卡片**：

```
🔍 search_knowledge_base
semantic_query: "Sunway 附近小区"
```

左边有个**青色的竖条**在闪，说明正在执行。就像你在餐厅点菜后，厨房亮了个灯表示"正在做"。

### 第三步：工具做完了

几秒钟后，卡片左边的竖条变成**绿色**，图标从旋转的 spinner 变成 ✅，下面出现 `✓ 5 条结果`。

这就像是厨房告诉你"菜做好了"。

### 第四步：AI 组织答案

工具结果拿到了，AI 开始写回答。这时候第三个思考步骤出现："📝 正在组织回答..."

然后**最终回答卡片**出现了，文字一个一个蹦出来（像打字机效果），用 Markdown 格式渲染 — 标题是粗体，列表有圆点，表格有边框。

### 第五步：地图出现

文字回答完了，如果有位置信息，底下会自动弹出一张**地图卡片**，标注了小区位置，还可以切换驾车/公交/步行路线。

### 整个过程就像看一个真人助理工作

> 🤔 想一想 → 🛠️ 去查资料 → ✅ 查到了 → 📝 写回答 → 🗺️ 附上地图

而且每一步都有视觉反馈：脉冲的圆点表示"在做"，绿色勾表示"做完了"，计时器告诉你"等了多久"。如果等太久，你随时可以点红色的停止按钮打断它。

### 为什么这样设计？

| 设计选择 | 原因 |
|---------|------|
| 思考步骤自动折叠 | 不刷屏，只看当前在干嘛，想看历史就点开 |
| 工具卡片可展开 | 看结果不需要时折叠，想看详情就展开 |
| 计时器实时显示 | 让用户知道没卡死，有心理预期 |
| 停止按钮 | 用户可以随时打断，不用干等 |
| 地图延迟加载 | 先看文字回答，再看地图，信息有优先级 |
| 答案用打字机效果 | 比一次性甩出一大段文字更自然，像真人在打字 |

---

---

## 一、整体架构

```
用户输入 → POST /api/chat → FastAPI StreamingResponse
                                    ↓
                            agent_stream_router()
                                    ↓
                            live_agent_stream()  ← ReAct Loop (最多3轮)
                                    ↓
                            SSE events (data: {...}\n\n)
                                    ↓
                            Frontend ReadableStream
                                    ↓
                            updateMsg() → React State
                                    ↓
                            JSX 渲染 (Thinking → Tools → Answer → Map)
```

**核心技术栈：**
- 后端：FastAPI + OpenAI SDK (SSE Streaming)
- 前端：Next.js + React + ReadableStream 手动解析 SSE
- 协议：Server-Sent Events (SSE)，每个事件一行 `data: {json}\n\n`

---

## 二、后端 SSE 事件系统

### 2.1 文件：`backend/app/agent.py`

#### SSE 序列化

```python
def sse_event(data: Dict[str, Any]) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
```

#### HTTP 端点（`backend/app/main.py`）

- 路由：`POST /api/chat`
- 请求体：`ChatRequest(query: str, user_id: str, history: List[ChatMessage])`
- 响应：`StreamingResponse(agent_stream_router(...), media_type="text/event-stream")`
- 头部：`Cache-Control: no-cache`, `Connection: keep-alive`
- 认证：Supabase JWT (`Authorization: Bearer <token>`)

#### 5 种 SSE 事件类型

| 事件类型 | 用途 | 负载格式 |
|---------|------|---------|
| `thinking` | 思考步骤 | `{type: "thinking", step: "🔍 ...", content?: "详细推理"}` |
| `tool_call` | 工具调用 | `{type: "tool_call", tool_name: "...", args: {...}}` |
| `tool_result` | 工具结果 | `{type: "tool_result", tool_name: "...", result: ...}` |
| `text` | 流式文字 | `{type: "text", delta: "单个字符"}` |
| `ui_component` | 富UI组件 | `{type: "ui_component", component: "MapAndCard", props: {...}}` |

#### ReAct 循环（最多 3 轮）

```python
MAX_LOOPS = 3
for loop_idx in range(MAX_LOOPS):
    # 1. 发送 thinking 事件
    yield sse_event({"type": "thinking", "step": step_labels[loop_idx]})

    # 2. 调用 LLM（带 tools）
    response = openai_client.chat.completions.create(
        model=Config.AGENT_MODEL,
        messages=messages,
        tools=tools_definitions,
        tool_choice="auto",
        extra_body={"reasoning_effort": "medium", "include_reasoning": True}
    )

    # 3. 如果有推理过程，发送 thinking 事件
    reasoning = getattr(message, 'reasoning', None)
    if reasoning:
        yield sse_event({"type": "thinking", "label": "🧠 模型推理过程", "content": reasoning[:1000]})

    # 4. 如果没有 tool_calls → 输出最终答案
    if not tool_calls:
        for char in content:
            yield sse_event({"type": "text", "delta": char})
        # 答案输出完后才发送 UI 组件（延迟策略）
        for comp in pending_ui_components:
            yield sse_event(comp)
        break

    # 5. 如果有 tool_calls → 执行工具，收集结果
    for tool_call in tool_calls:
        yield sse_event({"type": "tool_call", "tool_name": name, "args": args})
        result = execute_tool(name, args)
        yield sse_event({"type": "tool_result", "tool_name": name, "result": result})
        # 收集 UI 组件到 pending 列表（不立即发送）
        if has_ui: pending_ui_components.append(ui_event)
```

**关键设计：UI 组件延迟发送**

`pending_ui_components` 列表在工具执行时收集，但只在**最终文字答案输出完毕后**才发送。这确保了：
- 用户先看到文字回答
- 然后才看到地图/卡片组件
- 避免答案还没出来就先渲染地图

#### 可用工具（7 个）

| 工具名 | 用途 | 数据来源 |
|--------|------|---------|
| `calculate_commute` | 通勤路线计算 | Google Maps API |
| `get_web_realtime_info` | 联网搜索 | Tavily API |
| `convert_currency_frankfurter` | 汇率换算 | Frankfurter API |
| `get_malaysia_holidays` | 马来西亚节假日 | Nager.Date API |
| `search_internal_db` | 内部房源向量搜索 | Supabase pgvector |
| `search_knowledge_base` | 小区知识库搜索 | Supabase pgvector (174条) |
| `search_external_listings` | 外部房源搜索 | Tavily API |

---

## 三、前端事件处理

### 3.1 文件：`frontend/src/components/AIChat.tsx`

#### 数据结构

```typescript
interface ToolCard {
  id: string;           // "tc-{timestamp}-{random4chars}"
  name: string;         // "calculate_commute"
  args: Record<string, any>;
  status: 'running' | 'done' | 'error';
  result?: any;
}

interface Message {
  id: string;           // "msg-u-{timestamp}" 或 "msg-a-{timestamp}"
  role: 'user' | 'assistant';
  thoughts: { label: string; content?: string }[];
  tools: ToolCard[];
  content: string;      // 累积的文字流
  uiComponents: { component: string; props: any }[];
  contentStarted: boolean;  // 第一个 text 事件后变为 true
}
```

#### 核心函数：updateMsg()

接收 SSE 事件，不可变更新 Message 状态：

```typescript
const updateMsg = (id: string, ev: any) => {
  setMessages(prev => prev.map(m => {
    if (m.id !== id) return m;
    const thoughts = [...m.thoughts];
    const tools = [...m.tools];
    let content = m.content;
    let contentStarted = m.contentStarted;

    if (ev.type === 'thinking') {
      thoughts.push({ label: ev.step || ev.label, content: ev.content });
    } else if (ev.type === 'tool_call') {
      tools.push({ id: `tc-${Date.now()}-${rand()}`, name: ev.tool_name, args: ev.args, status: 'running' });
    } else if (ev.type === 'tool_result') {
      const last = tools[tools.length - 1];
      if (last) { last.status = 'done'; last.result = ev.result; }
    } else if (ev.type === 'text') {
      content += ev.delta;
      contentStarted = true;
    } else if (ev.type === 'ui_component') {
      uiComponents.push({ component: ev.component, props: ev.props });
    }

    return { ...m, thoughts, tools, content, contentStarted, uiComponents };
  }));
};
```

**事件处理逻辑：**
- `thinking` → push 到 thoughts 数组
- `tool_call` → push 新 ToolCard（status: 'running'）
- `tool_result` → 修改**最后一个** ToolCard（status: 'done', result: ...）
- `text` → 拼接单个字符到 content，首次触发 contentStarted = true
- `ui_component` → push 到 uiComponents 数组

#### SSE 流读取

```typescript
const reader = res.body.getReader();
const dec = new TextDecoder();
let buf = '';
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += dec.decode(value, { stream: true });
  const lines = buf.split('\n');
  buf = lines.pop() || '';  // 保留不完整的最后一行
  for (const l of lines) {
    if (l.startsWith('data: ')) {
      updateMsg(aid, JSON.parse(l.slice(6)));
    }
  }
}
```

手动 SSE 解析：按行分割，过滤 `data: ` 前缀，JSON 解析。

#### 发送时创建消息

```typescript
setMessages(prev => [...prev,
  { id: uid, role: 'user', content: userText, thoughts: [], tools: [], uiComponents: [], contentStarted: false },
  { id: aid, role: 'assistant', content: '', thoughts: [], tools: [], uiComponents: [], contentStarted: false }
]);
```

---

## 四、前端渲染流程

### 4.1 渲染顺序（每个 assistant 消息）

```
┌─────────────────────────────────────┐
│ 1. Thinking Steps (思考步骤)         │
│    ├─ 已完成: ✅ 2步已完成 (折叠)    │
│    ├─ 展开后: ✅ 步骤1 ✅ 步骤2      │
│    └─ 当前: 🔵 正在调用工具... 15s   │
├─────────────────────────────────────┤
│ 2. Tool Cards (工具调用卡片)         │
│    ┌─────────────────────────────┐  │
│    │ 🔍 search_knowledge_base ✓  │  │
│    │ semantic_query: "Sunway"    │  │
│    │ ▸ 点击展开查看结果           │  │
│    └─────────────────────────────┘  │
├─────────────────────────────────────┤
│ 3. Final Answer (最终回答)           │
│    📝 最终回答                       │
│    ─────────────                    │
│    Markdown 渲染的文字内容           │
├─────────────────────────────────────┤
│ 4. UI Components (地图/卡片)         │
│    ┌─────────────────────────────┐  │
│    │ 🗺️ MapAndCard              │  │
│    │ Google Maps iframe          │  │
│    └─────────────────────────────┘  │
└─────────────────────────────────────┘
```

### 4.2 Thinking Steps 渲染逻辑

```
已完成步骤 (prev)          当前步骤 (latest)
    ↓                        ↓
▸ 2步已完成            🔵 正在调用工具... (15s)
    ↓ 点击展开
✅ 正在理解你的问题
✅ 正在调用工具
```

**三种状态：**
1. **已完成折叠**：`▸ N步已完成` + 绿色勾，点击展开
2. **展开的已完成步骤**：每个步骤有 ✅ 勾，如果有推理内容可再展开
3. **当前步骤**：
   - 运行中：脉冲圆点 + 计时器 `{elapsed}s`
   - 完成：✅ 勾 + 透明度 0.7

### 4.3 Tool Cards 渲染逻辑

```
┌──────────────────────────────┐
│ 🔍 search_knowledge_base  ✓ │  ← header: icon + name + status
│ semantic_query: "Sunway"     │  ← args: 每个参数一行
│ ▸ 点击展开查看结果            │  ← 可点击展开/折叠
│ ✓ 5 条结果                   │  ← 折叠时的摘要
└──────────────────────────────┘
```

**状态样式：**
- `running`：左侧 3px 青色边框 + 旋转 spinner
- `done`：左侧 3px 绿色边框 + 绿色勾
- `error`：左侧 3px 红色边框 + 红色叉

### 4.4 Final Answer 渲染

```tsx
<div className="manus-answer">
  <div className="manus-answer-label">📝 最终回答</div>
  <div className="manus-answer-content">
    {renderMarkdown(m.content)}  // 自定义 Markdown 渲染器
  </div>
</div>
```

### 4.5 UI Components 渲染

```tsx
{m.uiComponents.map((item, i) => (
  <div key={i} className="manus-ui-wrapper">
    {item.component === 'MapAndCard' && <MapAndCard {...item.props} />}
  </div>
))}
```

**MapAndCard 三种模式：**

| 模式 | 触发条件 | 显示内容 |
|------|---------|---------|
| 通勤模式 | 有 destination 坐标 | 起终点路线 + 地图导航 |
| 知识库模式 | `is_knowledge_base: true` | 小区资料卡片 + 价格/评分标签 |
| 房源模式 | 默认 | 房源位置 + 通勤计算器 |

---

## 五、CSS 设计系统

### 5.1 主题

- **风格**：Glassmorphism + Teal-Gold 热带奢华
- **字体**：DM Sans（正文）+ Playfair Display（标题）
- **主题**：Light（默认）/ Dark（`[data-theme="dark"]`）

### 5.2 关键 CSS 变量

```css
--primary: #0D9488;        /* 主色（青色） */
--success: #059669;        /* 成功（绿色） */
--danger: #DC2626;         /* 危险（红色） */
--bg-surface-solid: #FFF;  /* 卡片背景 */
--glass-bg: rgba(255,255,255,0.7);  /* 玻璃背景 */
--glass-border: rgba(255,255,255,0.2);  /* 玻璃边框 */
```

### 5.3 组件样式速查

| 组件 | CSS 类 | 关键样式 |
|------|--------|---------|
| 用户气泡 | `.manus-user-text` | 青色背景，圆角 `18px 18px 6px 18px` |
| AI 气泡 | `.manus-assistant-bubble` | 玻璃背景，圆角 `16px 16px 16px 4px` |
| 工具卡片 | `.manus-tool-card` | 白色背景，12px 圆角，左侧状态色条 |
| 思考步骤 | `.manus-thought` | 白色背景，8px 圆角，slideUp 动画 |
| 最终回答 | `.manus-answer` | 白色背景，12px 圆角 |
| 推理内容 | `.manus-thought-content` | 紫色左边框，200px 最大高度滚动 |
| 输入框 | `.manus-input-bar` | 居中，14px 圆角，最大 700px 宽 |
| 停止按钮 | `.manus-send.stop-mode` | 红色背景，脉冲动画 |

### 5.4 动画

| 动画名 | 时长 | 用途 |
|--------|------|------|
| `slideUp` | 0.2s | 消息/卡片/回答出现 |
| `dotPulse` | 1.2s | 思考步骤脉冲圆点 |
| `spin` | 0.6s | 工具执行中旋转 |
| `pulse` | 1.5s | 停止按钮脉冲 |
| `led-breath` | 2s | 在线状态呼吸灯 |

---

## 六、完整事件流（端到端示例）

**用户输入：** "从 Sunway Geo 到 Monash 大学要多久？"

```
时间线：
0s    用户点击发送
      ├── [前端] 创建 user msg + 空 assistant msg
      ├── [前端] POST /api/chat
      ├── [前端] 启动计时器 setInterval(1s)
      │
1s    [后端] thinking: "🔍 正在理解你的问题..."
      ├── [前端] render: 脉冲圆点 + "1s"
      │
2s    [后端] tool_call: calculate_commute
      ├── [前端] render: 🔵 工具卡片 (running)
      │
3s    [后端] tool_result: {driving: "15 mins", ...}
      ├── [前端] render: ✅ 工具卡片 (done)
      │
4s    [后端] thinking: "🛠️ 正在调用工具获取信息..."
      ├── [前端] render: 新思考步骤
      │
5s    [后端] LLM 返回最终答案
      ├── [后端] thinking: "📝 正在组织回答..."
      ├── [后端] text: "从" → "从S" → "从Sun" → ... (逐字)
      ├── [前端] render: 📝 最终回答卡片，文字逐字出现
      │
10s   [后端] ui_component: MapAndCard
      ├── [前端] render: 🗺️ 地图组件（在答案下方）
      │
      ├── [前端] 计时器停止，elapsed = 0
      ├── [前端] 保存聊天历史
```

---

## 七、停止/中断流程

```
用户点击停止按钮
      │
      ├── [前端] abortController.abort()
      │         → fetch 收到 AbortError
      │
      ├── [前端] 已输出的内容保留
      │         → content 不清空
      │         → contentStarted = true
      │
      ├── [前端] 显示 "（已停止）"（如果没有内容）
      │
      ├── [前端] finally: 清除计时器，重置状态
```

---

## 八、Markdown 渲染器

自定义逐行解析器（不依赖第三方库），支持：

| 语法 | 渲染结果 |
|------|---------|
| `# 标题` | `<h2>` |
| `## 标题` | `<h3>` |
| `### 标题` | `<h4>` |
| `- 列表项` | `<ul><li>` |
| `1. 有序列表` | `<ol><li>` |
| `> 引用` | `<blockquote>` |
| `---` | `<hr>` |
| `\| col1 \| col2 \|` | `<table>` |
| `**粗体**` | `<strong>` |
| `` `代码` `` | `<code>` |
| `[链接](url)` | `<a>` |

---

## 九、7 个工具详细说明

### 1. calculate_commute（通勤计算）

```json
// 输入
{"origin_address": "Sunway Geo Residences", "destination_address": "Monash University Malaysia"}

// 输出
{
  "origin_name": "Sunway Geo Residences",
  "origin_lat": 3.063, "origin_lng": 101.609,
  "destination_name": "Monash University Malaysia",
  "destination_lat": 3.064, "destination_lng": 101.600,
  "driving_distance": "3.2 km",
  "driving_duration": "8 mins",
  "transit_duration": "15 mins",
  "walk_duration": "25 mins"
}

// UI: MapAndCard 通勤模式 → Google Maps 导航 iframe
```

### 2. get_web_realtime_info（联网搜索）

```json
// 输入
{"query": "吉隆坡留学生怎么办理手机卡"}

// 输出
"在马来西亚，留学生可以在吉隆坡国际机场或电信公司门店购买SIM卡..."

// UI: 纯文字回答（Markdown 渲染）
```

### 3. convert_currency_frankfurter（汇率换算）

```json
// 输入
{"amount": 3000, "from_currency": "MYR", "to_currency": "CNY"}

// 输出
{"success": true, "rate": 1.63, "converted_amount": 4890.0}

// UI: 纯文字回答
```

### 4. get_malaysia_holidays（节假日）

```json
// 输入
{"year": 2026}

// 输出
{"total_holidays": 15, "holidays": [{date: "2026-01-01", name: "New Year"}]}

// UI: Markdown 表格
```

### 5. search_internal_db（内部房源搜索）

```json
// 输入
{"semantic_query": "near monash studio", "max_price": 2000}

// 输出
[{id: "...", community_name: "Sunway Geo", rent: 1500, similarity: 0.85}]

// UI: MapAndCard 房源模式 → 地图 + 房源卡片
```

### 6. search_knowledge_base（知识库搜索）

```json
// 输入
{"semantic_query": "Sunway 附近安全的公寓", "state": "Selangor"}

// 输出
[{
  community_name: "Sunway Geo Residences",
  university_name: "Monash University Malaysia",
  price_range: {min: 650, max: 1800},
  tenant_rating: {overall: 4.5, safety: 4.7},
  pros: ["步行距离到大学", "设施现代"],
  cons: ["租金较高"]
}]

// UI: MapAndCard 知识库模式 → 小区资料卡片
```

### 7. search_external_listings（外部房源搜索）

```json
// 输入
{"location": "Nilai", "room_type": "studio", "max_price": 2000}

// 输出
{
  answer_summary: "...",
  listings: [{title: "...", snippet: "...", price_myr: 1200}]
}

// UI: 纯文字回答（Markdown 格式化的房源列表）
```

---

## 十、交互细节

### 10.1 输入框

- `<textarea>` 自适应高度，最大 160px（约 6 行）
- Enter 发送，Shift+Enter 换行
- 生成中 placeholder 变为 "AI 思考中，点击右侧按钮停止..."
- 底部居中，宽度 80%，最大 700px

### 10.2 停止按钮

- 发送中：发送按钮变为红色停止按钮（脉冲动画）
- 点击停止：AbortController 终止 fetch，保留已输出内容
- 状态恢复：清空计时器，重置 isGenerating

### 10.3 计时器

- 发送时启动 `setInterval(1s)`
- 显示在当前思考步骤右侧：`{elapsed}s`
- 停止/完成时清零

### 10.4 聊天历史

- 存储在 `localStorage`，key: `ez_chat_history`
- 最多 20 个会话
- 标题：首条用户消息前 40 字
- 右侧滑入面板，带遮罩层

### 10.5 免责声明

- 固定在输入框下方
- 文字：「此结果由 AI 生成，请仔细甄别」
- 0.7rem 灰色小字

---

## 十一、文件清单

| 文件 | 职责 |
|------|------|
| `backend/app/agent.py` | ReAct 循环、SSE 事件发送、工具调度 |
| `backend/app/tools.py` | 7 个工具的实现 |
| `backend/app/config.py` | API key、模型配置 |
| `backend/app/main.py` | FastAPI 路由、SSE StreamingResponse |
| `frontend/src/components/AIChat.tsx` | 聊天主组件、SSE 解析、渲染逻辑 |
| `frontend/src/components/MapAndCard.tsx` | 地图/卡片组件（3 种模式） |
| `frontend/src/app/globals.css` | 全部样式、动画、主题 |
