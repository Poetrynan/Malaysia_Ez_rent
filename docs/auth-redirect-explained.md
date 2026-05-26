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

### Q: 房源图片存在哪里？为什么不用 base64 直接存数据库？
**A:** 图片上传到 **Supabase Storage**（类似 S3 的对象存储），数据库只存图片的公开 URL。

| 方式 | 存什么 | 适合 |
|------|--------|------|
| base64 存数据库 | 几百 KB 的文本塞进字段 | ❌ 膨胀数据库、查询慢、有大小限制 |
| Supabase Storage | 文件存对象存储，数据库只存 URL | ✅ 生产级方案，CDN 加速 |

项目里的 Storage Bucket：`unit-media`，存储内容：
- 房源图片：`{unitId}/0.jpg`, `{unitId}/1.jpg`, ...
- 管理员收款码：`qr/{userId}.png`

所有人可查看（公开 Bucket），只有登录用户可上传/删除（RLS 策略，`TO authenticated`）。

### Q: Storage RLS 策略怎么配？为什么不能用 `EXISTS (SELECT FROM admin_users)`？
**A:** Storage 的 RLS 和普通表不一样。`storage.objects` 表的上下文里，`auth.uid()` 可以用，但跨表子查询（如 `EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid())`）**可能失败**，因为 Storage 的 RLS 执行环境和普通表不同。

| 策略写法 | 效果 | 推荐 |
|----------|------|------|
| `EXISTS (SELECT 1 FROM admin_users WHERE ...)` | 可能报错或不生效 | ❌ |
| `TO authenticated USING (bucket_id = 'unit-media')` | 所有登录用户可操作 | ✅ |

应用层（前端代码）已经做了管理员校验——只有进入管理端的用户才能上传，所以 Storage RLS 不需要重复检查。

### Q: admin_users 的 RLS 策略为什么不能用 `FOR ALL`？
**A:** PostgreSQL 中，`FOR ALL` 策略覆盖 **SELECT + INSERT + UPDATE + DELETE** 四种操作。如果你用一条 `FOR ALL` 策略：

```sql
-- ❌ 危险：这条策略同时控制读和写
CREATE POLICY "super admin manage" ON admin_users FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid() AND role = 'super_admin'));
```

问题：普通用户（学生）想读管理员联系方式（SELECT），但 `FOR ALL` 策略要求 `role = 'super_admin'`，学生读不到 → **登录流程崩溃**（首页查 admin_users 失败）。

正确做法：**拆成四条独立策略**：

```sql
-- ✅ 所有人可读
CREATE POLICY "anyone read" ON admin_users FOR SELECT USING (true);

-- ✅ 只有超级管理员可增删改
CREATE POLICY "super admin insert" ON admin_users FOR INSERT
  WITH CHECK (EXISTS (...));
CREATE POLICY "super admin update" ON admin_users FOR UPDATE
  USING (EXISTS (...));
CREATE POLICY "super admin delete" ON admin_users FOR DELETE
  USING (EXISTS (...));

-- ✅ 所有管理员可更新收款码（全系统共享）
CREATE POLICY "admin update QR" ON admin_users FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE id = auth.uid()));
```

### Q: 收款码是每个管理员各自的还是全系统共享？
**A:** **全系统共享。** 不管哪个管理员上传的，所有管理员和学生看到的是同一个收款码。

| 角色 | 能做什么 |
|------|---------|
| 任意管理员（editor / super_admin） | 上传、替换、删除收款码 |
| 学生 | 查看收款码，扫码付款 |

收款码存储在 `admin_users.payment_qr_code` 字段。前端查询时取第一条非空记录（`.not('payment_qr_code', 'is', null).limit(1).single()`），所以所有人看到同一个码。

上传流程：
1. 文件上传到 Supabase Storage `qr/{userId}.png`
2. 公开 URL 写入 `admin_users.payment_qr_code`
3. 同步缓存到 `localStorage`（防止数据库读取失败时丢失）

### Q: 删除数据是真的从数据库删掉吗？
**A:** **是的，硬删除。** 管理员删除房源或租约时，数据会从数据库彻底删除：

| 删除对象 | 同步清理的内容 |
|----------|--------------|
| 房源（unit） | Storage 里的图片文件 |
| 租约（lease） | 关联的 payment_records + 恢复 unit 状态为 available |

所有删除操作都有确认弹窗，防止误操作。

