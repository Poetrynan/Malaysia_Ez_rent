import json
import asyncio
from types import SimpleNamespace
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


# Decision/comparison queries deserve deeper reasoning; trivial lookups don't.
# We pick the effort per-query so we don't waste the tight Groq token budget.
_EFFORT_HIGH_KW = [
    "还是", "哪个", "对比", "比较", "纠结", "住哪", "该住", "最好住", "值不值",
    "权衡", "更好", "选哪", "应该住", "推荐", "划算", " vs ", "区别", "哪家",
]
_EFFORT_LOW_KW = [
    "汇率", "换算", "多少人民币", "多少钱", "节假日", "假期", "放假",
    "holiday", "currency", "exchange rate",
]


import re as _re

# TPM auto-retry: parse Groq "try again in 14.5s" / "3m10s", cap wait to avoid hanging
_MAX_TPM_WAIT_SEC = 90.0
_TPM_RETRIES_PER_MODEL = 1


def _parse_retry_seconds(err_str: str) -> Optional[float]:
    m = _re.search(r"try again in ([\dhms\. ]+)", err_str, _re.IGNORECASE)
    if not m:
        return None
    total = 0.0
    for part in _re.finditer(r"(\d+(?:\.\d+)?)([smh])", m.group(1).strip().lower()):
        val, unit = float(part.group(1)), part.group(2)
        if unit == "s":
            total += val
        elif unit == "m":
            total += val * 60
        elif unit == "h":
            total += val * 3600
    return total if total > 0 else None


