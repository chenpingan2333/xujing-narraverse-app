import type { ApiKeyRepository, UserApiKey, UsageRepository, ModelUsage, MonthlyUsage } from "./provider.types.js";

// ─── In-Memory API Key Repository ────────────────────────────────────────────

export class InMemoryApiKeyRepository implements ApiKeyRepository {
  private keys = new Map<string, UserApiKey>();

  saveKey(key: UserApiKey): Promise<void> {
    this.keys.set(key.id, key);
    return Promise.resolve();
  }

  getKeysByUser(userId: string): Promise<UserApiKey[]> {
    return Promise.resolve([...this.keys.values()].filter((k) => k.userId === userId));
  }

  getKeyById(keyId: string): Promise<UserApiKey | null> {
    return Promise.resolve(this.keys.get(keyId) ?? null);
  }

  deleteKey(keyId: string): Promise<void> {
    this.keys.delete(keyId);
    return Promise.resolve();
  }

  updateKeyEnabled(keyId: string, enabled: boolean): Promise<void> {
    const key = this.keys.get(keyId);
    if (key) {
      key.enabled = enabled;
      key.updatedAt = Date.now();
    }
    return Promise.resolve();
  }

  clear(): void {
    this.keys.clear();
  }
}

// ─── In-Memory Usage Repository ──────────────────────────────────────────────

export class InMemoryUsageRepository implements UsageRepository {
  private usage: ModelUsage[] = [];

  saveUsage(u: ModelUsage): Promise<void> {
    this.usage.push(u);
    return Promise.resolve();
  }

  getMonthlyUsage(
    userId: string,
    yearMonth: string,
  ): Promise<MonthlyUsage | null> {
    const [year, month] = yearMonth.split("-").map(Number);
    const start = new Date(year, month - 1, 1).getTime();
    const end = new Date(year, month, 0, 23, 59, 59, 999).getTime();

    const records = this.usage.filter(
      (u) =>
        u.userId === userId && u.createdAt >= start && u.createdAt <= end,
    );

    if (records.length === 0) return Promise.resolve(null);

    return Promise.resolve({
      userId,
      yearMonth,
      totalTokens: records.reduce(
        (s, r) => s + r.inputTokens + r.outputTokens,
        0,
      ),
      totalCost: records.reduce((s, r) => s + r.cost, 0),
      cacheHitRate:
        records.filter((r) => r.cacheHit).length / records.length,
      requestCount: records.length,
    });
  }

  getUsageHistory(
    userId: string,
    limit: number,
  ): Promise<ModelUsage[]> {
    return Promise.resolve(
      this.usage
        .filter((u) => u.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit),
    );
  }

  clear(): void {
    this.usage = [];
  }
}
