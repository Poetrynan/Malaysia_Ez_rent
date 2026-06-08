# Malaysia Ez Rent UI/UX Design Patterns & Guidelines

本手册沉淀了本项目在持续迭代中所遵循的核心 UI/UX 设计规范、交互技巧及视觉工程原理。后续在开发新功能、设计新界面或优化现有交互时，可直接以此为基准进行设计与复用。

---

## 目录

1. [玻璃拟态与对比度规范 (Glassmorphism & Contrast)](#1-玻璃拟态与对比度规范-glassmorphism--contrast)
2. [费茨法则与点击热区优化 (Fitts's Law & Tap Targets)](#2-费茨法则与点击热区优化-fittss-law--tap-targets)
3. [轻量化关闭交互 (Light Dismiss & Modal Dismissal)](#3-轻量化关闭交互-light-dismiss--modal-dismissal)
4. [视觉层级与色彩心理 (Visual Hierarchy & Color Psychology)](#4-视觉层级与色彩心理-visual-hierarchy--color-psychology)
5. [微交互、过渡动效与实时反馈 (Micro-interactions & State Feedback)](#5-微交互过渡动效与实时反馈-micro-interactions--state-feedback)
6. [信息聚合与全局通知红点 (Notification Bubbling)](#6-信息聚合与全局通知红点-notification-bubbling)
7. [客户端媒体压缩与网络容错 (Client-side Media Compression)](#7-客户端媒体压缩与网络容错-client-side-media-compression)
8. [流量闭环与防流失设计 (Product Loop & Anti-drainage Design)](#8-流量闭环与防流失设计-product-loop--anti-drainage-design)
9. [进度可视化与动态反馈 (Progress Visualization & Dynamic Feedback)](#9-进度可视化与动态反馈-progress-visualization--dynamic-feedback)
10. [网络延迟极小化与并行联表设计 (Network Latency Minimization)](#10-网络延迟极小化与并行联表设计-network-latency-minimization)
11. [手机收银台与信息验证优化 (Mobile Payment Portal & Profile Verification)](#11-手机收银台与信息验证优化-mobile-payment-portal--profile-verification)
12. [终端风格控制台与实时连接状态指示 (Mac Console Pattern & Alive Breathe Indicator)](#12-终端风格控制台与实时连接状态指示-mac-console-pattern--alive-breathe-indicator)
13. [气泡聊天工单对话系统 (Bubble Chat Order System)](#13-气泡聊天工单对话系统-bubble-chat-order-system)
14. [页面性能与 React 渲染闭环优化 (Page Performance & React Render Loop Optimization)](#14-页面性能与-react-渲染闭环优化-page-performance--react-render-loop-optimization)
15. [同小区房源小方块化与“查看更多”弹出模态框 (Same-Community Cards & Modal Overlay)](#15-同小区房源小方块化与查看更多弹出模态框-same-community-cards--modal-overlay)
16. [全端列表与详情同步及角色功能隔离原则 (All-Portal Sync & Role-based Isolation)](#16-全端列表与详情同步及角色功能隔离原则-all-portal-sync--role-based-isolation)
17. [评论区及异步加载骨架屏占位防抖机制 (Skeleton Shimmer Placements)](#17-评论区及异步加载骨架屏占位防抖机制-skeleton-shimmer-placements)
18. [Phosphor Duotone 图标库视觉升级与品牌统一 (Phosphor Duotone Icons & Brand Cohesion)](#18-phosphor-duotone-图标库视觉升级与品牌统一-phosphor-duotone-icons--brand-cohesion)
19. [地图无密匙智能降级与防错机制 (Keyless Map Smart Fallback & Fail-Safe)](#19-地图无密匙智能降级与防错机制-keyless-map-smart-fallback--fail-safe)
20. [租客身份验证缓存无感通行 (Tenant Identity Caching & Smooth Nav Bypass)](#20-租客身份验证缓存无感通行-tenant-identity-caching--smooth-nav-bypass)
21. [记住密码与表单自动填充支持 (Remember Me & Autocomplete Integration)](#21-记住密码与表单自动填充支持-remember-me--autocomplete-integration)
22. [AI 聊天 Tab 切换后台持久化与零卡顿 (AI Chat State Preservation & Latency-Free Tabs)](#22-ai-聊天-tab-切换后台持久化与零卡顿-ai-chat-state-preservation--latency-free-tabs)
23. [高级磨砂玻璃微光 Toast 动效 (Glassmorphic Shimmering Toast)](#23-高级磨砂玻璃微光-toast-动效-glassmorphic-shimmering-toast)

---

## 1. 玻璃拟态与对比度规范 (Glassmorphism & Contrast)

本项目整体采用现代、奢华的**玻璃拟态 (Glassmorphism)** 设计语言。但在实际使用中，必须严格区分**装饰性容器**与**功能/文本性容器**，防止文字因背景透出而无法辨识。

### 设计原则
* **轻度模糊与发光边框**：使用 `backdrop-filter: blur(16px) saturate(180%)`，并配以极细的、带半透明高光的边框（例如 `border: 1px solid rgba(255, 255, 255, 0.1)` 或 `rgba(13, 148, 136, 0.14)`），模拟精致的物理玻璃质感。
* **双主题对比度保底**：
  * **亮色主题 (Light Mode)**：对于信息层级高、需要快速阅读的弹出式模态框 (Modal/Dialog)，应使用**高不透明度或纯白底色**（如 `background: #ffffff`），字体颜色使用深色（如 `#1f2937` 和 `#111827`），以达到 WCAG 2.1 AA 级（对比度 $\ge 4.5:1$）的无障碍阅读标准。
  * **暗色主题 (Dark Mode)**：应提高半透明底色的 Alpha 通道值（如 `rgba(19, 31, 28, 0.95)`）或使用半透明灰色叠加，配合浅色文字（如 `#ECFDF5`），避免背景过暗导致黑色文字被完全“吞噬”。

### 典型实现 (PropertyListings 确认框)
```typescript
{
  background: '#ffffff', // 亮色主题下使用纯白底色保证对比度
  border: '1px solid rgba(0, 0, 0, 0.08)',
  borderRadius: 16,
  boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)', // 用较宽且柔和的阴影制造悬浮感
  color: '#1f2937' // 保证正文颜色对比度
}
```

---

## 2. 费茨法则与点击热区优化 (Fitts's Law & Tap Targets)

根据**费茨法则 (Fitts's Law)**：用户获取一个目标物的时间取决于目标的**距离**和**大小**。在触屏和高分辨率桌面设备上，微小的交互元素是造成用户操作失败和产生挫败感的首要原因。

### 设计原则
* **热区扩张**：禁止直接渲染无背景的单个符号（如纯文本 `×`、`🗑️`）作为关键按钮。
* **容器化 (Containerization)**：将纯文本或小图标转为**圆形图标按钮 (Elevated IconButton)**。
  * 按钮尺寸（包含内边距或容器外框）在移动端建议 $\ge 44 \times 44 \text{px}$，在精细布局的桌面端建议 $\ge 36 \times 36 \text{px}$。
  * 为容器按钮赋予实体背景色（如白色或主题色）及悬浮阴影，向用户暗示其“可点击性”。

### 典型实现 (收银台关闭按钮)
```typescript
style={{
  position: 'absolute',
  top: 20, right: 20,
  width: 36, height: 36, // 扩充为 36px 圆形
  borderRadius: '50%',
  background: '#ffffff', // 纯白实体背景
  color: '#374151',
  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', // 阴影提升视觉可见度
  display: 'flex', alignItems: 'center', justifyContent: 'center'
}}
```

---

## 3. 轻量化关闭交互 (Light Dismiss & Modal Dismissal)

当用户打开遮罩弹窗（Modal / Overlay / Drawer）后，如果只能通过点击一个精确的关闭按钮来退出，会造成高昂的操作心智成本。

### 设计原则
* **背板轻触退出 (Light Dismiss)**：点击弹窗主体区域之外的半透明暗色背景层 (Backdrop / Overlay) 时，默认触发关闭操作。
* **防穿透机制 (Event Propagation Control)**：
  * 在外层 Overlay 绑定关闭事件的同时，必须在弹窗容器主体上绑定 `onClick={e => e.stopPropagation()}`。
  * 这样可以防止用户在弹窗卡片内进行正常点击（如选择、复制、表单输入）时，事件冒泡到外层而导致弹窗意外关闭。

### 典型实现 (LeaseLedgerCard 收银台)
```typescript
{/* 外层 Overlay 绑定关闭函数 */}
<div className="modal-overlay" onClick={() => setSelectedPayment(null)}>
  
  {/* 弹窗实体主体：加 stopPropagation 防止点击卡片内部触发关闭 */}
  <div 
    className="modal-content" 
    style={{ position: 'relative' }} 
    onClick={e => e.stopPropagation()}
  >
    {/* 内容区 */}
  </div>
</div>
```

---

## 4. 视觉层级与色彩心理 (Visual Hierarchy & Color Psychology)

在房租支付、意向表达和违约警示等重度业务逻辑中，界面的色彩不仅是视觉装饰，更是引导用户行为的决策工具。

### 设计原则
* **动作区分**：
  * **主导性正面操作**（如“我要租”、“确认提交”）：使用品牌的**活力绿色/青色 (`var(--primary)` / `var(--success)`)**，传达安全、已确认、积极的心理暗示。
  * **破坏性/撤回操作**（如“取消意向”、“终止租约”）：使用**警告红/橙色 (`var(--danger)`)**。对于非直接违约撤回（如取消意向），按钮默认可采用 `border` 描边、背景透明样式，仅在悬浮或点击时增强颜色，减少操作的压迫感，同时让用户警惕其后果。
* **通知气泡对比 (Toast vs Alert Banner)**：
  * **瞬时反馈**（如取消意向成功）：使用自动淡出消失 of **Toast 气泡**。
  * **持续的风险警示**（如合租室友违约、押金没收风险）：必须在页面最顶部使用常驻的、带警告图标的 **警告横幅 (Joint Tenancy Breach Warning)**，直至风险解除。

---

## 5. 微交互、过渡动效与实时反馈 (Micro-interactions & State Feedback)

动态的界面能够给用户带来更高级的呼吸感，且微交互能为后台异步事务（例如向服务器发送 API 请求）提供视觉缓冲区。

### 设计原则
* **悬浮态缩放 (Hover Scaling)**：关键卡片和圆形操作按钮在鼠标悬停时，应用轻微的形变（如 `transform: scale(1.03)` 或 `translateY(-3px)`）及阴影加深（`transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1)`），提供明确的悬浮感知。
* **加载中与状态锁定**：
  * 按钮点击提交时，必须将按钮设为 `disabled` 并修改鼠标指针为 `cursor: 'wait'`。
  * 加载状态不可使用大范围阻断用户的 Loading 遮罩，建议使用按钮内部的局部 Spinner 或如本项目呼吸灯效果的脉冲动画（Pulse animation）。
* **渐显过渡 (Scale & Fade In)**：弹窗和确认对话框应带有轻微的渐显和比例微调动画，使弹出过渡更加柔和。

### 典型实现 (呼吸灯动画)
```css
@keyframes pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}
.pulse-dot {
  animation: pulse 1.5s ease-in-out infinite;
}
```

---

## 6. 信息聚合与全局通知红点 (Notification Bubbling)

在管理后台和多工作区系统中，如果操作入口藏得太深，会导致管理员漏看重要通知，增加响应延时。

### 设计原则
* **红点计数冒泡机制 (Pending Counts Bubbling)**：
  * 子组件或后台数据监听器计算当前待审批/待处理的增量事务数（如未审批账单、未回复反馈等）。
  * 通过状态回调函数（如 `onPendingCountsChange`）将该值向上冒泡通知最顶层的导航侧边栏/主页壳（App Shell）。
  * 在对应的 Tab 按钮右上角渲染醒目的带数字警告红点，直接指引用户发现未处理事务。

### 典型实现 (AdminPanel 计数冒泡)
```typescript
// AdminPanel.tsx 内部监听并计算待审批数
useEffect(() => {
  const pendingCount = unreviewedPayments.length + pendingInterests.length + unrepliedFeedback.length;
  onPendingCountsChange?.(pendingCount);
}, [unreviewedPayments, pendingInterests, unrepliedFeedback]);
```

---

## 7. 客户端媒体压缩与网络容错 (Client-side Media Compression)

在涉及图片上传（如上传中介头像、房屋挂牌图、支付凭证）的业务中，用户直接上传手机原图（通常 $5\text{MB} - 12\text{MB}$）会导致极高的服务器存储负载和上传网络超时。

### 设计原则
* **静默客户端压缩**：在图片被传输到云端/服务器之前，利用 Canvas 或前端库进行**静默等比压缩和格式化 (Canvas JPEG Compression)**。
* **严格大小控制**：
  * **中介头像与付款二维码**：建议分辨率控制在宽/高 $\le 600\text{px}$，体积严控在 $30\text{KB}$ 以内，最大程度节省数据库存储。
  * **账单凭证与挂牌照片**：控制在 $200\text{KB}$ 左右即可，既保证可读性，又极速完成上传。
* **进度反馈**：图片压缩和上传阶段，UI 应展现正在处理状态（如“正在压缩照片...”、“等待上传...”），保障用户的实时知情权。

---

## 8. 流量闭环与防流流失设计 (Product Loop & Anti-drainage Design)

在垂直类交易/租赁平台中，流量和交易必须被牢牢锁在自有系统内，否则极易发生线下绕过交易（跳单）或用户注意力被外部竞品带走。

### 设计原则
* **去除站外引流点 (No Outgoing Social Links)**：
  * 严厉查杀不必要的外部链接（例如中介主页的 Facebook URL、个人主页的 Website URL）。
  * 平台内部只保留直接沟通渠道（如 WeChat ID、WhatsApp 数字号码），且将其做成“一键复制”交互，促使用户停留在自有系统内完成后续沟通。
* **端内闭环决策 (In-app Closing Loop)**：
  * 所有与订单、合同、违约相关的确认操作，全部使用系统内部的 Modal/Toast 处理，决不跳转外部页面。
  * 给用户提供即时的微信和邮箱一键复制通道，使用户能快速联络站内唯一的管理员。

---

## 9. 进度可视化与动态反馈 (Progress Visualization & Dynamic Feedback)

在多步骤流程（如合租意向、租约进度）中，静态的进度指示器无法有效传达"正在进行"的状态感知。动态的视觉反馈能够显著提升用户对流程推进的感知度和参与感。

### 设计原则
* **线条延伸动画 (Line Extension Animation)**：
  * 进度连接线应从起点向终点"生长"，而非瞬间出现。
  * 使用缓动函数（如 `cubic-bezier(0.4, 0, 0.2, 1)`）模拟自然的加速减速过程。
  * 持续时间建议 0.8-1.5 秒，过快会让用户错过，过慢会造成等待焦虑。

* **光点引导 (Glow Dot Guidance)**：
  * 在进度线末端添加脉动的光点，吸引用户视线跟随进度。
  * 光点应跟随线条延伸移动，提供连续的视觉引导。
  * 使用多层阴影（`box-shadow`）和缩放动画（`scale`）制造呼吸感。

* **节点状态反馈 (Node State Feedback)**：
  * 激活的节点应有明显的视觉变化：放大（scale 1.05-1.1x）、发光阴影、颜色加深。
  * 所有状态变化必须带有平滑过渡（`transition: all 0.5s ease`），避免突兀的跳变。
  * 未激活节点保持低对比度，但仍需清晰可见（不能完全隐藏）。

* **可访问性考虑 (Accessibility)**：
  * 必须支持 `prefers-reduced-motion` 媒体查询。
  * 当用户启用"减少动画"设置时，动画应自动禁用，显示静态版本。
  * 动画不应是传达信息的唯一方式，文字标签和图标必须同时存在。

### 典型实现 (PropertyListings 进度流程)

```typescript
{/* 基础灰线 - 始终显示完整路径 */}
<div style={{ 
  position: 'absolute', 
  top: 10, 
  left: 20, 
  right: 20, 
  height: 2, 
  background: 'var(--glass-border)', 
  zIndex: 0 
}} />

{/* 动态蓝线 - 根据进度状态延伸 */}
<div style={{ 
  position: 'absolute', 
  top: 10, 
  left: 20, 
  width: `calc(${progressWidth} - 40px)`, 
  height: 2, 
  background: 'var(--primary)', 
  zIndex: 0, 
  transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
  boxShadow: '0 0 8px var(--primary)',
  transformOrigin: 'left center'
}} />

{/* 脉动光点 - 跟随线条末端 */}
<div style={{ 
  position: 'absolute', 
  top: 8, 
  left: calculateDotPosition(progressWidth),
  width: 6, 
  height: 6, 
  borderRadius: '50%',
  background: 'var(--primary)',
  boxShadow: '0 0 12px var(--primary), 0 0 20px var(--primary)',
  zIndex: 1,
  opacity: progressWidth !== '0%' ? 1 : 0,
  transition: 'left 0.8s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease',
  animation: progressWidth !== '0%' ? 'pulse 1.5s ease-in-out infinite' : 'none'
}} />
```

### CSS 动画定义

```css
/* 线条延伸 */
@keyframes extendLine {
  from { 
    width: 0;
    opacity: 0;
  }
  to { 
    width: calc(100% - 48px);
    opacity: 0.6;
  }
}

/* 光点脉动 */
@keyframes pulse {
  0%, 100% { 
    opacity: 1;
    transform: scale(1);
  }
  50% { 
    opacity: 0.7;
    transform: scale(1.3);
  }
}

/* 发光脉冲 */
@keyframes glowPulse {
  0%, 100% { 
    box-shadow: 0 0 12px var(--primary), 0 0 20px var(--primary);
    transform: scale(1);
  }
  50% { 
    box-shadow: 0 0 16px var(--primary), 0 0 28px var(--primary), 0 0 36px var(--primary);
    transform: scale(1.2);
  }
}

/* 可访问性支持 */
@media (prefers-reduced-motion: reduce) {
  .progress-line,
  .progress-dot,
  .progress-node {
    animation: none !important;
    transition: none !important;
  }
}
```

### 性能优化
* **使用 CSS 动画而非 JavaScript**：CSS 动画由浏览器的合成器线程处理，不会阻塞主线程。
* **GPU 加速**：使用 `transform` 和 `opacity` 属性触发 GPU 加速，避免使用 `width`/`height` 等会触发重排的属性（在必要时除外）。
* **避免过度动画**：一个界面中不应同时出现超过 3-4 个独立的动画循环，否则会分散用户注意力。

### 实际应用场景
| 场景 | 动画类型 | 持续时间 | 触发时机 |
|------|---------|---------|---------|
| 合租意向提交 | 线条延伸 + 光点脉动 | 0.8s | 用户提交意向成功后 |
| 租约进度更新 | 线条延伸 + 节点放大 | 1.5s | 管理员确认租约后 |
| 支付流程 | 光点移动 + 节点高亮 | 1.0s | 账单状态变更时 |

### 用户体验收益
1. **进度感知增强**：用户能清晰看到"从哪里到哪里"的过程。
2. **等待焦虑缓解**：动画提供视觉缓冲，减少用户对加载时间的敏感度。
3. **操作反馈即时**：动态效果让用户确信"系统收到了我的操作"。
4. **品牌质感提升**：精致的动画传达产品的专业性和用心程度。

---

## 10. 网络延迟极小化与并行联表设计 (Network Latency Minimization)

当用户进行主导航切换（如进入个人租约中心）时，如果前端采取串行的多步骤 API 查询，会导致长达数秒的“空自白屏”状态，破坏用户交互连贯性。

### 设计原则
* **并行合并请求**：对不具备前后依赖关系的多个数据源（如租约 leases 和意向记录 tenant_interests），必须通过 `Promise.all` 等机制并行派发，使总请求等待时长收窄为耗时最长的那一个 API 请求。
* **嵌套联表减少往返 (PostgREST Join)**：
  * 尽可能避免“先查 A -> 拿 A.id 查 B -> 拿 B.id 查 C”的链式查询。
  * 利用 Supabase (PostgREST) 的嵌套联查 `select('*, units(*, communities(*))')`。让数据库在服务端完成 JOIN 并将嵌套对象一次性返回，降低网络往返延迟。
* **骨架屏与渐入过渡**：在数据加载过程中，使用与实际卡片相同尺寸的骨架屏（Skeleton Card）作为占位符，且数据返回时提供 0.2s 的渐入动效，防止数据瞬间渲染造成的页面闪烁。

---

## 11. 手机收银台与信息验证优化 (Mobile Payment Portal & Profile Verification)

在手机等便携式设备和桌面设备上，用户在面对支付或填写个人重要资料时通常具有较高的操作阻碍和审美要求。

### 设计原则
* **安全锁与隐私背书 Banner (Encrypted Trust Banner)**：在敏感证件上传或个人隐私表单上方，提供显眼的、带有安全锁图标 (🔒) 的通告横幅，说明数据遵循 Supabase RLS 加密策略，仅供管理员和房东进行租约审核，不泄露给任何第三方。
* **限制表单与卡片最大宽度及居中 (Max Width Constraint & Centering)**：为个人信息等主要输入表单外层的玻璃卡片设定合理的宽度上限（如 `maxWidth: '800px'`）并执行 `margin: '0 auto'` 居中，避免在大屏显示器上输入框横向过度拉伸而降低阅读与填写效率，保持整体视觉高度内聚 and 居中对称。
* **响应式身份选择器三列网格 (3-Column Responsive Grid for Identity Types)**：废除铺满整行的厚重垂直列表，改用自适应的 3 列网格布局，并使用精美的矢量 SVG 图标（如 `CreditCard`、`GraduationCap`、`Globe`）取代在 Windows 上显示效果不佳的系统 Emojis，在不同终端屏幕宽度下皆可优雅地响应式折行。
* **资料完成进度条绿色终点渐变 (Success Green Gradient for 100% Progress)**：将进度条在 100% 满格时的渐变终点颜色从警告色（黄色/橙色）修正为代表已完成/成功的翡翠绿 (`var(--success)`)，给租客带来明确的视觉满足与积极反馈。
* **新租客迎新与引导横幅 (Warm Welcome & Onboarding Banner)**：若系统检测到租客尚未选择身份类型并验证，会在卡片头部渲染一个醒目的、带有 `👋 欢迎来到 Malaysia Ez Rent！` 问候语及 `⚠️ 待身份验证` 警示角标的磨砂玻璃渐变横幅。横幅明确阐述了“安全加密保护”的必要性以及“验证后将解锁的房源浏览、看房申请、意向金支付及电子租约签署”等核心系统价值，以此软性引导其优先完成该关键任务。
* **拍照框组件 (Camera Drop Slot)**：替代传统的原生上传按钮，将其设计为带虚线边框、相机图标及明确多语言提示的框体。当悬浮时提供虚线颜色变化。
* **手机支付分段切换与快捷复制 (Segmented Pay & Clipboard Copy)**：扫码支付页提供 “DuitNow 二维码 / 银行转账” 快捷 Tab，针对银行名称、卡号等手动输入项，提供一键复制按钮与动态勾选成功状态，降低输入差错。

---

## 12. 终端风格控制台与实时连接状态指示 (Mac Console Pattern & Alive Breathe Indicator)

在涉及 AI 服务、异步作业和后台逻辑分析的交互中，用户渴望直观地看到后台正在做什么，以打消等待焦虑。

### 设计原则
* **Mac 风格终端台 (Mac Console Shell)**：将 AI Reasoning 步骤等系统状态日志打包在一个深色的、带有 macOS 三色圆点（红/黄/绿）的终端框体中，使用等宽字体（Consolas/Monospace），保持专业的极客设计语言。
* **呼吸光点连接指示器 (Status breathe LED)**：在状态旁渲染一个 8px 的圆形 LED 灯点。通过 CSS 关键帧实现呼吸缩放与扩散阴影（Green/Yellow glowing LED dot），表现当前正在连接 API 或由于网络波动掉线的状态。

---

## 13. 气泡聊天工单对话系统 (Bubble Chat Order System)

工单与报修的售后跟进涉及多轮对话，普通的平铺式表格或列表不仅难以阅读，且无法体现对话的即时性。

### 设计原则
* **左右气泡对齐规则 (Speech Bubble Alignment)**：
  * **学生端**：自己发出的消息对齐在右侧，使用 Primary 主题底色加白色文字；中介/管理员发出的消息对齐在左侧，使用 Glassmorphic 半透明卡片底色。
  * **管理端**：管理员自己发出的回复对齐在右侧；租客/学生提交的内容对齐在左侧。
* **头像与姓名合并显示**：气泡上方展示发信人的简短角色，底部用微型灰字标注发送时间，确保长对话排版分明。

---

## 14. 页面性能与 React 渲染闭环优化 (Page Performance & React Render Loop Optimization)

在复杂的前端单页应用 (SPA) 中，非受控的或过于频繁的父子组件事件流会诱发严重的 React 渲染闭环及卡死 Bug（例如 Minified React error #185：Maximum update depth exceeded）。

### 设计与工程原则
* **稳定的回调引用 (Stable Callbacks)**：当向任何可能在 `useEffect` 中执行初始化或状态轮询的子组件传递回调函数时，必须使用 `useCallback` 对其进行包裹，保证依赖引用地址保持绝对稳定。
* **防御性状态对比 (Defensive State Updates)**：在状态变更触发函数内部，应在修改状态前执行相等性校验（例如 `prev.val === newVal` 则直接返回原对象指针），彻底防止回调在执行时因返回新对象指针引起的级联重新渲染。
* **依赖分流与最小订阅**：只在 `useEffect` 的依赖数组中声明必须包含的依赖项，避免无意义的顶层引用。

### 典型实现 (page.tsx)
```typescript
// 结合防抖/浅对比阻断多组件实例并行回调带来的重复刷新
const handlePendingCountsChange = useCallback((leasesCount: number, feedbackCount: number) => {
  setPendingCounts(prev => {
    if (prev.leases === leasesCount && prev.feedback === feedbackCount) return prev;
    return { leases: leasesCount, feedback: feedbackCount };
  });
}, []);
```

---

## 15. 同小区房源小方块化与“查看更多”弹出模态框 (Same-Community Cards & Modal Overlay)

对于辅助推荐或关联维度的列表（如“同小区的其他房间”），如果使用整行布局，会极度挤占核心详情抽屉 of 纵向空间，增加用户的滑动负担。

### 设计原则
* **紧凑方块平铺化**：将列表项改造为 $1 \times 1$ 紧凑的小方块网格。方块高度控制在 $48\text{px}$ 左右，仅保留封面缩略图、房型简称 and 价格，最多平铺 5 个。
* **渐进式“查看更多”**：限制方块数量上限。对超出限制的房源，提供清晰的超链接引导，点击后在当前页面渲染包含全局模糊背板（`backdrop-filter: blur(6px)`）的 Modal Overlay 进行弹窗滚动展示。
* **当前浏览态聚焦 (Active Anchor)**：在弹窗列表中，针对当前正在浏览的房源锚点，应配以“当前 / Current”高对比度徽章，帮助用户在切换时建立明确的空间与层级坐标。

---

## 16. 全端列表与详情同步及角色功能隔离原则 (All-Portal Sync & Role-based Isolation)

多端共享的数据模型（例如房源 Listings 详细规格）如果各端展现逻辑不一致，会导致用户与中介在信息对齐时产生偏差。

### 设计原则
* **展示逻辑百分百对齐 (UI/Data Alignment)**：针对房源详情、面积大小、历史评价，无论在租客端（`PropertyListings.tsx`）、中介浏览端（`AdminListingsBrowse.tsx`）还是游客端，其 UI 层级与渲染数据必须同步更新。
* **操作与角色权限隔离 (Action Privilege Isolation)**：在视觉统一的前提下，根据当前会话角色（Session role）动态隐藏或禁用与其身份冲突的动作按钮。
  * **中介控制台**：无缝同步同小区对比与评论板块，但绝对隐藏“我要租”、“申请合租”等与其管理员身份相悖的交易交互。
  * **租客控制台**：严格剔除管理属性（如“删除评价”特权、后台统计、房源所有权映射）。

---

## 17. 评论区及异步加载骨架屏占位防抖机制 (Skeleton Shimmer Placements)

当组件在进行异步网络请求（如切换房源拉取评价数据）时，如果不做任何视觉占位，会因页面局部高度塌陷产生剧烈的抖动。

### 设计原则
* **物理高度等比例占位 (Layout Height Anchoring)**：骨架图组件（`Skeleton Card/List`）的渲染框体、圆角与行高必须与最终真实渲染的数据卡片完全一致，确保内容加载前后，页面盒模型的物理占位尺寸恒定。
* **平滑闪烁无感过渡 (Smooth Shimmer Swipe)**：骨架屏必须配以微弱的、循环的线性渐变位移动画（如 `.shimmer` 扫描条效果，倾斜 $45^\circ$ 自左向右匀速扫过），相比纯色块，其更能有效打消用户的等待焦虑。

---

## 18. Phosphor Duotone 图标库视觉升级与品牌统一 (Phosphor Duotone Icons & Brand Cohesion)

为了强化品牌视觉质感并提升用户的信任心理，界面中的核心图标一律从细线轮廓型 Lucide 图标库升级为更加饱满、层次更强的 Phosphor duotone（双色调）图标。

### 设计原则
* **背景半透明填充**：双色调图标在主色线条基础上，自带一层 10%-12% 不透明度的半透明填充色块。这种柔和的色阶过度使得扁平的界面立刻产生立体微立体感，减少冷冰冰的线框感。
* **高频信任区域首选**：在首屏服务介绍、登录入口选择及关键信任标识（如“实名认证”、“资金安全”、“真实房源”）上，必须强制使用 duotone 风格，形成高度一致的品牌调性。

---

## 19. 地图无密匙智能降级与防错机制 (Keyless Map Smart Fallback & Fail-Safe)

当系统运行在本地沙盒、API key 配置出错或遇到谷歌地图配额耗尽等异常情况时，地图模块不应抛出不可读的 API 鉴权红屏或空白排版，而是应当实现无感自动降级。

### 设计原则
* **无密匙环境检测**：在组件（如 `MapAndCard`）渲染前，对传入的 API key 进行可选值分析。如 key 缺失、为空、或匹配 dummy 值（如包含 `YOUR_` 前缀且长度不足），立即激活降级机制。
* **免签标准嵌入**：降级后自动采用不需要 API Key 的 Google Maps 经典 iframe 参数化路由（`https://maps.google.com/maps?q=...&output=embed`）进行通勤和位置预览，避免系统因外部依赖环境的不可控性导致局部排版崩溃。

---

## 20. 租客身份验证缓存无感通行 (Tenant Identity Caching & Smooth Nav Bypass)

频繁的数据库鉴权拉取会导致用户在使用 SPA 单页应用时产生明显的交互顿挫和闪烁感。对于需要进行身份分类校验（本地人/留学生）的场景，采用本地状态缓存。

### 设计原则
* **全局上下文挂载**：在 `TenantDataContext` 中全局维系一份从 Supabase 登录 session 中获取的身份状态缓存 `profileIdentityType`。
* **即时无感通行**：拦截守卫 `TenantIdentityGate` 首次查询后，后续路由切换和敏感按钮拦截将百分百从本地内存中读取，直接通过，消除所有因后台接口请求滞后带来的 Spinner 菊花闪现和白屏顿挫。

---

## 21. 记住密码与表单自动填充支持 (Remember Me & Autocomplete Integration)

为了优化登录和注册流程，减少用户手输密码与验证码的频次，系统表单需深度适配主流浏览器的内置凭据管理器。

### 设计原则
* **严格表单语义属性**：所有密码、邮箱及新密码注册的 input 标签，必须设置完全正确的 HTML 语义属性：`name`、`type` 及 `autocomplete`（如 `username`、`current-password`、`new-password`）。
* **自动填充与拦截避免**：避免使用自定义的模拟 placeholder 和过于复杂的动态事件拦截密码输入。配合加密安全的“记住密码”本地暂存，帮助 Safari、Chrome 及第三方凭据管理工具实现一键安全填充。

---

## 22. AI 聊天 Tab 切换后台持久化与零卡顿 (AI Chat State Preservation & Latency-Free Tabs)

AI 对话是平台最核心的技术特色，用户常需在浏览房源列表和与 AI 对话之间来回对比。

### 设计原则
* **内存状态常驻**：AI 助手的聊天状态（包括对话历史数组、流式输出接收状态、当前输入框未发送的草稿等）在用户切离路由时，不应随组件 unmount 而被销毁，应当存留在全局状态或使用 DOM CSS 隐藏显示策略（保持渲染实例挂载）。
* **零延迟无感切回**：当用户从房源详情切回 AI 聊天时，窗口直接呈现切离前的完整状态，无任何白屏加载，保障多任务交叉决策的丝滑感。

---

## 23. 高级磨砂玻璃微光 Toast 动效 (Glassmorphic Shimmering Toast)

系统内的微小瞬时成功或警告反馈，不宜使用阻断性的 Alert 弹窗或简陋的纯黑浮层，而是使用完美契合奢华玻璃拟态主题的 Toast。

### 设计原则
* **磨砂玻璃微光感**：使用高斯模糊 `backdrop-filter: blur(12px)` 与极其透亮的发光半透明边框，并在卡片内部增加一条倾斜的平滑移动微光扫描条动画（Shimmer sweep），模拟精致实体玻璃质感。
* **阻尼回弹滑入**：采用 `cubic-bezier` 的自定义回弹贝塞尔曲线让 Toast 从顶部优雅滑入，降低动作反馈的心智压迫。

---

## 总结（更新于 2026-06-08）

高级的 UI 往往不是靠堆砌花哨的特效，而是体现在对**对比度**、**点击热区**、**动效细节**、**进度可视化**、**网络响应性**与**操作心智成本**的极致打磨上。后续开发时请牢记：
1. 重要的可交互元素，**绝不使用无背景的微小文字链接**。
2. 每一个 Modal 弹窗，**必配 Light Dismiss（点击背景关闭）**。
3. 文本内容，**决不允许在玻璃层上因为对比度不足而模糊难辨**。
4. 任何媒体文件上传，**在网络发送前必须完成客户端静默压缩**。
5. 所有的联系界面，**严禁外链站外平台，全部设计为站内复制闭环**。
6. **进度流程必须有动态反馈**，线条延伸、光点引导、节点动画缺一不可。
7. **进度节点的落点公式与布局必须采用数学均分 (Mathematical Equidistribution) 方式**：每个节点应使用统一的 `flex: 1` 占位，使 4 个节点的圆心完美对齐在 `12.5%`、`37.5%`、`62.5%` 和 `87.5%`。呼吸光点应用 `marginLeft: -3px`（半宽度偏移）进行中心对齐校准，杜绝过冲、偏离与多语言溢出。
8. **多源数据加载严禁串行**，必须使用 Promise.all 并行化或嵌套 SELECT 联表以降低网络延迟。
9. **所有动画必须支持 `prefers-reduced-motion`**，尊重用户的可访问性设置。
10. **唯一生效租约限制（一人一房原则）**：在用户有任何生效的租约合同（`myLeasedUnitIds.length > 0`）时，任何在其他房源下的意向表达与合租加入均应当做强阻断校验，提醒并拦截，防止一人租多房逻辑冲突。
11. **工单及日常对话必须采用聊天气泡交互**：左右对齐以区分身份，且消息气泡与发信主体颜色完美契合，消除平铺式死板列表。
12. **后台异步与连接状态灯同步渲染**：Mac Console 日志面板与 LED 光点（呼吸、跳动、发光阴影）结合，减少异步操作焦虑。
13. **手机支付分段切换与快捷复制**：扫码支付页提供 “DuitNow 二维码 / 银行转账” 快捷 Tab，针对银行名称、卡号等手动输入项，提供一键复制按钮与动态勾选成功状态，降低输入差错。
14. **安全锁与隐私背书 Banner**：在敏感证件上传或个人隐私表单上方，提供显眼的、带有安全锁图标 (🔒) 的通告横幅，说明数据遵循 Supabase RLS 加密存储策略。
15. **资料完善度百分比滑条**：在表单头部增加进度指示器，根据输入框填写的数量动态计算百分比（0%-100%），通过 6px 高度的彩色渐变滑条实时同步并辅以动效。
16. **拍照框组件**：替代传统的原生上传按钮，将其设计为带虚线边框、相机图标及明确多语言提示的框体。当悬浮时提供虚线颜色变化。
17. **React 状态流与渲染闭环优化**：当在父组件中向可能在 `useEffect` 中被引用的子组件传递更新回调时，必须使用 `useCallback` 记忆化，并在父组件的 `setState` 更新器中执行相同值检测阻断，杜绝产生死循环渲染 (Infinite Render Loop)。
18. **关联列表精简化与大弹窗 Modal 融合**：辅助信息（如小区其它房间）采用精致的 $1 \times 1$ 卡片化展示（限制最多 5 个），超出部分以微动效超链接引导，弹窗中锚定当前房源，建立清晰的空间视觉坐标。
19. **全端列表同步与操作权限强隔离**：跨端共用界面（房源列表、评论区）核心布局和字段逻辑强制全端同步，操作权限根据会话身份（租客/中介）进行百分之百物理隔离，杜绝越权或动作冲突。
20. **骨架屏防抖与扫描扫描淡入动效**：数据异步更新前必须配置物理高度 1:1 的骨架占位屏，加入 $45^\circ$ 平滑渐变移动扫描动画，解决内容加载时页面物理塌陷和剧烈抖动问题。
21. **全系统强制升级为 Phosphor Duotone 双色调图标规范**：使关键视觉触点拥有立体分层的填充层次，增加品牌高档 SaaS 质感。
22. **通勤地图服务 API 异常零密匙自动降级**：实现 API 状态自检测，静默切换至 keyless 经典地图组件，保证本地沙盒或异常下的正常排版呈现。
23. **身份拦截全局缓存通行设计**：将拉取的用户身份缓存至 Context 中并支持免打库校验，从根本上解决 Tab 导航切换时的页面 Spinner 闪烁。
24. **表单组件无障碍自动填充兼容**：利用标准 HTML 表单属性，实现 Safari、Chrome 等原生凭证以及记住密码机制的完全兼容，提升首关登录速度。
25. **AI 聊天历史会话与输入状态后台驻留**：路由切离时后台持久化状态与实例，解决用户二次进入时的卡顿与文本草稿丢失问题。
26. **高感知磨砂玻璃微光 Toast 反馈**：所有的瞬时反馈一律采用 `backdrop-filter: blur(12px)` + 微光扫描（Shimmer sweep）的浮窗，并使用回弹贝塞尔阻尼动效，彻底杜绝生硬死板的默认提醒。

