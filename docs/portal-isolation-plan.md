# 租客端 / 中介端 绝对隔离实施方案

> **目标**：租客和中介是两个完全独立的系统，一个账号只能是一种角色，不存在"租客转中介"的中间状态。
>
> **状态**：📋 规划中（2026-06-06）

---

## 一、现状分析

### 当前问题

```
现状流程：
  1. 没有租客注册页，直接通过 Magic Link（邮箱链接）或 Google 登录
  2. 登录后根据 admin_users 表判断角色：有记录 → 中介端，无记录 → 租客端
  3. 中介申请页（/register-agent）不需要登录，任何人可填表提交
  4. 租客也可以从租客端侧边栏申请当中介
  5. 审批通过后需要重新登录，系统才重新检查 admin_users 表

问题：
  1. 没有正式的注册流程，租客和中介共用同一个登录入口
  2. 一个账号可能在两种角色之间切换（租客申请当中介）
  3. 审批通过后需要重新登录才能切换到中介端
  4. agentRegStatus 状态管理复杂
  5. 中介申请时不需要登录，但审批通过后需要登录，流程不连贯
```

### 当前代码结构

| 文件 | 作用 | 需要改动 |
|------|------|----------|
| `src/app/login/page.tsx` | 登录页（有租客/中介 tab） | ✅ 重构 |
| `src/lib/AuthContext.tsx` | 认证上下文（查 admin_users 表判断角色） | ✅ 重构 |
| `src/middleware.ts` | 路由守卫（检查 Supabase session） | ✅ 新增注册路由白名单 |
| `src/app/register-agent/page.tsx` | 现有中介申请页（无需登录） | ❌ 删除 |
| `src/components/AdminPanel.tsx` | 中介端（有审核中介注册功能） | ✅ 改用新表 |
| `src/app/(app)/layout.tsx` | 应用布局（侧边栏/顶栏） | ⚠️ 小改 |

### 当前角色判断逻辑

```
登录方式：
  - Magic Link：输入邮箱 → 收到登录链接 → 点击链接完成登录
  - Google OAuth：点击按钮 → Google 授权 → 自动登录
  - Mock 模式：输入邮箱 → 直接登录（模拟）

AuthContext.resolveRole():
  → 查 admin_users 表（id = user.id 或 email = user.email）
  → 有记录 → role = 'admin'（中介）→ 跳转 /admin/*
  → 无记录 → role = 'student'（租客）→ 跳转 /listings
  → 查 agent_registrations 表获取 agentRegStatus（审批状态）

中介申请流程（/register-agent）：
  → 不需要登录，任何人可填表
  → 提交后写入 agent_registrations 表
  → 管理员在 AdminPanel 审核
  → 审批通过 → 记录插入 admin_users 表
  → 用户重新登录 → AuthContext 检测到 admin_users 记录 → 角色变为 admin
```

---

## 二、目标架构

### 登录方式决策（2026-06-06 讨论确定）

| 角色 | 注册 | 登录 | Google 登录 |
|------|------|------|------------|
| 租客 | 邮箱+密码+填表+验证码 | 邮箱+密码 **或** Google | ✅ 首次需完善资料 |
| 中介 | 填表申请（无需密码） | 邮箱+密码（审批通过后） | ❌ 不提供 |

**租客 Google 登录流程**：
```
Google 授权 → Supabase 自动创建账号
  → 检查 user_metadata 是否完整
    → 不完整 → 强制跳转"完善资料"页（姓名、身份类型、IC/护照、证件照片等）→ 填完进入系统
    → 完整 → 直接进入系统
```

**中介为什么不能用 Google**：
- 中介需要提交 REN 牌照等资料，Google 登录无法收集
- 中介必须走完整申请流程，审批通过后才能登录
- 登录页只提供邮箱+密码，没有 Google 按钮

### 新流程

```
租客注册 → /register/tenant → 填表 → 发验证码 → 验证通过 → 设置密码 → 注册完成 → /listings
租客登录 → 邮箱+密码 或 Google（首次需完善资料）

中介申请 → /register/agent → 填表+邮箱验证 → 提交 → 等审批
中介登录 → 审批通过 → 用邮箱+密码登录 → /admin/*

两个独立入口，两个独立账号，互不相通。
```

### 角色存储方式

| 方案 | 说明 | 推荐 |
|------|------|------|
| **方案 A** | 角色存在 Supabase Auth 的 `user_metadata.role` | ✅ 推荐 |
| 方案 B | 角色存在 `admin_users` 表（现有方式） | ❌ 改动大 |
| 方案 C | 角色存在新的 `user_profiles` 表 | ⚠️ 多一张表 |

