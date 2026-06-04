# 叙境 Mobile App — Capacitor 构建指南

## 一、项目结构

```
d-modelbridge-app-app/
├── app/                  # Next.js App Router 页面
├── src/                  # 业务逻辑层
├── android/              # Capacitor Android 项目 (已生成)
├── out/                  # WebView 资源目录
├── capacitor.config.ts   # Capacitor 配置
├── .env.local            # GitHub OAuth + QQ SMTP
└── package.json          # 含 @capacitor/* 依赖
```

## 二、依赖安装

```powershell
cd C:\Users\陈平安\Documents\Codex\2026-06-03\d-modelbridge-app-app
pnpm install --no-frozen-lockfile
```

## 三、Capacitor 配置说明

`capacitor.config.ts` 使用 **dev server 模式**：

```ts
server: {
  url: "http://192.168.1.28:3004",  // 你的电脑局域网 IP
  cleartext: true,
  allowNavigation: ["github.com", "api.github.com"],
}
```

这意味着 Android App 启动后会自动加载你电脑上运行的 Next.js dev server。
**不需要**把网页打包进 APK — 全部走网络加载。

### 切换 IP 地址

如果你的电脑 IP 变了，修改 `capacitor.config.ts` 中的 `url`，然后：

```powershell
npx cap sync
```

或者在终端设环境变量绕过去：

```powershell
$env:CAPACITOR_DEV_URL="http://你的IP:3004"
```

## 四、构建 APK

### 前置条件

1. **JDK 17+** — [下载](https://adoptium.net/)
2. **Android SDK** — 安装 Android Studio 会自动带上
3. 设置环境变量：

```powershell
$env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.12.7-hotspot"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
```

### 构建命令

```powershell
# 1. 确保 dev server 在跑
npm run dev

# 2. 同步 Capacitor 配置到 Android
npx cap sync

# 3. 构建 debug APK
cd android
.\gradlew.bat assembleDebug
```

APK 输出位置：

```
android\app\build\outputs\apk\debug\app-debug.apk
```

### 安装到手机

```powershell
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

或者直接把 APK 传到手机安装。

## 五、开发工作流

```
1. npm run dev              → 启动 Next.js dev server
2. 修改代码                  → Next.js HMR 自动刷新
3. npx cap sync             → 同步 Android 配置
4. npx cap open android     → 在 Android Studio 打开
5. Android Studio → Run     → 部署到手机/模拟器
```

### Live Reload

Capacitor dev server 模式下，修改 Next.js 代码后，Android App 中**下拉刷新**即可看到更新。
不需要重新编译 APK。

## 六、生产构建

如果要发布不依赖 dev server 的独立 APK：

### 方案 A：部署到服务器

1. 把 Next.js 部署到 Vercel / 自己的服务器
2. 修改 `capacitor.config.ts`：

```ts
server: {
  url: "https://narraverse.your-domain.com",
  cleartext: false,
}
```

3. `npx cap sync && cd android && .\gradlew.bat assembleRelease`

### 方案 B：打包进 APK

1. 修改 `next.config.ts`：

```ts
const nextConfig: NextConfig = {
  output: "export",  // 静态导出
  // ... 其他配置
};
```

2. `npm run build` → 输出到 `out/`
3. 修改 `capacitor.config.ts`：删除 `server` 块
4. `npx cap sync && cd android && .\gradlew.bat assembleDebug`

⚠️ 静态导出模式下 **API routes 不可用**（/api/chat, /api/auth 等）。需要额外部署后端服务。

## 七、OAuth 注意事项

### GitHub OAuth

GitHub OAuth callback URI 需要匹配 dev server 地址。

当前 `.env.local` 配置：
```
GITHUB_REDIRECT_URI=http://localhost:3000/api/auth/github/callback
```

在手机上测试时，GitHub 回调会跳转到 `localhost:3000`，手机上无法访问。
**解决方案**：

1. 在 GitHub OAuth App 设置中添加 callback URL：
   `http://192.168.1.28:3004/api/auth/github/callback`

2. 使用 ngrok 做公网隧道（推荐）：
   ```powershell
   npx ngrok http 3004
   ```
   然后在 GitHub OAuth App 设置中使用 ngrok 提供的 URL。

### Email OTP

QQ SMTP 已配置（`.env.local`），验证码会真实发送到用户邮箱。
手机上直接可用，不依赖 callback URL。

## 八、移动端 UI 适配

已完成的适配：

- ✅ `viewport-fit=cover` — iPhone 刘海屏安全区
- ✅ `safe-area-inset-*` CSS 变量 — 内容不被刘海/底部横条遮挡
- ✅ `overscroll-behavior: none` — 防止 WebView 下拉回弹
- ✅ 键盘弹出时内容上移
- ✅ 触控按钮最小 44px（符合 iOS HIG）
- ✅ `font-size: 16px` 防 iOS 输入框自动缩放
- ✅ 移动端 sidebar 自动隐藏，drawer 替代

## 九、常见问题

### Q: APK 安装后白屏
A: 检查 dev server 是否在运行，手机和电脑是否同一 WiFi。

### Q: GitHub 登录后回不来
A: 回调 URL 是 localhost，手机无法访问。用 ngrok 或部署到公网服务器。

### Q: gradlew 报 JAVA_HOME 错误
A: 安装 JDK 17+ 并设置 `JAVA_HOME` 环境变量。

### Q: 如何用模拟器测试
A: 打开 Android Studio → AVD Manager → 创建模拟器 → Run。
模拟器中 `10.0.2.2` 自动映射到宿主机 localhost。

## 十、当前插件

| 插件 | 用途 |
|------|------|
| `@capacitor/status-bar` | 状态栏样式控制 |
| `@capacitor/keyboard` | 键盘弹出/收起监听 |
| `@capacitor/browser` | 外部浏览器打开链接（OAuth） |

## 十一、下一步

- [ ] 安装 JDK 17+
- [ ] 安装 Android Studio（带 SDK）
- [ ] 运行 `npx cap open android` 在 Android Studio 中打开项目
- [ ] 连接手机或启动模拟器
- [ ] 点击 Run 部署
- [ ] 生产环境部署后，切换 capacitor.config.ts 到生产 URL
