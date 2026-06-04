import type { RelationshipEvent, RelationshipDelta } from "./chat.types.js";

const EVENT_DELTAS: Record<
  RelationshipEvent["type"],
  { affection: number; trust: number; intimacy: number }
> = {
  gift:           { affection: 5, trust: 3,  intimacy: 2 },
  compliment:     { affection: 4, trust: 2,  intimacy: 3 },
  care:           { affection: 6, trust: 5,  intimacy: 4 },
  companionship:  { affection: 3, trust: 4,  intimacy: 5 },
  promise_kept:   { affection: 4, trust: 6,  intimacy: 3 },
  argument:       { affection: -4, trust: -5, intimacy: -3 },
  coldness:       { affection: -5, trust: -3, intimacy: -4 },
  promise_broken: { affection: -6, trust: -7, intimacy: -4 },
};

/**
 * Detect relationship events from the user message and assistant response.
 */
export function detectRelationshipEvents(
  userMessage: string,
  assistantResponse: string,
): RelationshipEvent[] {
  const combined = `${userMessage} ${assistantResponse}`;
  const events: RelationshipEvent[] = [];

  if (/礼物|gift|送[给你]|惊喜/.test(combined)) {
    events.push({ type: "gift", intensity: 0.7, description: "赠送礼物" });
  }
  if (/amazing|great|wonderful|真[好棒厉害美帅]|太.*了|佩服|欣赏/.test(combined)) {
    events.push({ type: "compliment", intensity: 0.5, description: "表达赞美" });
  }
  if (/关心|照顾|care|take care|注意.*身体|还好吗|没事吧/.test(combined)) {
    events.push({ type: "care", intensity: 0.8, description: "表达关心" });
  }
  if (/一起|together|陪[你我]|和你|跟.*一起/.test(combined)) {
    events.push({ type: "companionship", intensity: 0.6, description: "共同经历" });
  }
  if (/履行|兑现|kept.*promise|说[到过].*做到|承诺.*完成/.test(combined)) {
    events.push({ type: "promise_kept", intensity: 0.9, description: "兑现承诺" });
  }
  if (/吵|argu|争[吵执]|不[要对]|讨厌.*这样|烦/.test(combined)) {
    events.push({ type: "argument", intensity: 0.7, description: "发生争吵" });
  }
  if (/不理|冷淡|ignore|无视|冷落|沉默/.test(combined)) {
    events.push({ type: "coldness", intensity: 0.6, description: "态度冷淡" });
  }
  if (/食言|broke.*promise|没做到|忘了|拖延|不是答应/.test(combined)) {
    events.push({ type: "promise_broken", intensity: 0.8, description: "未能兑现承诺" });
  }

  return events;
}

export function computeRelationshipDelta(
  events: RelationshipEvent[],
): RelationshipDelta {
  if (events.length === 0) {
    return { affection: 0, trust: 0, intimacy: 0, reason: "无显著关系事件" };
  }

  let affection = 0;
  let trust = 0;
  let intimacy = 0;
  const reasons: string[] = [];

  for (const event of events) {
    const base = EVENT_DELTAS[event.type];
    const scale = event.intensity;
    affection += Math.round(base.affection * scale);
    trust += Math.round(base.trust * scale);
    intimacy += Math.round(base.intimacy * scale);
    reasons.push(event.description);
  }

  return {
    affection,
    trust,
    intimacy,
    reason: reasons.join(", "),
  };
}
