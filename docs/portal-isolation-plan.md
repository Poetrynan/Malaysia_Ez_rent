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

### 3.0 扩展现有表：`users`（租客证件资料）

**不需要新建 `tenant_profiles` 表**，直接在现有 `users` 表上新增字段：

```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS identity_type VARCHAR(30)
  CHECK (identity_type IN ('malaysian', 'international_student', 'international_other'));

ALTER TABLE users ADD COLUMN IF NOT EXISTS ic_photo_front_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS ic_photo_back_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS passport_photo_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS work_permit_photo_url TEXT;
```

**现有 `users` 表已有字段**（可直接复用）：
- `passport_number` → 护照号码
- `local_id_number` → IC 号码
- `school` → 学校名称
- `student_card_url` → 学生证照片
- `document_url` → 通用证件照片

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
页面结构（分步）：

第一步：选择身份
  ┌─────────────────────────────────────┐
  │  Logo + 标题                         │
  │  "创建租客账号"                       │
  ├─────────────────────────────────────┤
  │  🔒 敏感信息说明                      │
  │  ...                                 │
  ├─────────────────────────────────────┤
  │  请选择您的身份：                      │
  │                                      │
  │  ┌─────────────────────────────┐    │
  │  │ 🇲🇾 马来西亚本地人            │    │
  │  │    需要 IC 号码和 IC 照片     │    │
  │  └─────────────────────────────┘    │
  │  ┌─────────────────────────────┐    │
  │  │ 🌍 国际学生                  │    │
  │  │    需要护照号码和护照照片     │    │
  │  └─────────────────────────────┘    │
  │  ┌─────────────────────────────┐    │
  │  │ 🌐 其他国际人士              │    │
  │  │    需要护照号码和护照照片     │    │
  │  └─────────────────────────────┘    │
  └─────────────────────────────────────┘

第二步：填写信息（根据选择动态显示）

── 马来西亚本地人 ──
  ┌─────────────────────────────────────┐
  │  姓名 *                              │
  │  [________________________]          │
  │                                      │
  │  邮箱 *                              │
  │  [________________________] [发送验证码]│
  │                                      │
  │  验证码 *                            │
  │  [________________________]          │
  │                                      │
  │  IC 号码 *                           │
  │  [________________________]          │
  │                                      │
  │  IC 正面照片 *                       │
  │  [上传区域]                          │
  │                                      │
  │  IC 反面照片 *                       │
  │  [上传区域]                          │
  │                                      │
  │  ── 选填 ──                          │
  │  学校名称                            │
  │  [________________________]          │
  │  学生证照片                          │
  │  [上传区域]                          │
  │  工作牌照片                          │
  │  [上传区域]                          │
  │                                      │
  │  密码 *                              │
  │  [________________________]          │
  │  确认密码 *                          │
  │  [________________________]          │
  │                                      │
  │  [注册]                              │
  │  ───── 或 ─────                      │
  │  [🔵 Google 注册]                    │
  │  已有账号？去登录                      │
  └─────────────────────────────────────┘

── 国际学生 / 其他国际人士 ──
  ┌─────────────────────────────────────┐
  │  姓名 *                              │
  │  [________________________]          │
  │                                      │
  │  邮箱 *                              │
  │  [________________________] [发送验证码]│
  │                                      │
  │  验证码 *                            │
  │  [________________________]          │
  │                                      │
  │  护照号码 *                          │
  │  [________________________]          │
  │                                      │
  │  护照照片 *                          │
  │  [上传区域]                          │
  │                                      │
  │  ── 选填 ──                          │
  │  学校名称（国际学生）                  │
  │  [________________________]          │
  │  学生证照片（国际学生）                │
  │  [上传区域]                          │
  │  工作牌照片（其他国际人士）            │
  │  [上传区域]                          │
  │                                      │
  │  密码 *                              │
  │  [________________________]          │
  │  确认密码 *                          │
  │  [________________________]          │
  │                                      │
  │  [注册]                              │
  │  ───── 或 ─────                      │
  │  [🔵 Google 注册]                    │
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

