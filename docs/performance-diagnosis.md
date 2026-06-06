# Tab 切换性能诊断报告

> 诊断日期：2026-06-06
> 最后更新：2026-06-06
> 状态：**大部分已修复** — 中介端主路径、房源列表、内部 tab 冗余请求、评价 N+1 已优化；租客端 TenantPortal 等待观察

---

## 现象

一级导航 tab 之间切换时有明显卡顿感。

---

## 已实施优化（2026-06-06）

| 项 | 实现方式 | 涉及文件 |
|----|----------|----------|
| ✅ 中介 AdminPanel 单实例 | `AdminShell` 挂在 `admin/layout.tsx`，根据 `pathname` 切换 `activeTab`；dashboard / properties / leases 等主 tab 切换时 **不再整页重挂载** | `AdminShell.tsx`, `admin/layout.tsx`, `AdminPanel.tsx` |
| ✅ 房源列表 Context 缓存 | `ListingsDataContext`：首次加载后数据保留在内存；切 tab 回来 **先显示缓存**，后台静默刷新；点「刷新」才强制全量拉取 | `ListingsDataContext.tsx`, `PropertyListings.tsx`, `(app)/layout.tsx` |
| ✅ 房源子视图按需渲染 | 「已登记房源库」表格、「新增房源」大表单改为 `{condition && (...)}`，**只有切到对应子 tab 才挂载** | `AdminPanel.tsx` |
| ✅ `loadAll(force)` | 增删改后 `loadAll(true)` 强制刷新；首次加载仍用 `isLoaded` 避免重复全量请求 | `AdminPanel.tsx` |
| ✅ 删房源即时 UI | 删除成功后本地 `setUnits` / `setLeases` / `setInterests` 过滤，并 `refreshListingsCache({ force: true })` 同步租客端列表缓存 | `AdminPanel.tsx` |
| ✅ P0-2 内部 tab 冗余请求 | 移除内部 tab 栏 onClick 中的 `loadAll(true)`、`fetchFeedbacks()`、`fetchAllReviews()`；数据由 `resolvedTab` effect 首次加载 + 增删改后 `loadAll(true)` 保证新鲜度 | `AdminPanel.tsx` |
| ✅ P2-3 ReviewSystem 批量查询 | 评价列表改为一次 `users.in('id', userIds)` 批量取姓名，不再每条 review 单独查询 | `ReviewSystem.tsx` |

**说明：** 中介「房源浏览」（`/admin/listings`）和「消息」（`/admin/inbox`）仍是独立组件，切到这两页时 `AdminPanel` 会卸载；但「房源浏览」已受益于 `ListingsDataContext` 缓存。

---

## 根因概览（含当前状态）

| 优先级 | 问题 | 状态 | 影响范围 | 文件 |
|--------|------|------|----------|------|
| 🔴 P0 | AdminPanel 每次路由切换完整重新挂载 | ✅ 已修复（主 tab） | 管理员 dashboard/properties/leases 等 | `AdminShell.tsx` |
| 🔴 P0 | Tab click handler 重复请求数据 | ✅ 已修复 | 内部 tab 栏（`hideTabBar` 后日常不走） | `AdminPanel.tsx` |
| — | 房源列表每次进入重新请求 + 转圈 | ✅ 已修复 | 租客 `/listings`、中介 `/admin/listings`、游客 `/guest` | `ListingsDataContext.tsx` |
| 🟠 P1 | 组件过大（5,800+ 行 + 50+ useState） | ❌ 未做 | AdminPanel 整体重渲染 | `AdminPanel.tsx` |
| 🟠 P1 | TenantPortal 路由切换重新挂载 | ❌ 未做 | 租客 my-lease / maintenance / profile | `TenantPortal.tsx` |
| 🟡 P2 | Context Provider 未 memoize | ❌ 未做 | 全应用 | `ThemeProvider.tsx`, `AuthContext.tsx` |
| 🟡 P2 | `backdrop-filter: blur(20px)` GPU 压力 | ❌ 未做 | 所有 `.glass-card` | `globals.css` |
| 🟡 P2 | ReviewSystem N+1 查询 | ✅ 已修复 | 房源详情页 | `ReviewSystem.tsx` |