### Q: 租客取消意向是删除还是标记？
**A:** **软删除**——把 `tenant_interests.status` 改为 `'left'`，数据保留在数据库里。

- **学生可自行取消**：在 Whole Unit 详情点 **「取消意向」**（顶部或自己那一行），调用 RPC **`cancel_tenant_interest`**（**015 迁移**），**无需等管理员拒绝**
- 学生端：查询时过滤 `.neq('status', 'left')`，看不到已取消的
- 管理员端：可以看到所有状态（interested / confirmed / left），方便追溯历史

为什么不用硬删除？因为管理员需要知道"这个人曾经来过又走了"，有助于判断房间热度。

### Q: 合租意向怎么提交？必须跑哪些 SQL？
**A:** Whole Unit 详情 →「我要租」→ 填备注或「跳过，直接提交」→ RPC **`submit_tenant_interest(unit_id, note)`**。

| 迁移 | 作用 |
|------|------|
| `003_corenting.sql` | 建表 + 基础 RLS |
| `014_tenant_interests_user_update.sql` | 学生 UPDATE 自己的行（fallback） |
| **`015_tenant_interest_rpc.sql`** | **submit / cancel RPC（生产推荐）** |

成功后界面显示 **「合租登记 X/Y（已确认入住 A · 意向中 B）」** 及公开意向名单。

### Q: 想合租的其他人能看到我的意向吗？
**A:** **能。** 同一 Whole Unit 详情页内，所有人可见该房源下未取消的意向（姓名、邮箱、备注、状态）。RLS 策略为 `Anyone can view interests`。

### Q: 房源类型不同，合租逻辑有什么区别？
**A:**

| 房型 | 逻辑 | 按钮行为 |
|------|------|----------|
| Studio / Master Room / Medium Room / Small Room | 单人入住，直接租 | 点"我要租"直接表达意向，无备注，无合租列表 |
| Whole Unit | 多人合租 | **合租登记**人数、备注输入、公开意向者列表、**自行取消意向** |

管理员可以在 AdminPanel 设置每个 Unit 的最大入住人数（`max_occupants`）。**满员**以管理员确认的 `confirmed` 数量为准；`interested` 计入「合租登记」展示但不占硬名额。

### Q: 配套设施怎么用？
**A:** 管理员创建小区时可以勾选配套设施（健身房、游泳池、洗衣房、自习室、停车位、安保、WiFi、便利店），数据存为 `communities.amenities TEXT[]` 数组。学生在房源详情页可以看到该小区的配套设施列表。

### Q: 什么是"双模式架构"？Live 和 Mock 有什么区别？
**A:** 项目支持两种运行模式，代码自动检测：

| 模式 | 数据源 | 判断条件 | 用途 |
|------|--------|----------|------|
| **Live** | Supabase 云数据库 | 用户已登录（`supabase.auth.getUser()` 成功） | 真实使用、部署上线 |
| **Mock** | 浏览器 localStorage | 用户未登录或 Supabase 不可用 | 本地演示、无需注册即可体验 |

每个数据操作都有两条路径：
```typescript
if (isLive) {
  // 写入 Supabase
} else {
  // 写入 localStorage
}
```

这样的好处：开发者可以直接打开页面体验完整功能，不需要先注册 Supabase 账号。连接真实数据库后，所有操作自动切换到 Supabase。

### Q: 租约的押金怎么计算？可以自定义吗？
**A:** 可以。管理员创建租约时，分别设置安全押金和水电押金的月数（支持小数如 0.5）：

| 字段 | 默认值 | 说明 |
|------|--------|------|
| `security_deposit_months` | 2 | 安全押金月数 |
| `utility_deposit_months` | 0.5 | 水电押金月数 |

总押金 = 月租 × (安全月数 + 水电月数)。学生端会显示明细，如"安全押金 (2 个月) RM 2,000"。

### Q: 管理员怎么创建租约并关联租客？
**A:** 创建租约时，选择一个可用房间后：

1. **有已确认的意向租客**：下拉框自动列出该房间的已确认租客（显示姓名 + 邮箱），直接选择
2. **没有意向租客**：手动输入租客的 UUID（在 Supabase 后台 → Authentication → Users 可以找到）
3. **Mock 模式**：自动用 `tenant-{timestamp}` 兜底，不需要真实 UUID

