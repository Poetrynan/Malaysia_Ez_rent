# Malaysia Ez Rent 部署指南

> 前端 → Vercel（免费）| 后端 → Render（免费）| 数据库 → Supabase（已在用）

---

## 一、部署前准备

### 1.1 推送代码到 GitHub

如果还没有 Git 仓库：

```bash
# 在项目根目录初始化 Git
cd C:\Users\Administrator\Desktop\Malaysia_Ez_rent
git init
git add .
git commit -m "Initial commit"
```

在 GitHub 上创建新仓库（不要勾选 README），然后：

```bash
git remote add origin https://github.com/你的用户名/Malaysia_Ez_rent.git
git push -u origin main
```

### 1.2 确认环境变量

部署时需要用到以下环境变量，提前准备好：

**前端（`.env.local`）：**

| 变量名 | 用途 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase 公开 Key |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `NEXT_PUBLIC_AGENT_API_URL` | 后端 API 地址（部署后改成 Render 的地址） |
| `NEXT_PUBLIC_AGENT_MODEL` | AI 模型名称 |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API Key |

**后端（`.env`）：**

| 变量名 | 用途 |
|--------|------|
| `OPENAI_API_KEY` | SiliconFlow API Key |
| `OPENAI_API_BASE` | API 端点 |
| `NEXT_PUBLIC_AGENT_MODEL` | AI 模型名称 |
| `TAVILY_API_KEY` | 联网搜索 Key |
| `GOOGLE_MAPS_API_KEY` | Google Maps Key |

---

## 二、部署前端到 Vercel

### 2.1 注册 Vercel

1. 打开 https://vercel.com
2. 点 **Sign Up** → 选 **Continue with GitHub**
3. 用你的 GitHub 账号登录

### 2.2 导入项目

1. Vercel 后台 → 点 **Add New...** → **Project**
2. 找到你的 `Malaysia_Ez_rent` 仓库 → 点 **Import**
3. 配置如下：
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`（因为代码在 frontend 子目录）
   - **Build Command**: `next build`（默认即可）
   - **Output Directory**: `.next`（默认即可）

### 2.3 配置环境变量

在 **Environment Variables** 区域，逐个添加：

```
NEXT_PUBLIC_SUPABASE_URL = https://legiyebykxmztaewlmhv.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = sb_publishable_Uzk4ArRjDh6XkgUDak9c3A_PyyNAY8j
NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_Uzk4ArRjDh6XkgUDak9c3A_PyyNAY8j
NEXT_PUBLIC_AGENT_API_URL = https://你的后端地址.onrender.com
NEXT_PUBLIC_AGENT_MODEL = deepseek-ai/DeepSeek-V3
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY = AIzaSyBV5bx2HlbDGqLv0C3rQmPgGdARm28Qr34
```

> **注意：** `NEXT_PUBLIC_AGENT_API_URL` 先空着，等后端部署完再填。

### 2.4 部署

点 **Deploy**，等 1-2 分钟，部署完成后 Vercel 会给你一个域名：
```
https://malaysia-ez-rent.vercel.app
```

### 2.5 更新 Supabase Redirect URLs

部署后需要在 Supabase 后台添加新的 Redirect URL：

1. Supabase → Authentication → URL Configuration
2. **Site URL** 改为：`https://malaysia-ez-rent.vercel.app`
3. **Redirect URLs** 添加：`https://malaysia-ez-rent.vercel.app/auth/callback`

### 2.6 更新 Google Cloud Console

Google OAuth 的 Authorized JavaScript origins 和 Redirect URIs 也要更新：

1. Google Cloud Console → APIs & Services → Credentials
2. 编辑你的 OAuth 2.0 Client
3. **Authorized JavaScript origins** 添加：`https://malaysia-ez-rent.vercel.app`
4. **Authorized redirect URIs** 保持不变（Supabase 的地址不用改）

---

## 三、部署后端到 Render

### 3.1 注册 Render

1. 打开 https://render.com
2. 点 **Get Started** → 选 **GitHub** 登录

### 3.2 创建 Web Service

1. Render 后台 → **New** → **Web Service**
2. 连接你的 GitHub 仓库
3. 配置如下：

| 配置项 | 值 |
|--------|---|
| **Name** | `ezrent-backend` |
| **Region** | Singapore（离马来西亚最近） |
| **Root Directory** | `backend` |
| **Runtime** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | Free |