**推荐方案 A**：`user_metadata` 是 Supabase Auth 自带的，不需要额外建表，登录时直接读取。

---

## 三、数据库设计

### 3.0 新建表：`tenant_profiles`（租客资料表）

```sql
CREATE TABLE tenant_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  identity_type TEXT NOT NULL,  -- 'malaysian' | 'international_student' | 'international_other'
  ic_number TEXT,               -- 马来西亚本地人 IC 号码
  passport_number TEXT,         -- 国际人士护照号码
  ic_photo_front_url TEXT,      -- IC 正面照片
  ic_photo_back_url TEXT,       -- IC 反面照片
  passport_photo_url TEXT,      -- 护照照片
  student_id_photo_url TEXT,    -- 学生证照片（选填）
  work_permit_photo_url TEXT,   -- 工作牌照片（选填）
  school_name TEXT,             -- 学校名称（选填）
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.1 新建表：`agent_profiles`（中介资料表）

```sql
CREATE TABLE agent_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,  -- 审批通过后才关联
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT,
  agency_name TEXT NOT NULL,
  ren_number TEXT NOT NULL,
  ren_tag_image_url TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'pending',  -- 'pending' | 'approved' | 'rejected'
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 注意：auth_user_id 可以为 NULL（申请时未注册账号）
-- 审批通过后，用户首次登录时自动关联 auth_user_id

-- RLS: 中介只能读自己的资料，管理员可以读所有
ALTER TABLE agent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents can read own profile"
  ON agent_profiles FOR SELECT
  USING (auth.uid() = auth_user_id);

CREATE POLICY "Admins can read all profiles"
  ON agent_profiles FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));

CREATE POLICY "Admins can update profiles"
  ON agent_profiles FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
```

### 3.2 修改表：`admin_users`

现有 `admin_users` 表保持不变，用于存储管理员/中介的后台权限。

审批通过后，将中介信息插入 `admin_users` 表（和现在逻辑一致）。

### 3.3 旧表处理：`agent_registrations`

现有的 `agent_registrations` 表保留，但不再用于新的注册流程。旧数据可逐步迁移到 `agent_profiles`。

---

## 四、前端改动详情

### 4.1 新建：`/register/tenant/page.tsx`（租客注册页）

**注意**：租客不只是学生，还包括马来西亚本地人、国际人士等。

```
页面结构：
  ┌─────────────────────────────────────┐
  │  Logo + 标题                         │
  │  "创建租客账号"                       │
  ├─────────────────────────────────────┤
  │  姓名 *                              │
  │  [________________________]          │
  │                                      │
  │  邮箱 *                              │
  │  [________________________] [发送验证码]│
  │                                      │
  │  验证码 *                            │
  │  [________________________]          │
  │                                      │
  │  身份类型 *（下拉选择）                │
  │  [马来西亚本地人 / 国际学生 / 其他]    │
  │                                      │
  │  ── 马来西亚本地人 ──                 │
  │  IC 号码 *                           │
  │  [________________________]          │
  │  IC 照片 *（正反面）                  │
  │  [上传区域]                          │
  │                                      │
  │  ── 国际人士 ──                      │
  │  护照号码 *                          │
  │  [________________________]          │
  │  护照照片 *                          │
  │  [上传区域]                          │
  │                                      │
  │  ── 选填 ──                          │
  │  学校名称                            │
  │  [________________________]          │
  │  学生证照片                          │
  │  [上传区域]                          │
  │                                      │
  │  工作牌照片                          │
  │  [上传区域]                          │
  │                                      │
  │  密码 *                              │
  │  [________________________]          │
  │                                      │
  │  确认密码 *                          │
  │  [________________________]          │
  │                                      │
  │  [注册]                              │
  │                                      │
  │  ───── 或 ─────                      │
  │  [🔵 Google 注册]                    │
  │                                      │
  │  已有账号？去登录                      │
  └─────────────────────────────────────┘
```

**证件上传规则**：
| 身份类型 | 必传证件 | 选传证件 |
|----------|---------|---------|
| 马来西亚本地人 | IC 照片（正反面） | 学生证、工作牌 |
| 国际学生 | 护照照片 | 学生证 |
| 其他国际人士 | 护照照片 | 工作牌 |

**图片压缩**：使用现有 `compressImageFile` 工具（和中介 REN 照片一样的压缩逻辑）

**注册逻辑（邮箱）**：
```
1. 用户填表 + 上传证件照片
2. 点击"发送验证码" → 调用 /api/send-verification
3. 用户输入验证码
4. 点击"注册" → 调用 /api/verify-code
5. 验证通过 → 压缩并上传证件照片到 Supabase Storage
6. supabase.auth.signUp({
     email, password,
     options: { data: { role: 'student', full_name, identity_type, ic_or_passport } }
   })
