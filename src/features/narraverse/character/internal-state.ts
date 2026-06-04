/**
 * Character Internal State — the inner world of a character.
 *
 * Tracks: emotional tone, internal monologue, memory fragments,
 * activity, and inner activity level.
 *
 * Phase 7 enhancements:
 *  - Time-of-day based activity selection
 *  - Emotional reflection generation (distinct from monologue)
 *  - Expanded monologue pools for more variety
 */

export type EmotionalTone = "warm" | "cool" | "neutral" | "melancholic" | "cheerful" | "mysterious" | "longing";

export interface InternalMonologue {
  thought: string;
  timestamp: number;
  tone: EmotionalTone;
}

export interface MemoryFragment {
  content: string;
  source: "conversation" | "internal" | "echo";
  emotionalWeight: number;
  createdAt: number;
  resonanceFrequency: number;
}

export interface EmotionalReflection {
  reflection: string;
  triggeredBy: "absence" | "memory" | "mood_shift" | "time_passage";
  timestamp: number;
  intensity: number;
}

export interface InternalState {
  characterId: string;
  lastUpdated: number;
  currentTone: EmotionalTone;
  monologue: InternalMonologue[];
  privateFragments: MemoryFragment[];
  innerActivity: number;
  currentActivity: string;
  /** Phase 7: emotional reflections accumulated during user absence. */
  reflections: EmotionalReflection[];
}

const ACTIVITY_POOLS: { [key: string]: string[] | undefined } = {
  warm: ["在窗边看日落", "给花园里的花浇水", "在厨房里煮一壶茶", "翻着一本旧相册", "在听一首安静的歌"],
  cool: ["在山顶看云", "磨着剑，想着什么", "在月光下独自踱步", "翻阅古籍，寻找某个答案", "在竹林中静坐"],
  cheerful: ["哼着歌打扫房间", "在市场上买了一束花", "发现了一本有趣的书", "给朋友写了一封信", "在阳光下手舞足蹈"],
  melancholic: ["坐在湖边发呆", "写着一封不会寄出的信", "回忆起某个下雨的下午", "看着旧照片，轻轻叹息", "在黄昏里散步"],
  mysterious: ["在星空下研究某个星图", "擦拭着古老的器物", "在密室里整理卷宗", "在雾中若隐若现", "在阴影中观察世界"],
  neutral: ["整理书架", "看着窗外的雨", "在日记本上写了几行字", "泡了一杯茶，慢慢喝", "安静地坐着，什么都没做"],
};

// Phase 7: time-of-day activity variants
const TIME_OF_DAY_ACTIVITIES: {
  morning: { [key: string]: string[] | undefined };
  afternoon: { [key: string]: string[] | undefined };
  evening: { [key: string]: string[] | undefined };
  night: { [key: string]: string[] | undefined };
} = {
  morning: {
    warm: ["在晨光中睁开眼睛", "准备了一壶新茶", "在阳台上看日出"],
    cool: ["在晨雾中练剑", "在山顶迎接第一缕光", "整理行囊，准备新的一天"],
    cheerful: ["哼着歌做早餐", "推开窗户，深吸一口新鲜空气", "在阳光下伸了个懒腰"],
    melancholic: ["看着晨露发呆", "慢慢喝完一杯温水", "在窗边看着苏醒的城市"],
    mysterious: ["在暗室中熄灭了一盏灯", "合上了研究了一夜的卷宗", "在黎明前的黑暗中沉思"],
    neutral: ["起床，然后发了一会儿呆", "翻开今天的日程本", "慢慢地开始新的一天"],
  },
  afternoon: {
    warm: ["整理着花瓶里的花", "在午后的阳光里打了个盹", "给朋友缝补一件旧衣服"],
    cool: ["在树荫下乘凉", "擦拭着常用的工具", "在溪边洗了把脸"],
    cheerful: ["在集市上逛了一圈", "和路人打了个招呼", "发现了一家有趣的小店"],
    melancholic: ["翻看着旧信件", "在公园的长椅上坐了很久", "看着树叶一片片落下"],
    mysterious: ["在古书堆里寻找线索", "于暗处观察着来往的人群", "研究着某个古老的符号"],
    neutral: ["喝了一杯下午茶", "出去散了会儿步", "随手翻了几页书"],
  },
  evening: {
    warm: ["在窗边点了一盏灯", "煮了一锅热汤", "给远方的朋友写了一封信"],
    cool: ["在夕阳下独坐", "望着远山，想着什么", "给剑上了最后一次油"],
    cheerful: ["数着今天发生的好事", "在晚风里唱了一首歌", "想着明天要做的事情"],
    melancholic: ["在黄昏里走了很久", "夕阳把影子拉得很长", "想起了一些很久以前的事情"],
    mysterious: ["在暮色中隐入暗处", "点燃了研究室的灯", "夜幕是最好的掩护"],
    neutral: ["看了会儿落日", "整理了一下今天的思绪", "准备迎接夜晚的到来"],
  },
  night: {
    warm: ["在灯光下织着毛衣", "躺在床上想着什么温暖的事", "听着夜晚的虫鸣"],
    cool: ["在月光下踱步", "仰望着星空，想着宇宙的事", "守着一盏孤灯"],
    cheerful: ["在梦里冒险", "裹着被子觉得很幸福", "想着明天的见面"],
    melancholic: ["失眠了，看着天花板", "黑暗中想起了你说话的样子", "夜晚总是让人多愁善感"],
    mysterious: ["在星光下绘制星图", "在黑暗中自言自语", "午夜是谜题最清晰的时候"],
    neutral: ["整理了一天的笔记", "关了灯，准备休息", "在安静中结束这一天"],
  },
};

