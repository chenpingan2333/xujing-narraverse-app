"use client";

interface RelationshipData {
  affection: number;
  trust: number;
  intimacy: number;
  reason?: string;
}

interface RelationshipPanelProps {
  relationship: RelationshipData;
  starCost?: number;
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-ink-muted">{label}</span>
        <span className="text-ink">{value}</span>
      </div>
      <div className="h-2 bg-paper-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  );
}

export default function RelationshipPanel({ relationship, starCost }: RelationshipPanelProps) {
  return (
    <div className="p-4 h-full overflow-y-auto">
      <h3 className="text-sm font-serif text-ink mb-4">💞 关系状态</h3>

      <Bar label="好感度" value={relationship.affection} color="linear-gradient(90deg, #f6c177, #f09090)" />
      <Bar label="信任度" value={relationship.trust} color="linear-gradient(90deg, #a8d8ea, #6bb5d0)" />
      <Bar label="亲密度" value={relationship.intimacy} color="linear-gradient(90deg, #d4a0d4, #b070b0)" />

      {relationship.reason && (
        <div className="memory-card mt-4">
          <p className="text-xs text-ink-muted leading-relaxed">{relationship.reason}</p>
        </div>
      )}

      {starCost != null && starCost > 0 && (
        <div className="mt-4 p-3 bg-paper-warm rounded-btn border border-paper-border">
          <p className="text-xs text-ink-muted">
            ⭐ 本次对话消耗 <span className="text-ink font-medium">{starCost}</span> 星钻
          </p>
        </div>
      )}
    </div>
  );
}
