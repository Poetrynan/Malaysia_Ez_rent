import json
import asyncio
from typing import AsyncGenerator, Dict, Any, List, Optional
from app.config import Config
from app.tools import (
    calculate_commute,
    get_web_realtime_info,
    convert_currency_frankfurter,
    get_malaysia_holidays,
    search_internal_db,
    search_knowledge_base,
    search_external_listings,
    openai_client
)

# Helper to format agent events as SSE strings
def sse_event(data: Dict[str, Any]) -> str:
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"


async def mock_agent_stream(query: str, user_id: str) -> AsyncGenerator[str, None]:
    """
    Simulates a high-fidelity ReAct agent thought loop and tool execution.
    Provides immediate feedback in local development without API keys.
    """
    query_lower = query.lower()

    if any(kw in query_lower for kw in ["rent", "room", "house", "lease", "bill", "账单", "房租", "交租", "租金", "房源", "公寓", "住宅", "找房", "租房"]):
        yield sse_event({"type": "thinking", "step": "🔍 Analyzing user query. The user is asking about renting or room search. These tasks should be done directly via UI tabs."})
        await asyncio.sleep(0.8)
        
        resp = (
            "您好！房源浏览和租约账单管理均无需通过 AI 查询，您直接查看页面菜单即可，这样更方便直观哦：\n\n"
            "1. 🔍 **浏览/搜索房源**：请直接点击上方导航栏的 **“房源列表”** 页面，您可以利用筛选条件和地图直接查找最心仪的房间。\n"
            "2. 💳 **查看账单/交租**：请直接点击上方导航栏的 **“我的租约”** 页面，里面有您实时的月度收租账单台账，并提供付款扫码与凭证上传功能。\n\n"
            "---\n\n"
            "作为您的 **AI 租房助手**，我当前支持以下核心功能，您可以随时向我提问：\n\n"
            "- 🚇 **交通通勤测算**：根据您输入的出发地址（如小区名字、地标），帮您测算到双威、莫纳什等校区的通勤路程与时间。\n"
            "  *示例 Prompt*: `帮我计算一下从 Sunway Geo Residences 到莫纳什大学要多久？`\n"
            "- 💱 **实时汇率换算**：快速查询和换算令吉（MYR）至人民币（CNY）或美元（USD）的最新汇率。\n"
            "  *示例 Prompt*: `3000令吉等于多少人民币？`\n"
            "- 📅 **大马节假日查询**：查询马来西亚官方的公众假期，方便您规划签证办理或银行办事时间。\n"
            "  *示例 Prompt*: `查一下2026年马来西亚有哪些国定假日？`\n"
            "- 🌐 **租客生活指南**：解答关于大马电话卡、公交卡办理、生活费水平等各种生活常识。\n"
            "  *示例 Prompt*: `租客在吉隆坡怎么办理 Touch 'n Go 公交卡？`"
        )
        for char in resp:
            yield sse_event({"type": "text", "delta": char})
            await asyncio.sleep(0.005)
        return

    elif any(kw in query_lower for kw in ["commute", "大学", "莫纳什", "双威", "泰莱", "马来亚", "亚太", "monash", "sunway", "taylor", "apu", "malaya", "um", "校区", "怎么去", "交通", "多久", "时间", "通勤"]):
        yield sse_event({"type": "thinking", "step": "🚇 Calculating commute travel time to Malaysia universities using Google Maps database..."})
        await asyncio.sleep(0.8)
        
        # Extract origin and university from user query
        from app.mock_data import UNIVERSITIES, COMMUNITIES
        origin_address = "Sunway Geo Residences"  # default
        target_uni = "Monash University Malaysia"  # default
        
        # Try to match a university from the query
        uni_keywords = {
            "马来亚": "Universiti Malaya (UM)", "um": "Universiti Malaya (UM)", "malaya": "Universiti Malaya (UM)",
            "university of malaya": "Universiti Malaya (UM)", "universiti malaya": "Universiti Malaya (UM)",
            "莫纳什": "Monash University Malaysia", "monash": "Monash University Malaysia",
            "双威": "Sunway University", "sunway": "Sunway University",
            "泰莱": "Taylor's University", "taylor": "Taylor's University",
            "apu": "Asia Pacific University (APU)", "亚太": "Asia Pacific University (APU)",
        }
        for kw, uni_name in uni_keywords.items():
            if kw in query_lower:
                target_uni = uni_name
                break
        
        # Try to match a community/origin from the query
        for comm in COMMUNITIES:
            if comm["name"].lower() in query_lower or any(w in query_lower for w in comm["name"].lower().split()):
                origin_address = comm["name"]
                break
        
        yield sse_event({"type": "tool_call", "tool_name": "calculate_commute", "args": {"origin_address": origin_address, "destination_address": target_uni}})
        await asyncio.sleep(0.8)

        commute_info = calculate_commute(origin_address, target_uni)
        yield sse_event({"type": "tool_result", "tool_name": "calculate_commute", "result": commute_info})
        await asyncio.sleep(0.5)
        
        dest_display = commute_info.get('destination_name') or target_uni
        intro = f"根据地图测算，从 **{origin_address}** 到 **{dest_display}** 的交通路线如下：\n\n"
        for char in intro:
            yield sse_event({"type": "text", "delta": char})
            await asyncio.sleep(0.005)
            
        details = (
            f"- 🚗 驾车: {commute_info['driving_distance']} / {commute_info['driving_duration']}\n"
            f"- 🚊 公共交通: {commute_info['transit_duration']}\n"
            f"- 🚶 步行: {commute_info['walk_duration']}\n\n"
            "注：吉隆坡早晚高峰容易拥堵，建议首选公共交通/步道（如双威 Canopy Walk）出行。"
        )
        for char in details:
            yield sse_event({"type": "text", "delta": char})
            await asyncio.sleep(0.005)

        # Show map routing visually
        yield sse_event({
            "type": "ui_component",
            "component": "MapAndCard",
            "props": {
                "origin_name": commute_info.get("origin_name") or origin_address,
                "origin_lat": float(commute_info.get("origin_lat") or 3.06341),
                "origin_lng": float(commute_info.get("origin_lng") or 101.60977),
                "destination_name": commute_info.get("destination_name") or target_uni,
                "destination_lat": float(commute_info.get("destination_lat") or 3.0645),
                "destination_lng": float(commute_info.get("destination_lng") or 101.6000)
            }
        })
        await asyncio.sleep(0.5)
            
    elif any(kw in query_lower for kw in ["currency", "换算", "汇率", "rmb", "人民币", "myr", "令吉", "钱"]):
        yield sse_event({"type": "thinking", "step": "💱 Querying Frankfurter API for live currency exchange rate..."})
        await asyncio.sleep(0.8)
        
        yield sse_event({"type": "tool_call", "tool_name": "convert_currency_frankfurter", "args": {"amount": 1000.0, "from_currency": "MYR", "to_currency": "CNY"}})
        await asyncio.sleep(0.8)
        
        rate_info = convert_currency_frankfurter(amount=1000.0, from_currency="MYR", to_currency="CNY")
        yield sse_event({"type": "tool_result", "tool_name": "convert_currency_frankfurter", "result": rate_info})
        await asyncio.sleep(0.5)
        
        res_text = (
            f"根据最新实时汇率：\n"
            f"**1000 令吉 (MYR)** = **{rate_info['converted_amount']} 人民币 (CNY)**\n"
            f"当前汇率基准为: {rate_info['rate']} (1 MYR = {rate_info['rate']} CNY)"
        )
        for char in res_text:
            yield sse_event({"type": "text", "delta": char})
            await asyncio.sleep(0.005)
            
    elif any(kw in query_lower for kw in ["holiday", "节日", "放假", "假期", "公休"]):
        yield sse_event({"type": "thinking", "step": "📅 Querying Nager.Date for official Malaysian public holidays..."})
        await asyncio.sleep(0.8)
        
        yield sse_event({"type": "tool_call", "tool_name": "get_malaysia_holidays", "args": {"year": 2026}})
        await asyncio.sleep(0.8)
        
        holidays_info = get_malaysia_holidays(year=2026)
        yield sse_event({"type": "tool_result", "tool_name": "get_malaysia_holidays", "result": holidays_info})
        await asyncio.sleep(0.5)
        
        res_text = "为您查到 2026 年马来西亚的部分重要公众假期（部分节日依农历或伊斯兰历可能有微调）：\n\n"
        for char in res_text:
            yield sse_event({"type": "text", "delta": char})
            await asyncio.sleep(0.005)
            
        for h in holidays_info["holidays"][:5]:
            line = f"- **{h['date']}**: {h['english_name']} ({h['local_name']})\n"
            for char in line:
                yield sse_event({"type": "text", "delta": char})
                await asyncio.sleep(0.005)
                
    else:
        yield sse_event({"type": "thinking", "step": "🌐 Searching Tavily for student guide and local information..."})
        await asyncio.sleep(0.8)
        
        yield sse_event({"type": "tool_call", "tool_name": "get_web_realtime_info", "args": {"query": query}})
        await asyncio.sleep(0.8)
        
        web_result = get_web_realtime_info(query)
        yield sse_event({"type": "tool_result", "tool_name": "get_web_realtime_info", "result": web_result})
        await asyncio.sleep(0.5)
        
        intro = "根据马来西亚最新租房与生活资讯：\n\n"
        for char in intro:
            yield sse_event({"type": "text", "delta": char})
            await asyncio.sleep(0.005)
            
        for char in web_result:
            yield sse_event({"type": "text", "delta": char})
            await asyncio.sleep(0.005)