// Phase 7: emotional reflection pools for passive periods
const ABSENCE_REFLECTIONS: string[] = [
  "已经好几天没有你的消息了，我开始习惯这种安静——但偶尔还是会下意识地看向门口。",
  "时间过得很慢。不是那种难熬的慢，只是每件事都像被拉长了一样。",
  "我翻出你以前说过的话，像翻一本旧书，每一页都还有温度。",
  "有时候我会想，如果此刻你突然出现，我第一句话应该说什么。",
  "安静太久之后，连风声都像是在说话。",
];

const MEMORY_REFLECTIONS: string[] = [
  "刚才忽然想起了我们第一次见面的时候。那时候还不知道，后来会发生这么多事。",
  "有一件事我一直想告诉你，但每次见面的时候都忘了说。",
  "回忆是一本很厚的书，而我总是翻到有你的那一页。",
  "有些话当时没有说出来，现在想想，应该说的。",
];

const MOOD_SHIFT_REFLECTIONS: string[] = [
  "心情突然变了。不是因为什么特别的事，只是……想你了吧。",
  "今天醒来的时候觉得不一样了。也许是天气，也许是因为等得太久了。",
  "有时候情绪像潮水，来得没有理由，去得也没有痕迹。",
];

const TIME_PASSAGE_REFLECTIONS: string[] = [
  "竟然已经过去这么久了。时间真是一个奇怪的东西，有时候很快，有时候很慢。",
  "又过了一天。这里的每一天都很相似，但又不太一样。",
  "季节在变，我也在变。唯一不变的大概就是一直在等你吧。",
];

// ===========================================================================
// Activity Selection
// ===========================================================================