7. 写入 tenant_profiles 表（证件信息、照片 URL）
8. 注册成功 → 跳转到 /listings
```

**注册逻辑（Google）**：
```
1. 用户点击 Google 注册
2. Google 授权 → Supabase 自动创建账号
3. 跳转到"完善资料"页面（补填所有必填信息 + 上传证件）
4. 填完 → 写入 tenant_profiles → 更新 user_metadata → 跳转到 /listings
```

### 4.1.1 新建：`/register/complete-profile/page.tsx`（完善资料页 - Google 新用户）

和租客注册页几乎一样，需要填写：
- 姓名（从 Google 自动获取，可修改）
- 邮箱（从 Google 自动获取，不可修改）
- 身份类型（马来西亚本地人/国际学生/其他）
- IC/护照号码 + 证件照片（根据身份类型）
- 选填：学校、学生证、工作牌

**区别**：
- 不需要邮箱验证码（Google 已验证邮箱）
- 不需要设置密码（Google 登录不需要密码）
- 此页面无法跳过，必须填完才能进入系统

### 4.2 新建：`/register/agent/page.tsx`（中介注册页）

```
页面结构：
  ┌─────────────────────────────┐
  │  Logo + 标题                 │
  │  "申请成为中介"               │
  ├─────────────────────────────┤
  │  姓名 *                     │
  │  [________________]         │
  │                             │
  │  邮箱 *                     │
  │  [________________] [发送验证码] │
  │                             │
  │  验证码 *                   │
  │  [________________]         │
  │                             │
  │  手机号 *                   │
  │  [________________]         │
  │                             │
  │  WhatsApp（选填）            │
  │  [________________]         │
  │                             │
  │  公司名称 *                 │
  │  [________________]         │
  │                             │
  │  REN 编号 *                 │
  │  [________________]         │
  │                             │
  │  REN 执照照片 *             │
  │  [上传区域]                 │
  │                             │
  │  [提交申请]                 │
  │                             │
  │  已有账号？去登录             │
  └─────────────────────────────┘
```

**注意**：中介申请时不需要设置密码。审批通过后，首次登录时才设置密码。

**注册逻辑（无需登录，无需密码）**：
```
1. 用户填表（不需要登录，任何人都可以申请）
2. 点击"发送验证码" → 调用 /api/send-verification
3. 用户输入验证码
4. 点击"提交申请" → 调用 /api/verify-code
5. 验证通过 → 写入 agent_profiles 表（status: 'pending'），暂不创建 Supabase 账号
6. 提示"申请已提交，等待审批"
```

**注意**：中介申请时不设密码、不创建账号。审批通过后的登录流程见下方"中介首次登录逻辑"。

### 4.3 新建：`/api/send-verification/route.ts`

```typescript
// 功能：生成 6 位验证码，存入 Supabase 表，通过 Resend 发送邮件
// 输入：{ email: string }
// 输出：{ success: boolean }

流程：
  1. 生成 6 位随机码
  2. 存入 email_verifications 表（带 5 分钟过期时间）
  3. 调用 Resend API 发送邮件
  4. 返回成功
```

### 4.4 新建：`/api/verify-code/route.ts`

```typescript
// 功能：校验验证码
// 输入：{ email: string, code: string }
// 输出：{ valid: boolean }

流程：
  1. 查询 email_verifications 表
  2. 检查验证码是否匹配 + 未过期 + 未使用
  3. 标记为已使用
  4. 返回验证结果
```

### 4.5 新建 Supabase 表：`email_verifications`

```sql
CREATE TABLE email_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 自动清理过期记录（可选，用 Supabase Cron 或定时任务）
```

### 4.6 修改：`login/page.tsx`

**改动**：
- 保留现有的租客/中介 tab 结构（`roleView`），但修改每个 tab 的内容
- **租客 tab**：邮箱+密码表单 + Google 登录按钮 + "还没有账号？注册"链接
- **中介 tab**：只有邮箱+密码表单 + "还没有账号？申请入驻"链接（无 Google 按钮）
- 去掉现有的 Magic Link 登录方式，改为邮箱+密码

**租客登录流程**：
```
邮箱+密码 → supabase.auth.signInWithPassword → 成功 → 检查 role → /listings
Google → supabase.auth.signInWithOAuth → 成功 → 检查 user_metadata →
  → 有 role → /listings
  → 无 role → /register/complete-profile（完善资料）
