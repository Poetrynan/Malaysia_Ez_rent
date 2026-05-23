# Supabase Auth 重定向配置详解

## 我们在配置什么？

Supabase 提供了登录/注册功能（邮箱、Google 登录等）。用户登录成功后，Supabase 需要把用户"送回"你的网站。这两个配置就是告诉 Supabase："你应该把用户送到哪里"。

---

## 1. Site URL（站点地址）

### 填什么
```
http://localhost:3000
```

### 这是什么？
Site URL 是你网站的"根地址"。当用户登录时，如果你的代码没有指定具体的跳转地址，Supabase 就会用这个地址作为默认值。

### 为什么是 localhost:3000？
- `localhost` = 你自己的电脑（本地开发服务器）
- `3000` = Next.js 默认使用的端口号
- 你在终端运行 `npm run dev` 时，Next.js 会在 `http://localhost:3000` 启动你的网站

### 打个比方
Site URL 就像你家的街道地址。快递员（Supabase）需要知道你住在哪里，才能把包裹（用户）送到你家。

---

## 2. Redirect URLs（跳转白名单）

### 填什么
```
http://localhost:3000/auth/callback
```

### 这是什么？
这是一个"白名单"——只有列在这个列表里的地址，Supabase 才允许登录后跳转过去。

### 为什么要这个白名单？
**安全考虑。** 如果没有白名单，黑客可以伪造一个跳转链接，让用户登录后被送到恶意网站。白名单确保用户只能被送到你自己的网站页面。

### 为什么是 /auth/callback 这个路径？
在你的项目里，有一个文件叫 `src/app/auth/callback/route.ts`。这个文件的作用是：

1. 用户在 Supabase 那边登录成功
2. Supabase 把用户重定向到 `/auth/callback`，并附带一些临时信息（叫 auth code）
3. 你的 `route.ts` 接收到这些信息，跟 Supabase 确认身份，创建登录会话（session）
4. 确认完毕后，把用户送到你想要的页面（比如首页或仪表盘）

### 打个比方
Redirect URL 就像快递站。用户登录后不会直接到你家门口，而是先到快递站（callback 路由）取件验身份，确认无误后再送到你家。

---

## 3. 为什么要分两个配置？

| 配置 | 作用 | 类比 |
|------|------|------|
| Site URL | 默认地址，没指定时用这个 | 你家的家庭住址 |
| Redirect URLs | 允许跳转的安全白名单 | 快递柜取件码，只有正确的码才能取件 |

它们配合工作：
- 你的代码可以指定"登录后跳转到 `/dashboard`"
- 但 `/dashboard` 必须在 Redirect URLs 白名单里（或者 Site URL 前缀匹配）
- 如果地址不在白名单里，Supabase 会拒绝跳转，防止安全问题

---

## 4. 开发环境 vs 生产环境

### 开发时（现在）
```
Site URL:        http://localhost:3000
Redirect URLs:   http://localhost:3000/auth/callback
```

### 上线后（以后）
```
Site URL:        https://你的域名.com
Redirect URLs:   https://你的域名.com/auth/callback
```

注意：生产环境用 `https`（加密连接），不用 `http`（明文传输）。

---

## 5. Google 登录时，为什么有两套重定向地址？

当你配置 Google 登录时，会遇到两个不同的地方都要填重定向地址，而且填的**不一样**。这很容易搞混，但它们是接力赛的两棒。

### 整个登录流程

```
用户点"用 Google 登录"
    ↓
Google 验证用户身份
    ↓
Google → 把用户送到 Supabase（第一棒）
    ↓
Supabase 创建登录会话
    ↓
Supabase → 把用户送到你的网站（第二棒）
    ↓
你的 /auth/callback 路由处理登录
```

### 两个地方分别填什么

| 配置位置 | 填什么 | 含义 |
|----------|--------|------|
| **Google Cloud Console** → Authorized redirect URIs | `https://legiyebykxmztaewlmhv.supabase.co/auth/v1/callback` | Google 验证完后，把用户送到 Supabase |
| **Supabase 后台** → Authentication → URL Configuration → Redirect URLs | `http://localhost:3000/auth/callback` | Supabase 处理完后，把用户送到你的网站 |

### 为什么不一样？

因为它们控制的是**不同阶段**的跳转：