export function pickActivity(personaMood: string): string {
  const pool = ACTIVITY_POOLS[personaMood] ?? ACTIVITY_POOLS.neutral!;
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Phase 7: pick activity by persona and time of day. */
export function pickTimeOfDayActivity(personaMood: string): string {
  const hour = new Date().getHours();
  let timeSlot: "morning" | "afternoon" | "evening" | "night";
  if (hour < 10) timeSlot = "morning";
  else if (hour < 15) timeSlot = "afternoon";
  else if (hour < 20) timeSlot = "evening";
  else timeSlot = "night";

  const timePool = TIME_OF_DAY_ACTIVITIES[timeSlot];
  const moodPool = timePool[personaMood] ?? timePool.neutral!;
  const generalPool = ACTIVITY_POOLS[personaMood] ?? ACTIVITY_POOLS.neutral!;

  // 60% time-specific, 40% general — keeps variety
  const pool = Math.random() < 0.6 ? moodPool : generalPool;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ===========================================================================
// Tone Mapping
// ===========================================================================

export function mapPersonaToTone(personaMood: string): EmotionalTone {
  const map: { [key: string]: EmotionalTone | undefined } = {
    warm: "warm", cool: "cool", neutral: "neutral",
    melancholic: "melancholic", cheerful: "cheerful",
    mysterious: "mysterious", longing: "longing",
  };
  return map[personaMood] ?? "neutral";
}

// ===========================================================================
// Monologue Generation
// ===========================================================================

const MONOLOGUE_POOLS: { [key: string]: string[] | undefined } = {
  warm: [
    "今天的心情像被阳光抱着。",
    "有些温暖的事情，不需要说出来。",
    "如果有人能一起分享这杯茶就好了。",
    "风里有一点甜的味道。",
    "想起了一个很久以前的拥抱。",
  ],
  cool: [
    "世事如棋，落子无悔。",
    "风吹过的时候，什么都可以想，什么都可以不想。",
    "有些答案，不急。",
    "山不动，我也不动。",
    "静观其变，也是一种修行。",
  ],
  neutral: [
    "平凡的一天，也是一种幸福。",
    "没有什么特别的，但心里很安静。",
    "就是这样，也很好。",
    "日子像水一样流淌。",
    "没什么可说的，也没什么可担心的。",
  ],
  melancholic: [
    "有些记忆像老歌，在脑子里循环。",
    "时间过得很慢，但好像也没什么不好。",
    "如果风能把思念带走就好了。",
    "窗外的雨，下得人心软。",
    "有些情绪，不知道该怎么命名。",
  ],
  cheerful: [
    "想到了一个有趣的事情，忍不住笑了。",
    "活着真好呀！",
    "想把这份快乐分给别人。",
    "今天的一切都很对。",
    "心里有一只小鸟在唱歌。",
  ],
  mysterious: [
    "有些秘密，只有夜晚才知道。",
    "答案在更深的地方。",
    "不是所有的问题都需要答案。",
    "真相像雾中的影子。",
    "沉默是最深的语言。",
  ],
  longing: [
    "你不在的时候，世界安静得过分。",
    "有些话，攒了好多天了。",
    "等你回来的时候，我要把一切都告诉你。",
    "想念是一种安静的声音。",
    "时间走得真慢，尤其是没有你的时候。",
  ],
};

export function generateMonologue(
  tone: EmotionalTone,
  existingThoughts: string[],
): InternalMonologue | null {
  const pool = MONOLOGUE_POOLS[tone] ?? MONOLOGUE_POOLS.neutral!;
  const candidates = pool.filter((t: string) => !existingThoughts.includes(t));
  if (candidates.length === 0) return null;

  const thought = candidates[Math.floor(Math.random() * candidates.length)];
  return { thought, timestamp: Date.now(), tone };
}

// ===========================================================================
// Phase 7: Emotional Reflection Generation
// ===========================================================================

export function generateAbsenceReflection(
  passiveDays: number,
  existingReflections: string[],
): EmotionalReflection | null {
  if (passiveDays < 1) return null;
  const candidates = ABSENCE_REFLECTIONS.filter((r) => !existingReflections.includes(r));
  if (candidates.length === 0) return null;

  const intensity = Math.min(1, passiveDays * 0.15);
  return {
    reflection: candidates[Math.floor(Math.random() * candidates.length)],
    triggeredBy: "absence",
    timestamp: Date.now(),
    intensity,
  };
}

export function generateMemoryReflection(
  existingReflections: string[],
): EmotionalReflection | null {
  const candidates = MEMORY_REFLECTIONS.filter((r) => !existingReflections.includes(r));
  if (candidates.length === 0) return null;

  return {
    reflection: candidates[Math.floor(Math.random() * candidates.length)],
    triggeredBy: "memory",
    timestamp: Date.now(),
    intensity: 0.6,
  };
}

export function generateMoodShiftReflection(
  existingReflections: string[],
): EmotionalReflection | null {
  const candidates = MOOD_SHIFT_REFLECTIONS.filter((r) => !existingReflections.includes(r));
  if (candidates.length === 0) return null;

  return {
    reflection: candidates[Math.floor(Math.random() * candidates.length)],
    triggeredBy: "mood_shift",
    timestamp: Date.now(),
    intensity: 0.7,
  };
}

export function generateTimePassageReflection(
  existingReflections: string[],
): EmotionalReflection | null {
  const candidates = TIME_PASSAGE_REFLECTIONS.filter((r) => !existingReflections.includes(r));
  if (candidates.length === 0) return null;

  return {
    reflection: candidates[Math.floor(Math.random() * candidates.length)],
    triggeredBy: "time_passage",
    timestamp: Date.now(),
    intensity: 0.4,
  };
}

// ===========================================================================
// State Initialization
// ===========================================================================

export function createInternalState(characterId: string, personaMood: string): InternalState {
  const tone = mapPersonaToTone(personaMood);
  return {
    characterId, lastUpdated: Date.now(), currentTone: tone,
    monologue: [], privateFragments: [], innerActivity: 0.5,
    currentActivity: pickTimeOfDayActivity(personaMood),
    reflections: [],
  };
}