### 3.3 配置环境变量

在 **Environment** 区域添加：

```
OPENAI_API_KEY = sk-uljpyrlxkvmtqmehbphjuqnnzpwctuogiilvgmqglcyskbdr
OPENAI_API_BASE = https://api.siliconflow.cn/v1
NEXT_PUBLIC_AGENT_MODEL = deepseek-ai/DeepSeek-V3
TAVILY_API_KEY = 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
GOOGLE_MAPS_API_KEY = AIzaSyBV5bx2HlbDGqLv0C3rQmPgGdARm28Qr34
```

### 3.4 部署

点 **Create Web Service**，等 2-3 分钟构建完成后，Render 给你一个域名：
```
https://ezrent-backend.onrender.com
```

### 3.5 回去更新前端环境变量

拿到后端域名后，回 Vercel 更新 `NEXT_PUBLIC_AGENT_API_URL`：

1. Vercel → 你的项目 → **Settings** → **Environment Variables**
2. 编辑 `NEXT_PUBLIC_AGENT_API_URL`，改为：`https://ezrent-backend.onrender.com`
3. **Deployments** → 最新一次部署 → **Redeploy**（重新部署前端）

---

## 四、部署后检查清单

| 检查项 | 怎么验证 |
|--------|---------|
| 前端能访问 | 打开 `https://xxx.vercel.app`，看到登录页 |
| Google 登录能用 | 点"用 Google 账号登录"，跳转 Google 授权页 |
| 登录后跳转正常 | 授权后回到首页，不报错 |
| 管理员判断正确 | admin 用户看管理端，student 用户看学生端 |
| AI 对话能用 | 在 AI 聊天页发消息，后端有响应 |
| 后端冷启动 | Render 免费版首次访问要等 30 秒，正常现象 |

---

## 五、常见问题

### Q: Render 免费版会休眠？
**A:** 是的。15 分钟没有请求，服务会自动休眠。下次访问需要 30-50 秒冷启动。如果介意：
- 用 **UptimeRobot**（免费）每 5 分钟 ping 一次后端，防止休眠
- 或者升级到 **Railway**（$5/月免费额度，不休眠）

### Q: Vercel 免费版有什么限制？
**A:** 个人项目完全够用：
- 无限站点
- 100GB 带宽/月
- 自动 HTTPS
- 每次 push 自动重新部署

### Q: 部署后环境变量改了，要重新部署吗？
**A:**
- **Vercel**：改环境变量后需要手动点 **Redeploy**
- **Render**：改环境变量后会自动重新部署

### Q: 前端和后端在不同域名，会有跨域问题吗？
**A:** 后端 `main.py` 已经配置了 CORS 允许所有来源。如果上线后要收紧，改成只允许你的 Vercel 域名：
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://malaysia-ez-rent.vercel.app"],
    ...
)
```

### Q: Supabase 需要额外配置吗？
**A:** 需要更新两个地方：
1. **Redirect URLs**：加上 Vercel 的回调地址
2. **Google OAuth**：Google Cloud Console 加上 Vercel 的域名

数据库本身不需要改动，Supabase 本身就是云服务。

### Q: 怎么查看部署日志？
**A:**
- **Vercel**：项目 → Deployments → 点某次部署 → View Function Logs
- **Render**：项目 → Logs 标签页

---

## 六、后续维护

### 代码更新
```bash
# 本地改完代码后
git add .
git commit -m "描述改了什么"
git push
```
- Vercel 会自动检测到 push，自动重新部署前端
- Render 也会自动重新部署后端

### 数据库迁移
新增迁移脚本后，在 Supabase SQL Editor 手动运行新的迁移文件。

### 域名绑定（可选）
- Vercel 支持绑定自定义域名（免费）
- Render 免费版不支持自定义域名

---

## 七、费用总结

| 服务 | 平台 | 月费用 |
|------|------|--------|
| 前端 | Vercel Free | $0 |
| 后端 | Render Free | $0 |
| 数据库 | Supabase Free | $0 |
| 域名（可选） | 自行购买 | ~$10/年 |
| **总计** | | **$0** |

---

*由 Antigravity AI 辅助生成 · Malaysia Ez Rent Project*
