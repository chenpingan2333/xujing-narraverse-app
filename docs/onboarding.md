# 叙境 Narraverse — Onboarding System

## 概述

Onboarding 系统负责新用户的首次体验流程，确保在 60 秒内完成：
注册 → 角色选择 → 世界选择 → 首段对话 → 情绪反馈 → 关系建立。

## Flow 状态机

```
welcome → character_select → world_select → first_chat → complete
                                         ↓ (可跳过)
                                     first_chat
```

### 各步骤说明

| 步骤 | 描述 | 用户操作 |
|------|------|---------|
| `welcome` | 欢迎页，情绪化文案 | 点击"开始" |
| `character_select` | 选择角色（默认推荐艾琳） | 点击角色卡片 |
| `world_select` | 选择世界（可跳过） | 选择或跳过 |
| `first_chat` | 进入对话，自动开场 | 发送第一句话 |
| `complete` | 流程完成，奖励发放 | — |

## First Message Injection

当 `user.isFirstTime === true` 且用户发送第一条消息时：

1. **消息增强**：用户消息前自动注入引导词
   - "这是你们第一次对话。请用温柔、略带好奇的语气主动向对方打招呼..."
2. **系统提示优化**：prompt builder 接收 `isFirstTime` 标志
3. **角色主动开场**：AI 角色以温暖、欢迎的语气回应

## First Engagement Reward

首次聊天触发：

- **关系 +20**（affection +8, trust +6, intimacy +6）
- **情绪卡片**："初次相遇，她记住了你的名字..."
- **UI 提示**：welcome banner → 消息发送后自动隐藏
- **防重复**：`rewardClaimed` 标志确保奖励只发放一次

## Analytics 埋点

| 事件 | 触发时机 |
|------|---------|
| `first_session_started` | 用户首次访问 onboarding API |
| `onboarding_step_advanced` | 每次步骤推进 |
| `first_message_sent` | 用户发送第一条消息 |
| `first_relationship_created` | 首次关系建立 |
| `first_reward_claimed` | 首次奖励领取 |
| `onboarding_completed` | 流程完成 |

## 安全措施

- **防 bypass**：onboarding 状态与服务端 session 绑定
- **防重复触发**：`rewardClaimed` 标志 + idempotent 服务方法
- **状态转移校验**：`canTransition()` 防止跳过步骤
- **Session 绑定**：所有 onboarding 操作通过 `requireAuth()` 验证

## API

### GET /api/onboarding
返回当前用户的 onboarding 状态。

### POST /api/onboarding
更新步骤或进行选择。
```json
// 推进步骤
{ "step": "character_select" }

// 选择角色
{ "characterId": "char-001" }

// 选择世界
{ "worldId": "world-fantasy", "worldName": "艾尔德兰", "worldType": "fantasy" }
```
