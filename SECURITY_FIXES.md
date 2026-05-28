# 安全修复详解（写给小白）

## 一、我们修了什么？

总共做了 3 件事：

### 修复 1：后端 API 加了"门锁"（JWT 身份验证）

#### 之前的问题

你的后端 API（部署在 Render 上）就像一个**没有门的房子**，任何人都能走进去。

举个例子：你的聊天接口 `/api/chat` 以前长这样：

```
任何人 → 发请求到 Render → 后端直接处理 → 返回数据
```

请求里带了一个 `user_id: "tenant-123"`，后端就傻傻地相信"哦你是 tenant-123"，然后用超级管理员权限去数据库查这个人的所有数据。

**问题在于**：攻击者可以把 `user_id` 改成任何人的 ID，比如 `user_id: "admin-999"`，后端也会照查不误。

#### 现在的修复

```
登录用户 → 发请求到 Render（带上 Token）→ 后端验证 Token → 确认身份 → 处理请求
                                          ↗
                              没有 Token？→ 拒绝！返回 401
                              Token 过期？→ 拒绝！返回 401
                              Token 假的？→ 拒绝！返回 401
```

**Token 是什么？** 就像一张身份证。用户登录 Supabase 后，Supabase 会给用户签发一张"身份证"（JWT Token）。这张身份证是加密的，别人伪造不了。

**具体改了什么：**
- 后端新增了一个 `verify_supabase_token()` 函数（在 `backend/app/main.py`）
- 所有需要权限的接口（`/api/chat`、`/api/embeddings/sync`）都加了这个验证
- `user_id` 不再从请求里随便拿，而是从验证过的 Token 里提取——保证是真实用户

---

### 修复 2：CORS 从"随便谁都能调"改成"只有我的网站能调"

#### 之前的问题

CORS 是什么？想象你的后端是一家餐厅：

- `allow_origins=["*"]` = **全世界任何人**都能来你餐厅吃饭
- `allow_origins=["https://malaysia-ez-rent.vercel.app"]` = **只有你自己的网站**能调用

之前设置的是 `["*"]`，意味着**任何网站**（包括恶意网站）都能偷偷调用你的后端 API。

**攻击场景**：坏人做一个假网站，用户不小心点进去，坏人的网站就偷偷调用你的后端，用用户的登录信息查数据。

#### 现在的修复

```python
# 之前
allow_origins=["*"]           # 全世界都可以调

# 现在
allow_origins=["https://malaysia-ez-rent.vercel.app"]  # 只有我的网站能调
```

这样即使有恶意网站想调你的后端，浏览器也会直接拦截。

---

### 修复 3：前端发送请求时带上"身份证"

#### 之前的问题

前端调后端时，请求头里没有带 Token：

```javascript
// 之前
fetch(`${apiUrl}/api/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },  // 只有 Content-Type
  body: JSON.stringify({ query: userText, user_id: activeUserId })
})
```

#### 现在的修复

```javascript
// 现在
const { data: { session } } = await supabase.auth.getSession();
authToken = session?.access_token || '';   // 从 Supabase 取 Token

fetch(`${apiUrl}/api/chat`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`  // 带上"身份证"
  },
  body: JSON.stringify({ query: userText })
})
```

---

## 二、你需要做什么？

在 **Render** 的环境变量里加两个值：

| 变量名 | 值 | 在哪里找 |
|--------|-----|----------|
| `SUPABASE_JWT_SECRET` | 一串密钥 | Supabase Dashboard → Settings → API → JWT Secret |
| `FRONTEND_URL` | `https://malaysia-ez-rent.vercel.app` | 你的 Vercel 域名 |

加完之后重新部署 Render 服务即可。

---

## 三、其他几个漏洞的通俗解释

### `/diagnose` 页面泄露信息（已删除）

这个页面本来是给你调试用的，会把浏览器里的登录信息和 Cookie 全部显示出来。
虽然只有登录用户自己能看到自己的信息（看不到别人的），但没必要留着，所以直接删了。

### Cookie 不安全（低风险）

Mock 模式下的登录 Cookie 没有设置安全标志：
- `HttpOnly` = JavaScript 读不到（防 XSS 偷 Cookie）
- `Secure` = 只在 HTTPS 下传输（防被截获）
- `SameSite` = 防止跨站攻击

但你线上用的是 Supabase 真实登录，Supabase 自己的 Cookie 是安全的，所以这个影响不大。

### 数据库权限太松（低风险）

`users` 表和 `admin_users` 表的 RLS 策略允许任何人查看所有人的联系方式。
这意味着如果有人知道你的 Supabase URL 和 anon key，可以直接查数据库拿所有用户的手机号和邮箱。
如果想修，需要改 RLS 策略，但目前 Supabase anon key 本身权限有限，风险可控。

---

## 四、总结：修之前 vs 修之后

| 场景 | 修之前 | 修之后 |
|------|--------|--------|
| 外部网站调你的 API | 可以 | 被 CORS 拦截 |
| 直接用 curl 调 API（不登录） | 可以 | 返回 401 |
| 冒充别人的身份查数据 | 可以（传 user_id） | 不行（user_id 从 Token 取） |
| 烧你的 AI 额度 | 谁都可以 | 必须登录才行 |
