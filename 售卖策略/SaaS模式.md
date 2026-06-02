# SaaS 运营模式

## 什么是 SaaS？

**Software as a Service（软件即服务）**
- 用户按月/年付费使用软件
- 不需要自己部署和维护
- 持续更新，用户自动享受新功能

## 您的系统适合做 SaaS 吗？

### ✅ 适合的原因

| 特点 | 说明 |
|------|------|
| 多租户架构 | 中介数据隔离（agent_id） |
| 已有权限系统 | 三种角色权限完善 |
| 云端部署 | Vercel + Render，自动扩展 |
| 持续付费场景 | 中介每月都需要管理房源 |

### ⚠️ 需要改进的地方

| 问题 | 解决方案 |
|------|---------|
| 数据库单实例 | 不同公司需要数据隔离 |
| 计费系统 | 需要接入支付网关 |
| 用户管理 | 需要后台管理订阅 |

---

## SaaS 架构设计

### 方案 A：共享数据库（推荐起步）

```
Supabase 项目
    │
    ├── 所有中介的数据
    │   ├── agent_id = 'agent_001'（公司A）
    │   ├── agent_id = 'agent_002'（公司B）
    │   └── agent_id = 'agent_003'（公司C）
    │
    └── 通过 RLS 隔离
```

**优点：**
- 部署简单，成本低
- 易于维护和更新

**缺点：**
- 数据混在一起（但已隔离）
- 一个公司数据泄露可能影响其他公司

**适合：** 初创阶段，用户量 < 1000

---

### 方案 B：独立数据库（成熟期）

```
Supabase 项目 A（公司A）
Supabase 项目 B（公司B）
Supabase 项目 C（公司C）
    │
    └── 共享同一套代码
```

**优点：**
- 完全数据隔离
- 安全性高

**缺点：**
- 运维复杂
- 成本高（每个项目单独付费）

**适合：** 企业客户，数据安全要求高

---

## SaaS 核心功能清单

### 必须实现

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 订阅管理 | P0 | 中介付费、续费、取消 |
| 使用量统计 | P0 | 房源数量、API调用 |
| 多租户隔离 | P0 | 不同公司数据隔离 |
| 计费系统 | P0 | 自动生成账单 |
| 支付网关 | P0 | Stripe / PayPal / 支付宝 |

### 建议实现

| 功能 | 优先级 | 说明 |
|------|--------|------|
| 白标定制 | P1 | 公司Logo、域名 |
| API接口 | P1 | 供第三方系统对接 |
| 数据导出 | P1 | 中介可导出自己的数据 |
| 客服系统 | P2 | 工单、在线客服 |

---

## SaaS 定价策略

### 基础版（免费）
- 3个房源
- 基础功能
- 邮件支持

### 专业版（RM 199/月）
- 20个房源
- 数据分析
- 优先客服
- API接口

### 企业版（RM 599/月）
- 无限房源
- 白标定制
- 专属客服
- SLA保障

### 年付优惠
- 专业版年付：RM 1,990（省 RM 398）
- 企业版年付：RM 5,990（省 RM 1,198）

---

## 技术实现

### 订阅状态管理

```sql
-- 在 admin_users 表添加字段
ALTER TABLE admin_users ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free';
ALTER TABLE admin_units ADD COLUMN subscription_expires_at TIMESTAMPTZ;
```

### 使用量限制

```sql
-- 检查房源数量限制
CREATE OR REPLACE FUNCTION check_unit_limit()
RETURNS TRIGGER AS $$
DECLARE
    tier VARCHAR(20);
    current_count INTEGER;
    max_count INTEGER;
BEGIN
    SELECT subscription_tier INTO tier
    FROM admin_users WHERE id = NEW.agent_id;

    max_count := CASE tier
        WHEN 'free' THEN 3
        WHEN 'pro' THEN 20
        WHEN 'enterprise' THEN 999999
    END;

    SELECT COUNT(*) INTO current_count
    FROM units WHERE agent_id = NEW.agent_id;

    IF current_count >= max_count THEN
        RAISE EXCEPTION '房源数量已达上限，请升级套餐';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 自动过期处理

```sql
-- 每天检查订阅是否过期
CREATE OR REPLACE FUNCTION check_expired_subscriptions()
RETURNS void AS $$
BEGIN
    UPDATE admin_users
    SET subscription_tier = 'free'
    WHERE subscription_expires_at < NOW()
    AND subscription_tier != 'free';
END;
$$ LANGUAGE plpgsql;
```

---

## 运营指标（KPI）

| 指标 | 目标 | 说明 |
|------|------|------|
| MRR | RM 50,000+ | 月度经常性收入 |
| 客户留存率 | > 85% | 中介续约率 |
| ARPU | RM 300+ | 每付费用户平均收入 |
| 客户获取成本 | < RM 500 | CAC |
| 客户生命周期价值 | > RM 3,600 | LTV |
| LTV/CAC | > 7 | 投资回报比 |
