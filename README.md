# AquaDrive 多语言液压泵外贸网站模板

这是一套可直接部署的多语言外贸网站模板，专为挖掘机液压泵产品设计。

## 包含语言
- 英语 (en)
- 法语 (fr)
- 阿拉伯语 (ar，自动右到左排版)
- 葡萄牙语 (pt)

## 文件说明
- `index.html` —— 首页
- `contact.html` —— 联系/询盘页
- `products.html` —— 产品页（可自行扩展）
- `about.html` —— 关于我们页（可自行扩展）
- `css/style.css` —— 样式
- `js/i18n.js` —— 多语言切换脚本
- `lang/*.json` —— 各语言翻译文件
- `images/` —— 图片
- `_redirects` —— Cloudflare Pages 路由配置

## 怎么改成你公司的内容
1. 修改 `lang/` 下的 json 文件 —— 改文字
2. 把产品图片放进 `images/` —— 改图片
3. 修改 `js/i18n.js` 里的 `WHATSAPP_NUMBER` —— 改成你的 WhatsApp 号
4. 全局替换 "AquaDrive"、"sales@yourcompany.com" 为你的真实信息

## 怎么新增一种语言（例如斯瓦希里语 sw）
1. 复制 `lang/en.json` 为 `lang/sw.json`，翻译里面的文字
2. 在 `js/i18n.js` 的 `SUPPORTED_LANGS` 数组里加 `'sw'`
3. 在每个 html 的语言菜单 `.lang-menu` 里加一个按钮

详见随附的《多语言外贸网站建站操作手册》。
