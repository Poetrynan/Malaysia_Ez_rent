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

几秒钟后，卡片左边的竖条变成**绿色**，图标从旋转的 spinner 变成 ✅，卡片下方**自动展开可读预览**（如假日列表、通勤时间、汇率结果），无需点击。

这就像是厨房告诉你"菜做好了"，还把菜端到你面前。

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
| 工具卡片默认展示预览 | 完成后直接显示格式化结果；点标题栏 `▸` 才看原始 JSON |
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
                            live_agent_stream()  ← ReAct Loop (最多6轮)
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

#### ReAct 循环（最多 6 轮）

```python
MAX_LOOPS = 6
MAX_COMPLETION_TOKENS = 3072
reasoning_effort = assess_reasoning_effort(query)  # low / medium / high

for loop_idx in range(MAX_LOOPS):
    # 1. 发送 thinking 事件
    yield sse_event({"type": "thinking", "step": step_labels[loop_idx]})

    # 2. 调用 LLM（带 tools，动态推理强度 + 更大输出上限）
    response = openai_client.chat.completions.create(
        model=Config.AGENT_MODEL,
        messages=messages,
        tools=tools_definitions,
        tool_choice="auto",
        max_completion_tokens=MAX_COMPLETION_TOKENS,
        extra_body={"reasoning_effort": reasoning_effort, "include_reasoning": True}
    )

    # 3. 如果有推理过程，发送 thinking 事件
    reasoning = getattr(message, 'reasoning', None)
    if reasoning:
        yield sse_event({"type": "thinking", "label": "🧠 模型推理过程", "content": reasoning[:1000]})

    # 4. 如果没有 tool_calls → 输出最终答案，break（卡片在循环后统一发送）
    if not tool_calls:
        for char in content:
            yield sse_event({"type": "text", "delta": char})
        final_text_emitted = bool(content.strip())
        break

    # 5. 如果有 tool_calls → 执行工具，收集结果
    for tool_call in tool_calls:
        yield sse_event({"type": "tool_call", "tool_name": name, "args": args})
        result = execute_tool(name, args)
        yield sse_event({"type": "tool_result", "tool_name": name, "result": result})
        # 知识库：所有小区入 kb_card_candidates；通勤卡入 pending_ui_components
        # 循环结束后按 answer_text 匹配决定出几张 KB 地图卡
        # 喂给模型的工具结果先经 compact_tool_result() 压缩关键字段
```

**关键设计 1：文字先于地图**

所有 UI 组件（`pending_ui_components` + 按答案筛选的 `kb_card_candidates`）在**循环结束且文字已输出后**统一发送：
- 用户先看到文字分析/推荐
- 然后才看到地图/卡片组件
- 避免"只有卡片、没有分析"的糟糕体验

**关键设计 1b：多小区对比 → 多张地图卡**

循环中把知识库返回的**每个**带坐标小区存入 `kb_card_candidates`。答案写完后扫描 `answer_text`：凡在正文中被提到的小区各出一张 MapAndCard（最多 3 张）。已出现在通勤卡上的小区不重复。不再依赖模型是否记得设 `show_map=true`。

**关键设计 2：循环耗尽时的强制收尾合成**

若 6 轮全是 `tool_calls`、模型从未写出正文，不再发送废话兜底句，而是追加一次**不带 tools 的强制合成调用**（`tool_choice` 无 tools），让模型必须根据已收集的工具结果写出中文分析与推荐。

**关键设计 3：动态推理强度**

`assess_reasoning_effort(query)` 按问题难度选择 Groq `reasoning_effort`：
- 决策/对比题（"还是、哪个、住哪、推荐…"）→ `high`
- 汇率/节假日等查表题 → `low`
- 其余 → 配置默认 `medium`

**关键设计 4：工具结果智能压缩**

`compact_tool_result()` 在写入 messages 前只保留高信号字段（价格、评分、安全、距离、优缺点等），避免原先 `MAX_RESULT_CHARS=2000` 硬截断把整段小区信息从中间切断。地图卡片仍使用工具返回的**完整原始数据**构建。

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
┌──────────────────────────────────────────────────┐
│ 🤖 [头像]  ┌─ Assistant Bubble ─────────────┐   │
│            │ 1. Thinking Steps               │   │
│            │    ✅ 2步已完成 / 🔵 正在调用…   │   │
│            ├─────────────────────────────────┤   │
│            │ 2. Tool Cards（宽度自适应）      │   │
│            │    📅 get_malaysia_holidays ✓   │   │
│            │    year: 2026                   │   │
│            │    2026年公共假期 · 共15天       │   │
│            │    • 2026-01-01 New Year's Day   │   │
│            ├─────────────────────────────────┤   │
│            │ 3. Final Answer                 │   │
│            │    📝 最终回答 + Markdown       │   │
│            ├─────────────────────────────────┤   │
│            │ 4. UI Components（可多张地图）   │   │
│            │    🗺️ MapAndCard × N            │   │
│            └─────────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

