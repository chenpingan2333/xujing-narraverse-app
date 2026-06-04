# 自定义角色系统

允许内测用户创建、管理自己的角色，并与现有的 persona 系统、关系引擎、记忆系统无缝集成。

## 架构概览

```
用户创建角色
     |
     v
POST /api/characters/custom  (requireAuth)
     |
     v
CustomCharacterService.create(userId, input)
     |-- userId 来自 session，非客户端
     |-- 输入经 Zod 校验
     |-- 返回 toCharacterResponse() 剥离 userId
     |
     v
响应不含 userId（客户端安全）

角色参与对话时:
     |
     v
CustomCharacterService.toPersonaInput() --> persona.builder.ts
     --> PersonaFingerprint --> system-prompt-builder.ts
     --> 注入到运行时系统提示词
```

## 文件结构

```
src/features/narraverse/characters/
├── types.ts          # CustomCharacter, Zod 校验, 响应类型
├── service.ts        # CRUD + 用户隔离 + persona 集成
└── __tests__/
    ├── custom-character.test.ts   # 单元测试
    └── beta-flow.test.ts          # 集成测试

app/api/characters/custom/
└── route.ts          # REST API (GET/POST/PATCH/DELETE)
```

## 数据模型

```typescript
interface CustomCharacter {
  id: string;           // "cchar-{timestamp}-{counter}"
  userId: string;       // 用户隔离键（服务端，不暴露）
  name: string;         // 1-40 字符
  persona: string;      // 1-1000 字符的角色描述
  description: string;  // 简短描述，最多300字符
  tier: "basic" | "premium" | "story";
  avatar: string;       // emoji 或短文本
  worldId: string | null;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

## API 端点

`app/api/characters/custom/route.ts`:

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | `/api/characters/custom` | 列出当前用户所有角色 |
| GET | `/api/characters/custom?id=X` | 获取单个角色 |
| POST | `/api/characters/custom` | 创建角色 |
| PATCH | `/api/characters/custom` | 更新角色（body 包含 id） |
| DELETE | `/api/characters/custom?id=X` | 删除角色 |

## 安全约束

### 用户隔离
- `userId` 从 `requireAuth()` 的 session 中提取
- 客户端 body 中的任何 userId 字段被忽略
- `list()`, `get()`, `update()`, `delete()` 均校验 `userId` 匹配
- 跨用户访问返回 404（而非 403），防止信息泄露

### 输入校验
- `CreateCharacterRequest` Zod schema 校验名称、描述长度
- `UpdateCharacterRequest` 允许部分更新
- `tier` 限于 `basic | premium | story`

### 响应安全
- `toCharacterResponse()` 剥离 `userId` 字段
- 客户端永远看不到角色属于哪个用户

## Persona 集成

`CustomCharacterService.toPersonaInput()` 将 `CustomCharacter` 转换为 `PersonaBuilderInput`，可直接传入 `persona.builder.ts` 生成 `PersonaFingerprint`，再由 `system-prompt-builder.ts` 注入系统提示词。

此路径不修改 `chat.runtime.ts` — 由 API 层在调用 `runChat` 前完成角色到 persona 的转换。

## 当前限制（MVP）

- 使用内存存储（`Map<string, CustomCharacter>`）
- 生产环境需迁移至 PostgreSQL，表结构需包含 `user_id` 索引