---

## 详细分析

### ✅ P0-1：AdminPanel 路由切换完整重新挂载（已修复）

**原机制：** 每个 admin 子路由各自渲染 `<AdminPageWrapper>` → `<AdminPanel>`。侧边栏 `router.push()` 时 Next.js 销毁旧实例、创建新实例。

**原代价（修正）：** 每次挂载会跑 `detectModeAndLoad()`，但全量 `loadFromSupabase()` **仅在 `!isLoaded` 时执行**（`AdminDataContext` 跨路由保留）。并非「每次切换都打 10+ 查询」——首次进入 admin 区或 `isLoaded === false` 时才会触发 7 个并行查询；但每次重挂载仍会执行 `getUser()`、`admin_users` 查 profile 等，加上 5,800 行组件完整初始化，体感仍卡。

**已实施方案：** `AdminShell` 在 `admin/layout.tsx` 中单例渲染 `AdminPanel`，用 `pathname` 映射 `activeTab`；各 `admin/*/page.tsx` 改为路由占位（`return null`）。

**残留：** 切到 `/admin/listings` 或 `/admin/inbox` 时 `AdminPanel` 仍会卸载（独立页面组件）。

---

### ✅ P0-2：Tab click handler 重复请求数据（已修复）

**原问题：** 内部 tab 栏点击时额外触发数据请求：

| Tab | 原触发代码 | 冗余请求 |
|-----|------------|----------|
| Leases | `onClick` 内 `loadAll(true)` | 7 个并行查询 + fetchInterests() |
| Feedback | `onClick` 内 `fetchFeedbacks()` | 3 个查询 |
| Reviews | `onClick` 内 `fetchAllReviews()` | 1 个查询（仅 `!reviewsLoaded` 时） |

**已实施方案：** 内部 tab 栏 onClick 仅保留 `setTab(...)` 及 UI 状态（如 `setLeasesView`、已读标记）；首次进入各 tab 由 `resolvedTab` effect 按需加载（`!isLoaded` 时 `loadAll(true)`、`fetchFeedbacks()`、`!reviewsLoaded` 时 `fetchAllReviews()`）；增删改操作后仍调用 `loadAll(true)` 保证数据新鲜度。

---

### ✅ 房源列表重复加载（已修复，原报告未单独列出）

**原机制：** `PropertyListings` 每次路由挂载执行 `loadListings()` + `loadAdmins()` + `loadFavorites()`，并 `setListingsLoading(true)` 显示转圈。

**已实施方案：** `ListingsDataContext`（Stale-While-Revalidate）— 有缓存时立即渲染，后台静默刷新；手动「刷新」按钮调用 `loadListings({ force: true })`。

**资源影响：** 主要占用浏览器内存；同会话内重复访问 Supabase **读次数减少**；Vercel / Render 无影响。

---

### ✅ 房源子视图按需渲染（已实施，方向与 P1-1 建议不同）

**原做法：** 库存表、新增房源表单用 `display: none` 隐藏，DOM 仍在，首次进「房源管理」即付出渲染成本。

**已实施方案：** `{propertiesView === 'inventory' && (...)}` 与 `{propertiesView === 'editor' && editorSubTab === 'unit' && (...)}`，未激活子视图不挂载。

**取舍：** 与「非活跃 tab 保留 DOM（`display:none`）」相反——按需渲染省首次成本，切换子 tab 时需重新挂载（房源量不大时体感可接受）。

---

### 🟠 P1-1：AdminPanel 组件过大（未做，低紧迫）