- **Google Cloud Console** 那个：告诉 Google "验证完用户后，你可以把人送到哪里"。这里填的是 Supabase 的地址，因为用户需要先经过 Supabase 创建会话。
- **Supabase 后台** 那个：告诉 Supabase "处理完登录后，你可以把人送到哪里"。这里填的是你自己网站的地址，因为最终用户要回到你的网站。

### 打个比方

想象你从国外寄快递回家：
1. **Google Cloud Console** = 国际快递公司的中转仓地址（Google → Supabase）
2. **Supabase 后台** = 你家的收货地址（Supabase → 你的网站）

两段路线，两个地址，缺一不可。

---

## 6. 管理员和普通用户怎么区分？

### 项目里的设计

用**两张表**来区分角色（不用一张表 + role 字段）：

| 表 | 谁 | 怎么判断 |
|---|---|---|
| `users` | 普通学生 | Google/邮箱登录后，触发器自动在这里创建一条记录 |
| `admin_users` | 管理员 | 需要手动在 Supabase 后台添加 |

首页代码（`page.tsx`）的判断逻辑：
```typescript
// 查 admin_users 表，有记录就是管理员，没有就是学生
const { data: adminRecord } = await supabase
  .from('admin_users')
  .select('id')
  .eq('id', user.id)
  .single();
const activeRole = adminRecord ? 'admin' : 'student';
```

### 用户登录后的数据流

```
用户通过 Google 登录
    ↓
Supabase 自动创建 auth.users 记录
    ↓
触发器 on_auth_user_created 自动创建 users 表记录
    ↓
首页查 admin_users 表判断角色
    ↓
有记录 → 管理员面板（AdminPanel）
无记录 → 学生面板（StudentPortal）
```

### 怎么添加管理员？

在 Supabase 后台 → SQL Editor 运行：
```sql
INSERT INTO admin_users (id, email, role)
VALUES ('用户UUID', '用户邮箱@gmail.com', 'editor');
```

用户的 UUID 可以在 Supabase 后台 → Authentication → Users 里找到。

### 为什么不用一张表 + role 字段？

两种方式都能用，但这个项目选了两张表：
- `users` 表只存学生信息（手机号、头像），结构更简单
- `admin_users` 表单独存管理员，权限查询更直接（`WHERE id IN (SELECT id FROM admin_users)`）
- RLS 策略里已经用 `admin_users` 表做权限判断，保持一致

---

## 7. 常见问题

### Q: 我能填多个 Redirect URL 吗？
**A:** 可以。如果你有多个回调地址（比如还有一个 `/auth/reset-password` 回调），每行填一个：
```
http://localhost:3000/auth/callback
http://localhost:3000/auth/reset-password
```

### Q: 我能用通配符 * 吗？
**A:** Redirect URLs 支持通配符，比如 `https://*.yourdomain.com`。但 Site URL 不支持通配符，必须是精确地址。

### Q: 填错了会怎样？
**A:** 用户登录后会看到一个错误页面，提示"重定向地址不在白名单里"。不会丢数据，但用户无法完成登录。修改配置后刷新即可生效。

### Q: localhost 安全吗？
**A:** `localhost` 只在你自己的电脑上能访问，别人访问不了，所以开发环境用它没问题。上线后一定要改成正式域名。

### Q: 登录需要建数据库表吗？
**A:** **不需要。** Supabase 自己有一个内置的 `auth.users` 表，专门管理登录凭证（邮箱、密码、Google ID 等）。你什么都不用做，Supabase 自动处理。

你项目里的 `users` 表和 `admin_users` 表是**业务数据表**，不是登录用的：
- `users` 表：存学生的姓名、头像等业务信息
- `admin_users` 表：区分谁是管理员

登录流程：Supabase 管登录 → 触发器自动在你的 `users` 表创建业务记录 → 首页查 `admin_users` 判断角色。

### Q: Supabase 弹出"destructive operations"警告，要继续吗？
**A:** **继续，安全。** 这是 Supabase SQL Editor 的标准警告，因为 SQL 里有 `CREATE TABLE`、`ALTER TABLE` 等语句。但实际上：

- 所有表都用了 `IF NOT EXISTS` — 已存在的表不会被覆盖
- 函数用了 `CREATE OR REPLACE` — 只更新函数定义
- 触发器先 `DROP IF EXISTS` 再创建 — 只更新触发器
- **不会删除任何已有数据**

这个警告是提醒你"这条 SQL 会修改数据库结构"，不是说会丢数据。

### Q: 数据库能迁移到其他 Supabase 账号吗？
**A:** **可以。** 用 Supabase CLI 完整迁移：

