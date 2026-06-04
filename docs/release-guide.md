# 叙境 Release 发布指南

## 架构

```
Next.js (SSR + API) → Vercel 部署
                        ↑
Capacitor APK (WebView) ─┘  加载 Vercel URL
```

**为什么不用静态导出？** Next.js API routes（`/api/chat`、`/api/auth` 等）是服务端代码，`output: "export"` 无法处理。Vercel 免费部署全功能，APK 只做 WebView 壳 — 零服务器依赖在 APK 内。

## 一键构建 Release APK

```powershell
.\scripts\build-release.ps1 -VersionName "1.0.0" -VersionCode "1"
```

脚本自动完成：
1. 设置版本号
2. 生成/检查 keystore（首次自动创建）
3. `npm run build` Next.js 生产构建
4. `npx cap sync` 同步 Capacitor
5. `gradlew assembleRelease` 编译签名 APK

APK 输出：`android/app/build/outputs/apk/release/app-release.apk`

## 手动构建步骤

```powershell
# 1. 部署后端到 Vercel
npx vercel --prod
# 记下 URL（例如 https://narraverse.vercel.app）

# 2. 设置 Capacitor URL
$env:NARRAVERSE_URL = "https://narraverse.vercel.app"
npx cap sync

# 3. 生成 keystore（仅首次）
keytool -genkey -v \
  -keystore android/narraverse-release.keystore \
  -alias narraverse \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass narraverse2026 \
  -keypass narraverse2026 \
  -dname "CN=Narraverse, OU=Dev, O=Narraverse, L=Beijing, ST=Beijing, C=CN"

# 4. 创建 android/keystore.properties
@"
storeFile=narraverse-release.keystore
storePassword=narraverse2026
keyAlias=narraverse
keyPassword=narraverse2026
"@ | Out-File android/keystore.properties

# 5. 构建 APK
cd android
.\gradlew.bat assembleRelease
```

## GitHub Release 发布

### 自动发布（推荐）

推送 tag 自动触发 GitHub Actions：

```powershell
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions 自动：
1. 构建 Next.js
2. 编译 signed APK
3. 创建 GitHub Release 并上传 APK

**需要的 GitHub Secrets**：
- `KEYSTORE_PASSWORD` — keystore 密码

在 GitHub repo → Settings → Secrets → Actions → New secret 添加。

### 手动发布

1. 运行 `.\scripts\build-release.ps1`
2. 去 GitHub Releases 页面 → Draft a new release
3. Tag: `v1.0.0`
4. 上传 `android/app/build/outputs/apk/release/app-release.apk`
5. Publish

## 环境变量

| 变量 | 用途 | 默认值 |
|------|------|--------|
| `NARRAVERSE_URL` | Capacitor 加载的线上 URL | `https://narraverse.vercel.app` |
| `GITHUB_CLIENT_ID` | GitHub OAuth | （在 .env.local） |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth | （在 .env.local） |
| `SMTP_HOST` | 邮件服务 | `smtp.qq.com` |
| `SMTP_USER` | 邮箱账号 | （在 .env.local） |
| `SMTP_PASS` | 邮箱授权码 | （在 .env.local） |

## 用户安装 APK

1. 从 GitHub Releases 下载最新 APK
2. 打开 APK 文件
3. 允许「安装未知来源应用」
4. 打开 叙境 → 登录 → 开始使用

## 开发者更新流程

```
1. 修改代码 → npm run dev 本地测试
2. 提交 git → push
3. 部署: npx vercel --prod
4. 构建 APK: .\scripts\build-release.ps1 -VersionName "1.0.1"
5. 发布: git tag v1.0.1 && git push origin v1.0.1
   (GitHub Actions 自动构建 + Release)
```

## Vercel 首次部署

```powershell
npm i -g vercel
vercel login
vercel          # 按提示操作，会得到一个 URL
vercel --prod   # 生产部署
```

然后在 Vercel Dashboard 设置环境变量（GitHub OAuth、SMTP 等）。

## 约束确认

- ✅ 不改 Chat Runtime / Provider / Memory / Payment / Story Engine
- ✅ 不引入新服务器依赖（Vercel 托管，APK 内无服务器）
- ✅ 保持现有 UI 与功能不变
- ✅ 无 OTA / 热更新逻辑
