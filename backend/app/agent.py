import json
import asyncio
from typing import AsyncGenerator, Dict, Any, List
from app.config import Config
from app.tools import (
    search_internal_db,
    calculate_commute,
    get_web_realtime_info,
    check_my_own_rental_status,
    openai_client,
    supabase_service_client
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

    if "rent" in query_lower or "room" in query_lower or "house" in query_lower or "monash" in query_lower or "sunway" in query_lower or "taylor" in query_lower:
        # Scenario 1: Housing Search & Commute Route
        yield sse_event({"type": "thinking", "step": "🔍 Analyzing user query. The user is searching for accommodation near universities in Malaysia. I should search the internal database for available rooms."})
        await asyncio.sleep(1.2)

        # Trigger search tool
        room_type = None
        if "studio" in query_lower:
            room_type = "Studio"
        elif "master" in query_lower:
            room_type = "Master Room"
        elif "medium" in query_lower:
            room_type = "Medium Room"

        max_price = None
        if "under" in query_lower or "below" in query_lower:
            # Simple number extraction
            words = query_lower.split()
            for i, w in enumerate(words):
                if w in ["under", "below", "max"] and i + 1 < len(words):
                    try:
                        max_price = float(words[i+1].replace("myr", "").replace("$", ""))
                    except ValueError:
                        pass

        yield sse_event({"type": "tool_call", "tool_name": "search_internal_db", "args": {"semantic_query": query, "room_type": room_type, "max_price": max_price}})
        await asyncio.sleep(1.0)

        # Retrieve search result
        db_results = search_internal_db(query, room_type=room_type, max_price=max_price)
        yield sse_event({"type": "tool_result", "tool_name": "search_internal_db", "result": db_results})
        await asyncio.sleep(0.8)

        if not db_results:
            yield sse_event({"type": "thinking", "step": "No matching rooms found in search results. Let's do a wider search or ask for clarification."})
            await asyncio.sleep(0.5)
            yield sse_event({"type": "text", "delta": "抱歉，在系统内未找到完全符合条件的房源。建议您放宽预算或搜索其他户型！"})
            return

        # Pick the top match
        top_match = db_results[0]
        community_name = top_match["community_name"]
        
        yield sse_event({"type": "thinking", "step": f"Top match found: {community_name}. Let's calculate the commute distance and transit times from this property to the requested university (or Monash by default) to help the student map their journey."})
        await asyncio.sleep(1.2)

        # Determine target university
        target_uni = "Monash University Malaysia"
        for uni in ["monash", "sunway", "taylor", "apu", "um"]:
            if uni in query_lower:
                if uni == "monash": target_uni = "Monash University Malaysia"
                elif uni == "sunway": target_uni = "Sunway University"
                elif uni == "taylor": target_uni = "Taylor's University"
                elif uni == "apu": target_uni = "Asia Pacific University (APU)"
                elif uni == "um": target_uni = "Universiti Malaya (UM)"

        # Target Coordinates (simulate Sunway Geo lat/lng if available)
        origin_lat, origin_lng = 3.06341, 101.60977
        if "nadayu" in community_name.lower():
            origin_lat, origin_lng = 3.0698, 101.6040
        elif "latour" in community_name.lower():
            origin_lat, origin_lng = 3.0593, 101.6160
        elif "pacific" in community_name.lower():
            origin_lat, origin_lng = 3.1130, 101.5878

        yield sse_event({"type": "tool_call", "tool_name": "calculate_commute", "args": {"origin_lat": origin_lat, "origin_lng": origin_lng, "university_name": target_uni}})
        await asyncio.sleep(1.0)

        commute_info = calculate_commute(origin_lat, origin_lng, target_uni)
        yield sse_event({"type": "tool_result", "tool_name": "calculate_commute", "result": commute_info})
        await asyncio.sleep(0.8)

        # Generate Stream responses
        intro = f"嗨！为您精心推荐 **{community_name}** 的一套房源。以下是它的具体信息及到校交通情况：\n\n"
        for char in intro:
            yield sse_event({"type": "text", "delta": char})
            await asyncio.sleep(0.01)

        details = (
            f"- **房型**: {top_match['room_type']}\n"
            f"- **月租**: {top_match['rent']} MYR\n"
            f"- **到校交通 ({commute_info['university']})**:\n"
            f"  - 🚗 驾车: {commute_info['driving_distance']} / {commute_info['driving_duration']}\n"
            f"  - 🚊 公共交通: {commute_info['transit_duration']}\n"
            f"  - 🚶 步行: {commute_info['walk_duration']}\n\n"
            f"**房源介绍**:\n{top_match['description']}\n\n"
            "希望这能帮到您！您可以通过下方卡片在地图上预览路线，或直接申请看房。"
        )
        for char in details:
            yield sse_event({"type": "text", "delta": char})
            await asyncio.sleep(0.01)

        # Injects interactive map component
        yield sse_event({
            "type": "ui_component",
            "component": "MapAndCard",
            "props": {
                "origin_name": community_name,
                "origin_lat": origin_lat,
                "origin_lng": origin_lng,
                "destination_name": target_uni,
                "destination_lat": 3.0645 if "monash" in target_uni.lower() else (3.0678 if "sunway" in target_uni.lower() else 3.0617),
                "destination_lng": 101.6000 if "monash" in target_uni.lower() else (101.6033 if "sunway" in target_uni.lower() else 101.6167),
                "rent": top_match["rent"],
                "room_type": top_match["room_type"],
                "unit_id": top_match["id"]
            }
        })

    elif "status" in query_lower or "my lease" in query_lower or "rent status" in query_lower or "账单" in query_lower or "房租" in query_lower or "交租" in query_lower:
        # Scenario 2: Personal Rental Ledger Status
        yield sse_event({"type": "thinking", "step": "🔑 Checking security context. User requested their rental status. I need to call `check_my_own_rental_status` via service role."})
        await asyncio.sleep(1.2)

        yield sse_event({"type": "tool_call", "tool_name": "check_my_own_rental_status", "args": {"user_id": user_id}})
        await asyncio.sleep(1.0)

        rental_status = check_my_own_rental_status(user_id)
        yield sse_event({"type": "tool_result", "tool_name": "check_my_own_rental_status", "result": rental_status})
        await asyncio.sleep(0.8)

        if not rental_status.get("has_active_lease"):
            yield sse_event({"type": "text", "delta": "您目前没有活跃的租赁合同，或者您的账户还没有绑定房源。如果有疑问，请联系管理员！"})
            return

        lease = rental_status["lease_details"]
        payments = rental_status["payment_records"]
        
        paid_count = sum(1 for p in payments if p["paid"])
        total_count = len(payments)

        response_text = (
            f"您的租期信息已查到：您当前承租的是 **{lease['community_name']} {lease['unit_number']}** ({lease['room_type']})。\n\n"
            f"- **租期**: {lease['start_date']} 至 {lease['end_date']}\n"
            f"- **月租**: {lease['monthly_rent']} MYR\n"
            f"- **账期进度**: 已付 {paid_count} 个月 / 共 {total_count} 个月。\n\n"
            "下方是您的实时账单与付款进度卡片，您可直接扫码支付未结清的月租账单。"
        )
        for char in response_text:
            yield sse_event({"type": "text", "delta": char})
            await asyncio.sleep(0.01)

        yield sse_event({
            "type": "ui_component",
            "component": "LeaseLedgerCard",
            "props": {
                "community_name": lease["community_name"],
                "unit_number": lease["unit_number"],
                "start_date": lease["start_date"],
                "end_date": lease["end_date"],
                "monthly_rent": lease["monthly_rent"],
                "payments": payments
            }
        })

    else:
        # Scenario 3: Real-time search or general queries
        yield sse_event({"type": "thinking", "step": f"🌐 Let's query Tavily search engine to fetch current real-time details regarding: '{query}'"})
        await asyncio.sleep(1.2)

        yield sse_event({"type": "tool_call", "tool_name": "get_web_realtime_info", "args": {"query": query}})
        await asyncio.sleep(1.0)

        web_result = get_web_realtime_info(query)
        yield sse_event({"type": "tool_result", "tool_name": "get_web_realtime_info", "result": web_result})
        await asyncio.sleep(0.8)

        yield sse_event({"type": "thinking", "step": "Synthesizing web search results into a concise structured response."})
        await asyncio.sleep(0.8)

        intro = "根据马来西亚本地最新信息：\n\n"
        for char in intro:
            yield sse_event({"type": "text", "delta": char})
            await asyncio.sleep(0.01)

        for char in web_result:
            yield sse_event({"type": "text", "delta": char})
            await asyncio.sleep(0.01)


async def live_agent_stream(query: str, user_id: str) -> AsyncGenerator[str, None]:
    """
    Executes a real ReAct loop using OpenAI Tool Calling.
    """
    # Define tool structures for OpenAI
    tools_definitions = [
        {
            "type": "function",
            "function": {
                "name": "search_internal_db",
                "description": "Search the internal housing database using semantic vectors.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "semantic_query": {"type": "string", "description": "The description/preferences of housing needed by the student."},
                        "room_type": {"type": "string", "enum": ["Studio", "Master Room", "Medium Room", "Small Room"], "description": "Optional room type filter."},
                        "max_price": {"type": "number", "description": "Optional maximum rent limit in MYR."}
                    },
                    "required": ["semantic_query"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "calculate_commute",
                "description": "Calculate travel times and distances from coordinate coordinates to a university.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "origin_lat": {"type": "number", "description": "Latitude of the community."},
                        "origin_lng": {"type": "number", "description": "Longitude of the community."},
                        "university_name": {"type": "string", "description": "Target university name (e.g. Monash University Malaysia)."}
                    },
                    "required": ["origin_lat", "origin_lng", "university_name"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "get_web_realtime_info",
                "description": "Search the live web for recent local transit, policies, and neighborhood facts in Malaysia.",
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
                "name": "check_my_own_rental_status",
                "description": "Check the calling user's active lease, rent due amounts, and monthly ledger ledger status.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "user_id": {"type": "string", "description": "The user ID of the tenant."}
                    },
                    "required": ["user_id"]
                }
            }
        }
    ]

    messages = [
        {
            "role": "system",
            "content": (
                "You are an expert AI Rent Agent for international students in Malaysia. "
                "You help students find rooms, calculate commute to universities, get local updates, and check lease/payment records. "
                "Important Rules:\n"
                "1. ALWAYS explain your thoughts briefly in Chinese (thinking state) before invoking any tool.\n"
                "2. When suggesting a property, follow up by invoking the calculate_commute tool to show specific travel durations.\n"
                "3. If the user asks about their lease, due rent, or payment checks, run check_my_own_rental_status immediately with the user's ID.\n"
                "4. Answer clearly in Chinese, with structured formatting.\n"
                "5. When calling calculate_commute, ALWAYS extract the exact 'lat' and 'lng' values from the search results returned by search_internal_db for the property, and use those as 'origin_lat' and 'origin_lng' respectively. DO NOT guess or hallucinate these values."
            )
        },
        {"role": "user", "content": f"User ID: {user_id}\nQuery: {query}"}
    ]

    # ReAct Loop
    for loop_idx in range(5):
        yield sse_event({"type": "thinking", "step": f"Thinking (Step {loop_idx + 1}): Analyzing conversation state..."})
        await asyncio.sleep(0.5)

        try:
            import os
            response = openai_client.chat.completions.create(
                model=os.getenv("NEXT_PUBLIC_AGENT_MODEL", "gpt-4o-mini"),
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
            
            # Post-text check: if we mentioned a unit, append UI component for visual polish
            # We look back in our context to see if search_internal_db was called
            found_unit = None
            for msg in reversed(messages):
                if msg.get("role") == "tool" and msg.get("name") == "search_internal_db":
                    try:
                        results = json.loads(msg["content"])
                        if results:
                            found_unit = results[0]
                            break
                    except:
                        pass
            
            if found_unit:
                # Find latitude/longitude
                com_name = found_unit.get("community_name", "")
                lat = found_unit.get("lat") or 3.06341
                lng = found_unit.get("lng") or 101.60977

                yield sse_event({
                    "type": "ui_component",
                    "component": "MapAndCard",
                    "props": {
                        "origin_name": com_name,
                        "origin_lat": lat,
                        "origin_lng": lng,
                        "destination_name": "Monash University Malaysia",
                        "destination_lat": 3.0645,
                        "destination_lng": 101.6000,
                        "rent": float(found_unit.get("rent", 0)),
                        "room_type": found_unit.get("room_type", ""),
                        "unit_id": found_unit.get("id", "")
                    }
                })
            break

        # Append assistant's message with tool calls (converted to dict for compatibility with third-party OpenAI APIs)
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
            if tool_name == "search_internal_db":
                result_data = search_internal_db(
                    semantic_query=tool_args.get("semantic_query", ""),
                    room_type=tool_args.get("room_type"),
                    max_price=tool_args.get("max_price")
                )
            elif tool_name == "calculate_commute":
                result_data = calculate_commute(
                    origin_lat=tool_args.get("origin_lat", 0.0),
                    origin_lng=tool_args.get("origin_lng", 0.0),
                    university_name=tool_args.get("university_name", "")
                )
            elif tool_name == "get_web_realtime_info":
                result_data = get_web_realtime_info(query=tool_args.get("query", ""))
            elif tool_name == "check_my_own_rental_status":
                # Ensure we pass the actual user_id from context for compliance checks
                result_data = check_my_own_rental_status(user_id=user_id)

            yield sse_event({"type": "tool_result", "tool_name": tool_name, "result": result_data})
            await asyncio.sleep(0.5)

            # Append tool result to messages
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "name": tool_name,
                "content": json.dumps(result_data, ensure_ascii=False)
            })

            # Save trace to db asynchronously if logged in
            if supabase_service_client:
                try:
                    # Log conversation step
                    supabase_service_client.table("agent_conversations").insert({
                        "user_id": user_id,
                        "session_id": "session-realtime",
                        "role": "assistant",
                        "content": f"Invoked tool: {tool_name}",
                        "intermediate_steps": {
                            "tool_name": tool_name,
                            "args": tool_args,
                            "result": result_data
                        }
                    }).execute()
                except Exception as e:
                    print(f"Failed to log conversation step to agent_conversations: {e}")
                    

async def agent_stream_router(query: str, user_id: str) -> AsyncGenerator[str, None]:
    """Router selecting mock or live OpenAI stream based on configuration."""
    if Config.is_openai_enabled():
        async for item in live_agent_stream(query, user_id):
            yield item
    else:
        async for item in mock_agent_stream(query, user_id):
            yield item
