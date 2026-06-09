# 🚀 Malaysia Ez Rent — 个人中介 SaaS 发展路线图

> 面向独立房产经纪人（Real Estate Negotiators - REN）的 SaaS 订阅与赋能演进方案
>
> 最后更新：2026-06-09

---

## 📍 当前状态

| 维度 | 现状 |
|------|------|
| **商业模式** | 个人中介注册，填写所属公司（如 IQI, Propnex 等），目前免费使用 |
| **数据隔离** | 数据库底层已实现 `agent_id` 字段级物理隔离，中介只能管理属于自己的房源和租约 |
| **计费** | 暂无，全功能免费 |
| **注册** | 支持自主提交 REN 证件申请，超级管理员在后台一键审批 |
| **部署** | Vercel (前端) + Render (后端) + Supabase (数据库) |

---

## 🎯 SaaS 目标状态（To-Individual-Agent）

在马来西亚，房产中介（REN）大多是独立经纪人，自负盈亏并支付自己的广告和工具费用。本平台的 SaaS 路线应当**直接面向中介个人**（To-Individual-Agent）销售效率工具，而不是售卖给企业（B2B 公司），其架构设计如下：

```
┌─────────────────────────────────────────────────┐
│              Platform Admin (超级平台管理员)       │
│  管理所有中介 · 审批注册 · 查看全局数据 · 计费管理    │
├─────────────────────────────────────────────────┤
│  Agent A (中介 A)             Agent B (中介 B)     │
│  ├── 独立管理的房源与合租意向    ├── 完全独立的数据数据  │
│  ├── 独立管理的租约与收租对账    ├── 个人专属名片与联系方式│
│  ├── 个人订阅套餐（Stripe）      ├── 不同的套餐与限额等级│
│  └── 看不到 B 的任何租约与隐私    └── 看不到 A 的任何数据 │
└─────────────────────────────────────────────────┘
```

中介在注册时填写自己的挂靠公司（如 IQI Realty），但**付费主体和账户主体是中介个人**。

---

## 🗺️ 分阶段路线图

### Phase 1：个人订阅与用量门控系统（2-3 周）

> 核心目标：接入在线支付，对中介账号实施订阅套餐分级与房源数量限制

#### 1.1 扩展 `admin_users` 表
直接在中介表（`admin_users`）中追加订阅字段，无需新建复杂的 `tenants`（公司）表：

```sql
ALTER TABLE admin_users ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free'; -- free / pro / unlimited
ALTER TABLE admin_users ADD COLUMN subscription_expires_at TIMESTAMPTZ;
ALTER TABLE admin_users ADD COLUMN stripe_customer_id VARCHAR(100);
```

#### 1.2 创建 `usage_records` 表
按月统计每个中介的 AI 请求和存储等用量：

```sql
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID REFERENCES admin_users(id) ON DELETE CASCADE,
  month DATE NOT NULL,                   -- 例如 2026-06-01
  ai_requests_count INT DEFAULT 0,
  whatsapp_sent_count INT DEFAULT 0,
  UNIQUE(agent_id, month)
);
```

#### 1.3 数据库触发器限额控制
在数据库层通过触发器硬性限制免费中介的房源发布上限：

```sql
CREATE OR REPLACE FUNCTION check_agent_unit_limit()
RETURNS TRIGGER AS $$
DECLARE
    tier VARCHAR(20);
    current_count INTEGER;
    max_count INTEGER;
BEGIN
    SELECT subscription_tier INTO tier FROM admin_users WHERE id = NEW.agent_id;
    
    max_count := CASE tier
        WHEN 'free' THEN 3        -- 免费版限 3 套
        WHEN 'pro' THEN 30       -- 专业版限 30 套
        WHEN 'unlimited' THEN 999999 -- 无限版
        ELSE 3
    END;
    
    SELECT COUNT(*) INTO current_count FROM units WHERE agent_id = NEW.agent_id;
    
    IF current_count >= max_count AND TG_OP = 'INSERT' THEN
        RAISE EXCEPTION '您的当前套餐房源数量已达上限（%套），请升级您的套餐。', max_count;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_unit_limit
BEFORE INSERT ON units
FOR EACH ROW EXECUTE FUNCTION check_agent_unit_limit();
```

