# Groq GPT-OSS 120B 完整使用说明

根据 Groq 官方文档，以下是 `openai/gpt-oss-120b` 的完整参数和使用指南。


## 📋 一、模型基本信息

| 属性 | 数值 |
| :--- | :--- |
| **模型 ID** | `openai/gpt-oss-120b` |
| **架构** | MoE（混合专家），120B 总参数，5.1B 激活/前向传播 |
| **推理速度** | ~500 tokens/秒 |
| **上下文窗口** | 131,072 tokens |
| **最大输出 tokens** | 65,536 tokens |
| **输入价格** | $0.15 / 百万 tokens |
| **缓存输入** | $0.075 / 百万 tokens |
| **输出价格** | $0.60 / 百万 tokens |

**性能基准**：
- MMLU（通用推理）：90.0%
- SWE-Bench Verified（编程）：62.4%
- HealthBench Realistic（医疗）：57.6%
- MMMLU（多语言）：81.3%


## 🚀 二、快速开始

### 安装与配置

```bash
# 安装 Groq SDK
pip install groq

# 设置 API Key
export GROQ_API_KEY="your-api-key-here"
```

### 最小调用示例

```python
from groq import Groq

client = Groq()

completion = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[
        {
            "role": "user",
            "content": "Explain why fast inference is critical for reasoning models"
        }
    ]
)

print(completion.choices[0].message.content)
```


## 🧠 三、推理控制参数（核心）

### 1. `reasoning_effort` —— 推理强度

GPT-OSS 120B 支持三档推理强度控制：

| 选项 | 说明 | 适用场景 |
| :--- | :--- | :--- |
| `"low"` | 低强度，使用少量推理 tokens | 简单问答、分类、信息提取 |
| `"medium"` | 中等强度，平衡质量与速度 | 大多数日常任务（推荐） |
| `"high"` | 高强度，使用大量推理 tokens | 复杂数学、逻辑推理、代码调试 |

```python
reasoning_effort="medium"  # low / medium / high
```

### 2. `include_reasoning` —— 是否返回推理过程

| 选项 | 说明 |
| :--- | :--- |
| `true` | 在 `message.reasoning` 字段返回推理过程（默认） |
| `false` | 不返回推理过程 |

```python
include_reasoning=True  # 获取模型的内部思考链
```

### ⚠️ GPT-OSS 系列的重要限制

根据 Groq 官方文档，**`openai/gpt-oss-20b` 和 `openai/gpt-oss-120b` 不支持 `reasoning_format` 参数**。

也就是说：
- ❌ 不能使用 `reasoning_format="raw"`（返回 `<think>` 标签）
- ❌ 不能使用 `reasoning_format="parsed"`
- ❌ 不能使用 `reasoning_format="hidden"`
- ✅ 只能通过 `include_reasoning` 参数控制推理内容的返回

推理内容默认在 `message.reasoning` 字段中返回。


## 🌡️ 四、生成控制参数

| 参数 | 类型 | 范围 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- | :--- |
| **`temperature`** | float | 0.0 - 2.0 | 0.6 | 控制随机性。推荐 0.5-0.7 |
| **`top_p`** | float | 0.0 - 1.0 | 0.95 | 核采样阈值 |
| **`max_completion_tokens`** | int | - | 1024 | 最大输出 token 数，复杂任务建议 4096+ |
| **`stop`** | string/array | - | null | 停止序列，最多 4 个 |
| **`seed`** | int | - | null | 设置后使输出可复现 |
| **`stream`** | bool | - | false | 是否流式返回 |

### ⚠️ 已知限制

以下参数**当前不支持**任何 Groq 模型：
- `frequency_penalty`
- `presence_penalty`
- `logprobs` / `top_logprobs`
- `n > 1`（只支持 `n=1`）


## 🛠️ 五、内置工具（Agent 核心能力）

GPT-OSS 120B 是 Groq 上 Agent 能力最完整的模型，支持以下内置工具：

### 1. 代码执行（Code Interpreter）

在安全的服务器端沙箱中执行 Python 代码：

```python
from groq import Groq

client = Groq()

response = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[
        {"role": "user", "content": "Calculate the square root of 12345. Output only the final answer."}
    ],
    tool_choice="required",
    tools=[
        {"type": "code_interpreter"}
    ]
)

# 最终输出
print(response.choices[0].message.content)
# 推理过程
print(response.choices[0].message.reasoning)
# 执行的代码
print(response.choices[0].message.executed_tools[0])
```

### 2. 浏览器搜索（Browser Search）

模拟人类浏览行为，获取实时网页内容（由 Exa 驱动）：

```python
chat_completion = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[
        {"role": "user", "content": "What happened in AI last week? Give me a concise summary."}
    ],
    tool_choice="required",
    tools=[
        {"type": "browser_search"}
    ],
    reasoning_effort="medium"  # 搜索场景推荐 low 或 medium
)
```

> ⚠️ 浏览器搜索与结构化输出（structured outputs）不兼容

### 3. 函数调用（Function Calling）

