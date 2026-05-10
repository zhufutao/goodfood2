# 青竹小吃

一个适合部署到 Cloudflare Pages 的小吃配方网站，包含前端、Pages Functions 后端、D1 数据库、R2 图片存储绑定和管理员后台。

## 当前功能

- 首页分类浏览，默认显示全部小吃。
- 搜索小吃名称。
- 小吃详情页展示配方、制作步骤、三张展示图和点赞。
- 注册、登录、退出登录。
- 未登录用户点赞时跳转登录。
- 用户中心查看点赞过的配方。
- 管理员后台新增、修改、删除小吃配方。
- 新增配方时会生成占位展示图；后续可替换为通义万相、火山方舟、硅基流动等图片模型 provider。

## 管理员账号

固定管理员邮箱：`admin@goodfood`

首次使用时，在注册页用 `admin@goodfood` 注册，该账号会自动成为管理员。请使用强密码。

## 本地开发

```bash
npm install
npm run build
npm run db:migrate:local
npm run pages:dev
```

如果 PowerShell 拦截 `npm.ps1`，使用：

```bash
npm.cmd install
npm.cmd run build
```

## Cloudflare 配置

1. 在 Cloudflare 创建 D1 数据库：`goodfood2-db`。
2. 在 Cloudflare 创建 R2 bucket：`goodfood2-images`。
3. 把 D1 的 `database_id` 填入 `wrangler.jsonc`。
4. 在 Cloudflare Pages 中连接 GitHub 仓库。
5. 构建命令：`npm run build`。
6. 输出目录：`dist`。
7. 绑定 D1：变量名 `DB`。
8. 绑定 R2：变量名 `FOOD_IMAGES`。
9. 部署后执行远程迁移：

```bash
npm run db:migrate:remote
```

## 图片模型接入

当前默认 `IMAGE_PROVIDER=placeholder`，用于无 API Key 的开发阶段。

已内置通义万相 provider：

```text
IMAGE_PROVIDER=dashscope
DASHSCOPE_API_KEY=你的通义万相 API Key
```

也兼容：

```text
IMAGE_API_KEY=你的通义万相 API Key
```

如果你的阿里云 DashScope 账号需要 workspace，可以额外配置：

```text
DASHSCOPE_WORKSPACE=你的 workspace
```

本地开发不要把 key 写入代码，放到 `.dev.vars`：

```text
IMAGE_PROVIDER=dashscope
DASHSCOPE_API_KEY=你的通义万相 API Key
```

Cloudflare Pages 生产环境请在 Dashboard 的环境变量里设置同名变量。

图片生成流程：

- 管理员保存新配方。
- 后端调用通义万相创建异步生图任务。
- 轮询任务结果。
- 下载生成图到 R2。
- 数据库保存 `/api/images/...` 站内图片地址。

注意：通义万相任务返回的临时图片 URL 通常有有效期，所以必须保存到 R2，不能直接长期使用原始 URL。