**头像布局：** `.manus-assistant` 使用 `display: flex; flex-direction: row`，机器人头像在气泡**左侧**（与用户消息对称，用户气泡在右侧）。

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
┌─────────────────────────────────────┐
│ 📅 get_malaysia_holidays  ✓    ▸   │  ← header（▸ 仅切换原始 JSON）
│ year: 2026                          │  ← args：单行，过长横向滑动
├─────────────────────────────────────┤
│ 2026 年马来西亚公共假期 · 共 15 天   │  ← renderToolResult() 预览
│ • 2026-01-01 New Year's Day         │     完成后**默认展示**，无需点击
│ • 2026-05-01 Labour Day             │
└─────────────────────────────────────┘
         ↓ 点击 header 展开
┌─────────────────────────────────────┐
│ 原始数据                            │
│ { "year": 2026, "holidays": [...] } │
└─────────────────────────────────────┘
```

**`renderToolResult(name, result)`** 按工具类型格式化预览：

| 工具 | 预览内容 |
|------|---------|
| `get_malaysia_holidays` | 年份 + 假日列表（最多 12 条） |
| `calculate_commute` | 起终点 + 驾车/公交/步行时间 |
| `convert_currency_frankfurter` | 换算结果 + 汇率 |
| `search_knowledge_base` | 小区名 + 价格 + 评分（最多 5 条） |
| `get_web_realtime_info` | 摘要文本（前 500 字） |
| 其他 | JSON 摘要或条数 |

**布局（自适应，不硬换行）：**
- 卡片 `width: fit-content; max-width: 100%` — 短内容紧凑，长内容顶满气泡宽度
- 参数行 `flex-wrap: nowrap; overflow-x: auto` — 单行展示，过长可横滑
- 工具名空间不足时 `text-overflow: ellipsis`

**状态样式：**
- `running`：左侧 3px 青色边框 + 旋转 spinner
- `done`：左侧 3px 绿色边框 + 绿色勾 + 自动显示预览区
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

**多张地图卡：** 多小区对比时，`uiComponents` 可含多个 `MapAndCard`（每个被答案提及的小区一张），在最终回答下方纵向排列。

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
| AI 消息行 | `.manus-assistant` | `display:flex; row`，头像左 + 气泡右 |
| 用户气泡 | `.manus-user-text` | 青色背景，圆角 `18px 18px 6px 18px` |
| AI 气泡 | `.manus-assistant-bubble` | 玻璃背景，圆角 `16px 16px 16px 4px` |
| 工具卡片 | `.manus-tool-card` | `width:fit-content; max-width:100%`，左侧状态色条 |
| 工具预览 | `.manus-tool-body` / `.manus-tool-preview-*` | 完成后默认展示，无需点击 |
| 工具参数 | `.manus-tool-args` | 单行 `nowrap`，过长 `overflow-x:auto` |
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
| `<br>` / `<br/>` | 换行（`renderInline` 识别 HTML 换行标签） |

**注意：** 表格单元格内应避免模型输出 `<br>`；系统 prompt 要求单元格保持简短，多行信息放表格下方的列表。前端已兼容 `<br>` 以防模型偶尔违规输出。

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

## 十一、已知 Bug 与修复记录

### Bug 1：无关问题也弹出地图卡片（2026-06-05 修复）

**现象：** 用户问"吉隆坡留学生怎么办理手机卡？"，AI 回答完后底部出现了一张公寓地图卡片（Platinum Suites），和手机卡完全无关。

**根因：** 后端 `search_knowledge_base` 工具执行后，**无条件**生成 `MapAndCard` UI 组件 — 只要搜索结果有经纬度就附加地图，不管用户问的是什么。系统 prompt 的 "SEARCH FIRST, NEVER GUESS" 规则过于激进，导致 LLM 连无关问题也调用了 `search_knowledge_base`。

**修复：**
- 给 `search_knowledge_base` 工具新增 `show_map: boolean` 参数（默认 false）
- 系统 prompt 增加规则：只有租房/小区/住宿相关问题才设 `show_map=true`
- 后端只在 `show_map=true` 时才生成 MapAndCard

---

### Bug 2：地图定位与文字回答不一致（2026-06-05 修复）

**现象：** AI 文字回答重点介绍的是 A 小区，但地图卡片显示的是 B 小区的位置。

**根因：** 后端始终取 `result_data[0]`（第一个搜索结果）生成地图卡片，但 LLM 的文字回答可能重点介绍的是搜索结果中的其他小区。

**修复：**
- 给 `search_knowledge_base` 新增 `map_community_name: string` 参数
- LLM 指定地图该展示哪个小区（必须和搜索结果中的 `community_name` 匹配）
- 后端按名字匹配（不区分大小写），匹配失败才 fallback 到第一个结果

---

### Bug 3：第二个问题工具调用完成后不显示最终结果（2026-06-05 修复）

**现象：** 第二个问题的工具调用、推理都完成了，但最终文字回答不显示。

**根因（双重 bug）：**

1. **前端 SSE buffer 遗漏：** 流结束时 `reader.read()` 返回 `done=true`，但 `buf` 里可能还残留最后一个 SSE 事件（最后一包数据没以 `\n` 结尾）。原代码 `done → break` 直接跳出，残留数据丢失。
2. **后端无兜底：** `MAX_LOOPS=3` 的循环中，如果 3 轮全是 tool_calls（LLM 一直在查工具），循环结束时从未执行 `break`，text 和 UI component 都没发出去。

**修复：**
- 前端：流结束后 flush 剩余 buffer（`if (buf.trim()) processBuf(false)`）
- 后端：循环结束后补发 UI 组件；兜底文字已由**强制收尾合成**取代（见 Bug 5）

---

### Bug 4：重复地图卡片，浪费 Google API 调用（2026-06-05 修复）

**现象：** 用户问"从 Sunway Geo 到 UM 大学要多久？你推荐我住 GEO 吗？"，AI 回答后出现两张地图卡片：
1. 知识库模式卡片：显示 Sunway Geo 位置，但要求用户手动输入出发地
2. 通勤模式卡片：显示 UM → Geo 的实际路线

**根因：** `search_knowledge_base` 和 `calculate_commute` 各自独立生成 MapAndCard，互不感知。第一张卡片的"输入出发地"功能在已有通勤结果时完全多余，且多调用了一次 Google Maps API。

**修复：**
- 新增 `has_commute` 标志位，跟踪本轮是否调用了 `calculate_commute`
- 当 `has_commute=true` 时，跳过 `search_knowledge_base` 的 MapAndCard
- 将知识库的小区信息（名称、价格、评分、描述）合并到通勤卡片的 props 中
- 前端 MapAndCard 组件已有优先级逻辑：`isCommuteMode` > `isKBMode` > 房源模式
- 最终效果：一张卡片同时展示通勤路线 + 小区信息，只调用一次 Google Maps API

---

### Bug 5：复杂决策题只甩地图卡片、无分析（2026-06-05 修复，后续增强见 Bug 9）

**现象：** 用户问"我想住 GEO，但学校在 UM，还可能去 Monash 交换，住哪里最好？"，AI 只回复"以上是根据搜索结果整理的信息，希望对你有帮助！"，底下堆了两张互不相关的地图卡片（GEO 无出发地、Pantai Hillpark 有目的地），没有任何对比分析或推荐。

**根因（三重）：**

1. **循环耗尽无正文：** 复杂问题触发多轮工具调用（知识库 + 通勤 + 外部搜索），6 轮全用在 `tool_calls` 上，模型从未进入"写答案"分支。旧代码在循环结束后只发一句写死的废话兜底，**模型根本没机会分析**。
2. **两张各说各话的卡片：** `search_knowledge_base` 的地图卡片在 `calculate_commute` 之前就被加入 `pending_ui_components`（`has_commute` 尚未置位），导致知识库单点卡 + 通勤路线卡同时出现。
3. **跨小区信息错贴：** 知识库的 GEO 价格/评分被合并进 Pantai Hillpark 的通勤卡片（未校验 origin 名称是否一致）。

**修复：**

- 循环结束且 `final_text_emitted=false` 时，追加**强制收尾合成**（不传 `tools`，`max_completion_tokens=3072`），模型必须写出对比分析与明确推荐。
- 知识库地图改为延后决策；后续升级为 `kb_card_candidates` 多卡匹配（见 Bug 9）。
- 合并通勤卡与知识库信息时，校验 `community_name` 与 `origin_name` 是否匹配。
- 系统 prompt 新增 `## DECISION / TRADE-OFF QUESTIONS`：决策题必须先查再写分析，禁止只甩卡片或废话兜底。