#### 1.4 Stripe 支付与本地付款集成
集成 **Stripe Checkout**，支持信用卡以及马来西亚本地主流的 **FPX（网银转账）** 与 GrabPay，打通自动扣款和订阅状态回调（Webhook）。

---

### Phase 2：自动化入驻与微信/WhatsApp 增值通知（2 周）

> 核心目标：实现中介注册到审批的自动化，引入增值服务收费项（催租通知）

#### 2.1 增值账单催收通知
中介的一大痛点是“每个月手动催租”。平台可集成 **WhatsApp Business API** 或短信网关，提供“一键 WhatsApp 催租”或“系统自动发短信催账”服务。
- 计费方式：按条收费（例如每条 WhatsApp 提醒扣除 RM 0.10，在中介账户中预存金额）。

#### 2.2 REN 号自动化核验
目前中介注册需要超管手动审核 REN 证件。未来可接入马来西亚估价师、评估师、地产代理及物业管理人局（LPPEH）的公开接口或数据源，实现中介执照号（REN）的秒级自动验证，缩短入驻审核流。

---

### Phase 3：房源 AI 精准推荐与推广置顶（2 周）

> 核心目标：不卖“广告位”，而卖“精准获客”

#### 3.1 AI 对话精准导流
- 当学生问 AI 助手：“我想在 USM 附近找一间 RM 800 的房间”时，AI 助手基于向量相似度召回小区，并在推荐房源时，**优先展示付费中介发布的房源**。
- 计费方式：按推荐点击次数扣费（如每次有效导流扣除 RM 1.00），或提供付费中介专享的“AI 精选推荐”特权。

#### 3.2 房源置顶与刷新
允许中介在列表里一键刷新（Bump）房源使其靠前，参考 iProperty 逻辑但价格更亲民。

---

## 💰 个人中介定价模型建议

中介为**生产力效率工具**和**精准客户流量**付费，性价比需远超自建系统和传统的 iProperty 纯广告消耗。

| 套餐 | 月付 | 年付（8折） | 适用客户 | 核心限制与权益 |
|------|------|-----------|---------|--------------|
| **🆓 体验版 (Free)** | RM 0 | RM 0 | 新人中介、试用 | 限制最多发布 **3 套**活跃房源；基础 AI 找房展示；无自动催租功能。 |
| **🌟 专业版 (Pro)** | RM 99 | RM 948 | 独立执业经纪人（主干） | 限制最多发布 **30 套**活跃房源；完整 AI 助手导流；开通报修工单中心；享受收租账目看板。 |
| **💎 无限版 (Unlimited)** | RM 299 | RM 2,870 | 高产中介、包楼盘团队 | **无限制**房源发布；优先 AI 对话推荐；享用数据导出；支持优先客服。 |

### 🚀 增值服务（按量计费）
- **自动 WhatsApp 账单催收**：RM 0.15 / 条
- **AI 对话置顶引流**：RM 50 / 月/房源
- **房源一键刷新（Bump）**：RM 2.00 / 次
- **AI 租房合同解读助手 (计费 API)**：按次收费（如 RM 10/次），基于大模型自动解析英文合同中的关键条款（转租、押金退还、违约处罚等）并翻译给国际租客。


---

## ⚠️ 关键商业决策反思

1. **为什么不需要公司（B2B）版本？**
   - 马来西亚大部分地产中介是以独立 Negotiator 形式挂靠在 IQI、PropNex、Hartamas 等大机构下。中介的获客预算和跟单完全由中介个人掌控，销售工具应直接卖给中介个人（ToC 裂变/To-Individual），避免冗长的企业采购审批。
2. **中介如何展示所属公司？**
   - 中介在 `/profile` 或注册时填写的公司名称（例如 `IQI Realty`）会直接渲染在房源详情页的中介名片上，展示其专业合规性，但底层数据与该公司其他中介完全隔离，保护中介私域客户和房源资产。
3. **竞争防守壁垒是什么？**
   - 传统平台（如 iProperty）只管前端展示，数据随买随走。
   - Malaysia Ez Rent 把**租约、自动催租台账、报修对话和历史收租水流水乳交融地锁定在系统里**，中介一旦有 10 个活跃租客在用，其数据迁移成本和客户流失代价将呈指数级上升，产生极高的用户粘性。
