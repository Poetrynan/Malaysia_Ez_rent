# 🚀 Malaysia Ez Rent — SaaS 发展路线图

> 从单一业务全栈应用到多租户 SaaS 平台的演进方案
>
> 最后更新：2026-05-30

---

## 📍 当前状态

| 维度 | 现状 |
|------|------|
| 架构 | 单一业务（一个租房平台服务一家公司） |
| 数据隔离 | 靠 `agent_id` 字段区分中介，所有数据在同一张表 |
| 计费 | 无，免费使用 |
| 入驻 | 手动添加管理员，无自助注册 |
| 部署 | Vercel (前端) + Render (后端) + Supabase (数据库) |

---

## 🎯 SaaS 目标状态

```
┌─────────────────────────────────────────────────┐
│              Platform Admin (超级平台管理员)       │
│  管理所有租户 · 审批入驻 · 查看全局数据 · 计费管理    │
├─────────────────────────────────────────────────┤
│  Tenant A (租赁公司 A)        Tenant B (公司 B)    │
│  ├── 自己的房源、中介、租约       ├── 完全独立的数据    │
│  ├── 自己的 Logo、品牌          ├── 自己的品牌         │
│  ├── 自己的订阅套餐             ├── 不同的套餐等级      │
│  └── 看不到 B 的任何数据        └── 看不到 A 的数据    │
└─────────────────────────────────────────────────┘
```

---

## 🗺️ 分阶段路线图

### Phase 1：多租户数据隔离（2-3 周）

> 核心目标：每家公司的数据完全隔离，互不可见

#### 1.1 新增 `tenants` 表

```sql
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,           -- 公司名称
  slug VARCHAR(100) UNIQUE NOT NULL,     -- URL 友好标识 (如 "abc-realty")
  logo_url TEXT,                          -- 公司 Logo
  contact_email VARCHAR(200),
  contact_phone VARCHAR(50),
  status VARCHAR(20) DEFAULT 'active',   -- active / suspended / cancelled
  plan VARCHAR(20) DEFAULT 'free',       -- free / standard / premium
  max_units INT DEFAULT 5,               -- 套餐限制
  max_agents INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 1.2 所有业务表加 `tenant_id`

需要修改的表（共 ~12 张）：

| 表名 | 改动 |
|------|------|
| `admin_users` | 加 `tenant_id UUID REFERENCES tenants(id)` |
| `units` | 加 `tenant_id`（从 `agent_id` → `admin_users.tenant_id` 推导） |
| `leases` | 加 `tenant_id`（从 `unit_id` → `units.tenant_id` 推导） |
| `payment_records` | 加 `tenant_id`（从 `lease_id` → `leases.tenant_id` 推导） |
| `tenant_interests` | 加 `tenant_id` |
| `maintenance_requests` | 加 `tenant_id` |
| `communities` | 加 `tenant_id` |
| `feedback` | 加 `tenant_id` |
| `agent_registrations` | 加 `tenant_id`（审批后关联） |
| `users` | 加 `tenant_id`（学生注册时关联） |

#### 1.3 RLS 策略改造

```sql
-- 之前：所有登录用户看到所有数据
CREATE POLICY "Authenticated can view" ON units
  FOR SELECT USING (auth.role() = 'authenticated');

-- 之后：只看到自己租户的数据
CREATE POLICY "Tenant isolation" ON units
  FOR SELECT USING (
    tenant_id = (auth.jwt()->>'tenant_id')::UUID
  );
```

每个表都需要：`DROP POLICY` → `CREATE POLICY`（带 tenant_id 过滤）

#### 1.4 数据迁移

```sql
-- 1. 创建默认租户
INSERT INTO tenants (id, name, slug) VALUES
  ('默认租户 UUID', 'Malaysia Ez Rent', 'ezrent');