async def live_agent_stream(
    query: str,
    user_id: str,
    history: Optional[List[Dict[str, Any]]] = None
) -> AsyncGenerator[str, None]:
    """
    Executes a real ReAct loop using OpenAI Tool Calling.
    """
    tools_definitions = [
        {
            "type": "function",
            "function": {
                "name": "calculate_commute",
                "description": "Calculate travel times and distances between any two locations using Google Maps. Accepts ANY address, landmark, building name, or university — resolve abbreviations to full names before calling (e.g. 'UM' → 'Universiti Malaya', 'KLCC' → 'Petronas Twin Towers').",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "origin_address": {"type": "string", "description": "Full starting address, building name, or landmark in Malaysia (e.g. 'Sunway Geo Residences, Bandar Sunway', 'KLCC, Kuala Lumpur')."},
                        "destination_address": {"type": "string", "description": "Full destination address, university name, or landmark (e.g. 'Universiti Malaya', 'Monash University Malaysia'). NOT abbreviations — use full names."}
                    },
                    "required": ["origin_address", "destination_address"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_web_realtime_info",
                "description": "Search the live web for transit policies, deposit rules, neighborhood facts - NOT for property listings.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Specific search query."}
                    },
                    "required": ["query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "convert_currency_frankfurter",
                "description": "Convert currency exchange rate (e.g. MYR to CNY, USD to MYR) for a specified amount.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "amount": {"type": "number", "default": 1.0, "description": "The amount to convert."},
                        "from_currency": {"type": "string", "default": "MYR", "description": "3-letter source currency ISO code (e.g., MYR, CNY, USD)."},
                        "to_currency": {"type": "string", "default": "CNY", "description": "3-letter target currency ISO code (e.g., CNY, MYR, USD)."}
                    },
                    "required": ["amount", "from_currency", "to_currency"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_malaysia_holidays",
                "description": "Retrieve public holidays in Malaysia for a specific year.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "year": {"type": "integer", "default": 2026, "description": "The calendar year (e.g. 2026)."}
                    },
                    "required": ["year"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "search_internal_db",
                "description": "Search the internal database of available rental rooms/units using vector similarity and filter criteria.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "semantic_query": {"type": "string", "description": "Free text query describing the room, e.g. 'near monash', 'studio with gym', 'medium room in sunway'."},
                        "room_type": {"type": "string", "enum": ["Studio", "Master Room", "Medium Room", "Small Room", "Whole Unit"], "description": "Optional room type filter."},
                        "max_price": {"type": "number", "description": "Optional maximum monthly rent in MYR."}
                    },
                    "required": ["semantic_query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "search_knowledge_base",
                "description": "Search the rental knowledge base for community/property profiles near Malaysian universities. Returns rich info: price ranges, ratings, pros/cons, transportation, facilities, distance to university, etc. Use this when users ask about neighborhoods, communities, or want recommendations.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "semantic_query": {"type": "string", "description": "Natural language query, e.g. 'affordable condo near Sunway University', 'safe apartment with gym in Nilai'."},
                        "state": {"type": "string", "description": "Optional Malaysian state filter, e.g. 'Selangor', 'Kuala Lumpur', 'Perak'."},
                        "max_results": {"type": "integer", "default": 5, "description": "Max number of results to return (default 5)."},
                        "show_map": {"type": "boolean", "default": False, "description": "Set to true ONLY when the user is asking about housing, properties, neighborhoods, or accommodation. Set to false for general questions (phone cards, visa, food, transport, etc.)."},
                        "map_community_name": {"type": "string", "description": "When show_map=true, set this to the exact community name that the map should display. Must match a community_name from the search results. E.g. if your answer focuses on 'Sunway Geo Residences', set this to 'Sunway Geo Residences'. Only used when show_map=true."}
                    },
                    "required": ["semantic_query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "search_external_listings",
                "description": "Search external rental platforms for actual available rooms/listings. Returns structured listing data with prices, room types, and locations. Use this when users ask for specific available rooms, current prices, or want to find a room to rent NOW. Always combine with search_knowledge_base for context.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "location": {"type": "string", "description": "Area name, community name, or university name, e.g. 'Sunway Geo Residences', 'Nilai', 'near Monash University'."},
                        "room_type": {"type": "string", "description": "Optional room type filter, e.g. 'master room', 'studio', 'medium room'."},
                        "max_price": {"type": "number", "description": "Optional maximum monthly rent in MYR."}
                    },
                    "required": ["location"]
                }
            }
        }
    ]

    messages = [
        {
            "role": "system",
            "content": (
                "You are EzRent AI, an expert rental assistant for international students in Malaysia. "
                "You know 52 universities and 174 communities across Malaysia with detailed profiles "
                "(price ranges, ratings, pros/cons, transportation, facilities, distance to university).\n\n"
                "## CORE RULE: SEARCH FIRST, NEVER GUESS\n"
                "- User mentions ANY name/keyword (YOLO, Sunway Geo, D28, Monash, etc.) → call search_knowledge_base IMMEDIATELY\n"
                "- User asks about prices/recommendations/neighborhoods → call search_knowledge_base + search_external_listings TOGETHER\n"
                "- Only ask for clarification AFTER searching and finding nothing relevant\n"
                "- NEVER say 'I don't have information about that' without searching first\n"
                "- IMPORTANT: Only set show_map=true when the query is about housing/properties/neighborhoods. For general questions (phone cards, visa, food, etc.), set show_map=false.\n"
                "- When show_map=true, ALWAYS set map_community_name to the exact community your answer focuses on (must match a community_name from search results). If your answer covers multiple communities, pick the one you recommend most.\n\n"
                "## HOW TO ANSWER HOUSING QUESTIONS\n"
                "When presenting community info, ALWAYS structure your answer like this:\n"
                "1. **Community name + location** (one line)\n"
                "2. **Price range** (e.g. RM 650-1,800/月)\n"
                "3. **Key highlights** (3-5 bullet points: rating, distance, pros)\n"
                "4. **Things to note** (cons, if any)\n"
                "5. **Best for** (who is this community ideal for)\n\n"
                "When comparing communities, use a table format:\n"
                "| 小区 | 价格 | 评分 | 距大学 | 亮点 |\n\n"
                "When user asks vague questions like '便宜的' / '好的' / '推荐':\n"
                "- Search the knowledge base with relevant filters\n"
                "- Rank results by the requested criteria (price → low to high, rating → high to low)\n"
                "- Present top 3-5 options with clear reasoning\n\n"
                "## TOOL RULES\n"
                "- For commute: resolve 'UM' → 'Universiti Malaya', 'KLCC' → 'Petronas Twin Towers'. Ask for address if too vague.\n"
                "- NEVER reveal how you get data (Tavily, Supabase, Google Maps API, etc.). You are the expert, not a tool wrapper.\n"
                "- NEVER mention rental platforms (Mudah.my, PropertyGuru, iProperty, etc.) — not even in disclaimers or footnotes.\n"
                "- NEVER add disclaimers like '以上房源均来自XX平台' or '具体信息请在XX网站获取'. You ARE the source.\n"
                "- You MAY share useful external URLs when the user asks (e.g. university websites, government portals, official pages). Use markdown links.\n"
                "- NEVER make up coordinates, distances, or prices. Only use tool results.\n"
                "- NEVER print raw User ID strings.\n"
                "- Answer in Chinese. Use markdown tables and bullet points for clarity.\n\n"
                "## FEATURES (list when asked '你有什么功能')\n"
                "- 🏘️ 小区推荐 — 52 所大学、174 个小区的完整资料\n"
                "- 🔍 房源搜索 — 实时搜索外部租房平台\n"
                "- 🚇 通勤测算 — 驾车/公交/步行路线和时间\n"
                "- 💱 汇率换算 — MYR ↔ CNY ↔ USD\n"
                "- 📅 节假日查询 — 马来西亚公众假期\n"
                "- 🌐 生活指南 — 电话卡、公交卡、签证等\n"
            )
        }
    ]

    # Append historical messages if present (exclude welcome message starting with 👋)
    if history:
        for msg in history:
            role = msg.get("role")
            content = msg.get("content")
            if role in ["user", "assistant"] and content and not content.startswith("👋"):
                messages.append({"role": role, "content": content})

    # Append current query
    messages.append({"role": "user", "content": f"User ID: {user_id}\nQuery: {query}"})

    # ReAct Loop
    pending_ui_components = []  # Collect map data, emit AFTER text is done
    has_commute = False  # Track if calculate_commute was called (skip duplicate map card)
    kb_community_info = None  # Store knowledge base result for merging into commute card
    MAX_LOOPS = 5  # Allow up to 5 rounds for complex multi-tool queries
    for loop_idx in range(MAX_LOOPS):
        step_labels = [
            "🔍 正在理解你的问题...",
            "🛠️ 正在调用工具获取信息...",
            "📝 正在组织回答..."
        ]
        yield sse_event({"type": "thinking", "step": step_labels[min(loop_idx, len(step_labels)-1)]})
        await asyncio.sleep(0.3)

        try:
            # Build extra kwargs for Groq reasoning support
            extra_body = {}
            if Config.AGENT_REASONING_EFFORT:
                extra_body["reasoning_effort"] = Config.AGENT_REASONING_EFFORT
                extra_body["include_reasoning"] = True

            response = openai_client.chat.completions.create(
                model=Config.AGENT_MODEL,
                messages=messages,
                tools=tools_definitions,
                tool_choice="auto",
                timeout=90.0,
                extra_body=extra_body if extra_body else None
            )
        except Exception as e:
            err_str = str(e)
            print(f"[Agent Error] {type(e).__name__}: {err_str[:500]}")
            # Rate limit / quota exceeded
            if "429" in err_str or "RESOURCE_EXHAUSTED" in err_str or "quota" in err_str.lower():
                yield sse_event({"type": "text", "delta": "🙏 抱歉，当前 AI 助手使用人数较多，请求已达今日上限。请稍后再试，或联系管理员升级服务额度。"})
            # API key invalid / forbidden
            elif "401" in err_str or "403" in err_str or "invalid" in err_str.lower() or "forbidden" in err_str.lower() or "authorization" in err_str.lower():
                yield sse_event({"type": "text", "delta": f"⚙️ AI 服务配置异常（{type(e).__name__}），请联系管理员检查 API Key 和模型设置。"})
            # Model overloaded
            elif "503" in err_str or "overloaded" in err_str.lower() or "high demand" in err_str.lower():
                yield sse_event({"type": "text", "delta": "⏳ AI 助手当前繁忙，请稍等几秒后重试。"})
            # Network / timeout
            elif "timeout" in err_str.lower() or "connect" in err_str.lower():
                yield sse_event({"type": "text", "delta": "🌐 网络连接超时，请检查网络后重试。"})
            # Generic fallback
            else:
                yield sse_event({"type": "text", "delta": f"❌ AI 助手遇到了问题，请稍后重试。如持续出现请联系管理员。"})
            return

        # Safety check for empty/malformed response
        if not response.choices:
            yield sse_event({"type": "text", "delta": "⚠️ AI 返回了空响应，请重试。"})
            break

        message = response.choices[0].message
        tool_calls = message.tool_calls

        # Send Groq reasoning process to frontend (if available)
        reasoning = getattr(message, 'reasoning', None)
        if reasoning:
            yield sse_event({"type": "thinking", "label": "🧠 模型推理过程", "content": reasoning[:1000]})
            await asyncio.sleep(0.3)

        # If model chooses to write text (no tool calls)
        if not tool_calls:
            content = message.content or ""
            # Stream the final text typewriter-style
            for char in content:
                yield sse_event({"type": "text", "delta": char})
                await asyncio.sleep(0.01)
            # Text done — now emit all pending UI components (maps, cards, etc.)
            for comp in pending_ui_components:
                yield sse_event(comp)
                await asyncio.sleep(0.3)
            break

        # Append assistant's message with tool calls
        assistant_msg = {
            "role": "assistant",
            "content": message.content or ""
        }
        if message.tool_calls:
            assistant_msg["tool_calls"] = [
                {
                    "id": tc.id,
                    "type": tc.type,
                    "function": {
                        "name": tc.function.name,
                        "arguments": tc.function.arguments
                    }
                } for tc in message.tool_calls
            ]
        messages.append(assistant_msg)

        # Process each tool call
        for tool_call in tool_calls:
            tool_name = tool_call.function.name
            tool_args = json.loads(tool_call.function.arguments)

            yield sse_event({"type": "tool_call", "tool_name": tool_name, "args": tool_args})
            await asyncio.sleep(0.8)

            # Invoke target tool
            result_data = None
            if tool_name == "calculate_commute":
                has_commute = True
                result_data = calculate_commute(
                    origin_address=tool_args.get("origin_address", ""),
                    destination_address=tool_args.get("destination_address", tool_args.get("university_name", ""))
                )
            elif tool_name == "get_web_realtime_info":
                result_data = get_web_realtime_info(query=tool_args.get("query", ""))
            elif tool_name == "convert_currency_frankfurter":
                result_data = convert_currency_frankfurter(
                    amount=tool_args.get("amount", 1.0),
                    from_currency=tool_args.get("from_currency", "MYR"),
                    to_currency=tool_args.get("to_currency", "CNY")
                )
            elif tool_name == "get_malaysia_holidays":
                result_data = get_malaysia_holidays(
                    year=tool_args.get("year", 2026)
                )
            elif tool_name == "search_internal_db":
                result_data = search_internal_db(
                    semantic_query=tool_args.get("semantic_query", ""),
                    room_type=tool_args.get("room_type"),
                    max_price=tool_args.get("max_price")
                )
            elif tool_name == "search_knowledge_base":
                result_data = search_knowledge_base(
                    semantic_query=tool_args.get("semantic_query", ""),
                    state=tool_args.get("state"),
                    max_results=tool_args.get("max_results", 5)
                )
            elif tool_name == "search_external_listings":
                result_data = search_external_listings(
                    location=tool_args.get("location", ""),
                    room_type=tool_args.get("room_type"),
                    max_price=tool_args.get("max_price")
                )

            yield sse_event({"type": "tool_result", "tool_name": tool_name, "result": result_data})
            await asyncio.sleep(0.5)

            # Collect UI components — will be emitted AFTER text is done
            if tool_name == "search_knowledge_base" and isinstance(result_data, list) and len(result_data) > 0:
                show_map = tool_args.get("show_map", False)
                # Always find the best matching community for potential merging
                target_name = tool_args.get("map_community_name", "")
                best = None
                if target_name:
                    target_lower = target_name.strip().lower()
                    for item in result_data:
                        item_name = (item.get("community_name") or "").strip().lower()
                        if item_name and (item_name == target_lower or target_lower in item_name or item_name in target_lower):
                            best = item
                            break
                if not best:
                    best = result_data[0]
                # Store community info for merging into commute card later
                if best.get("latitude") and best.get("longitude"):
                    kb_community_info = {
                        "community_name": best.get("community_name"),
                        "university_name": best.get("university_name"),
                        "price_range": best.get("price_range"),
                        "tenant_rating": best.get("tenant_rating"),
                        "description": best.get("description"),
                    }
                # Only create separate map card if no commute card will be shown
                if show_map and not has_commute and best.get("latitude") and best.get("longitude"):
                    pending_ui_components.append({
                        "type": "ui_component",
                        "component": "MapAndCard",
                        "props": {
                            "origin_name": best.get("community_name", ""),
                            "origin_lat": float(best["latitude"]),
                            "origin_lng": float(best["longitude"]),
                            "community_name": best.get("community_name"),
                            "university_name": best.get("university_name"),
                            "price_range": best.get("price_range"),
                            "tenant_rating": best.get("tenant_rating"),
                            "description": best.get("description"),
                            "is_knowledge_base": True
                        }
                    })

            if tool_name == "search_internal_db" and isinstance(result_data, list) and len(result_data) > 0:
                best_match = result_data[0]
                origin_lat = float(best_match.get("lat") or 0)
                origin_lng = float(best_match.get("lng") or 0)
                if origin_lat and origin_lng:
                    pending_ui_components.append({
                        "type": "ui_component",
                        "component": "MapAndCard",
                        "props": {
                            "origin_name": best_match.get("community_name") or "",
                            "origin_lat": origin_lat,
                            "origin_lng": origin_lng,
                            "rent": float(best_match.get("rent") or 0),
                            "room_type": best_match.get("room_type") or "",
                            "unit_id": best_match.get("id")
                        }
                    })

            elif tool_name == "calculate_commute" and isinstance(result_data, dict):
                commute_props = {
                    "origin_name": result_data.get("origin_name") or "Sunway Geo Residences",
                    "origin_lat": float(result_data.get("origin_lat") or 3.06341),
                    "origin_lng": float(result_data.get("origin_lng") or 101.60977),
                    "destination_name": result_data.get("destination_name") or result_data.get("university") or "Destination",
                    "destination_lat": float(result_data.get("destination_lat") or 3.0645),
                    "destination_lng": float(result_data.get("destination_lng") or 101.6000)
                }
                # Merge community info from knowledge base (avoid duplicate card)
                if kb_community_info:
                    commute_props.update({
                        "community_name": kb_community_info.get("community_name"),
                        "university_name": kb_community_info.get("university_name"),
                        "price_range": kb_community_info.get("price_range"),
                        "tenant_rating": kb_community_info.get("tenant_rating"),
                        "description": kb_community_info.get("description"),
                        "is_knowledge_base": True,
                    })
                pending_ui_components.append({
                    "type": "ui_component",
                    "component": "MapAndCard",
                    "props": commute_props
                })

            # Append tool result to messages
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "name": tool_name,
                "content": json.dumps(result_data, ensure_ascii=False)
            })

    # Fallback: loop ended without emitting text (all iterations had tool calls)
    # Emit pending UI components and a default message
    for comp in pending_ui_components:
        yield sse_event(comp)
        await asyncio.sleep(0.3)
    yield sse_event({"type": "text", "delta": "以上是根据搜索结果整理的信息，希望对你有帮助！如有其他问题，随时问我 😊"})




async def agent_stream_router(
    query: str,
    user_id: str,
    history: Optional[List[Dict[str, Any]]] = None
) -> AsyncGenerator[str, None]:
    """Router selecting mock or live OpenAI stream based on configuration."""
    if Config.is_openai_enabled():
        async for item in live_agent_stream(query, user_id, history):
            yield item
    else:
        async for item in mock_agent_stream(query, user_id):
            yield item