---

### Bug 6：工具结果硬截断导致模型"看不全"（2026-06-05 修复）

**现象：** 多小区对比时，模型回答片面或遗漏选项，像"没查到"一样。

**根因：** 工具返回的完整 JSON 在写入 messages 前被 `MAX_RESULT_CHARS=2000` 从中间硬切，第二个/第三个小区的数据常被截断丢失。同时 Groq 免费层 **8K TPM** 速率限制迫使代码保守截断。

**修复：**

- 新增 `compact_tool_result()`：按工具类型只保留关键字段（社区名、价格、评分、安全、距离、前 3 优点、前 2 缺点等），**信息密度更高、不易从中间切断**。
- 安全网上限放宽至 3500 字符（仅兜底）。
- 地图/UI 组件仍用完整 `result_data`，不受压缩影响。

---

### Bug 7：输出 token 上限过小，分析写到一半被掐（2026-06-05 修复）

**现象：** 有分析意图但正文很短或戛然而止。

**根因：** 未设置 `max_completion_tokens`，Groq 默认 **1024**；gpt-oss 的推理 token 也计入此上限，复杂题推理占满后留给正文的所剩无几。

**修复：** 主循环与强制收尾合成均设 `max_completion_tokens=3072`。

---

### Bug 8：所有问题都用 medium 推理，复杂题思考不足（2026-06-05 修复）