-- 2. 将现有数据关联到默认租户
UPDATE admin_users SET tenant_id = '默认租户 UUID' WHERE tenant_id IS NULL;
UPDATE units SET tenant_id = '默认租户 UUID' WHERE tenant_id IS NULL;
-- ... 所有表同理
```

#### 1.5 后端适配

- `config.py`：从 JWT 中提取 `tenant_id`
- `tools.py`：`search_internal_db` 加 `tenant_id` 过滤
- `agent.py`：`check_my_own_rental_status` 加 `tenant_id` 过滤
- 所有 RPC 函数：加 `p_tenant_id` 参数

#### 1.6 前端适配

- `AdminPanel.tsx`：加载数据时自动带 `tenant_id` 过滤
- `PropertyListings.tsx`：房源列表只显示当前租户的房源
- `page.tsx`：登录时从 JWT 读取 `tenant_id`，注入到全局 Context

#### ⚠️ 风险与注意事项

- 历史数据迁移必须在低峰期执行
- RLS 策略变更需要在 Supabase Dashboard 逐表测试
- Mock 模式下的 `supabase.ts` 也需要适配 `tenant_id` 逻辑
- 迁移脚本编号：`027_multi_tenant.sql`

---

### Phase 2：订阅计费系统（2 周）

> 核心目标：按套餐收费，限制功能和用量

#### 2.1 套餐设计

| 套餐 | 价格 | 房源数 | 中介数 | AI 功能 | 地图 | 报修 |
|------|------|--------|--------|---------|------|------|
| 🆓 Free | RM 0/月 | 5 | 1 | ✅ 基础 | ❌ | ❌ |
| 🌟 Standard | RM 99/月 | 50 | 5 | ✅ 完整 | ✅ | ✅ |
| 💎 Premium | RM 299/月 | 无限 | 无限 | ✅ 完整 | ✅ | ✅ + API |

#### 2.2 新增表

```sql
-- 订阅记录
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  plan VARCHAR(20) NOT NULL,             -- free / standard / premium
  status VARCHAR(20) DEFAULT 'active',   -- active / past_due / cancelled
  stripe_subscription_id VARCHAR(200),   -- Stripe 订阅 ID
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 用量统计（按月）
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  month DATE NOT NULL,                   -- 2026-05-01
  units_count INT DEFAULT 0,
  agents_count INT DEFAULT 0,
  ai_requests INT DEFAULT 0,
  storage_bytes BIGINT DEFAULT 0,
  UNIQUE(tenant_id, month)
);
```

#### 2.3 支付集成

**推荐方案：Stripe（国际通用）+ FPX（马来西亚本地银行转账）**

```
用户点击 "升级套餐"
  → 前端调用后端创建 Stripe Checkout Session
  → 跳转 Stripe 支付页（支持信用卡 / FPX / GrabPay）
  → 支付成功 → Stripe Webhook → 后端更新 subscription.status
  → 前端刷新，解锁功能
```

#### 2.4 功能门控中间件

```python
# backend/app/middleware.py
def check_plan_limits(request: Request):
    """检查当前租户的套餐是否允许该操作"""
    tenant_id = get_tenant_from_jwt(request)
    subscription = get_subscription(tenant_id)

    if subscription.plan == 'free':
        unit_count = count_units(tenant_id)
        if unit_count >= 5:
            raise HTTPException(403, "Free plan limited to 5 units. Upgrade to Standard.")
```

前端也需要门控：

```tsx
// 前端功能门控示例
const { plan } = useTenant();
const canUseMap = plan === 'standard' || plan === 'premium';

{canUseMap ? <MapAndCard /> : <UpgradePrompt feature="地图通勤" />}
```

#### 2.5 需要新增的文件

| 文件 | 说明 |
|------|------|
| `backend/app/billing.py` | Stripe 集成、Webhook 处理、用量统计 |
| `backend/app/middleware.py` | 套餐门控中间件 |
| `frontend/src/components/UpgradePrompt.tsx` | 升级引导组件 |
| `frontend/src/app/pricing/page.tsx` | 套餐定价页 |
| `supabase/migrations/028_subscriptions.sql` | 订阅表 + 用量表 |

---

### Phase 3：自助入驻 + 白标（2 周）

> 核心目标：公司自己注册、配置、使用，无需人工介入

#### 3.1 公开注册流程

```
公司访问 platform.malaysia-ez-rent.com
  → 点击 "免费注册"
  → 填写：公司名称、联系人、电话、邮箱、营业执照上传
  → 选择套餐（Free / Standard / Premium）
  → 支付（如果是付费套餐）
  → 自动创建：
      ├── tenant 记录
      ├── admin 用户（super_admin 角色）
      └── subscription 记录
  → 跳转到自己的后台，开始使用
