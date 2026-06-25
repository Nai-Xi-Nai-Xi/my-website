# 乃希的个人网站

这是一个可以长期更新的个人网站。前台负责展示，后台负责编辑内容和上传图片，内容保存在 `data/site.json`，上传的图片会进入 `public/uploads`。

## 本地预览

推荐直接运行：

```powershell
.\start-site.ps1
```

如果电脑里有 Node.js，也可以运行：

```powershell
npm start
```

如果默认 Node.js 被系统拦截，可以直接用 Codex 自带的运行时：

```powershell
& "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe" server.js --port=3001
```

前台地址：`http://localhost:3000`

后台地址：`http://localhost:3000/admin`

如果使用 `--port=3001`，就把地址里的 `3000` 改成 `3001`。

## 更新内容

后台默认管理密钥是：

```text
naixi-admin
```

打开后台后可以更新主页信息、栏目内容、条目正文、图片地址和社交平台。图片可以在条目里直接上传，上传后记得点“保存全部”。

栏目里的这些显示名称都可以在后台设置：

- 顶部菜单名称
- 板块主标题
- 板块上方小字
- 板块说明
- 板块标签

正式公开部署时，建议设置自己的管理密钥：

```powershell
$env:ADMIN_TOKEN="你的新密钥"
npm start
```

## X / Twitter 咖啡同步

后台新增了“咖啡推文同步”。它会读取 X API 最近搜索结果，把指定账号里包含关键词的推文同步到 `coffee` 栏目。

**推荐方式（后台粘贴）：**

1. 打开 http://localhost:3000/admin
2. 滚动到「咖啡推文同步」
3. 把 Bearer Token 粘贴到输入框，点「保存 Token」
4. 点「同步咖啡推文」

Token 会保存在本机 `.private/twitter.json`，不会写进 `site.json`。

**备选方式（环境变量）：**

启动服务前设置 Bearer Token：

```powershell
$env:X_BEARER_TOKEN="你的 X API Bearer Token"
.\start-site.ps1
```

后台里填写：

- X/Twitter 用户名：不带 `@`
- 关键词：默认 `咖啡`
- 同步到哪个栏目 ID：默认 `coffee`
- 高级搜索 Query：可留空；留空时会使用 `from:用户名 咖啡 -is:retweet`

注意：X API 最近搜索通常只返回接口可检索范围内的公开推文，是否可用取决于你的 X 开发者账号权限和当前 API 限制。

## 栏目

当前已经预置这些栏目：

- 扩列介绍
- 乃希汉化
- 咖啡日常
- 音乐作品
- 摄影作品
- 小随笔
- 社交平台

以后可以继续在后台添加栏目或条目。
