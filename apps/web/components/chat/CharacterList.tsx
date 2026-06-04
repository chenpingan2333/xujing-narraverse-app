"use client";

export interface CharacterItem {
  id: string;
  name: string;
  persona: string;
  avatar: string;
  tier?: string;
  relationship?: {
    affection: number;
    trust: number;
    intimacy: number;
  };
}

interface CharacterListProps {
  characters: CharacterItem[];
  selectedId: string | null;
  onSelect: (character: CharacterItem) => void;
}

const tierLabels: Record<string, string> = {
  basic: "基础",
  premium: "高级",
  story: "故事",
};

export default function CharacterList({ characters, selectedId, onSelect }: CharacterListProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-paper-border">
        <h3 className="text-sm font-serif text-ink">👤 角色</h3>
      </div>
      <div className="flex-1 overflow-y-auto">
        {characters.map((char) => {
          const isActive = char.id === selectedId;
          return (
            <button
              key={char.id}
              onClick={() => onSelect(char)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-all duration-200 border-l-[3px] ${
                isActive
                  ? "bg-paper-warm border-apricot-dark"
                  : "border-transparent hover:bg-paper-warm"
              }`}
            >
              <span className="text-2xl shrink-0">{char.avatar}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink truncate">{char.name}</span>
                  {char.tier && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-paper-border text-ink-muted shrink-0">
                      {tierLabels[char.tier] ?? char.tier}
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-muted truncate mt-0.5">{char.persona}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