租客 UUID 必须是合法的 `auth.users` UUID，否则数据库会报 `invalid input syntax for type uuid`。

### Q: 学生支付流程是什么？收款码在哪里？
**A:** 学生点击未缴费的月份后，弹窗分两个区域：

| 区域 | 显示内容 | 来源 |
|------|----------|------|
| 上方 | **收款信息（动态区分）**：<br> - **首月与押金（定金）**：显示中介（管理员）的收款码，提示“请将定金/首月租金扫给中介”。<br> - **第二个月及之后的租金**：显示房东的收款二维码或银行账户信息，提示“请将租金付给房东”。 | 首月取 `admin_users.payment_qr_code`，<br>后续取 `units.landlord_qr_code` / `landlord_bank_info`。 |
| 下方 | 手机扫码上传转账截图的二维码 | 生成指向 `/mobile-upload/{paymentId}` 的 QR |

流程：学生扫码付款 → 截图 → 手机扫码上传截图 → 管理员审核（批准/驳回）→ 状态更新。

如果管理员或房东没上传对应收款码，弹窗会提示"尚未上传收款信息，请联系管理员"。

### Q: 管理端台账怎么操作？已缴费能改回来吗？
**A:** 可以。管理员点击台账格子可以切换状态：
- **待缴 → 已缴**：直接点击
- **已缴 → 待缴**：再次点击即可回退
- **待审核**：点击后弹出审核弹窗（查看截图、批准/驳回）

台账按时间顺序排列（1月、2月、3月...），不会把已缴的挤到后面。

### Q: 数据库加字段会丢数据吗？

项目里的迁移脚本放在 `supabase/migrations/` 目录下，按编号管理：
- `001_add_admin_contact.sql` — 给 admin_users 加联系方式字段
- `002_limit_admins_and_ui.sql` — 限制管理员最多 5 人
- `003_corenting.sql` — 合租功能（units.max_occupants + tenant_interests 表）
- `004_unit_media.sql` — 图片存储 + 配套设施 + 收款码 + 押金月数（units.media_urls + communities.amenities + admin_users.payment_qr_code + leases.security/utility_deposit_months）
- `005_feedback.sql` — 意见箱（feedback 表 + RLS 策略）
- `006_bedrooms_bathrooms.sql` — units 加 bedrooms/bathrooms + match_units
- `007_mobile_upload.sql` — 手机匿名上传凭证 RPC + Storage evidence/ 策略
- `008_whole_unit_room_type.sql` — `units.room_type` 允许 `Whole Unit`（整租/合租）
- `009_unit_video_url.sql` — 看房视频 `units.video_url`
- `010_agent_qr_separation.sql` — Agent 收款码与审核隔离
- `011_optional_unit_number.sql` — 门牌号可选
- `012_remove_unit_number_display.sql` — 隐藏门牌号展示
- `013_landlord_payment_details.sql` — 房东收款信息（后续月租付房东）
- `014_tenant_interests_user_update.sql` — 学生 UPDATE 自己的合租意向
- `015_tenant_interest_rpc.sql` — **submit_tenant_interest / cancel_tenant_interest RPC**

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

### Q: 意见箱怎么用？

**A:** 学生可以在 StudentPortal 底部的"意见箱"区域提交意见或建议。提交后：

| 角色 | 能做什么 |
|------|---------|
| 学生 | 提交意见、查看自己的历史意见、查看管理员回复 |
| 管理员 | 在 AdminPanel 的"意见" tab 查看所有意见、回复、标记已处理、删除 |

**数据库表**：`feedback`（`005_feedback.sql` 迁移）

| 字段 | 说明 |
|------|------|
| `user_id` | 提交学生的 UUID |
| `content` | 意见内容 |
| `status` | `pending`（待处理）/ `resolved`（已处理）|
| `admin_reply` | 管理员回复（可选）|
| `resolved_at` | 处理时间 |

**RLS 策略**：学生只能插入和查看自己的意见；管理员可以查看、更新、删除所有意见。

