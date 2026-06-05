# 角色卡批量导入

## 文件夹说明

```
characters-import/
├── json/       ← 放入 Tavern Character Card V2 或 Chub.ai 格式的 .json 文件
├── images/     ← 放入对应角色图片（与 json 文件同名，如 沈离愁.png）
└── README.md
```

## 命名规则

- JSON 文件名 = 角色名（如 `沈离愁.json`）
- 图片文件名与 JSON 文件**同名**，支持 .png / .jpg / .jpeg / .webp / .gif
- 示例：`json/沈离愁.json` + `images/沈离愁.png`

## 使用方式

### 导入为官方角色
```bash
$env:DATABASE_URL="你的数据库连接串"
$env:IMPORT_AS_OFFICIAL="true"
node scripts/bulk-import-characters.cjs
```

### 导入为普通角色（仅预览）
```bash
$env:DATABASE_URL="你的数据库连接串"
node scripts/bulk-import-characters.cjs
```
（不设置 IMPORT_AS_OFFICIAL 时只预览不写入；用户角色请通过前端导入页面操作）

## 支持的格式

- **Tavern Character Card V2** (`"spec": "chara_card_v2"`)
- **Chub.ai** 格式
- 叙境扩展字段放在 `data.extensions.narraverse`：
  - `speechStyle` → speech_style
  - `worldView` → world_view
  - `storyNodes` → story_nodes

## 图片

图片会自动复制到 `public/characters/` 目录，avatar 字段设置为 `/characters/文件名.png`。