# 地图卡片数据混淆问题 - 调试指南

## 问题描述

当AI返回多个社区推荐时（如Arte S和Centrio Avenue），地图卡片显示的社区信息与地图坐标不匹配：
- 卡片标题显示：Centrio Avenue
- 卡片价格/描述：Centrio Avenue的数据
- 地图标记位置：Arte S的坐标
- 点击地图跳转：跳转到Arte S

## 已实施的修复

### 1. 后端调试日志（backend/app/agent.py）

添加了三处关键日志：

```python
# 创建卡片候选时
print(f"[KB Card] Creating card for {name}: lat={card_props['origin_lat']}, lng={card_props['origin_lng']}")

# 选择显示卡片时  
print(f"[KB Card Selected] {name}: lat={cand['props']['origin_lat']}, lng={cand['props']['origin_lng']}")

# 发送到前端时
print(f"[Emit UI Component] MapAndCard for {comp_name}: lat={comp_lat}, lng={comp_lng}")
```

### 2. 前端组件调试（frontend/src/components/MapAndCard.tsx）

添加了useEffect来记录接收到的props：

```typescript
React.useEffect(() => {
  if (is_knowledge_base && community_name) {
    console.log(`[MapAndCard] Rendering KB card:`, {
      community_name,
      origin_lat,
      origin_lng,
      price_range,
      description: description?.substring(0, 50)
    });
  }
}, [is_knowledge_base, community_name, origin_lat, origin_lng]);
```

### 3. React Key优化（frontend/src/components/AIChat.tsx）

将MapAndCard组件的key从简单的索引改为包含社区名称的唯一标识：

```typescript
// 修改前
<div key={i} className="manus-ui-wrapper">

// 修改后  
<div key={`ui-${m.id}-${i}-${item.props?.community_name || item.props?.origin_name || i}`} className="manus-ui-wrapper">
```

这样可以确保每个社区的卡片都有独立的React组件实例，避免状态混淆。

## 测试步骤

### 1. 重启后端服务

```bash
cd backend
# 如果使用venv
python app/main.py

# 或使用uvicorn
uvicorn app.main:app --reload
```

### 2. 打开浏览器开发者工具

- 按F12打开开发者工具
- 切换到Console标签
- 清空之前的日志

### 3. 提交测试问题

在AI聊天框中输入：
```
帮我找便宜又安全的租房，USM的
```

### 4. 检查后端日志

后端终端应该输出类似：

```
[KB Card] Creating card for Arte S: lat=5.3525, lng=100.2985
[KB Card] Creating card for Centrio Avenue: lat=5.3615, lng=100.2975
[KB Card Selected] Arte S: lat=5.3525, lng=100.2985
[KB Card Selected] Centrio Avenue: lat=5.3615, lng=100.2975
[Emit UI Component] MapAndCard for Arte S: lat=5.3525, lng=100.2985
[Emit UI Component] MapAndCard for Centrio Avenue: lat=5.3615, lng=100.2975
```

### 5. 检查浏览器Console

应该输出类似：

```
[MapAndCard] Rendering KB card: {
  community_name: 'Arte S',
  origin_lat: 5.3525,
  origin_lng: 100.2985,
  price_range: {min: 650, max: 3500, ...},
  description: '槟城极具地标性的前卫公寓，以其流线型外墙和现代化的生活方式著称...'
}

[MapAndCard] Rendering KB card: {
  community_name: 'Centrio Avenue',
  origin_lat: 5.3615,
  origin_lng: 100.2975,
  price_range: {min: 750, max: 1800, ...},
  description: '位于Gelugor的高性价比公寓，租金实惠，生活便利...'
}
```

### 6. 验证地图卡片

检查页面上显示的地图卡片：

- **Arte S卡片**应该显示：
  - 标题：Arte S
  - 价格：RM 650 - 3500
  - 描述：槟城极具地标性的前卫公寓...
  - 地图：标记在 5.3525, 100.2985
  
- **Centrio Avenue卡片**应该显示：
  - 标题：Centrio Avenue
  - 价格：RM 750 - 1800
  - 描述：位于Gelugor的高性价比公寓...
  - 地图：标记在 5.3615, 100.2975

## 可能的问题场景

### 场景 A：后端日志正确，前端console错误

**说明**：数据传输过程中出现问题
**排查**：检查SSE事件解析逻辑（AIChat.tsx的processBuf函数）

### 场景 B：后端和前端日志都正确，但UI显示错误

**说明**：React渲染或地图组件问题
**排查**：检查MapAndCard组件的mapUrl生成逻辑

### 场景 C：后端日志显示坐标已经混淆

**说明**：search_knowledge_base返回的数据有问题
**排查**：检查数据库中的latitude/longitude字段

## 数据库验证脚本

如果怀疑是数据库问题，运行：

```python
# backend/scripts/verify_coordinates.py
from app.database import supabase_service_client

result = supabase_service_client.table("rental_knowledge_base")\
    .select("community_name, latitude, longitude")\
    .in_("community_name", ["Arte S", "Centrio Avenue"])\
    .execute()

for row in result.data:
    print(f"{row['community_name']}: lat={row['latitude']}, lng={row['longitude']}")
```

预期输出：
```
Arte S: lat=5.3525, lng=100.2985
Centrio Avenue: lat=5.3615, lng=100.2975
```

## 参考数据

### Arte S（正确数据）
- 地址：Jalan Bukit Gambir, Gelugor, 11700 George Town, Penang
- 坐标：5.3525, 100.2985
- 价格：RM 650 - 3500
- 距离USM：0.8 km（步行10分钟）

### Centrio Avenue（正确数据）
- 地址：Jalan Bukit Gambir, Gelugor, 11700 George Town, Penang
- 坐标：5.3615, 100.2975
- 价格：RM 750 - 1800
- 距离USM：1.5 km（驾车5分钟）

## 联系信息

如果问题持续存在，请提供：
1. 后端终端的完整日志
2. 浏览器Console的完整输出
3. 页面截图（显示错误的卡片）
4. Network标签中的SSE事件原始数据