**未处理提醒**：管理端"意见" tab 会显示未处理意见的数量角标。

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
| 1️⃣ | 在 Supabase SQL Editor 运行 `supabase/schema.sql`（建表 + 触发器 + RLS） | ✅ 已执行 |
| 2️⃣ | 运行 `supabase/migrations/004_unit_media.sql`（加列 + Storage + 策略） | ✅ 已执行 |
| 3️⃣ | 运行 **`supabase/migrations/007_mobile_upload.sql`**（手机上传凭证 RPC） | ⚠️ 必做 |
| 4️⃣ | 运行 **`supabase/migrations/008_whole_unit_room_type.sql`**（Whole Unit 房型） | ⚠️ 若后台保存整租报错则必做 |
| 5️⃣ | 测试 Google 登录，确认 `users` 表自动创建了记录 | ✅ 已测试 |
| 6️⃣ | 在 `admin_users` 表手动添加管理员（或让 super_admin 在前端添加） | 按需做 |

> 完整清单见文档末尾 **「你现在需要做的事（更新于 2026-05-24）」** 一节。

---

### Q: NEXT_PUBLIC_SUPABASE_ANON_KEY 和 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 为什么是一样的？
**A:** 它们本质上都是指 Supabase 项目提供的 `anon` `public` 客户端公开密钥。不同库对它的命名习惯不同：
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase 前端 SDK 的常规命名，在前端 API 初始化时使用。
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`：Supabase SSR 验证框架组件（如 `@supabase/ssr`）及中间件模板的习惯命名。

为了兼容代码中这两种不同命名形式的调用，在配置文件中它们配置为相同的值。

### Q: 为什么项目没有直接把本地带有真实秘钥的 backend/.env 提交到 GitHub？
**A:** **安全起见。** `SUPABASE_SERVICE_ROLE_KEY` 具有绕过数据库 RLS（行级安全）策略的最高权限，可以任意删除和篡改数据，绝对不能提交到 GitHub（公开泄露会导致数据库被黑）。
- 我们在根目录的 `.gitignore` 中忽略了 `backend/.env`，使得包含真实密钥的本地配置文件只保留在电脑本地。
- 在 **Render** 的高级设置中，我们以环境变量的形式单独安全地配置了 `SUPABASE_SERVICE_ROLE_KEY`，云端服务运行时会自动读取。

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

---

## 10. 手机上传凭证页为什么不需要登录？

### 设计原因

学生用 PC 打开支付弹窗，再用**手机**扫「上传凭证」二维码。此时手机浏览器**没有** Google 登录态，也不应该要求学生再登录一次——否则体验极差。

因此 `/mobile-upload/[id]` 在 `middleware.ts` 里被**显式放行**，不经过 Auth 检查：

```typescript
// frontend/src/middleware.ts
if (
  pathname.startsWith('/login') ||
  pathname.startsWith('/auth/') ||
  pathname.startsWith('/mobile-upload/') ||  // ← 匿名可访问
  ...
) {
  return NextResponse.next();
}
```

### 那数据安全怎么办？

虽然页面匿名可访问，但不是谁都能随便改账单：

1. **URL 里带 UUID**：每个账单有 128 位随机 `payment_records.id`，不可枚举
2. **RPC 最小权限**：`007_mobile_upload.sql` 里两个 `SECURITY DEFINER` 函数只允许：
   - 按 ID 读取展示字段（账期、月租、房源名）
   - 按 ID 写入 `evidence_url` + 置 `status = pending_review`
3. **Storage 子目录隔离**：匿名只能写 `unit-media/evidence/`，不能动房源图片
4. **已审核账单不可覆盖**：`paid = true` 的账单拒绝再次提交凭证

这比「要求手机也登录 Supabase」更合理：安全性靠 UUID 不可猜测 + RPC 收窄写权限，而不是靠 Cookie。

### 必须在 Supabase 执行的 SQL

本地改代码不够，还须在 **Supabase Dashboard → SQL Editor** 运行一次：

```
supabase/migrations/007_mobile_upload.sql
```

创建 `get_mobile_upload_info` 和 `submit_mobile_payment_evidence` 两个 RPC，以及 Storage 匿名写入策略。未执行时手机端会报「未找到该账单记录」。

---

## 11. 两种二维码：收款码 vs 上传凭证码

支付弹窗里有两个二维码，**含义完全不同**，不要混用：

| | 收款码（左侧） | 上传凭证码（右侧） |
|---|---|---|
| **内容** | 管理员上传的 DuitNow / Touch'n Go 图片 | URL：`{网站域名}/mobile-upload/{账单UUID}` |
| **是否唯一** | ❌ **全系统共享**，所有学生扫同一个 | ✅ **每个账单唯一**，5 月和 6 月各不同 |
| **谁生成** | 管理员在后台「收款设置」上传 | 前端按 `payment_records.id` 动态生成 |
| **扫了干什么** | 打开银行 App 付款给房东 | 打开手机上传页，提交该月转账截图 |
| **存哪里** | `admin_users.payment_qr_code`（Storage URL） | 不存库，仅 QR 编码 URL |

**严肃结论：上传凭证二维码是一账单一码。** 扫 5 月的码只能传 5 月的凭证，不能传到 6 月。这是防止凭证张冠李戴的刻意设计。

收款码则 intentionally 全员共用——房东只有一个收款账户。

---

## 12. 上传图片压缩与 Storage 配额

原图（手机截图 3–8 MB）直接上传会快速占满 Supabase Storage 免费配额。

项目在 `frontend/src/utils/compressImage.ts` 用 Canvas 在上传前压缩：

| 类型 | 压缩参数 | 典型结果 |
|------|---------|---------|
| 支付凭证 | 1080×2400, JPEG 80% | 150–400 KB |
| 房源照片 | 1920×1920, JPEG 88% | 200–500 KB |
| 收款码 | 800×800, JPEG 92% | 50–150 KB |

小于阈值（如房源图 250KB）**跳过压缩**。学生端详情页可 **Lightbox 全屏** 查看大图（点击缩略图或主图）。

### 看房视频压缩（2026-05-24 新增）

`frontend/src/utils/compressVideo.ts`：

| 项 | 说明 |
|----|------|
| 方式 | Canvas + MediaRecorder → **WebM** |
| 参数 | ≤1280×720，~1.2 Mbps |
| 触发 | 原文件 **> 12MB** |
| 存储 | `unit-media/{unitId}/walkthrough.webm` |
| 字段 | `units.video_url`（需 **`009_unit_video_url.sql`**） |

浏览器不支持 MediaRecorder 时回退原文件。压缩过程管理端按钮显示「压缩中…」。

---

## 13. 在租房源列表会不会挤占页面？

**不会。** 布局已固定：

```
app-container (height: 100vh, overflow: hidden)
  ├── sidebar（固定）
  └── main-viewport
        ├── topbar（sticky）
        └── main-content（overflow-y: auto）← 房源卡片在这里滚动
