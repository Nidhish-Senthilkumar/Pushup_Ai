import { useSyncExternalStore } from "react";
import type { SetSummary } from "../engine/session";
import type { Workout } from "./plans";

/**
 * Everything Cadence remembers, kept on this device only (localStorage).
 * No account, no server: the history, the leaderboard and the settings never
 * leave the browser unless the person exports them.
 */

export interface Profile {
  name: string;
  ageBand: "" | "under20" | "20-29" | "30-39" | "40-49" | "50-59" | "60+";
  sex: "" | "female" | "male";
  weightKg: number;
  goal: "strength" | "fitness" | "form" | "fun";
  onboarded: boolean;
}

export interface Settings {
  voice: boolean;
  sounds: boolean;
  countAloud: boolean;
  model: "lite" | "full";
  mirror: boolean;
  showDebug: boolean;
  /** Where the QR code on the Arcade screen sends visitors. */
  shareUrl: string;
  arcadeSeconds: number;
  /** How deep a rep must go to count as clean (and to count at all in the Arcade). */
  strictness: "easy" | "standard" | "strict";
}

export interface SetRecord extends SetSummary {
  target?: { reps?: number; ms?: number };
}

export interface WorkoutRecord {
  id: string;
  title: string;
  kind: "single" | "plan" | "assessment" | "arcade";
  planId?: string;
  startedAt: number;
  endedAt: number;
  sets: SetRecord[];
  xp: number;
  kcal: number;
  /** Personal records and achievements earned by this workout, for the summary. */
  prs?: string[];
  achievements?: string[];
}

export interface ArcadeEntry {
  id: string;
  name: string;
  challengeId: string;
  score: number;
  clean: number;
  attempts: number;
  form: number;
  at: number;
}

export interface Assessment {
  id: string;
  at: number;
  pushups: number | null;
  squats: number | null;
  plankMs: number | null;
  form: { pushup?: number; squat?: number; plank?: number };
}

export interface PlanState {
  planId: string;
  title: string;
  startedAt: number;
  days: Workout[];
  /** Ids of the plan days completed, e.g. "w1d2". */
  done: string[];
}

export interface LabSample {
  exerciseId: string;
  label: number;
  labelName: string;
  at: number;
  /** One row per frame: the team's four features, as in data/TRAINING_SET. */
  rows: [number, number, number, number][];
}

interface Data {
  version: 1;
  profile: Profile;
  settings: Settings;
  workouts: WorkoutRecord[];
  arcade: ArcadeEntry[];
  assessments: Assessment[];
  plan: PlanState | null;
  lab: LabSample[];
  customWorkouts: Workout[];
  seenAchievements: string[];
}

const KEY = "spotter.v1";

/** Phones get the lighter pose model by default: faster, smaller download, still accurate at arm's length. */
const isPhone = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches && Math.min(window.screen.width, window.screen.height) < 600;

export const DEFAULT_SETTINGS: Settings = {
  voice: true,
  sounds: true,
  countAloud: true,
  model: isPhone ? "lite" : "full",
  mirror: true,
  showDebug: false,
  shareUrl: "",
  arcadeSeconds: 30,
  strictness: "standard",
};

const DEFAULT_PROFILE: Profile = { name: "", ageBand: "", sex: "", weightKg: 70, goal: "fitness", onboarded: false };

function fresh(): Data {
  return {
    version: 1,
    profile: { ...DEFAULT_PROFILE },
    settings: { ...DEFAULT_SETTINGS },
    workouts: [],
    arcade: [],
    assessments: [],
    plan: null,
    lab: [],
    customWorkouts: [],
    seenAchievements: [],
  };
}

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const parsed = JSON.parse(raw) as Partial<Data>;
    const base = fresh();
    return {
      ...base,
      ...parsed,
      profile: { ...base.profile, ...(parsed.profile ?? {}) },
      settings: { ...base.settings, ...(parsed.settings ?? {}) },
      workouts: Array.isArray(parsed.workouts) ? parsed.workouts : [],
      arcade: Array.isArray(parsed.arcade) ? parsed.arcade : [],
      assessments: Array.isArray(parsed.assessments) ? parsed.assessments : [],
      lab: Array.isArray(parsed.lab) ? parsed.lab : [],
      customWorkouts: Array.isArray(parsed.customWorkouts) ? parsed.customWorkouts : [],
      seenAchievements: Array.isArray(parsed.seenAchievements) ? parsed.seenAchievements : [],
    };
  } catch {
    return fresh();
  }
}

let data: Data = typeof localStorage === "undefined" ? fresh() : load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage full or blocked (private window). The app keeps working for this visit.
  }
}

function emit() {
  for (const l of listeners) l();
}

export function update(fn: (d: Data) => Data) {
  data = fn(data);
  persist();
  emit();
}

export function getData(): Data {
  return data;
}

export function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useData(): Data {
  return useSyncExternalStore(subscribe, getData, getData);
}

// Other tabs (the booth laptop's second window) see changes too.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      data = load();
      emit();
    }
  });
}

export const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

export function saveWorkout(w: WorkoutRecord) {
  update((d) => ({ ...d, workouts: [w, ...d.workouts].slice(0, 500) }));
}

export function deleteWorkout(id: string) {
  update((d) => ({ ...d, workouts: d.workouts.filter((w) => w.id !== id) }));
}

export function setSettings(patch: Partial<Settings>) {
  update((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
}

export function setProfile(patch: Partial<Profile>) {
  update((d) => ({ ...d, profile: { ...d.profile, ...patch } }));
}

export function addArcadeEntry(e: ArcadeEntry) {
  update((d) => ({ ...d, arcade: [...d.arcade, e].slice(-2000) }));
}

export function renameArcadeEntry(id: string, name: string) {
  update((d) => ({ ...d, arcade: d.arcade.map((a) => (a.id === id ? { ...a, name } : a)) }));
}

export function clearArcade() {
  update((d) => ({ ...d, arcade: [] }));
}

export function addAssessment(a: Assessment) {
  update((d) => ({ ...d, assessments: [a, ...d.assessments] }));
}

export function setPlan(plan: PlanState | null) {
  update((d) => ({ ...d, plan }));
}

export function addLabSample(s: LabSample) {
  update((d) => ({ ...d, lab: [...d.lab, s] }));
}

export function saveCustomWorkout(w: Workout) {
  update((d) => ({ ...d, customWorkouts: [w, ...d.customWorkouts.filter((x) => x.id !== w.id)] }));
}

export function deleteCustomWorkout(id: string) {
  update((d) => ({ ...d, customWorkouts: d.customWorkouts.filter((x) => x.id !== id) }));
}

export function clearLab() {
  update((d) => ({ ...d, lab: [] }));
}

export function markAchievementsSeen(ids: string[]) {
  update((d) => ({ ...d, seenAchievements: [...new Set([...d.seenAchievements, ...ids])] }));
}

export function exportAll(): string {
  return JSON.stringify(data, null, 2);
}

export function importAll(json: string): boolean {
  try {
    const parsed = JSON.parse(json) as Partial<Data>;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.workouts)) return false;
    localStorage.setItem(KEY, JSON.stringify(parsed));
    data = load();
    emit();
    return true;
  } catch {
    return false;
  }
}

export function resetAll() {
  data = fresh();
  persist();
  emit();
}

/** For tests and the demo: replace everything at once. */
export function replaceData(next: Data) {
  data = next;
  persist();
  emit();
}

export type { Data };