**现象：** 多约束决策题（住 A 但学校 B、还可能去 C）推理深度不够。

**修复：** `assess_reasoning_effort(query)` 动态选择 `low` / `medium` / `high`；决策/对比类关键词命中 `high`，汇率/节假日命中 `low`。

---

### Bug 9：多小区对比只出一张地图卡（2026-06-05 修复）

**现象：** 用户对比 GEO 与 Pantai Hillpark 两个小区，文字里两个都分析了，但底部零张或仅一张地图卡。

**根因：** 旧逻辑只取 `search_knowledge_base` 的单个 `best` 结果，且依赖模型设 `show_map=true`（模型经常忘记设）。

**修复：**
- 循环中收集所有带坐标的搜索结果到 `kb_card_candidates`
- 答案完成后扫描 `answer_text`，正文提到几个小区就出几张卡（上限 3）
- 已在通勤卡展示的小区跳过；`kb_show_map=true` 时保留单卡兜底（防非住房问题误弹卡）

---

### Bug 10：Markdown 表格内 `<br>` 原样显示（2026-06-05 修复）

**现象：** 对比表格单元格出现字面量 `<br>` 而非换行。

**根因：** 自定义 `renderInline` 不识别 HTML 标签。

**修复：** `renderInline` 按 `<br>` / `<br/>` 切分并渲染 React `<br />`；系统 prompt 禁止在表格单元格内使用 HTML。

---

### Bug 11：工具卡完成后只显示「✓ 完成」，需点击才看结果（2026-06-05 修复）

**现象：** 如节假日查询，工具执行完毕但卡片只显示 `✓ 完成`，用户必须点开才能看假日列表。

**根因：** 工具结果默认折叠，折叠态摘要过于简陋。

**修复：**
- 新增 `renderToolResult()`，工具 `done` 后**默认展示**人类可读预览
- 点击 header 右侧 `▸` 才展开原始 JSON（开发者/调试用）
- 卡片 `width: fit-content` 自适应宽度；参数单行横滑，不硬换行

---

### Bug 12：AI 头像不在气泡左侧（2026-06-05 修复）

**现象：** 机器人头像显示在气泡上方，而非气泡左边，不像标准 IM 布局。

**根因：** `.manus-assistant` 容器缺少 `display: flex`，头像与气泡按块级元素纵向堆叠。

**修复：** `.manus-assistant { display: flex; flex-direction: row; align-items: flex-start; gap: 10px; }`，头像左、气泡右。

---

## 十二、文件清单

| 文件 | 职责 |
|------|------|
| `backend/app/agent.py` | ReAct 循环、SSE 事件发送、工具调度 |
| `backend/app/tools.py` | 7 个工具的实现 |
| `backend/app/config.py` | API key、模型配置 |
| `backend/app/main.py` | FastAPI 路由、SSE StreamingResponse |
| `frontend/src/components/AIChat.tsx` | 聊天主组件、SSE 解析、渲染逻辑 |
| `frontend/src/components/MapAndCard.tsx` | 地图/卡片组件（3 种模式） |
| `frontend/src/app/globals.css` | 全部样式、动画、主题 |