```

房源再多，只在**主内容区**出现滚动条；侧边栏和顶部栏保持固定。

---

## 14. AI 找房会不会去 iProperty？

**不会，且严禁。** 当前 Live Agent **根本不搜房**：

```
用户：「帮我找 Monash 附近的 Studio」
    ↓
Agent 不调用任何搜房工具
    ↓
回复：请直接使用上方导航 **「房源列表」** 页面筛选平台库存
```

平台房源只来自管理员在 Supabase 录入的 `units`，由 **`PropertyListings.tsx`** 展示，**不是** AI Chat。

**Tavily**（`get_web_realtime_info`）仅用于政策、交通、押金常识等；query 带 `-site:iproperty.com.my -site:propertyguru.com.my` 等，**禁止**爬取或推荐外部租房站。`search_iproperty_listings` 已从代码中删除。

若 Agent 报 `503 - model experiencing high demand`，是 LLM API 高峰期过载，与 Supabase / Tavily 无关；稍后重试即可。

---

## 15. Supabase「Memory usage」高 ≠ 数据库被占满了

### 先分清三个概念

很多人在 Supabase 仪表盘看到 **Primary Database → Memory usage** 显示 ~400 MB，会以为「数据库磁盘快满了」。**这是误解。**

| 指标 | 在哪里看 | 是什么 | 你们项目典型大小 |
|------|---------|--------|----------------|
| **Memory usage** | Database → Memory usage 图表 | PostgreSQL **RAM（内存）**，含查询 + 缓存 | ~400 MB 是实例分配的正常基线 |
| **Database size** | Settings → Usage | Postgres **磁盘**里表数据占用的空间 | 通常几 MB～几十 MB |
| **Storage size** | Storage → `unit-media` | **图片文件**（凭证、房源、收款码） | 取决于上传量，这才是大图占的地方 |

**Memory 图表 ≠ 磁盘占用。** Free 内存只剩 10% 也不代表出问题——PostgreSQL 会故意用 RAM 做 Cache + Buffers 加速读取，这是健康行为。

### Memory 图表各项含义（示例）

| 项目 | 典型占比 | 含义 |
|------|---------|------|
| **Used** | ~50% | 正在跑查询、维持连接 |
| **Cache + Buffers** | ~40% | 热数据缓存在内存里 |
| **Free** | ~10% | 空闲 RAM |

Total ~408 MB 是 Supabase 给这个 Postgres 实例的**内存池大小**，不是「你的数据有多大」。

### 图片到底占哪里？

本项目设计：

| 内容 | 存哪里 | 数据库里存什么 |
|------|--------|--------------|
| 支付凭证截图 | Storage `unit-media/evidence/` | `payment_records.evidence_url`（URL 字符串） |
| 房源照片 | Storage `unit-media/{unitId}/` | `units.media_urls`（URL 数组） |
| 收款码 | Storage `unit-media/qr/` | `admin_users.payment_qr_code`（URL 字符串） |

**图片本体不在 PostgreSQL 表里**（早期若把 base64 直接写进 `payment_qr_code` 除外——那才会撑大数据库 TEXT 字段）。

### 什么情况下 Storage / Database 才会真的变大？

| 情况 | 影响 |
|------|------|
| 上传大量原图（压缩前） | **Storage** 暴涨（单张 3–8 MB） |
| 重复测试上传凭证 | Storage `evidence/` 累积 |
| 早期 base64 收款码存 DB | **Database size** 异常（单条可达几百 KB～几 MB TEXT） |
| 正常业务数据（租约、账单、向量） | Database 很小，可忽略 |

**2026-05-24 起** 已加 `compressImage.ts`，新上传凭证/房源/收款码会先压缩再传 Storage。

### 如何自查占用

**1. 看总配额（Settings → Usage）**

- Database size
- Storage size

**2. 查数据库磁盘（SQL Editor）**

```sql
SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;
```

**3. 查是否还有 base64 大字段（历史遗留）**

```sql
SELECT id, length(payment_qr_code) AS qr_len
FROM admin_users
WHERE payment_qr_code IS NOT NULL AND length(payment_qr_code) > 1000;
```

若 `qr_len` 达几万～几十万，说明还存着 base64 文本。在管理端**重新上传收款码**（现走 Storage URL）即可覆盖。

**4. 查 Storage**

Dashboard → **Storage → unit-media**，看 `evidence/`、`qr/` 各文件夹体积；测试文件可手动删除。

### 总结

- **Memory ~400 MB**：正常 RAM 使用，**不用慌**。
- **担心配额**：看 **Database size** 和 **Storage size**，不是 Memory 图表。
- **图片占空间**：在 **Storage**；新上传已压缩，旧大文件需手动清理。

---

## 16. 品牌 Logo 上线要不要动数据库？

### 简单答案：**不用。**

Logo 是纯前端静态资源，与 Supabase 无关：

| 内容 | 位置 |
|------|------|
| 线上 Logo 文件 | `frontend/public/logo.png`（圆形图标版，源文件 `QQ20260524-170137.png`） |
| 侧边栏 | `page.tsx` — 52×52 图标 + 产品名/副标题 |
| 登录页 | `login/page.tsx` — 88×88 图标 + 文字 |
| 手机上传页 | `mobile-upload/[id]/page.tsx` — 72×72 图标 |
| 浏览器标签 favicon | `layout.tsx` → `icons: { icon: "/logo.png" }` |

### 如何上线

```bash
git add frontend/public/logo.png frontend/src/app/ ...
git commit -m "更新品牌 Logo"
git push
```

**Vercel 会自动 build 并部署**，无需在 Supabase 执行任何 SQL。

favicon 若浏览器仍显示旧图标：强制刷新（Ctrl+F5）或清除缓存。

### 和 SQL 迁移别混

| 变更 | 需要 Supabase SQL？ |
|------|-------------------|
| Logo / 前端样式 | ❌ 不需要 |
| 手机扫码上传凭证 | ✅ `007_mobile_upload.sql` |
| Whole Unit 房型保存 | ✅ `008_whole_unit_room_type.sql` |

---

## 17. 收租核查表为什么不显示门牌号？

### 现象

管理端 → 租约 → **收租核查表**，展开某条租约后，头部只有租客名 + 租金 + 日期，看不到是哪个 unit。

### 原因（已修复）

1. 租约与 `units` / `communities` 的关联在部分情况下未正确 JOIN
2. 房源信息原先和租金、日期挤在同一行，不够醒目

### 现在的展示格式

```
冯诗楠
Nautica Lake Suites · B-12-08 (Studio)   ← 单独一行，蓝色加粗
RM 1350/mo · 2026-03-01 → 2027-03-01
```

实现：`AdminPanel.tsx` 加载租约时使用 `leases → units → communities` 嵌套查询，渲染时用 `resolveLeaseUnit()` 兜底。

### 若仍显示「单元信息缺失」

说明该租约的 `unit_id` 为空，或对应房源已被删除。需在 Supabase 检查：

```sql
SELECT l.id, l.unit_id, u.unit_number, c.name
FROM leases l
LEFT JOIN units u ON u.id = l.unit_id
LEFT JOIN communities c ON c.id = u.community_id
WHERE l.status = 'active';
```

---

## 18. Whole Unit 保存报 `units_room_type_check` 怎么办？

前端 AdminPanel 已支持 **Whole Unit**（整租/合租），但旧数据库的 CHECK 约束可能只允许 4 种房型。

**报错示例：**
```
new row for relation "units" violates check constraint "units_room_type_check"
```

**解决：** 在 Supabase SQL Editor 执行一次：

```
supabase/migrations/008_whole_unit_room_type.sql
```

该脚本把 `room_type` 允许值扩展为：`Studio`, `Master Room`, `Medium Room`, `Small Room`, **`Whole Unit`**。

---

## 19. 学生端通勤 Google Places Autocomplete 自动建议与 Mock 降级机制

学生在详情页计算通勤时，无需手动费力输入或担心拼写错误。系统在 `MapAndCard.tsx` 中提供了地址联想输入建议：
1. **自动联想建议**：输入关键字时自动请求 Google Places Autocomplete，列出精确的本地建筑、街道或商场名称。
2. **本地 Mock 兜底**：如果谷歌地图脚本未加载或网络受限，自动降级切换到本地经典地标（例如 Monash, Sunway, Taylor's, Sunway Pyramid 等）关键词过滤列表，保障高可用，不会报错。

---

## 20. Whole Unit 合租意向：提交、公开、自行取消（2026-05-25）

### 学生端流程

```
PropertyListings → Whole Unit 详情
    → 「我要租」
    → 「提交意向」或「跳过，直接提交」
    → RPC submit_tenant_interest
    → 合租登记 1/Y · 名单出现 · 绿色成功提示
    → 随时「取消意向」→ RPC cancel_tenant_interest → 归零
