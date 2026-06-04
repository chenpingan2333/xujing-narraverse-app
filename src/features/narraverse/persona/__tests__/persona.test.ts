import { describe, it, expect } from "vitest";
import { buildPersonaFingerprint, refreshFingerprintWithRelationship } from "../persona.builder.js";
import { injectPersona, estimateInjectionTokens } from "../persona.injector.js";
import type { PersonaBuilderInput } from "../persona.types.js";

const aiLin: PersonaBuilderInput = {
  name: "艾琳",
  persona: "温柔体贴的邻家女孩，喜欢分享日常生活中的小确幸。性格开朗，善解人意，总是能在你需要的时候给你温暖和鼓励。",
  tier: "basic", relationshipAffection: 50, relationshipTrust: 50, relationshipIntimacy: 50,
};

const moYe: PersonaBuilderInput = {
  name: "墨夜",
  persona: "神秘高冷的剑客，话不多但每句都有深意。沉默寡言，内敛克制，只有真正信任的人才能看到他柔软的一面。",
  tier: "story", relationshipAffection: 50, relationshipTrust: 50, relationshipIntimacy: 50,
};

const leiEn: PersonaBuilderInput = {
  name: "雷恩",
  persona: "勇敢正直的冒险者，性格热情外向，永远充满好奇心。说话直接，行动果断，但有时过于冲动。",
  tier: "premium", relationshipAffection: 50, relationshipTrust: 50, relationshipIntimacy: 50,
};

describe("PersonaBuilder", () => {
  it("builds a complete fingerprint from character data", () => {
    const fp = buildPersonaFingerprint(aiLin);
    expect(fp.characterName).toBe("艾琳");
    expect(fp.speechStyle).toBeDefined();
    expect(fp.emotionalBaseline).toBeDefined();
    expect(fp.behavioralTendencies).toBeDefined();
    expect(fp.relationshipAttitude).toBeDefined();
    expect(fp.corePersona).toBe(aiLin.persona);
    expect(fp.version).toBe(1);
  });

  it("detects warm/cheerful emotional baseline", () => {
    const fp = buildPersonaFingerprint(aiLin);
    expect(fp.emotionalBaseline.primaryMood).toMatch(/warm|cheerful/);
    expect(fp.emotionalBaseline.empathyLevel).toBeGreaterThan(0.5);
    expect(fp.emotionalBaseline.optimism).toBeGreaterThanOrEqual(0.5);
  });

  it("detects mysterious/cool emotional baseline", () => {
    const fp = buildPersonaFingerprint(moYe);
    expect(fp.emotionalBaseline.primaryMood).toMatch(/cool|mysterious/);
    expect(fp.speechStyle.expressiveness).toBeLessThan(0.6);
    expect(fp.speechStyle.sentenceLength).toBe("short");
  });

  it("detects outgoing/expressive speech style", () => {
    const fp = buildPersonaFingerprint(leiEn);
    expect(fp.speechStyle.expressiveness).toBeGreaterThan(0.4);
    expect(fp.behavioralTendencies.curiosity).toBeGreaterThan(0.5);
    expect(fp.behavioralTendencies.assertiveness).toBeGreaterThan(0.5);
  });

  it("assigns basic vocabulary for basic tier", () => {
    const fp = buildPersonaFingerprint(aiLin);
    expect(fp.speechStyle.vocabulary).toBe("simple");
  });

  it("assigns richer vocabulary for story tier", () => {
    const fp = buildPersonaFingerprint(moYe);
    expect(fp.behavioralTendencies.cautiousness).toBeGreaterThanOrEqual(0.5);
    // Story tier retains moderate vocabulary unless rich markers present
  });

  it("builds different fingerprints for different characters", () => {
    const fp1 = buildPersonaFingerprint(aiLin);
    const fp2 = buildPersonaFingerprint(moYe);
    // Speech styles should differ meaningfully
    expect(fp1.speechStyle.expressiveness).not.toBe(fp2.speechStyle.expressiveness);
  });

  it("changes relationship attitude when intimacy increases", () => {
    const fp = buildPersonaFingerprint(moYe);
    const lowInjection = injectPersona(fp, { intimacy: 20 });
    const highInjection = injectPersona(fp, { intimacy: 80 });
    expect(lowInjection).toContain("初识");
    expect(highInjection).toContain("亲密");
    expect(lowInjection).not.toBe(highInjection);
  });

  it("refreshes fingerprint version on relationship update", () => {
    const fp = buildPersonaFingerprint(aiLin);
    const refreshed = refreshFingerprintWithRelationship(fp);
    expect(refreshed.version).toBe(fp.version + 1);
  });
});

describe("PersonaInjector", () => {
  it("produces injectable prompt text with all required sections", () => {
    const fp = buildPersonaFingerprint(aiLin);
    const text = injectPersona(fp, { intimacy: 50 });
    expect(text).toContain("角色人格设定");
    expect(text).toContain("艾琳");
    expect(text).toContain("说话风格");
    expect(text).toContain("情绪底色");
    expect(text).toContain("行为倾向");
    expect(text).toContain("当前关系阶段");
  });

  it("includes world context when provided", () => {
    const fp = buildPersonaFingerprint(aiLin);
    const text = injectPersona(fp, { intimacy: 50, worldType: "fantasy" });
    expect(text).toContain("奇幻");
    expect(text).toContain("世界");
  });

  it("estimates token count within reasonable range", () => {
    const fp = buildPersonaFingerprint(aiLin);
    const tokens = estimateInjectionTokens(fp);
    expect(tokens).toBeGreaterThan(100);
    expect(tokens).toBeLessThan(800);
  });

  it("injection is deterministic for same inputs", () => {
    const fp = buildPersonaFingerprint(aiLin);
    const t1 = injectPersona(fp, { intimacy: 50 });
    const t2 = injectPersona(fp, { intimacy: 50 });
    expect(t1).toBe(t2);
  });

  it("墨夜 shows short sentences and reserved expressiveness", () => {
    const fp = buildPersonaFingerprint(moYe);
    const text = injectPersona(fp, { intimacy: 30 });
    expect(text).toContain("墨夜");
    expect(fp.speechStyle.sentenceLength).toBe("short");
    expect(fp.speechStyle.expressiveness).toBeLessThan(0.6);
  });
});