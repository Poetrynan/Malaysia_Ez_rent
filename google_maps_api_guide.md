# Google Maps API 使用及费用说明指南

本指南详细介绍了 **Malaysia Ez Rent** 系统中所调用的 Google Maps API、对应的扣费逻辑以及如何确保 API 在免费额度内运行的配置建议。

---

## 1. 调用的 Google Maps API 列表及计费

目前，系统主要调用了以下 **Google Maps Platform** 的 API 服务：

| API 名称 | 调用场景 / 功能 | 计费价格 (每 1,000 次) | 每月 $200 免费额度折合次数 |
| :--- | :--- | :--- | :--- |
| **Google Maps Embed API** | 学生端租房页面展示与 Sunway / Monash 大学的通勤路线地图 (Iframe 嵌套) | **完全免费 (Free)** | **无限次 (Unlimited)** |
| **Places API (Autocomplete)** | 管理端录入房源输入小区名称时，提供实时英文地名下拉联想 | **$2.83** | 约 **70,000 次** |
| **Places API (Details)** | 在联想下拉框中选中某个具体小区后，获取其经纬度（lat/lng）及完整英文地址 | **$17.00** | 约 **11,700 次** |
| **Maps JavaScript API** | 网页全局引入并加载谷歌地图 JavaScript 基础运行环境 | **$7.00** | 约 **28,500 次** |

---

## 2. 核心扣费逻辑与免费政策

Google Maps Platform 采取的是 **“先赠送、后扣费”** 的政策，对于个人和中小型项目非常友好：

1. **每月 $200 美元赠送金 (Monthly $200 Free Credit)**：
   * 谷歌云平台（Google Cloud Console）会在每月 1 号自动向您的结算账户发放 **$200 美元**的免费抵扣金额度。
   * 系统运行产生的所有 API 费用将优先在此额度内抵扣。只有当月度总账单**超出 $200 美元**时，才会开始从您绑定的信用卡中扣钱。
   
2. **免除高频消耗（Embed API 优势）**：
   * 针对学生端用户访问最频繁的“通勤路线图”板块，系统选用了 **Maps Embed API (Directions 模式)**。
   * 该 API 属于谷歌官方明确规定的 **免费/无上限** 服务。因此，无论网站每天有多少学生访问、刷新多少次，这部分都不会消耗任何预算或赠送金。

3. **费用控制结论**：
   * 在目前及中期的访问量级下，您每个月的实际扣款账单将为 **0 元**。

---

## 3. 安全性建议（限制 API Key 防止被盗刷）

为了防止您的 Google Maps API Key 被他人提取并恶意盗刷，强烈建议您在 **[Google Cloud Console](https://console.cloud.google.com/)** 中对该 Key 进行安全限制：

### 3.1 域名限制 (HTTP Referrer Restrictions)
只允许您自己的网站域名调用此 API。
1. 进入 Google Cloud Console -> **API 和服务** -> **凭据**。
2. 点击编辑您当前正在使用的 API 密钥。
3. 在“应用限制”下选择 **“网站 (HTTP 引用来源)”**。
4. 添加以下允许的域名规则：
   * `localhost:*` （本地开发测试使用，上线后可移除）
   * `*.vercel.app/*` （Vercel 预览及正式环境）
   * `*.[您的自定义域名]/*` （如有绑定独立域名）

### 3.2 API 限制 (API Restrictions)
限制此密钥只能调用本项目需要的 API。
1. 在同一编辑密钥页面，向下滚动到“API 限制”。
2. 选择 **“限制密钥”**。
3. 在下拉列表中仅勾选以下四项：
   * `Maps JavaScript API`
   * `Places API`
   * `Maps Embed API`
   * `Geocoding API` (可选，若未来需要反向解析)
4. 保存设置。