```

### 与管理员的关系

| 动作 | 谁做 | 结果 |
|------|------|------|
| 提交意向 | 学生 | `status = interested` |
| 取消意向 | **学生自己** | `status = left`，**不等管理员** |
| 确认入住 | 管理员 AdminPanel | `status = confirmed`，计入「已确认入住」 |
| 移除意向 | 管理员 | `status = left` |

### 常见故障

| 现象 | 原因 | 修复 |
|------|------|------|
| 提交后仍 0/Y | 旧前端只统计 confirmed | 部署最新前端 |
| 「跳过」无反应 | 旧版只关表单未提交 | 同上 |
| 提交成功仍显示「我要租」 | myInterest 状态不同步 | 最新版用 authUserId + 列表推导 |
| 无法取消 | 未跑 014/015 | SQL Editor 执行两文件 |

---

## 你现在需要做的事（更新于 2026-05-26）

| 步骤 | 做什么 | 状态 |
|------|--------|------|
| 1️⃣ | 在 Supabase SQL Editor 运行 `supabase/schema.sql`（建表 + 触发器 + RLS） | ✅ 已执行 |
| 2️⃣ | 运行 `004_unit_media.sql`（加列 + Storage + 策略） | ✅ 已执行 |
| 3️⃣ | 运行 **`007_mobile_upload.sql`**（手机匿名上传凭证 RPC + Storage evidence/ 策略） | ⚠️ **必做**，否则手机上传失败 |
| 4️⃣ | 运行 **`008_whole_unit_room_type.sql`**（Whole Unit 房型） | ⚠️ 保存整租报错时必做 |
| 5️⃣ | 运行 **`009_unit_video_url.sql`**（看房视频 URL 字段） | ⚠️ Live 模式上传视频时必做 |
| 6️⃣ | 运行 **`010_agent_qr_separation.sql`**（收款码与审核隔离） | ⚠️ 按 Agent 隔离权限和收款码时必做 |
| 7️⃣ | 运行 **`011_optional_unit_number.sql`**（门牌号可选化） | ⚠️ 隐藏门牌号时必做 |
| 8️⃣ | 运行 **`012_remove_unit_number_display.sql`**（彻底隐藏门牌号） | ⚠️ 隐藏门牌号时必做 |
| 8️⃣b | 运行 **`013_landlord_payment_details.sql`**（后续月租付房东） | ⚠️ 学生第二个月起付房东时必做 |
| 8️⃣c | 运行 **`014_tenant_interests_user_update.sql`** + **`015_tenant_interest_rpc.sql`** | ⚠️ **Whole Unit 合租提交/取消必做** |
| 8️⃣d | 运行 **`016_maintenance_requests.sql`**（维修工单系统表） | ⚠️ 启用报修工单必做 |
| 8️⃣e | 运行 **`017_agent_profile_fields.sql`**（中介主页基本资料扩展字段） | ⚠️ **更新中介个人主页时必做** |
| 9️⃣ | 测试 Google 登录，确认 `users` 表自动创建了记录 | ✅ 已测试 |
| 🔟 | 在 `admin_users` 表手动添加管理员（或让 super_admin 在前端添加） | 按需做 |
| 1️⃣1️⃣ | 本地手机扫码测试：用 `192.168.x.x:3000` 而非 `localhost` | 见第 8 节 |
| 1️⃣2️⃣ | 生产环境 Redirect URLs 加入正式域名 `/auth/callback` | 部署时做 |
| 1️⃣3️⃣ | **Logo 更新**：提交 `frontend/public/logo.png` 后 `git push` | ❌ 无需 SQL，见第 16 节 |

---

## 20. 登录页多语言、深色模式与生产环境 SMTP 警告

### 多语言与深色模式支持
* 登录页面（`/login`）现在完整接入了全局 the ThemeProvider，通过顶部右侧的语言与主题切换按钮，允许用户随时切换“中/英”语言和“深/浅”主题。
* 解决了此前部分环境里登录页面被强行锁定为浅色模式的问题。

### 生产环境发信限制警告
* 针对免费或受限 SMTP 发信服务在发送 Magic Link 时可能会在 QQ 邮箱等国内邮箱产生拦截或延迟的问题，新增了高亮的双语警告框。
* **特别注意**：**严禁**在此文案中使用“沙箱”、“Sandbox”等技术术语，以防止普通用户产生混淆。统一采用“免费发信服务器通道限制”、“垃圾邮件箱检查”等业务层面的通俗指引。

---

## 21. 房源列表 Grid/List 视图模式与精简卡片

### 网格/列表切换
* 房源列表头部筛选 Bar 中增加了网格与列表切换按钮。
* 网格卡片高度和间距得到优化，使默认的网格布局卡片更紧凑精致。
* 列表模式采用通栏横向排列的 `PropertyRow` 组件展示，视觉层次更优美。

---

## 22. iProperty中介主页借鉴、头像压缩与去除社交外链

### 详情面板中介名片
* 房源详情抽屉中嵌入了中介个人名片，展示中介的头像、姓名、职位、代理公司名、执照编号等核心身份信息。
* 点击名片可打开完整的中介个人主页 Modal。

### 中介主页 Modal
* 个人主页采用卡片与 Tabs 交互，包含主营房源、个人简介、擅长领域。
* 主营房源 Tab 支持按最低/最高租金筛选，并有一键找房跳转功能。
* 包含带有前台规则验证的留言/预约意向表单，提交后弹窗提示成功，用户选择房间时可智能导流至租约与账单。

### 头像文件压缩
* 中介上传头像时使用 Canvas 压缩，强制转成 JPEG 且大小限制在 ≤30KB，节省云存储空间。

### 移除社交外链以限定内部闭环
* 移除了 Facebook URL 与个人 Website URL 两个外推引流字段，将用户的交互完全锁定在 Malaysia Ez Rent 平台内，由内建的预约和电话/微信/WhatsApp等联系方式满足服务闭环。

---

*文档更新：2026-05-26 · 含合租意向 RPC（014/015）、自行取消、缴租银行/微信/支付宝、禁止 iProperty、Memory vs Storage、Agent权限隔离与红点气泡通知、登录多语言与深色模式、房源列表多视图模式切换、iProperty中介主页与头像压缩(30KB)、去除社交引流外链*