```bash
supabase db dump --project-id 旧项目ID > backup.sql
```

然后在新项目的 SQL Editor 里运行 `backup.sql`。这样会迁移：

| 内容 | 是否迁移 |
|------|---------|
| 表结构、触发器、函数 | 会 |
| 业务数据（房源、租约、账单） | 会 |
| `auth.users`（用户账号、密码） | 会 |
| RLS 策略 | 会 |

**用户不需要重新注册**，UUID 保持不变，所有关联数据完整保留。

迁移后只需改两个地方：
1. `.env.local` 里的 Supabase URL 和 Key
2. Google Cloud Console 里的 redirect URI

**注意：** 如果只手动导出业务表（不导 `auth.users`），用户重新注册后 UUID 会变，旧的租约、账单数据就断链了。所以一定要用 CLI 完整迁移。

### Q: 数据库加字段会丢数据吗？
**A:** **不会。** 用 `ALTER TABLE ... ADD COLUMN` 加字段是安全操作，已有数据不受影响。大厂规范是永远用迁移脚本（`ALTER TABLE`），不删表重建。

项目里的迁移脚本放在 `supabase/migrations/` 目录下，按编号管理：
- `001_add_admin_contact.sql` — 给 admin_users 加联系方式字段
- `002_limit_admins_and_ui.sql` — 限制管理员最多 5 人

### Q: 超级管理员不注册，可以在数据库帮他注册吗？
**A:** 可以，但要分两步：

**第 1 步：创建 auth 用户（必须通过 Supabase）**
- 方式 A：去 Supabase 后台 → Authentication → Users → **Invite user by email**，输入邮箱，用户收到邀请邮件后设置密码
- 方式 B：让用户直接用 Google 登录，Supabase 自动创建 auth 用户

**第 2 步：把 auth 用户加为超级管理员**
用户注册后，在 Authentication → Users 找到 UUID，然后运行：
```sql
INSERT INTO admin_users (id, email, display_name, whatsapp, role)
VALUES ('用户的UUID', '用户邮箱@gmail.com', '张房东', '+60123456789', 'super_admin');
```

或者让超级管理员在管理端前端 → "管理员"标签 → 添加管理员（更方便）。

**注意：** `admin_users` 的 `id` 必须和 `auth.users` 的 `id` 一致，否则登录后首页查不到管理员身份。

### Q: 超级管理员和普通管理员有什么区别？
**A:**

| 权限 | 超级管理员 (super_admin) | 普通管理员 (editor) |
|------|------------------------|-------------------|
| 管理房源、租约、账单 | 可以 | 可以 |
| 添加/删除管理员 | 可以 | 不可以 |
| 修改管理员联系方式 | 可以 | 不可以 |
| 看到"管理员"标签页 | 可以 | 不可以看到 |

超级管理员日常运营完全在前端操作，只有改数据库结构才需要去 Supabase 后台。

### Q: 管理员最多几个？
**A:** **5 人。** 用触发器 `limit_admin_count` 实现，插入第 6 人时会报错。以后想改数字，修改触发器里的 `>= 5` 即可。

Supabase 免费版不限制管理员数量（限制的是数据库大小 500MB、月活用户 50K 等）。

---

## 简单直接的答案

| 存储内容 | 放哪里 | 谁来管 |
|---------|--------|--------|
| **登录凭证**（邮箱、密码、Google ID） | Supabase 自带的 `auth.users` | Supabase 自动管理 |
| **你的业务数据**（文章、商品、订单、评论、用户昵称、头像等） | **你自己创建的表** | 你自己设计和维护 |

---
# 那我的项目里的数据库是用来干啥的
## 打个比方

把 Supabase 想象成一个**商场**：

| 角色 | 对应什么 |
|------|---------|
| **商场大门 + 门禁卡系统** | `auth.users`（只管验证身份，能不能进来） |
| **商场里的店铺、货架、商品** | **你自己创建的数据库表**（存放你的业务数据） |

- 门禁系统（auth.users）只知道：这个人有卡，可以进来。
- 但它不知道：这个人买了什么商品、写了什么文章、有多少积分。

**这些“业务数据”就需要你来设计和存储。**

---

## 具体到你的项目

