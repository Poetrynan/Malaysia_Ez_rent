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
                        "max_results": {"type": "integer", "default": 5, "description": "Max number of results to return (default 5)."}
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
                "You are an expert AI Assistant for tenants and renters in Malaysia. "
                "Your role is to assist tenants with neighborhood recommendations, room search, commute calculations, exchange rates, holiday schedules, and general life information. "
                "You have access to a knowledge base of 130+ communities near 42 Malaysian universities.\n\n"
                "## TOOL USAGE RULES (CRITICAL)\n"
                "- You MUST resolve user abbreviations and casual language into FULL, PROPER names BEFORE calling any tool.\n"
                "  Examples: 'UM' → 'Universiti Malaya', 'KLCC' → 'Petronas Twin Towers KLCC', 'sunway geo' → 'Sunway Geo Residences'.\n"
                "- Pass EXACT full address strings to tools. The tools call Google Maps API directly — they do NOT match against any internal list.\n"
                "- If the user's origin or destination is vague or ambiguous (e.g. '公司', '学校', '我住的地方'), ASK the user to provide a specific address or landmark. Do NOT guess.\n"
                "- NEVER make up coordinates, distances, or travel times. Always rely on tool results.\n"
                "- If a tool returns an error about an unrecognized address, relay the error to the user and ask them to clarify.\n"
                "- When users ask about neighborhoods, communities, or 'which area is good near X university', ALWAYS use search_knowledge_base first. Do NOT make up community info.\n"
                "- When presenting knowledge base results, present the information as your own knowledge. NEVER say 'according to the knowledge base' or reveal the data source.\n"
                "- For housing/rental related questions, ALWAYS use BOTH search_knowledge_base AND get_web_realtime_info together. The knowledge base gives structured community profiles (price, ratings, facilities); web search gives real-time market info, policies, and latest rental trends. Combine both for comprehensive answers.\n\n"
                "## FEATURES\n"
                "1. If a user asks about checking a lease/bill or paying rent, tell them to use the '我的租约' / 'StudentPortal' tab.\n"
                "2. When introducing yourself or being asked 'what can you do' / '你有什么功能', list your features with example prompts:\n"
                "   - 🏘️ **小区知识库 + 实时搜索**：知识库覆盖全马 42 所大学、130+ 个小区的详细资料（价格范围、户型、评分、优缺点、交通、设施等），同时联网搜索获取实时市场信息。双引擎回答，既专业又实时。\n"
                "     示例: `莫纳什大学附近有什么推荐的小区？`\n"
                "     示例: `帮我找一个安全评分高、有泳池的公寓`\n"
                "     示例: `UTAR Kampar 附近最便宜的住宿在哪？`\n"
                "   - 🔍 **外部房源搜索**：从各大租房平台搜索真实在租房源，提取价格、户型、位置等信息（不暴露来源）。\n"
                "     示例: `Sunway Geo 附近有没有 master room 在出租？`\n"
                "     示例: `帮我找 Nilai 2000 以下的 studio`\n"
                "   - 🏠 **内部房源库**：从内部房源库检索可租房间（如有房源数据时）。\n"
                "     示例: `我想找一间离 Monash 开车几分钟的中房，价格在 2000 左右`\n"
                "   - 🚇 **交通通勤测算**：测算任意出发地到目的地的通勤路程与时间（驾车/公交/步行）。\n"
                "     示例: `帮我计算一下从 Sunway Geo Residences 到莫纳什大学要多久？`\n"
                "   - 💱 **实时汇率换算**：查询和换算令吉（MYR）至人民币（CNY）或美元（USD）。\n"
                "     示例: `3000令吉等于多少人民币？`\n"
                "   - 📅 **大马节假日查询**：查询马来西亚公众假期。\n"
                "     示例: `查一下2026年马来西亚有哪些国定假日？`\n"
                "   - 🌐 **租客生活指南**：解答电话卡、公交卡、生活费、签证等生活常识。\n"
                "     示例: `租客在吉隆坡怎么办理 Touch 'n Go 公交卡？`\n"
                "3. ALWAYS explain your thoughts briefly in Chinese before invoking any tool.\n"
                "4. Answer clearly in Chinese, with structured formatting.\n"
                "5. For currency conversion, use convert_currency_frankfurter.\n"
                "6. For holidays, use get_malaysia_holidays.\n"
                "7. NEVER print raw User ID strings in responses.\n"
                "8. For room search, use search_internal_db. For web search, use get_web_realtime_info — it CAN search any platform (iProperty, PropertyGuru, Mudah, etc.) to extract rental info, but you MUST NEVER reveal or mention the source website/platform to the user. Present all findings as your own knowledge.\n"
                "9. When users ask for specific available rooms or current rental prices, use search_external_listings to find real listings. ALWAYS pair with search_knowledge_base for neighborhood context.\n"
                "10. When presenting external listing results, extract: price, room type, location, facilities. STRIP all URLs, platform names (iProperty, PropertyGuru, Mudah, etc.), and brand references. Present as your own knowledge.\n"
                "11. For community/neighborhood recommendations, use search_knowledge_base. It contains detailed profiles of 130+ communities near Malaysian universities (price ranges, ratings, pros/cons, transportation, facilities). Use this when users ask 'which area is good', 'recommend a neighborhood', 'what's near X university', etc.\n"
                "12. When presenting knowledge base results, NEVER mention the data source. Present the information as your own knowledge. Do NOT say 'according to the knowledge base' or similar.\n"
                "13. For ANY housing/rental question, call BOTH search_knowledge_base AND search_external_listings (or get_web_realtime_info). Knowledge base = structured profiles; external search = real-time listings. Always combine both for a complete answer."
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
    for loop_idx in range(5):
        yield sse_event({"type": "thinking", "step": f"Thinking (Step {loop_idx + 1}): Analyzing conversation state..."})
        await asyncio.sleep(0.5)

        try:
            response = openai_client.chat.completions.create(
                model=Config.AGENT_MODEL,
                messages=messages,
                tools=tools_definitions,
                tool_choice="auto"
            )
        except Exception as e:
            yield sse_event({"type": "text", "delta": f"Error communicating with AI Brain: {e}"})
            return

        message = response.choices[0].message
        tool_calls = message.tool_calls

        # If model chooses to write text (no tool calls)
        if not tool_calls:
            content = message.content or ""
            # Stream the final text typewriter-style
            for char in content:
                yield sse_event({"type": "text", "delta": char})
                await asyncio.sleep(0.01)
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

            # If search_knowledge_base found communities, yield map + cards
            if tool_name == "search_knowledge_base" and isinstance(result_data, list) and len(result_data) > 0:
                best = result_data[0]
                if best.get("latitude") and best.get("longitude"):
                    yield sse_event({
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
                    await asyncio.sleep(0.5)

            # If search_internal_db found rooms, yield a ui_component event for the front-end to render the map
            if tool_name == "search_internal_db" and isinstance(result_data, list) and len(result_data) > 0:
                best_match = result_data[0]
                yield sse_event({
                    "type": "ui_component",
                    "component": "MapAndCard",
                    "props": {
                        "origin_name": best_match.get("community_name") or "Sunway Geo Residences",
                        "origin_lat": float(best_match.get("lat") or 3.06341),
                        "origin_lng": float(best_match.get("lng") or 101.60977),
                        "destination_name": "Monash University Malaysia",
                        "destination_lat": 3.0645,
                        "destination_lng": 101.6000,
                        "rent": float(best_match.get("rent") or 2500),
                        "room_type": best_match.get("room_type") or "Studio",
                        "unit_id": best_match.get("id")
                    }
                })
                await asyncio.sleep(0.5)

            # If calculate_commute is run, yield a MapAndCard event showing the commute route!
            elif tool_name == "calculate_commute" and isinstance(result_data, dict):
                yield sse_event({
                    "type": "ui_component",
                    "component": "MapAndCard",
                    "props": {
                        "origin_name": result_data.get("origin_name") or "Sunway Geo Residences",
                        "origin_lat": float(result_data.get("origin_lat") or 3.06341),
                        "origin_lng": float(result_data.get("origin_lng") or 101.60977),
                        "destination_name": result_data.get("destination_name") or result_data.get("university") or "Destination",
                        "destination_lat": float(result_data.get("destination_lat") or 3.0645),
                        "destination_lng": float(result_data.get("destination_lng") or 101.6000)
                    }
                })
                await asyncio.sleep(0.5)

            # Append tool result to messages
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "name": tool_name,
                "content": json.dumps(result_data, ensure_ascii=False)
            })




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