AdminPanel.tsx 约 **5,800+ 行、50+ useState**。`setTab(...)` 仍触发整组件重渲染；`{tab === '...' && (...)}` 使非活跃一级 tab 卸载，切回时丢失滚动位置。

**何时值得做：** 中介端多 tab 切换仍慢，或需持续扩展功能时，作为长期重构。

**修复方向：** 拆分为独立 TabPanel 子组件 + `React.memo`；派生数据 `useMemo`。

---

### 🟠 P1-2：TenantPortal 路由切换重新挂载（未做，按体感决定）

my-lease / maintenance / profile 各自渲染 `<TenantPortal mode="...">`，路由切换时：

1. `load()` 执行 3+ 个 Supabase 查询
2. `loadProfile()` 查询 users 表
3. 创建 realtime 订阅（tenant_interests, leases）
4. 快速切换时 subscribe/unsubscribe 级联

**何时值得做：** 租客在「我的租约 / 报修 / 个人资料」之间切换仍明显卡顿时（与已修复的中介端同类问题）。

**修复方向：** 单一 `TenantPortal` 实例 + `pathname` 切换 mode，或共享状态提升到 Context。

---

### 🟡 P2-1：Context Provider 未 memoize（未做，收益通常很小）

```typescript
// ThemeProvider.tsx — 每次渲染传新对象
<ThemeContext.Provider value={{ lang, setLang, t, theme, toggleTheme }}>

// AuthContext.tsx — 每次渲染传新对象
<AuthContext.Provider value={{ role, adminRole, ... }}>
```

**评估：** 卡顿主因是重挂载与重复请求，非 Context 引用变化。除非 profiling 证实，否则**优先级低**。

---

### 🟡 P2-2：backdrop-filter GPU 压力（未做，低优先级）

```css
.glass-card {
  backdrop-filter: blur(20px) saturate(1.3);
}
```

大量使用于卡片、侧边栏、顶栏。tab 切换时大量元素同时挂载可能造成 GPU 合成压力。

**评估：** 需改动大量 UI，收益难量化；除非低端机明显掉帧，否则不必为性能专门改视觉。

---

### ✅ P2-3：ReviewSystem N+1 查询（已修复）

**原问题：** 每条 review 单独查一次 `users` 表，20 条 review ≈ 21 次请求。

```typescript
// 旧代码（已移除）
const reviewsWithNames = await Promise.all((data || []).map(async (r) => {
  const { data: userData } = await sb.from('users').select('full_name').eq('id', r.user_id).single();
  ...
}));
```

**已实施方案：** 先收集 `userIds`，一次 `users.select('id, full_name').in('id', userIds)` 批量取姓名，再 map 回 review 列表。20 条 review = **2 次请求**（reviews + users）。

---

## 后续优先级建议

### 按体感决定（仍有价值时再做）

1. **P1-2 TenantPortal 单实例** — 仅当租客在「我的租约 / 报修 / 个人资料」之间切换仍卡
2. **P1-1 拆分 AdminPanel** — 仅当中介端多 tab 仍慢或需大规模扩展功能

### 可暂缓 / 不必专门做

3. P2-1 Context `useMemo` — 收益通常很小
4. P2-2 减少 `backdrop-filter` — 需动大量 UI，除非低端机明显掉帧
5. 非活跃 tab 保留 DOM（与已实施的子视图按需渲染策略相反，需单独评估）
6. Tab 切换 CSS fade 过渡（体验抛光，不解决卡顿根因）

---

## 关于骨架图

**结论：一级导航 tab 切换不需要骨架图。**

- 骨架图适用于首次加载或需等待远端数据的场景
- 优化后数据已在内存（`AdminDataContext` / `ListingsDataContext`），切换应接近即时；骨架图反而造成「闪一下」
- 仅在首次进入页面时保留加载态（当前已有）
- 可选：短 fade 过渡（< 150ms）作为体验抛光，非性能必需