| 功能 | 数据存哪里？ | 谁负责？ |
|------|-------------|---------|
| 用户登录（Google/邮箱） | `auth.users`（Supabase 自带） | 自动 |
| 学生业务数据（姓名、头像） | `users` 表（你建的） | 触发器自动创建 |
| 管理员身份 | `admin_users` 表（你建的） | 手动添加 |
| 房源、租约、账单 | `communities`、`units`、`leases`、`payment_records` | 你设计 |

所以：
- **`auth.users`** = 管登录，Supabase 替你管好了
- **`users` + `admin_users`** = 管用户业务数据和角色
- **其他表** = 管房源、租约等业务

---

## 你的项目用 `users` + `admin_users` 两张表

这个项目没有用 `profiles` 表，而是用两张表区分角色：

| 表 | 用途 | 字段 |
|---|---|---|
| `users` | 学生用户业务数据 | `id`（关联 auth.users）、`phone`、`full_name`、`avatar_url` |
| `admin_users` | 管理员身份 | `id`（关联 auth.users）、`email`、`role`（super_admin/editor） |

触发器 `on_auth_user_created` 会在用户注册时自动往 `users` 表插入记录。
`admin_users` 需要手动添加。

---

## 一张图总结

```
┌──────────────────────────────────────────────────┐
│                    Supabase                        │
│                                                    │
│  ┌──────────────────┐    ┌──────────────────────┐ │
│  │   auth.users     │    │  users（学生业务数据） │ │
│  │  （Supabase 管理） │    │  admin_users（管理员）│ │
│  ├──────────────────┤    ├──────────────────────┤ │
│  │ • id             │    │ • id（关联 auth）     │ │
│  │ • email          │◄───│ • full_name          │ │
│  │ • encrypted_pwd  │    │ • avatar_url         │ │
│  │ • provider_id    │    │ • phone              │ │
│  └──────────────────┘    └──────────────────────┘ │
│                                                    │
│         管登录                        管业务       │
│    （你不用管）                   （触发器自动同步） │
└──────────────────────────────────────────────────┘
```

---

## 你现在需要做的事

| 步骤 | 做什么 | 状态 |
|------|--------|------|
| 1️⃣ | 在 Supabase SQL Editor 运行 `supabase/schema.sql`（建表 + 触发器） | 待执行 |
| 2️⃣ | 测试 Google 登录，确认 `users` 表自动创建了记录 | 待测试 |
| 3️⃣ | 在 `admin_users` 表手动添加管理员 | 按需做 |

---

## 8. 本地开发时手机扫码打不开网页

### 问题
学生扫码上传支付凭证时，手机上显示"无法打开网页"。二维码里包含的地址是 `http://localhost:3000/mobile-upload/xxx`。

### 原因
`localhost` 指的是"本机"。在电脑浏览器上访问 `localhost:3000` 没问题，因为服务就跑在你电脑上。但手机扫码后，手机会尝试访问**它自己的 `localhost:3000`**——手机上根本没有运行这个服务，所以打不开。

### 解决方法
用电脑的**局域网 IP** 代替 `localhost` 访问：

```powershell
# 1. 查电脑的局域网 IP
ipconfig

# 2. 找到 "IPv4 地址"，通常是 192.168.x.x
# 3. 在电脑浏览器用这个 IP 访问
#    http://192.168.x.x:3000
```

这样二维码里会自动变成 `http://192.168.x.x:3000/mobile-upload/xxx`，手机就能打开了。

**前提条件**：手机和电脑必须连同一个 WiFi。

### 打个比方
- `localhost` = "我自己"——只有你自己知道自己在哪
- `192.168.x.x` = "家庭住址"——同一个 WiFi 网络里的其他设备（手机）能找到你

---

## 9. 部署到服务器后还有这个问题吗？

### 没有。
部署后，网站会有一个真实域名（比如 `https://malaysia-ez-rent.vercel.app`）。代码里的 `window.location.origin` 会自动返回这个真实域名，二维码里就是正式 URL，任何手机都能直接访问。

`localhost` 问题**只存在于本地开发阶段**。

| 环境 | 二维码里的地址 | 手机能打开吗 |
|------|---------------|-------------|
| 本地开发（`localhost:3000`） | `http://localhost:3000/mobile-upload/xxx` | ❌ 不能 |
| 本地开发（`192.168.x.x:3000`） | `http://192.168.x.x:3000/mobile-upload/xxx` | ✅ 同一 WiFi 可以 |
| 部署后（Vercel） | `https://malaysia-ez-rent.vercel.app/mobile-upload/xxx` | ✅ 全球可以 |