def _retry_hint(err_str: str) -> str:
    wait_sec = _parse_retry_seconds(err_str)
    if not wait_sec:
        return ""
    if wait_sec >= 60:
        mins, secs = int(wait_sec // 60), int(wait_sec % 60)
        return f"（约 {mins} 分{secs} 秒后恢复）" if secs else f"（约 {mins} 分钟后恢复）"
    return f"（约 {int(max(1, wait_sec))} 秒后恢复）"


def _is_tpd_error(err_str: str) -> bool:
    low = err_str.lower()
    return "per day" in low or "tpd" in err_str


def _is_tpm_error(err_str: str) -> bool:
    low = err_str.lower()
    return "per minute" in low or "tpm" in err_str


def _rate_limit_message(err_str: str) -> str:
    """Build an honest, specific rate-limit message, including retry time if present."""
    hint = _retry_hint(err_str)
    if _is_tpd_error(err_str):
        return (
            "🙏 抱歉，AI 助手今日的免费额度已经用完了" + hint + "。"
            "可以稍后再试，或联系管理员升级服务额度。今天先用「房源列表」「我的租约」等页面功能吧～"
        )
    if _is_tpm_error(err_str):
        return (
            "⏳ 当前每分钟请求量已达上限" + hint + "。"
            "已自动等待重试并尝试过备用模型，请稍等片刻后再发一次消息。"
        )
    return "⏳ 当前请求有点密集，触发了限流" + hint + "。请稍等几秒后重试。"


def _is_rate_limit_error(err_str: str) -> bool:
    low = err_str.lower()
    return (
        "429" in err_str
        or "resource_exhausted" in low
        or "quota" in low
        or "rate_limit" in low
    )


def _model_chain(start_model: str) -> List[str]:
    """Primary model first, then fallback — each Groq model has its own TPD budget."""
    models = [start_model]
    fb = (Config.AGENT_FALLBACK_MODEL or "").strip()
    if fb and fb != start_model:
        models.append(fb)
    return models


def _groq_extra_body(model: str, reasoning_effort: str, *, with_tools: bool) -> Optional[dict]:
    """Build model-specific Groq extra_body — gpt-oss and qwen3 use different reasoning knobs."""
    m = model.lower()
    if "gpt-oss" in m:
        body: Dict[str, Any] = {"include_reasoning": True}
        if reasoning_effort:
            body["reasoning_effort"] = reasoning_effort
        return body
    if "qwen" in m:
        # Qwen3: none/default only; hide reasoning when tools are on (Groq requirement)
        body = {"reasoning_effort": "none" if reasoning_effort == "low" else "default"}
        if with_tools:
            body["reasoning_format"] = "hidden"
        return body
    return None


def _iter_llm_stream(
    start_model: str,
    messages: list,
    *,
    tools: Optional[list],
    tool_choice: str,
    max_completion_tokens: int,
    reasoning_effort: str,
):
    """Stream an LLM completion, auto-falling back to AGENT_FALLBACK_MODEL on 429.

    Yields event tuples for the caller to turn into SSE:
      ("text_delta", str)
      ("model_switch", str)   — switched to this model after primary rate-limited
      ("complete", dict)      — final accumulators + error metadata
    """
    models = _model_chain(start_model)

    for mi, model_name in enumerate(models):
        if mi > 0:
            yield ("model_switch", model_name)

        tpm_retries = _TPM_RETRIES_PER_MODEL
        while True:
            content_text = ""
            reasoning_text = ""
            tool_calls_acc: Dict[int, dict] = {}
            try:
                extra_body = _groq_extra_body(model_name, reasoning_effort, with_tools=bool(tools))
                kwargs: Dict[str, Any] = {
                    "model": model_name,
                    "messages": messages,
                    "timeout": 90.0,
                    "max_completion_tokens": max_completion_tokens,
                    "stream": True,
                }
                if tools is not None:
                    kwargs["tools"] = tools
                    kwargs["tool_choice"] = tool_choice
                if extra_body:
                    kwargs["extra_body"] = extra_body

                stream = openai_client.chat.completions.create(**kwargs)
                for chunk in stream:
                    if not chunk.choices:
                        continue
                    delta = chunk.choices[0].delta
                    r = getattr(delta, "reasoning", None)
                    if r:
                        reasoning_text += r
                    if getattr(delta, "content", None):
                        content_text += delta.content
                        yield ("text_delta", delta.content)
                    for tc in (getattr(delta, "tool_calls", None) or []):
                        slot = tool_calls_acc.setdefault(
                            tc.index, {"id": None, "name": "", "arguments": ""}
                        )
                        if tc.id:
                            slot["id"] = tc.id
                        if tc.function and tc.function.name:
                            slot["name"] = tc.function.name
                        if tc.function and tc.function.arguments:
                            slot["arguments"] += tc.function.arguments

                yield ("complete", {
                    "content_text": content_text,
                    "reasoning_text": reasoning_text,
                    "tool_calls_acc": tool_calls_acc,
                    "used_model": model_name,
                    "all_rate_limited": False,
                    "error": None,
                })
                return

            except Exception as e:
                err_str = str(e)
                if _is_rate_limit_error(err_str):
                    # TPM: wait for the window to reset, then retry the same model once
                    if _is_tpm_error(err_str) and tpm_retries > 0:
                        wait = min((_parse_retry_seconds(err_str) or 8.0) + 1.0, _MAX_TPM_WAIT_SEC)
                        tpm_retries -= 1
                        print(f"[Agent] {model_name} TPM limited, retry in {wait:.0f}s...")
                        yield ("retry_wait", {"seconds": wait, "model": model_name})
                        continue
                    # TPD or TPM retries exhausted → try fallback model
                    if mi < len(models) - 1:
                        print(f"[Agent] {model_name} rate limited, trying {models[mi + 1]}...")
                        break
                yield ("complete", {
                    "content_text": content_text,
                    "reasoning_text": reasoning_text,
                    "tool_calls_acc": tool_calls_acc,
                    "used_model": model_name,
                    "all_rate_limited": _is_rate_limit_error(err_str),
                    "error": e,
                })
                return


def assess_reasoning_effort(query: str) -> str:
    """Return 'low' | 'medium' | 'high' based on how much thinking the query needs."""
    q = (query or "").lower()
    if any(kw in q for kw in _EFFORT_HIGH_KW):
        return "high"
    if any(kw in q for kw in _EFFORT_LOW_KW):
        return "low"
    return (Config.AGENT_REASONING_EFFORT or "medium").strip()


def compact_tool_result(tool_name: str, result: Any) -> Any:
    """Reduce a tool result to high-signal fields only.

    The model has a tiny token budget on Groq's free tier. Dumping the full verbose
    JSON (and then hard-truncating it) used to drop whole communities mid-entry. Here
    we keep the fields the model actually needs to reason, so several options survive.
    Note: UI cards are built from the FULL result elsewhere — this only trims what the
    model reads.
    """
    try:
        if tool_name == "search_knowledge_base" and isinstance(result, list):
            compact = []
            for it in result[:5]:
                tr = it.get("tenant_rating") or {}
                pr = it.get("price_range") or {}
                trans = it.get("transportation")
                if isinstance(trans, (dict, list)):
                    trans = json.dumps(trans, ensure_ascii=False)[:200]
                elif isinstance(trans, str):
                    trans = trans[:200]
                compact.append({
                    "community": it.get("community_name"),
                    "university": it.get("university_name"),
                    "state": it.get("state"),
                    "price": (f"RM{pr.get('min')}-{pr.get('max')}/{pr.get('unit', 'mo')}" if pr else None),
                    "rating": tr.get("overall"),
                    "safety": tr.get("safety"),
                    "distance_to_university": it.get("distance_to_university"),
                    "room_types": it.get("room_types_available"),
                    "pros": (it.get("pros") or [])[:3],
                    "cons": (it.get("cons") or [])[:2],
                    "transportation": trans,
                })
            return compact
        if tool_name == "search_external_listings" and isinstance(result, dict):
            return {
                "success": result.get("success"),
                "answer_summary": (result.get("answer_summary") or "")[:600],
                "listings": [
                    {
                        "title": (l.get("title") or "")[:80],
                        "price_myr": l.get("price_myr"),
                        "snippet": (l.get("snippet") or "")[:200],
                    } for l in (result.get("listings") or [])[:5]
                ],
            }
        if tool_name == "search_internal_db" and isinstance(result, list):
            return [
                {
                    "community": it.get("community_name"),
                    "room_type": it.get("room_type"),
                    "rent": it.get("rent"),
                    "status": it.get("status"),
                    "description": (it.get("description") or "")[:160],
                } for it in result[:5]
            ]
        if tool_name == "get_malaysia_holidays" and isinstance(result, dict):
            hs = result.get("holidays") or []
            return {
                "year": result.get("year"),
                "total": result.get("total_holidays") or len(hs),
                "holidays": [{"date": h.get("date"), "name": h.get("english_name")} for h in hs[:15]],
            }
        if tool_name == "get_web_realtime_info" and isinstance(result, str):
            return result[:1200]
    except Exception as e:
        print(f"[compact_tool_result] {tool_name}: {e}")
    return result


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
        yield sse_event({"type": "thinking", "step": "🚇 正在计算通勤路线和时间..."})
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
        yield sse_event({"type": "thinking", "step": "🌐 正在搜索最新资讯..."})
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
                "description": "Calculate travel times and distances between any two locations. Accepts ANY address, landmark, building name, or university — resolve abbreviations to full names before calling (e.g. 'UM' → 'Universiti Malaya', 'KLCC' → 'Petronas Twin Towers').",
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
                "| 小区 | 价格 | 评分 | 距大学 | 亮点 |\n"
                "- Keep each table cell SHORT (a few words). NEVER put HTML tags like <br> inside cells. "
                "If a cell needs multiple facts, separate them with a comma or put the detail in a bullet list below the table instead.\n\n"
                "When user asks vague questions like '便宜的' / '好的' / '推荐':\n"
                "- Search the knowledge base with relevant filters\n"
                "- Rank results by the requested criteria (price → low to high, rating → high to low)\n"
                "- Present top 3-5 options with clear reasoning\n\n"
                "## DECISION / TRADE-OFF QUESTIONS (VERY IMPORTANT)\n"
                "When the user is torn between options or has competing constraints (e.g. '我想住A，但学校在B，"
                "还可能去C交换，住哪里最好？'):\n"
                "1. Do your searches/commute calculations FIRST.\n"
                "2. Then ALWAYS write a real analysis: compare the options head-to-head (commute to EACH relevant "
                "campus, price, safety, trade-offs), state the key tension, and give ONE clear recommendation with "
                "the reason. Offer a backup option if it's a close call.\n"
                "3. If you computed a commute, mention the actual numbers in your text.\n"
                "- NEVER answer a decision question with only map cards and no written analysis. Cards SUPPLEMENT "
                "your analysis, they never replace it.\n"
                "- NEVER end with empty filler like '以上是根据搜索结果整理的信息，希望对你有帮助'. Always give substance.\n\n"
                "## TOOL RULES\n"
                "- For commute: resolve 'UM' → 'Universiti Malaya', 'KLCC' → 'Petronas Twin Towers'. Ask for address if too vague.\n"
                "- NEVER reveal how you get data or mention any backend tools/services. You are the expert, not a tool wrapper.\n"
                "- NEVER mention any external rental platforms — not even in disclaimers or footnotes.\n"
                "- NEVER add disclaimers like '以上房源均来自XX平台' or '具体信息请在XX网站获取'. You ARE the source.\n"
                "- You MAY share useful URLs (university sites, government portals, official pages). Use markdown links.\n"
                "- NEVER share URLs for: rental listing pages, pornography, violence, political, or religious content.\n"
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
    kb_card_candidates = []  # ALL kb communities with coords; cards chosen by answer text after loop
    kb_show_map = False  # True if the model flagged any KB search as housing (show_map=true)
    commute_card_names = set()  # community/origin names already shown on a commute card
    answer_text = ""  # Accumulated final answer text — used to decide which KB cards to show
    final_text_emitted = False  # Track whether the model produced a real final answer
    reasoning_effort = assess_reasoning_effort(query)  # low/medium/high per query difficulty
    MAX_COMPLETION_TOKENS = 3072  # Room for reasoning + a full answer (default 1024 was too small)
    MAX_LOOPS = 6  # Allow up to 6 rounds for complex multi-tool queries

    # ── Token-saving guards (Groq free tier has a tight daily budget) ──
    tool_result_cache = {}  # (tool_name, args_key) -> result; avoids re-running identical calls
    empty_search_keys = set()  # search queries that returned 0 results; don't retry within a turn
    tool_call_counts = {}  # tool_name -> times called this turn; caps runaway repeated calls
    MAX_CALLS_PER_TOOL = 3  # hard cap on how many times one tool may run in a single turn
    rate_limited = False  # True only when primary + fallback both hit 429
    active_model = Config.AGENT_MODEL  # may switch to AGENT_FALLBACK_MODEL mid-turn
    for loop_idx in range(MAX_LOOPS):
        step_labels = [
            "🔍 正在理解你的问题...",
            "🛠️ 正在调用工具获取信息...",
            "📝 正在组织回答..."
        ]
        yield sse_event({"type": "thinking", "step": step_labels[min(loop_idx, len(step_labels)-1)]})
        await asyncio.sleep(0.3)

        # Accumulators for the streamed response (filled by _iter_llm_stream)
        content_text = ""
        reasoning_text = ""
        tool_calls_acc = {}  # index -> {id, name, arguments}
        content_streamed = False

        for ev_type, payload in _iter_llm_stream(
            active_model,
            messages,
            tools=tools_definitions,
            tool_choice="auto",
            max_completion_tokens=MAX_COMPLETION_TOKENS,
            reasoning_effort=reasoning_effort,
        ):
            if ev_type == "text_delta":
                content_streamed = True
                yield sse_event({"type": "text", "delta": payload})
            elif ev_type == "model_switch":
                active_model = payload
                yield sse_event({"type": "thinking", "step": "⚡ 主模型额度紧张，已切换备用模型继续回答..."})
            elif ev_type == "retry_wait":
                secs = max(1, int(round(payload["seconds"])))
                yield sse_event({"type": "thinking", "step": f"⏳ 短时限流，{secs} 秒后自动重试..."})
                await asyncio.sleep(payload["seconds"])
            elif ev_type == "complete":
                content_text = payload["content_text"]
                reasoning_text = payload["reasoning_text"]
                tool_calls_acc = payload["tool_calls_acc"]
                active_model = payload["used_model"]
                err = payload.get("error")
                if err:
                    err_str = str(err)
                    print(f"[Agent Error] {type(err).__name__}: {err_str[:500]}")
                    if payload.get("all_rate_limited"):
                        rate_limited = True
                        yield sse_event({"type": "text", "delta": _rate_limit_message(err_str)})
                    elif "401" in err_str or "403" in err_str or "invalid" in err_str.lower() or "forbidden" in err_str.lower() or "authorization" in err_str.lower():
                        yield sse_event({"type": "text", "delta": f"⚙️ AI 服务配置异常（{type(err).__name__}），请联系管理员检查 API Key 和模型设置。"})
                    elif "503" in err_str or "overloaded" in err_str.lower() or "high demand" in err_str.lower():
                        yield sse_event({"type": "text", "delta": "⏳ AI 助手当前繁忙，请稍等几秒后重试。"})
                    elif "timeout" in err_str.lower() or "connect" in err_str.lower():
                        yield sse_event({"type": "text", "delta": "🌐 网络连接超时，请检查网络后重试。"})
                    else:
                        yield sse_event({"type": "text", "delta": "❌ AI 助手遇到了问题，请稍后重试。如持续出现请联系管理员。"})
                    return

        # Reconstruct tool_calls (ordered by their streamed index) into objects that
        # expose the same .id/.type/.function.name/.arguments shape the loop expects.
        tool_calls = None
        if tool_calls_acc:
            tool_calls = []
            for idx in sorted(tool_calls_acc.keys()):
                slot = tool_calls_acc[idx]
                if not slot.get("name"):
                    continue
                tool_calls.append(SimpleNamespace(
                    id=slot["id"] or f"call_{idx}",
                    type="function",
                    function=SimpleNamespace(name=slot["name"], arguments=slot["arguments"] or "{}"),
                ))
            if not tool_calls:
                tool_calls = None

        # Build a message-like object for the assistant-message append below
        message = SimpleNamespace(content=content_text, tool_calls=tool_calls)

        # Surface accumulated reasoning (if Groq returned any)
        if reasoning_text:
            yield sse_event({"type": "thinking", "label": "🧠 模型推理过程", "content": reasoning_text[:1000]})
            await asyncio.sleep(0.2)

        # If model chose to write text (no tool calls) — it was already streamed live.
        if not tool_calls:
            if not content_streamed:
                yield sse_event({"type": "text", "delta": "⚠️ AI 返回了空响应，请重试。"})
            answer_text = content_text
            final_text_emitted = bool(content_text.strip())
            # Cards are emitted in the unified block after the loop
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
            await asyncio.sleep(0.5)

            # Build a stable cache key from tool name + sorted args
            cache_key = (tool_name, json.dumps(tool_args, ensure_ascii=False, sort_keys=True))
            # Search query signal used for empty-result memo (avoid re-searching dead terms)
            search_term = (tool_args.get("semantic_query") or tool_args.get("location") or "").strip().lower()
            search_tools = {"search_knowledge_base", "search_internal_db", "search_external_listings"}

            result_data = None
            served_from_guard = False

            if cache_key in tool_result_cache:
                # Identical call already made this turn — reuse, spend zero tokens/API
                result_data = tool_result_cache[cache_key]
                served_from_guard = True
            elif tool_name in search_tools and search_term and search_term in empty_search_keys:
                # We already searched this term and got nothing — don't burn another call
                result_data = [] if tool_name != "search_external_listings" else {"success": True, "listings": []}
                served_from_guard = True
            elif tool_call_counts.get(tool_name, 0) >= MAX_CALLS_PER_TOOL:
                # Runaway guard: model keeps calling the same tool with variations
                result_data = {"error": True, "message": f"已达到 {tool_name} 的本轮调用上限，请基于已有结果作答。"}
                served_from_guard = True
            else:
                tool_call_counts[tool_name] = tool_call_counts.get(tool_name, 0) + 1
                # Invoke target tool
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

                # Memoize result + remember dead search terms
                tool_result_cache[cache_key] = result_data
                if tool_name in search_tools and search_term:
                    is_empty = (isinstance(result_data, list) and len(result_data) == 0) or (
                        isinstance(result_data, dict) and not result_data.get("listings")
                    )
                    if is_empty:
                        empty_search_keys.add(search_term)

            yield sse_event({"type": "tool_result", "tool_name": tool_name, "result": result_data})
            await asyncio.sleep(0.3 if served_from_guard else 0.5)

            # Collect UI components — will be emitted AFTER text is done
            if tool_name == "search_knowledge_base" and isinstance(result_data, list) and len(result_data) > 0:
                if tool_args.get("show_map", False):
                    kb_show_map = True
                # Best match (for merging into a commute card, if one appears)
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
                if best.get("latitude") and best.get("longitude"):
                    kb_community_info = {
                        "community_name": best.get("community_name"),
                        "university_name": best.get("university_name"),
                        "price_range": best.get("price_range"),
                        "tenant_rating": best.get("tenant_rating"),
                        "description": best.get("description"),
                    }
                # Collect EVERY community with coordinates as a card candidate. Which ones
                # actually render is decided AFTER the answer is written — we show a card
                # for each community the answer actually talks about (so a 2-community
                # comparison gets 2 cards). This no longer depends on the model setting
                # show_map, which it often forgets to do.
                seen_names = {(c["props"].get("community_name") or "").strip().lower() for c in kb_card_candidates}
                for item in result_data:
                    name = (item.get("community_name") or "").strip()
                    if not name or not item.get("latitude") or not item.get("longitude"):
                        continue
                    if name.lower() in seen_names:
                        continue
                    seen_names.add(name.lower())
                    kb_card_candidates.append({
                        "type": "ui_component",
                        "component": "MapAndCard",
                        "props": {
                            "origin_name": name,
                            "origin_lat": float(item["latitude"]),
                            "origin_lng": float(item["longitude"]),
                            "community_name": name,
                            "university_name": item.get("university_name"),
                            "price_range": item.get("price_range"),
                            "tenant_rating": item.get("tenant_rating"),
                            "description": item.get("description"),
                            "is_knowledge_base": True,
                            "auto_load": True
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
                            "unit_id": best_match.get("id"),
                            "auto_load": True
                        }
                    })

            elif tool_name == "calculate_commute" and isinstance(result_data, dict):
                commute_props = {
                    "origin_name": result_data.get("origin_name") or "Sunway Geo Residences",
                    "origin_lat": float(result_data.get("origin_lat") or 3.06341),
                    "origin_lng": float(result_data.get("origin_lng") or 101.60977),
                    "destination_name": result_data.get("destination_name") or result_data.get("university") or "Destination",
                    "destination_lat": float(result_data.get("destination_lat") or 3.0645),
                    "destination_lng": float(result_data.get("destination_lng") or 101.6000),
                    "auto_load": True
                }
                # Merge community info from knowledge base ONLY when it refers to the
                # same place as the commute origin. Otherwise we'd label a route from
                # community A with the price/rating of community B (confusing & wrong).
                if kb_community_info:
                    kb_name = (kb_community_info.get("community_name") or "").strip().lower()
                    origin_name = (commute_props.get("origin_name") or "").strip().lower()
                    names_match = bool(kb_name) and bool(origin_name) and (
                        kb_name == origin_name or kb_name in origin_name or origin_name in kb_name
                    )
                    if names_match:
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
                for nm in (commute_props.get("origin_name"), commute_props.get("community_name")):
                    if nm:
                        commute_card_names.add(nm.strip().lower())

            # Append tool result to messages — compress to high-signal fields first so
            # the model sees ALL options instead of a JSON blob cut off mid-entry.
            compact = compact_tool_result(tool_name, result_data)
            result_json = json.dumps(compact, ensure_ascii=False)
            MAX_RESULT_CHARS = 3500  # safety net only; compaction already trims most bulk
            if len(result_json) > MAX_RESULT_CHARS:
                result_json = result_json[:MAX_RESULT_CHARS] + "... (truncated)"
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "name": tool_name,
                "content": result_json
            })

    # If the loop exhausted its rounds while still calling tools, the model never
    # wrote a real answer. Force ONE final synthesis pass (no tools) so the model MUST
    # analyze the gathered data. Skip it when:
    #   - already rate-limited (another call just 429s again — wasteful)
    #   - the query is trivial (low effort) — the in-loop call almost always answered,
    #     and a 2nd full LLM call isn't worth the daily token budget.
    if not final_text_emitted and not rate_limited and reasoning_effort != "low":
        yield sse_event({"type": "thinking", "step": "📝 正在综合分析，给出建议..."})
        await asyncio.sleep(0.3)
        messages.append({
            "role": "system",
            "content": (
                "Based on ALL the tool results above, write the FINAL answer for the user now, in Chinese. "
                "Do NOT call any tools. If the user is choosing between options or locations, directly compare "
                "them (price, commute, safety, trade-offs) and give a clear, decisive recommendation with reasoning. "
                "Never reply with a generic filler like '以上是根据搜索结果整理的信息'. Be specific and helpful."
            )
        })
        final_content = ""
        for ev_type, payload in _iter_llm_stream(
            active_model,
            messages,
            tools=None,
            tool_choice="auto",
            max_completion_tokens=MAX_COMPLETION_TOKENS,
            reasoning_effort=reasoning_effort,
        ):
            if ev_type == "text_delta":
                final_content += payload
                yield sse_event({"type": "text", "delta": payload})
            elif ev_type == "model_switch":
                active_model = payload
                yield sse_event({"type": "thinking", "step": "⚡ 主模型额度紧张，已切换备用模型继续综合分析..."})
            elif ev_type == "retry_wait":
                secs = max(1, int(round(payload["seconds"])))
                yield sse_event({"type": "thinking", "step": f"⏳ 短时限流，{secs} 秒后自动重试..."})
                await asyncio.sleep(payload["seconds"])
            elif ev_type == "complete":
                active_model = payload["used_model"]
                if not final_content:
                    final_content = payload["content_text"]
                err = payload.get("error")
                if err:
                    es = str(err)
                    print(f"[Agent Synthesis Error] {type(err).__name__}: {es[:300]}")
                    if payload.get("all_rate_limited"):
                        rate_limited = True
                        yield sse_event({"type": "text", "delta": _rate_limit_message(es)})
        if final_content.strip():
            answer_text = final_content
            final_text_emitted = True

    # Decide which knowledge-base map cards to show FIRST (so the fallback message can
    # know whether any cards will actually appear). One card per community the answer
    # mentions; skip communities already on a commute card.
    answer_lower = (answer_text or "").lower()
    MAX_KB_CARDS = 3
    shown = 0
    for cand in kb_card_candidates:
        if shown >= MAX_KB_CARDS:
            break
        name = (cand["props"].get("community_name") or "").strip()
        if not name or name.lower() in commute_card_names:
            continue
        if name.lower() in answer_lower:
            pending_ui_components.append(cand)
            shown += 1
    # Fallback: model flagged housing (show_map) but no name matched in the answer.
    if shown == 0 and kb_show_map and not has_commute and kb_card_candidates:
        first = kb_card_candidates[0]
        if (first["props"].get("community_name") or "").strip().lower() not in commute_card_names:
            pending_ui_components.append(first)

    # Honest last-resort message — only when no real answer was produced.
    if not final_text_emitted:
        if rate_limited:
            pass  # the 429 message was already streamed at the point of failure
        elif pending_ui_components:
            yield sse_event({"type": "text", "delta": "我已经为你整理了相关信息，请查看下方的卡片。如果告诉我更具体的需求（预算、几人住、最看重通勤还是安全），我可以帮你直接对比并给出推荐 😊"})
        else:
            yield sse_event({"type": "text", "delta": "抱歉，我暂时没能找到匹配的信息 🙇。可以换个说法，或补充更具体的条件（如大学名称、地区、预算），我再帮你查一次。"})

    # Emit all collected UI components AFTER the text (maps, cards, etc.)
    for comp in pending_ui_components:
        yield sse_event(comp)
        await asyncio.sleep(0.3)




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