**敏感信息说明（注册页顶部展示）**：
```
┌─────────────────────────────────────────────────┐
│  🔒 为什么需要这些信息？                          │
│                                                  │
│  为了保障您的租房安全和合法权益，我们需要验证      │
│  您的身份信息。根据马来西亚相关法律法规，租赁      │
│  平台有义务核实租户身份。您的证件信息将：          │
│                                                  │
│  ✅ 仅用于身份验证，不会公开显示                   │
│  ✅ 加密存储，严格保护隐私                        │
│  ✅ 仅在您表达租房意向时，由中介审核查看           │
│                                                  │
│  我们承诺不会将您的信息用于任何其他用途。          │
└─────────────────────────────────────────────────┘
```

**现有用户补填逻辑**：
- 现有用户登录后，检查 `users` 表的 `identity_type` 是否为空
- 如果为空 → 弹出模态框："为了您的租房安全和平台合规，请补填身份信息"
- 模态框无法关闭（必须填写），但可以选择"稍后提醒"（最多 3 次）
- 补填完成后不再弹出

**注册逻辑（邮箱）**：
```
1. 用户填表 + 上传证件照片
2. 点击"发送验证码" → 调用 /api/send-verification
3. 用户输入验证码
4. 点击"注册" → 调用 /api/verify-code
5. 验证通过 → 压缩并上传证件照片到 Supabase Storage
6. supabase.auth.signUp({
     email, password,
     options: { data: { role: 'student', full_name, identity_type } }
   })
7. 触发器自动创建 public.users 记录
8. 更新 users 表：填入证件信息、照片 URL（identity_type, local_id_number/passport_number, ic_photo_front_url 等）
9. 注册成功 → 跳转到 /listings
```

**注册逻辑（Google）**：
```
1. 用户点击 Google 注册
2. Google 授权 → Supabase 自动创建账号 → 触发器自动创建 public.users 记录
3. 跳转到"完善资料"页面（补填所有必填信息 + 上传证件）
4. 填完 → 更新 users 表（证件信息、照片 URL）→ 更新 user_metadata → 跳转到 /listings
```

**已注册但未完整填写的用户**：
```
场景：
  - 旧系统用户（迁移前注册，没有证件信息）
  - Google 注册后跳过了完善资料（理论上不允许，但以防万一）
  - 邮箱注册后未上传证件

处理：
  1. 用户登录 → AuthContext 检查 users.identity_type 是否为空
  2. 为空 → 弹出 IdentityPromptModal（补填弹窗）
  3. 用户点击"立即填写" → 跳转到补填页面（类似 complete-profile）
  4. 填完 → 更新 users 表 → 不再弹出
  5. 点击"稍后提醒" → 关闭弹窗，记录次数（最多 3 次）
```

### 4.1.1 新建：`/register/complete-profile/page.tsx`（完善资料页 - Google 新用户）

和租客注册页的第二步一样（分步选择身份），顶部显示敏感信息说明。

**区别**：
- 姓名从 Google 自动获取（可修改）
- 邮箱从 Google 自动获取（不可修改）
- 不需要邮箱验证码（Google 已验证邮箱）
- 不需要设置密码（Google 登录不需要密码）
- 此页面无法跳过，必须填完才能进入系统

**页面流程**：
```
第一步：选择身份（马来西亚本地人 / 国际学生 / 其他）
第二步：填写对应信息 + 上传证件 → 提交 → 进入系统
```

### 4.1.2 新建组件：`IdentityPromptModal`（现有用户补填弹窗）

```
触发条件：用户登录后，users.identity_type 为空
弹窗内容：
  ┌─────────────────────────────────────────────────┐
  │  🔒 请补填身份信息                                │
  │                                                  │
  │  为了您的租房安全和平台合规，我们需要验证您的      │
  │  身份信息。根据马来西亚相关法律法规，租赁平台      │
  │  有义务核实租户身份。                              │
  │                                                  │
  │  [立即填写]  [稍后提醒（剩余 3 次）]              │
  └─────────────────────────────────────────────────┘

行为：
- 点击"立即填写" → 跳转到补填页面（类似 complete-profile）
- 点击"稍后提醒" → 关闭弹窗，记录次数到 localStorage
- 超过 3 次 → "稍后提醒"按钮消失，只能"立即填写"
- 补填完成后 → 不再弹出
```

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