```python
tools=[
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "获取指定位置的天气",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string", "description": "城市名"}
                },
                "required": ["location"]
            }
        }
    }
],
tool_choice="auto"  # auto / none / required / 指定函数
```


## 🎫 六、服务等级参数

### `service_tier`

| 选项 | 说明 | 适用场景 |
| :--- | :--- | :--- |
| `"on_demand"` | 标准服务，高峰期可能有队列等待（默认） | 大多数场景 |
| `"auto"` | 自动选择当前可用的最佳等级 | 不想手动管理时使用 |
| `"flex"` | 尽力而为，高吞吐但可能过载 | 非关键批量任务 |
| `"performance"` | 企业级优先队列，低延迟保障 | **仅限企业用户** |

```python
service_tier="auto"
```

**Performance Tier 要求**：
- 仅对企业用户开放
- 上下文长度（未缓存）必须低于 8,192 tokens


## 📊 七、完整调用示例

### 示例 1：基础调用（带推理）

```python
from groq import Groq

client = Groq()

completion = client.chat.completions.create(
    # 必填参数
    model="openai/gpt-oss-120b",
    messages=[
        # 重要：避免使用 system prompt，将所有指令放在 user message 中
        {"role": "user", "content": "A farmer needs to cross a river with a wolf, a goat, and a cabbage. The boat can only carry one item at a time. How can he get everything across safely?"}
    ],
    
    # 推理控制
    reasoning_effort="high",        # low / medium / high
    include_reasoning=True,         # 返回推理过程（默认 true）
    
    # 生成控制
    temperature=0.6,
    top_p=0.95,
    max_completion_tokens=4096,     # 复杂任务调高
    stream=False,
    seed=42,                        # 可复现结果
    
    # 服务等级
    service_tier="on_demand",       # 或 "auto"
)

# 获取推理过程
print("=== 推理过程 ===")
print(completion.choices[0].message.reasoning)

# 获取最终答案
print("=== 最终答案 ===")
print(completion.choices[0].message.content)
```

### 示例 2：带代码执行的 Agent

```python
completion = client.chat.completions.create(
    model="openai/gpt-oss-120b",
    messages=[
        {"role": "user", "content": "Calculate the sum of all prime numbers under 1000, then search online for interesting facts about that number."}
    ],
    reasoning_effort="medium",
    tool_choice="auto",
    tools=[
        {"type": "code_interpreter"},   # 计算质数和
        {"type": "browser_search"}      # 搜索相关信息
    ],
    temperature=0.6,
    max_completion_tokens=8192
)

# 查看工具执行结果
print(completion.choices[0].message.content)
print(completion.choices[0].message.executed_tools)
```


## 📋 八、参数速查表

| 分类 | 参数 | 默认值 | 推荐值 |
| :--- | :--- | :--- | :--- |
| **必填** | `model` | - | `"openai/gpt-oss-120b"` |
| **必填** | `messages` | - | 避免 system prompt，指令放 user |
| **推理** | `reasoning_effort` | `"medium"` | 复杂任务用 `"high"` |
| **推理** | `include_reasoning` | `true` | 调试用 `true`，生产可 `false` |
| **生成** | `temperature` | `0.6` | 0.5-0.7 |
| **生成** | `top_p` | `0.95` | 0.9-1.0 |
| **生成** | `max_completion_tokens` | `1024` | 复杂任务 4096+ |
| **生成** | `stream` | `false` | 交互式用 `true` |
| **工具** | `tools` | `[]` | 按需添加 `code_interpreter` / `browser_search` / 自定义函数 |
| **工具** | `tool_choice` | `"auto"` | 强制调用用 `"required"` |
| **服务** | `service_tier` | `"on_demand"` | 保持默认或 `"auto"` |


## 💡 九、最佳实践

1. **避免使用 system prompt**：官方建议将所有指令放在 user message 中，效果更好

2. **合理设置 reasoning_effort**：
   - 简单任务用 `low`，节省 tokens
   - 复杂推理用 `high`，获得更准确的答案

3. **适当调高 max_completion_tokens**：默认 1024 对于复杂推理任务可能不够，建议设置为 4096 或更高

4. **使用 include_reasoning 调试**：开发阶段开启，了解模型思考过程；生产环境可关闭以节省带宽

5. **充分利用内置工具**：GPT-OSS 120B 的代码执行和浏览器搜索功能是目前 Groq 免费层中最完整的 Agent 能力


## ⚠️ 十、重要限制汇总

| 限制 | 说明 |
| :--- | :--- |
| **不支持 `reasoning_format`** | 不能使用 `raw`/`parsed`/`hidden` 格式 |
| **不支持 `frequency_penalty`** | 所有 Groq 模型都不支持 |
| **不支持 `presence_penalty`** | 所有 Groq 模型都不支持 |
| **不支持 `logprobs`** | 所有 Groq 模型都不支持 |
| **`n` 只能为 1** | 不支持生成多个回复 |
| **浏览器搜索不兼容结构化输出** | 两者不能同时使用 |
| **Performance Tier 需要企业版** | 免费/开发者用户只能用 `on_demand`/`auto`/`flex` |