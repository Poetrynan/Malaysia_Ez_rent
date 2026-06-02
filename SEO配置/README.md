# SEO 配置文件

## 文件清单

| 文件 | 说明 | 放置位置 |
|------|------|---------|
| `robots.txt` | 搜索引擎爬虫规则 | `frontend/public/robots.txt` |
| `sitemap.ts` | 网站地图 | `frontend/src/app/sitemap.ts` |
| `layout-update.tsx` | 更新后的 layout.tsx | `frontend/src/app/layout.tsx` |
| `og-image.html` | OG预览图模板 | 生成图片后放 `frontend/public/og-image.png` |

---

## 部署步骤

### 1. 复制文件

```bash
# 复制 robots.txt
cp SEO配置/robots.txt frontend/public/

# 复制 sitemap.ts
cp SEO配置/sitemap.ts frontend/src/app/

# 更新 layout.tsx（手动合并代码）
```

### 2. 提交到搜索引擎

| 平台 | 地址 | 操作 |
|------|------|------|
| Google | https://search.google.com/search-console | 添加网站 → 验证 → 提交sitemap |
| 百度 | https://ziyuan.baidu.com | 添加网站 → 验证 → 提交sitemap |
| Bing | https://www.bing.com/webmasters | 添加网站 → 验证 → 提交sitemap |

### 3. 验证 sitemap

部署后访问：`https://ezrent.my/sitemap.xml`

### 4. 验证 robots.txt

部署后访问：`https://ezrent.my/robots.txt`

---

## 注意事项

- 部署后需要等待 1-7 天才能被搜索引擎收录
- 可以在 Search Console 中手动请求索引
- 定期更新 sitemap（添加新页面时）
