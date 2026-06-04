# 叙境 (Narraverse) 项目代码撰写规则

每次撰写、修改、修复本项目代码时必须逐条核对以下规则。

---

## 规则 0: 不 revert 用户改动

`NEVER` revert 不是你自己造成的改动。用户的改动即使你不理解，也必须保留并适配，而不是回退。只对你自己引入的问题负责。

---

## 规则 1: PowerShell 写入文本文件 = 禁用 Set-Content

### Bug 表现
GitHub Actions (Linux) 报 `SyntaxError: Unexpected token '﻿'`。文件头出现不可见字符 `\uFEFF`。

### 根因
PowerShell 的 `Set-Content -Encoding utf8` 和 `Out-File -Encoding utf8` 会在文件头写入 UTF-8 BOM。

### 正确写法
```powershell
# 读
$content = Get-Content -Raw -Path "path/to/file.json"
# 写（无 BOM）
[System.IO.File]::WriteAllText("path/to/file.json", $content, [System.Text.UTF8Encoding]::new($false))
```

### 适用文件类型
`package.json`, `tsconfig.json`, `.json`, `.ts`, `.tsx`, `.js`, `.yml`, `.yaml`, `.env` — 所有会被 Linux CI 解析的文本文件。

---

## 规则 2: Android 图标 = 只用 PNG

### Bug 表现
Android 8.0+ 设备上 APP 图标显示为默认 Android 机器人，而非实际图标。

### 根因
Android API 26+ 优先使用 `mipmap-anydpi-v26/` 目录下的 adaptive icon XML。这些 XML 引用 `ic_launcher_foreground.png`（默认机器人）和 `ic_launcher_background`（白色），覆盖了 `mipmap-*/ic_launcher.png` 的实际图标。

### 必须删除的文件
```
android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
android/app/src/main/res/mipmap-*/ic_launcher_foreground.png    (所有 density)
android/app/src/main/res/drawable-v24/ic_launcher_foreground.xml
android/app/src/main/res/drawable/ic_launcher_background.xml
android/app/src/main/res/values/ic_launcher_background.xml
```

### `resources/android/icon/` 目录规范
该目录供 GitHub Actions `Restore app icon` 步骤使用。**只能**包含以下结构：
```
resources/android/icon/
  mipmap-hdpi/ic_launcher.png
  mipmap-hdpi/ic_launcher_round.png
  mipmap-mdpi/...
  mipmap-xhdpi/...
  mipmap-xxhdpi/...
  mipmap-xxxhdpi/...
```
不允许有任何 `mipmap-anydpi-v26/`、`ic_launcher_foreground.png`、`drawable/`、`values/`。

---

## 规则 3: 本项目用 cmd /c 跑 Node 工具链

### 原因
PowerShell 执行策略禁止直接运行 `npx`、`pnpm` 等脚本。

### 正确写法
```powershell
cmd /c "cd /d D:\modelbridge\叙境app\narraverse-app && pnpm build 2>&1"
cmd /c "cd /d D:\modelbridge\叙境app\narraverse-app && npx cap sync android 2>&1"
```

需要网络时加代理：
```powershell
cmd /c "set HTTP_PROXY=http://127.0.0.1:7897 && set HTTPS_PROXY=http://127.0.0.1:7897 && cd /d D:\modelbridge\叙境app\narraverse-app && pnpm install --no-frozen-lockfile 2>&1"
```

### PowerShell 不支持 &&
PowerShell 用 `;` 分隔命令，不是 `&&`：
```powershell
git add .; git commit -m "msg"  # 正确
git add . && git commit -m "msg"  # 错误！PowerShell 不支持
```

---

## 规则 4: 项目特定配置速查

| 项目 | 值 |
|------|-----|
| 包管理器 | `pnpm`（不是 npm/yarn） |
| 模块系统 | ESM（`"type": "module"`），`.cjs` 文件用 CommonJS |
| 代理 | `HTTP_PROXY=http://127.0.0.1:7897` |
| Web 部署 | Vercel（push → 自动部署） |
| Android 构建 | GitHub Actions（push tag `v*.*.*` → 自动构建 + Release） |
| 数据库 | Neon PostgreSQL (`ep-falling-meadow-...neon.tech`) |
| 图标源 | `resources/android/icon/` → workflow 的 `Restore app icon` |
| 工作目录 | `D:\modelbridge\叙境app\narraverse-app` |

---

## 规则 5: 改动后立即验证 BOM

修改任何 JSON/TS 文件后，用以下命令确认没有 BOM：
```powershell
$bytes = [System.IO.File]::ReadAllBytes("path/to/file.json")
if ($bytes[0] -eq 0xEF -and $bytes[1] -eq 0xBB -and $bytes[2] -eq 0xBF) {
    Write-Host "ERROR: BOM present!"
} else {
    Write-Host "OK: No BOM"
}
```

---

## 规则 6: cap sync 后验证图标

`npx cap sync android` 执行后，用以下命令确认图标干净：
```powershell
Get-ChildItem -Path "android/app/src/main/res" -Recurse -Name | Select-String -Pattern "ic_launcher"
```
输出应该只有 `mipmap-*/ic_launcher.png` 和 `mipmap-*/ic_launcher_round.png`。不应出现 `mipmap-anydpi-v26`、`ic_launcher_foreground`、`drawable/`、`values/`。