**注册逻辑（无需登录，需设密码）**：
```
1. 用户填表 + 设置密码（不需要登录，任何人都可以申请）
2. 点击"发送验证码" → 调用 /api/send-verification
3. 用户输入验证码
4. 点击"提交申请" → 调用 /api/verify-code
5. 验证通过 → supabase.auth.signUp() 创建账号（无权限）
6. 写入 agent_profiles 表（status: 'pending'）
7. 提示"申请已提交，等待审批"
```

**注意**：中介申请时就创建账号，但没有权限。审批通过后获得权限，直接登录。

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

**中介登录逻辑**：
```
邮箱+密码 → supabase.auth.signInWithPassword → 成功 → 检查 agent_profiles →
  → approved → 查 admin_users → /admin/*
  → pending → 提示"您的申请正在审核中"
  → rejected → 提示"该账号不存在或申请未通过"
  → 不存在 → 提示"该账号不存在或申请未通过"
```

**注意**：审批通过后，管理员在 AdminPanel 将中介信息插入 `admin_users` 表。中介再次登录时，AuthContext 检测到 `admin_users` 记录，直接进入中介端。

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
- 注册路由加入白名单：`/register/tenant`、`/register/agent`、`/register/complete-profile`
- `/api/*` 路由放行（API 不需要认证）
- 中介登录后检测 agent_profiles 状态，未审批的不能进入 /admin/*

### 4.9 删除：`register-agent/page.tsx`

现有的中介申请页删除，由新的 `/register/agent/page.tsx` 替代。

**同时删除以下站内消息功能**（改用邮件通知）：
- `register-agent/page.tsx` 中的 Supabase Realtime 订阅（监听审批状态变化）
- `register-agent/page.tsx` 中的 `realtimeBanner` 状态和 UI
- AdminPanel 中审批通过/拒绝时发送站内通知的逻辑（`ez_user_notifications`）
- 侧边栏中的中介审批状态提醒（`agentRegStatus` 相关的 banner）

### 4.10 修改：`AdminPanel.tsx`

**改动**：
- 中介审核功能改为读取 `agent_profiles` 表
- 审批通过后：
  1. 将中介信息插入 `admin_users` 表
  2. 调用 `/api/send-approval-email` 发送审批通过通知邮件
- 审批拒绝后：
  1. 调用 `/api/send-rejection-email` 发送审批拒绝通知邮件

### 4.11 新建：`/api/send-approval-email/route.ts`

```
功能：审批通过后通知中介
输入：{ email: string, full_name: string }
邮件内容：
  标题：您的中介申请已通过 - Malaysia Ez Rent
  正文：
    {full_name}，您好！
    您的中介申请已通过审核。
    现在可以使用邮箱和密码登录中介管理后台：{login_url}
```

### 4.12 新建：`/api/send-rejection-email/route.ts`

```
功能：审批拒绝后通知中介
输入：{ email: string, full_name: string }
邮件内容：
  标题：中介申请审核结果 - Malaysia Ez Rent
  正文：
    {full_name}，您好！
    很抱歉，您的中介申请未通过审核。
    如有疑问请联系管理员。
```

---

## 五、完整改动清单

### 5.1 新建文件

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| `src/app/register/tenant/page.tsx` | 新建 | 租客注册页（含证件上传+图片压缩） |
| `src/app/register/agent/page.tsx` | 新建 | 中介注册页（填表+设密码+REN照片） |
| `src/app/register/complete-profile/page.tsx` | 新建 | Google 新用户完善资料页（补填证件） |
| `src/app/register/layout.tsx` | 新建 | 注册页布局（共享样式） |
| `src/app/api/send-verification/route.ts` | 新建 | 发送邮箱验证码 API（Resend） |
| `src/app/api/verify-code/route.ts` | 新建 | 校验验证码 API |
| `src/app/api/send-approval-email/route.ts` | 新建 | 审批通过通知邮件 API（Resend） |
| `src/app/api/send-rejection-email/route.ts` | 新建 | 审批拒绝通知邮件 API（Resend） |
| `src/components/VerificationInput.tsx` | 新建 | 6 位验证码输入组件 |
| `src/components/IdentityPromptModal.tsx` | 新建 | 现有用户补填身份信息弹窗 |

### 5.2 Supabase 表处理

**新建表**：

| 表名 | 说明 | 关联 |
|------|------|------|
| `agent_profiles` | 中介申请资料 | `auth_user_id → auth.users.id`（可 NULL） |
| `email_verifications` | 邮箱验证码 | 无外键，按 email 查询 |

**删除的表**：
无。`agent_registrations` 保留但不再使用。

**扩展现有表**：

| 表名 | 新增字段 | 说明 |
|------|---------|------|
| `users` | `identity_type` | 身份类型（malaysian/international_student/international_other） |
| `users` | `ic_photo_front_url` | IC 正面照片 URL |
| `users` | `ic_photo_back_url` | IC 反面照片 URL |
| `users` | `passport_photo_url` | 护照照片 URL |
| `users` | `work_permit_photo_url` | 工作牌照片 URL（选填） |

**不需要新建 `tenant_profiles` 表**：`users` 表已有 `passport_number`、`local_id_number`、`school`、`company`、`student_card_url`、`document_url` 等字段，直接复用。

### 5.2.1 现有表结构参考

**`users` 表**（已有证件相关字段）：
```
id UUID (关联 auth.users.id)
phone VARCHAR UNIQUE
full_name VARCHAR
avatar_url TEXT
email VARCHAR
passport_number VARCHAR        -- ✅ 已有
school VARCHAR                 -- ✅ 已有
company VARCHAR                -- ✅ 已有
local_id_number VARCHAR        -- ✅ 已有（IC 号码）
document_url TEXT              -- ✅ 已有
student_card_url TEXT          -- ✅ 已有
created_at TIMESTAMPTZ
unit_number VARCHAR

需要新增：
identity_type VARCHAR         -- 'malaysian' | 'international_student' | 'international_other'
ic_photo_front_url TEXT       -- IC 正面照片
ic_photo_back_url TEXT        -- IC 反面照片
passport_photo_url TEXT       -- 护照照片
work_permit_photo_url TEXT    -- 工作牌照片（选填）
```

**`admin_users` 表**：
```
id UUID (关联 auth.users.id)
email VARCHAR NOT NULL UNIQUE
role VARCHAR DEFAULT 'editor' (CHECK: super_admin/editor)
display_name VARCHAR
phone VARCHAR
whatsapp VARCHAR
wechat_id VARCHAR
avatar_url TEXT
job_title VARCHAR DEFAULT 'Real Estate Negotiator'
agency_name VARCHAR DEFAULT 'Malaysia Ez Rent'
agency_license VARCHAR
agency_address TEXT
bio TEXT
experience_years INTEGER DEFAULT 0
experience_months INTEGER DEFAULT 0
area_expertise ARRAY
property_types ARRAY
facebook_url TEXT
website_url TEXT
ren_number VARCHAR             -- ✅ 已有
ren_tag_url TEXT               -- ✅ 已有
payment_qr_code TEXT
created_at TIMESTAMPTZ
```

**`agent_registrations` 表**（将被 `agent_profiles` 替代）：
```
id UUID
auth_user_id UUID (可 NULL)
email VARCHAR NOT NULL DEFAULT ''
full_name VARCHAR NOT NULL
phone VARCHAR NOT NULL (约束: ^601[0-9]{8,9}$)
whatsapp VARCHAR (约束: ^601[0-9]{8,9}$)
agency_name VARCHAR NOT NULL
ren_number VARCHAR NOT NULL (约束: ^REN[0-9]{4,7}$)
ren_tag_image_url TEXT NOT NULL
verification_status VARCHAR DEFAULT 'pending' (CHECK: pending/approved/rejected/suspended/banned)
rejection_reason TEXT
metadata JSONB
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
reviewed_at TIMESTAMPTZ
reviewed_by UUID
```

**`user_notifications` 表**：
```
id UUID
user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
title TEXT NOT NULL
content TEXT NOT NULL
type VARCHAR DEFAULT 'system' (CHECK: system/announcement/update/bonus/agent_status)
is_read BOOLEAN DEFAULT false
created_at TIMESTAMPTZ
```

**重要触发器**（迁移 036）：
```sql
-- 当新用户通过 Supabase Auth 注册时自动触发：
-- 1. 创建 public.users 记录
-- 2. 如果 email 在 admin_users 中存在，自动关联 auth_user_id
-- 3. 如果关联成功，自动插入 user_notifications（type='agent_status'）
-- ⚠️ 这个触发器在新系统中需要修改：
--    - 删除插入 user_notifications 的逻辑（改用邮件通知）
--    - 保留创建 public.users 和关联 admin_users 的逻辑
```

### 5.3 新建 Supabase Storage 路径

| 路径 | 说明 |
|------|------|
| `tenant-docs/ic/{user_id}-front.jpg` | 租客 IC 正面照片 |
| `tenant-docs/ic/{user_id}-back.jpg` | 租客 IC 反面照片 |
| `tenant-docs/passport/{user_id}.jpg` | 租客护照照片 |
| `tenant-docs/student-id/{user_id}.jpg` | 租客学生证照片（选填） |
| `tenant-docs/work-permit/{user_id}.jpg` | 租客工作牌照片（选填） |

### 5.4 新建 Resend 邮件模板（环境变量配置，Render）

| 环境变量 | 说明 |
|----------|------|
| `RESEND_API_KEY` | Resend API Key |
| `RESEND_FROM_EMAIL` | 发件人邮箱（如 `noreply@ezrent.my`） |

### 5.5 修改文件详情

#### `src/lib/AuthContext.tsx`

**改动**：
- 接口新增 `agentPending: boolean` 状态（替代 `agentRegStatus`）
- `resolveRole()` 改为：
  1. 读取 `user.user_metadata.role`（`'student'` | `'agent'`）
  2. 如果 `role === 'agent'`：查 `agent_profiles` 表的 `verification_status`
     - `approved` → 查 `admin_users` 获取权限 → `setRoleState('admin')`
     - `pending` → `setRoleState(null)`, `setAgentPending(true)`
     - `rejected` → `setRoleState(null)`, 显示拒绝提示
  3. 如果 `role === 'student'`：`setRoleState('student')`
  4. 如果没有 role（Google 新用户）：`setRoleState(null)`, 重定向到 `/register/complete-profile`
- 删除 `agentRegStatus` 相关逻辑
- Mock 模式同步更新

#### `src/app/login/page.tsx`

**改动**：
- 保留 `roleView` 结构（`'choose'` / `'student'` / `'agent'`）
- **student tab**：
  - 改为邮箱+密码表单（替代 Magic Link）
  - 保留 Google 登录按钮
  - 底部加"还没有账号？注册" → `/register/tenant`
- **agent tab**：
  - 只有邮箱+密码表单
  - 去掉 Google 登录按钮
  - 底部加"还没有账号？申请入驻" → `/register/agent`
- Mock 模式保留现有逻辑

#### `src/middleware.ts`

**改动**：
- 白名单新增：`/register/tenant`、`/register/agent`、`/register/complete-profile`
- 其余不变

#### `src/components/AdminPanel.tsx`

**改动**：
- `fetchAgentRegistrations()`：改读 `agent_profiles` 表（替代 `agent_registrations`）
- `commitApproveAgentRegistration()`：
  - 保留插入 `admin_users` 逻辑
  - 删除插入 `user_notifications` 逻辑（改用邮件）
  - 新增调用 `/api/send-approval-email` 发送通知邮件
  - 更新 `agent_profiles.verification_status = 'approved'`（替代删除记录）
- `commitRejectAgentRegistration()`：
  - 更新 `agent_profiles.verification_status = 'rejected'`
  - 删除插入 `user_notifications` 逻辑
  - 新增调用 `/api/send-rejection-email` 发送通知邮件
- `deleteAgentRegistration()`：改删 `agent_profiles` 记录
- 删除现有的 Realtime 订阅相关代码
- **新增"手动添加中介"功能**：完整表单（邮箱、姓名、手机号、公司、REN 编号、REN 照片上传），创建 Auth 用户 + admin_users + agent_profiles 记录，发邮件通知

#### `src/components/AppSidebar.tsx`

**改动**：
- 删除 `agentRegStatus` 相关代码（第 13 行解构，第 182-197 行 banner）
- 侧边栏不再显示审批状态（改用邮件通知）

#### `src/app/(app)/layout.tsx`

**改动**：
- 删除 `agentRegStatus === 'pending'` 滚动横幅（第 38-61 行）
- 删除 `agentRegStatus === 'approved'` 成功横幅（第 63-83 行）
- 删除 `agentRegStatus === 'rejected'` 错误横幅（第 84-104 行）
- 删除 `agentRegStatus` 从 `useAuth()` 解构

#### `src/app/register-agent/page.tsx`

**删除**：被 `src/app/register/agent/page.tsx` 替代

#### `src/app/auth/callback/route.ts`

**改动**：
- OAuth 回调后，检查 `user.user_metadata.role` 是否存在
- 如果没有 role（Google 新用户）→ 重定向到 `/register/complete-profile`（替代 `/listings`）
- 如果有 role → 保持现有逻辑重定向到 `/listings`

#### `src/app/actions/deleteAccount.ts`

**改动**：
- 删除从 `agent_registrations` 表删除的逻辑
- 新增从 `tenant_profiles` 表删除的逻辑
- 新增从 `agent_profiles` 表删除的逻辑

#### `src/lib/supabase.ts`（Mock 模式）

**改动**：
- Mock localStorage keys 新增：`ez_tenant_profiles`、`ez_agent_profiles`、`ez_email_verifications`
- 删除：`ez_agent_registrations`（被 `ez_agent_profiles` 替代）
- Mock auth 新增：`signUp` 方法（支持邮箱+密码注册）

#### Supabase 触发器 `on_auth_user_created`（迁移 036）

**改动**：
- 删除自动插入 `user_notifications`（agent_status）的逻辑（改用邮件通知）
- 保留自动创建 `public.users` 记录的逻辑
- 保留自动关联 `admin_users` 的逻辑（审批通过后，中介首次登录时自动关联）
- 新增：如果 `user_metadata.role = 'student'`，自动创建 `tenant_profiles` 记录（可选）

#### `src/utils/compressImage.ts`

**无需修改**：现有 `REN_TAG_PRESET` 可复用，新增证件照片压缩预设（如需要）

#### `src/components/Inbox.tsx`

**改动**：
- 如果引用了 `agent_registrations` 相关的通知类型，需要更新或删除

#### `src/lib/PendingCountsContext.tsx`

**改动**：
- `agentReviews` 计数逻辑改为查 `agent_profiles` 表（替代 `agent_registrations`）

#### `src/app/(app)/admin/layout.tsx`

**无需修改**：现有 `role !== 'admin'` 守卫逻辑仍然有效

### 5.6 不需要修改的文件

| 文件 | 原因 |
|------|------|
| `src/components/PropertyListings.tsx` | 只查 `units`、`communities`、`favorites`，不涉及 auth |
| `src/components/TenantPortal.tsx` | 只查租约、支付记录，不涉及 auth |
| `src/components/FavoritesManager.tsx` | 只查 `favorites` 表 |
| `src/components/AgentRating.tsx` | 只查 `agent_ratings` 表 |
| `src/components/AdminPageWrapper.tsx` | 路由逻辑不变 |
| `src/utils/supabase/client.ts` | Supabase 客户端不变 |
| `src/utils/supabase/server.ts` | Supabase 服务端客户端不变 |
| `src/utils/compressImage.ts` | 压缩工具不变 |
| `src/components/LegalContent.tsx` | 法律条款内容不变 |

### 5.7 现有 Supabase 表（不需要修改）

| 表名 | 说明 |
|------|------|
| `admin_users` | 管理员/中介权限表（保持不变） |
| `agent_ratings` | 中介评分（保持不变） |
| `communities` | 小区信息（保持不变） |
| `favorites` | 收藏（保持不变） |
| `leases` | 租约（保持不变） |
| `lease_transfers` | 租约转让（保持不变） |
| `maintenance_requests` | 维修工单（保持不变） |
| `mobile_upload_sessions` | 手机上传会话（保持不变） |
| `payment_records` | 支付记录（保持不变） |
| `reviews` | 评价（保持不变） |
| `tenant_interests` | 租客意向（保持不变） |
| `units` | 房源（保持不变） |
| `user_notifications` | 站内通知（保持不变，但中介审批不再使用） |
| `users` | 用户信息（保持不变） |

### 5.8 需要迁移的旧表

| 旧表 | 处理 |
|------|------|
| `agent_registrations` | 保留但不再使用，数据可迁移到 `agent_profiles` |

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

## 九、开发者手动创建账号（开绿灯）

开发者可以为朋友、熟人在数据库后台直接创建账号，跳过注册和审批流程。

### 9.0.1 创建租客账号

```
1. Supabase Auth → 新建用户（填邮箱、密码）
2. user_metadata → 设置 { role: 'student', full_name: '...', identity_type: '...' }
3. Supabase Storage → 上传证件照片（朋友通过 WhatsApp/微信发送）
4. tenant_profiles 表 → 插入记录，填入照片 URL
```

### 9.0.2 创建中介账号

```
1. Supabase Auth → 新建用户（填邮箱、密码）
2. user_metadata → 设置 { role: 'agent', full_name: '...' }
3. Supabase Storage → 上传 REN 执照照片（朋友通过 WhatsApp/微信发送）
4. agent_profiles 表 → 插入记录（status: 'approved'），填入照片 URL
5. admin_users 表 → 插入记录（权限）
```

**注意**：照片必须上传，不能留空。保持数据完整性。

### 9.0.3 AdminPanel 新增"手动添加中介"功能

现有的"管理管理员"功能只填邮箱和角色，缺少 REN 等必填信息。需要新增一个完整的表单：

```
AdminPanel → 管理管理员 → [手动添加中介] 按钮

表单内容：
  ┌─────────────────────────────────────┐
  │  手动添加中介                        │
  ├─────────────────────────────────────┤
  │  邮箱 *                              │
  │  [________________________]          │
  │                                      │
  │  姓名 *                              │
  │  [________________________]          │
  │                                      │
  │  手机号 *                            │
  │  [________________________]          │
  │                                      │
  │  公司名称 *                          │
  │  [________________________]          │
  │                                      │
  │  REN 编号 *                          │
  │  [________________________]          │
  │                                      │
  │  REN 执照照片 *                      │
  │  [上传区域]                          │
  │                                      │
  │  [创建账号]                          │
  └─────────────────────────────────────┘

逻辑：
1. 管理员填表 + 上传 REN 照片
2. 点击"创建账号"
3. 调用 Supabase Admin API 创建 Auth 用户（设置临时密码）
4. 写入 admin_users 表（role: 'editor'）
5. 写入 agent_profiles 表（status: 'approved'）
6. 发邮件通知对方：账号已创建，附带登录链接和临时密码
```

**注意**：这个功能只有超级管理员可以使用。

---

## 十、风险与注意事项

### 10.1 向后兼容

- 现有已注册用户（通过 Supabase Magic Link 登录的）需要迁移
- 建议：给现有用户的 `user_metadata` 补充 `role: 'student'` 字段（保持租客身份）
- 现有 `admin_users` 表中的中介账号需要补充 `agent_profiles` 记录

### 10.2 Mock 模式

- Mock 模式下邮箱验证码用 localStorage 模拟
- 注册信息存入 localStorage 对应 key

### 10.3 邮箱唯一性

- 一个邮箱只能注册一个角色（学生 OR 中介）
- 注册时检查邮箱是否已存在于 Supabase Auth

### 10.4 密码安全

- 密码最少 8 位，包含大小写字母和数字
- 使用 Supabase Auth 的密码策略

---

## 十一、测试清单

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
