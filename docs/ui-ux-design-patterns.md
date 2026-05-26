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

## 总结

高级的 UI 往往不是靠堆砌花哨的特效，而是体现在对**对比度**、**点击热区**、**动效细节**与**操作心智成本**的极致打磨上。后续开发时请牢记：
1. 重要的可交互元素，**绝不使用无背景的微小文字链接**。
2. 每一个 Modal 弹窗，**必配 Light Dismiss（点击背景关闭）**。
3. 文本内容，**决不允许在玻璃层上因为对比度不足而模糊难辨**。
4. 任何媒体文件上传，**在网络发送前必须完成客户端静默压缩**。
5. 所有的联系界面，**严禁外链站外平台，全部设计为站内复制闭环**。