```

#### 3.2 白标支持

每个租户可以自定义：

| 配置项 | 说明 |
|--------|------|
| Logo | 上传公司 Logo，替换默认品牌 |
| 主题色 | 自定义主色调（CSS 变量） |
| 公司名称 | 登录页、侧边栏显示租户自己的名字 |
| 域名（高级） | `abc-rent.malaysia-ez-rent.com` 或自定义域名 |

```sql
-- tenants 表扩展
ALTER TABLE tenants ADD COLUMN brand_color VARCHAR(7) DEFAULT '#10B981';
ALTER TABLE tenants ADD COLUMN custom_domain VARCHAR(200);
ALTER TABLE tenants ADD COLUMN welcome_message TEXT;
```

#### 3.3 平台管理后台

新增超级平台管理员角色（不在任何 tenant 内）：

```
Platform Admin Dashboard
  ├── 租户管理：查看/暂停/删除租户
  ├── 订阅管理：查看所有订阅、手动调整
  ├── 用量监控：全局 API 调用、存储使用
  ├── 审批入驻：审核新注册的租户
  └── 全局设置：默认套餐、公告、维护模式
```

#### 3.4 首次登录引导

新租户首次登录时的 setup wizard：

```
Step 1: 上传公司 Logo
Step 2: 填写公司信息（地址、联系方式）
Step 3: 添加第一个中介账号
Step 4: 录入第一套房源
Step 5: 完成！开始使用
```

---

### Phase 4：持续迭代

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 📊 数据分析面板 | P1 | 房源浏览量、转化率、收入统计 |
| 🔌 开放 API | P2 | 第三方系统接入（ERP、CRM） |
| 🌍 多语言扩展 | P2 | 马来语、日语、韩语 |
| 📱 移动端 App | P3 | React Native / Flutter |
| 🤖 AI 高级功能 | P2 | 智能定价建议、市场分析 |
| 🔔 通知系统 | P1 | 邮件、SMS、WhatsApp 通知 |
| 📄 电子合同 | P2 | 在线签署租约合同 |

---

## 💰 商业模式建议

### 收入来源

| 来源 | 说明 |
|------|------|
| 📦 订阅费 | 月付/年付套餐 |
| 💳 交易抽成 | 每笔成功缴租收取 1-2% 手续费 |
| 📢 广告位 | 首页推荐位、搜索置顶 |
| 🔌 API 费用 | 按调用量收费（第三方接入） |

### 定价参考（马来西亚市场）

| 套餐 | 月付 | 年付（8折） | 目标客户 |
|------|------|-----------|---------|
| Free | RM 0 | RM 0 | 个人房东、试用 |
| Standard | RM 99 | RM 948 | 小型中介（5-20 套房） |
| Premium | RM 299 | RM 2,870 | 中型中介（20+ 套房） |
| Enterprise | 定制 | 定制 | 大型租赁公司 |

---

## ⚠️ 关键决策点

在动手之前，先确认以下问题：

| 问题 | 为什么重要 |
|------|-----------|
| **有没有真实客户愿意付费？** | 没有付费意愿就没有 SaaS 的基础 |
| **目标客户是谁？** | 个人房东 vs 小型中介 vs 大型公司，架构差异很大 |
| **Phase 1 做不做？** | 多租户改造是半个重写，投入产出比要算清楚 |
| **用 Stripe 还是本地支付？** | 马来西亚 FPX 银行转账普及率高，Stripe FPX 支持良好 |
| **要不要保留 Mock 模式？** | SaaS 产品 Mock 模式意义不大，可以移除 |

---

## 📋 执行清单

### Phase 1 启动前

- [ ] 确认有付费客户意向
- [ ] 设计 tenants 表结构
- [ ] 列出所有需要加 `tenant_id` 的表
- [ ] 编写数据迁移脚本（历史数据归入默认租户）
- [ ] 改造 RLS 策略（逐表测试）
- [ ] 适配 Mock 模式
- [ ] 全流程回归测试

### Phase 2 启动前

- [ ] 注册 Stripe 账号（或选择其他支付）
- [ ] 设计套餐定价
- [ ] 实现 Webhook 处理
- [ ] 前端门控组件
- [ ] 用量统计逻辑

### Phase 3 启动前

- [ ] 设计公开注册页
- [ ] 实现自动创建 tenant + admin
- [ ] 白标配置存储
- [ ] 平台管理后台

---

*Malaysia Ez Rent — 从工具到平台 🇲🇾*