```

**中介登录流程**：
```
邮箱+密码 → supabase.auth.signInWithPassword → 成功 → 检查 agent_profiles →
  → approved → 查 admin_users → /admin/*
  → pending → 提示"审批中"
  → rejected → 提示"申请未通过"
  → 不存在 → 提示"请先申请入驻"
```

**中介首次登录逻辑（审批通过后）**：
```
1. 中介去登录页，输入邮箱，点击"登录"
2. 系统检测：邮箱在 agent_profiles 表且 status = 'approved'
3. 但该邮箱没有 Supabase 账号（申请时未创建）
4. 跳转到"设置密码"页面：
   ┌─────────────────────────────┐
   │  "您的申请已通过！"          │
   │  "请设置密码以激活账号"      │
   ├─────────────────────────────┤
   │  密码 *                     │
   │  [________________]         │
   │  确认密码 *                 │
   │  [________________]         │
   │  [激活账号并登录]            │
   └─────────────────────────────┘
5. 设置密码 → supabase.auth.signUp() 创建账号
6. 写入 admin_users 表（权限）
7. 关联 agent_profiles.auth_user_id
8. 自动登录 → 跳转到 /admin/*
```

**已有账号的中介**：直接输入邮箱+密码登录 → 跳转到 /admin/*

### 4.7 修改：`AuthContext.tsx`

**改动**：
```typescript
// 现在：查 admin_users 表判断角色
// 改为：查 user_metadata.role 判断角色

const resolveRole = async (user) => {
  const role = user.user_metadata?.role;  // 'student' | 'agent'

  if (role === 'agent') {
    // 查 agent_profiles 表获取审批状态
    const { data } = await supabase
      .from('agent_profiles')
      .select('verification_status')
      .eq('auth_user_id', user.id)
      .single();

    if (data?.verification_status === 'approved') {
      // 查 admin_users 获取权限级别
      setRoleState('admin');
    } else {
      // 审批中或被拒绝，显示对应提示
      setRoleState('agent_pending');  // 新增状态
      setAgentRegStatus(data?.verification_status);
    }
  } else {
    // 租客
    setRoleState('student');
  }
};
```

**新增角色状态**：
| 状态 | 含义 | 跳转 |
|------|------|------|
| `null` | 未登录 | /guest |
| `'student'` | 租客 | /listings |
| `'admin'` | 中介（已审批，已有账号） | /admin/* |

**中介审批流程**：
1. 中介在 `/register/agent` 提交申请（无需登录，无需账号）
2. 申请存入 `agent_profiles` 表（`auth_user_id = NULL`）
3. 管理员审批通过
4. 中介去 `/login` 登录 → 系统检测到该邮箱已审批通过但无账号 → 引导设置密码 → 创建 Supabase 账号 → 自动关联 `auth_user_id` → 跳转到 /admin/*

### 4.8 修改：`middleware.ts`

**改动**：
- 注册路由加入白名单：`/register/tenant`、`/register/agent`、`/register/complete-profile`、`/register/set-password`
- `/api/*` 路由放行（API 不需要认证）
- 中介登录后检测 agent_profiles 状态，未审批的不能进入 /admin/*

### 4.9 删除：`register-agent/page.tsx`

现有的中介申请页删除，由新的 `/register/agent/page.tsx` 替代。

### 4.10 修改：`AdminPanel.tsx`

**改动**：
- 中介审核功能改为读取 `agent_profiles` 表
- 审批通过后：将中介信息插入 `admin_users` 表（和现在逻辑一致）

---

## 五、新增文件清单

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| `src/app/register/tenant/page.tsx` | 新建 | 租客注册页（含证件上传） |
| `src/app/register/agent/page.tsx` | 新建 | 中介注册页（无需密码） |
| `src/app/register/complete-profile/page.tsx` | 新建 | Google 新用户完善资料页 |
| `src/app/register/set-password/page.tsx` | 新建 | 中介审批通过后设置密码页 |
| `src/app/register/layout.tsx` | 新建 | 注册页布局（共享样式） |
| `src/app/api/send-verification/route.ts` | 新建 | 发送验证码 API |
| `src/app/api/verify-code/route.ts` | 新建 | 校验验证码 API |
| `src/components/VerificationInput.tsx` | 新建 | 6 位验证码输入组件 |
| Supabase SQL | 新建 | tenant_profiles 表 |
| Supabase SQL | 新建 | agent_profiles 表 |
| Supabase SQL | 新建 | email_verifications 表 |
| `docs/portal-isolation-plan.md` | 已有 | 本文档 |

---

## 六、修改文件清单

| 文件路径 | 改动 |
|----------|------|
| `src/app/login/page.tsx` | 去掉角色 tab，加注册链接 |
| `src/lib/AuthContext.tsx` | 角色判断改为查 user_metadata |
| `src/middleware.ts` | 注册路由加入白名单 |
| `src/components/AdminPanel.tsx` | 审核功能改用 agent_profiles 表 |
| `src/app/register-agent/page.tsx` | 删除（被新页面替代） |

---

## 七、费用

| 项目 | 费用 |
|------|------|
| Supabase Auth | ✅ 免费（50,000 活跃用户/月） |
| Supabase 数据库 | ✅ 免费（500MB） |
| Resend 邮件 | ✅ 免费（3,000 封/月） |
| 代码改动 | ✅ 免费 |

**总费用：$0**

---

## 八、预计工作量

| 阶段 | 内容 | 时间 |
|------|------|------|
| 1 | 建表（tenant_profiles + agent_profiles + email_verifications） | 0.5h |
| 2 | 邮箱验证码 API（send + verify） | 2h |
| 3 | 租客注册页（含证件上传+图片压缩） | 3h |
| 4 | Google 完善资料页 | 1.5h |
| 5 | 中介注册页 | 2h |
| 6 | AuthContext 重构 | 2h |
| 7 | 登录页改造（学生/中介 tab + 密码登录） | 1.5h |
| 8 | AdminPanel 审核适配 | 1h |
| 9 | 中间件 + 路由守卫 | 0.5h |
| 10 | 测试 + 修 bug | 3h |
| **总计** | | **~17h（2-3天）** |

---

## 九、风险与注意事项

### 9.1 向后兼容

- 现有已注册用户（通过 Supabase Magic Link 登录的）需要迁移
- 建议：给现有用户的 `user_metadata` 补充 `role: 'student'` 字段（保持租客身份）
- 现有 `admin_users` 表中的中介账号需要补充 `agent_profiles` 记录

### 9.2 Mock 模式

- Mock 模式下邮箱验证码用 localStorage 模拟
- 注册信息存入 localStorage 对应 key

### 9.3 邮箱唯一性

- 一个邮箱只能注册一个角色（学生 OR 中介）
- 注册时检查邮箱是否已存在于 Supabase Auth

### 9.4 密码安全

- 密码最少 8 位，包含大小写字母和数字
- 使用 Supabase Auth 的密码策略

---

## 十、测试清单

### 租客注册
- [ ] 马来西亚本地人注册（IC 号码 + IC 正反面照片）→ 成功
- [ ] 国际学生注册（护照号码 + 护照照片）→ 成功
- [ ] 其他国际人士注册（护照号码 + 护照照片 + 工作牌）→ 成功
- [ ] 选填项（学校、学生证、工作牌）不填也能注册
- [ ] 图片压缩正常（大图片被压缩后上传）
- [ ] 邮箱验证码发送 → 输入正确 → 通过
- [ ] 邮箱验证码过期（5分钟）→ 输入后提示过期
- [ ] 邮箱验证码错误 → 提示错误

### Google 注册
- [ ] Google 注册 → 首次登录 → 跳转到完善资料页
- [ ] 完善资料页：姓名自动获取、邮箱不可修改
- [ ] 填完证件信息 → 提交 → 进入系统
- [ ] Google 登录（已有完整资料）→ 直接进入系统

### 中介申请
- [ ] 中介申请（无需登录）→ 邮箱验证码 → 提交成功
- [ ] 中介申请不需要设置密码
- [ ] 同一邮箱不能重复申请

### 中介审批与登录
- [ ] 中介审批通过 → 用邮箱登录 → 引导设置密码 → 进入中介端
- [ ] 中介审批拒绝 → 登录 → 显示拒绝提示
- [ ] 中介审批中 → 登录 → 显示审批中提示
- [ ] 未申请过的邮箱 → 登录 → 提示"请先申请入驻"

### 路由隔离
- [ ] 未登录用户不能访问 /listings 和 /admin/*
- [ ] 学生不能访问 /admin/*
- [ ] 中介不能访问 /listings
- [ ] Guest 页面不受影响

### 其他
- [ ] 同一邮箱不能同时注册学生和中介
- [ ] Mock 模式下所有流程正常
- [ ] 密码强度校验（8位+大小写+数字）

---

*文档版本：v1.0 · 2026-06-06*
