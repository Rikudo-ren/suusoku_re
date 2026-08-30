import {
  child,
  get,
  onValue,
  orderByChild,
  push,
  query,
  ref,
  remove,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/database";
import { db } from "./firebase";
import type { Difficulty, ProblemMode } from "./problems";

export type RankEntry = {
  id: string;
  name: string;
  score: number;
  solved: number;
  misses: number;
  maxCombo: number;
  ts: number;
};

export type BoardKey = `${ProblemMode}::${Difficulty}`;

export const boardKey = (mode: ProblemMode, difficulty: Difficulty): BoardKey => `${mode}::${difficulty}`;

const boardPath = (mode: ProblemMode, difficulty: Difficulty) => `rankings/${mode}/${difficulty}`;

/* ---------------- player name ---------------- */

const NAME_KEY = "numeric-velocity-name-v1";
const ADJ = ["CYBER", "NEON", "PULSE", "QUANTUM", "GHOST", "VOLT", "NOVA", "ECHO", "FLUX", "APEX"];

function randomGuestName(): string {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${a}-${n}`;
}

export function loadPlayerName(): string {
  try {
    const raw = localStorage.getItem(NAME_KEY);
    if (raw && raw.trim()) return raw.trim().slice(0, 12);
  } catch {
    /* ignore */
  }
  const g = randomGuestName();
  try {
    localStorage.setItem(NAME_KEY, g);
  } catch {
    /* ignore */
  }
  return g;
}

export function savePlayerName(name: string): string {
  const clean = name.trim().slice(0, 12) || randomGuestName();
  try {
    localStorage.setItem(NAME_KEY, clean);
  } catch {
    /* ignore */
  }
  return clean;
}

/* ---------------- submit ---------------- */

export async function submitScore(
  mode: ProblemMode,
  difficulty: Difficulty,
  entry: { name: string; score: number; solved: number; misses: number; maxCombo: number },
): Promise<void> {
  if (!entry.score || entry.score <= 0) return;
  const listRef = ref(db, boardPath(mode, difficulty));
  await push(listRef, {
    name: (entry.name || "GUEST").slice(0, 12),
    score: Math.max(0, Math.floor(entry.score)),
    solved: Math.max(0, Math.floor(entry.solved)),
    misses: Math.max(0, Math.floor(entry.misses)),
    maxCombo: Math.max(0, Math.floor(entry.maxCombo)),
    ts: serverTimestamp(),
  });
  prune(mode, difficulty).catch(() => {
    /* best effort, never block the UI on this */
  });
}

/* ---------------- prune (keep each board small) ---------------- */

const MAX_ENTRIES = 100;
const PRUNE_TRIGGER = 140;

async function prune(mode: ProblemMode, difficulty: Difficulty) {
  const listRef = ref(db, boardPath(mode, difficulty));
  const snap = await get(query(listRef, orderByChild("score")));
  const rows: { key: string; score: number }[] = [];
  snap.forEach((c) => {
    rows.push({ key: c.key as string, score: (c.val()?.score as number) ?? 0 });
  });
  if (rows.length <= PRUNE_TRIGGER) return;
  // rows are ascending by score (Firebase orderByChild default) -> drop the lowest scorers
  const dropCount = rows.length - MAX_ENTRIES;
  const drops = rows.slice(0, dropCount);
  await Promise.all(drops.map((r) => remove(child(listRef, r.key))));
}

/* ---------------- subscribe (real-time) ---------------- */

export function subscribeBoard(
  mode: ProblemMode,
  difficulty: Difficulty,
  top: number,
  cb: (entries: RankEntry[]) => void,
): Unsubscribe {
  const listRef = query(ref(db, boardPath(mode, difficulty)), orderByChild("score"));
  return onValue(
    listRef,
    (snap) => {
      const arr: RankEntry[] = [];
      snap.forEach((c) => {
        const v = c.val() ?? {};
        arr.push({
          id: c.key as string,
          name: typeof v.name === "string" ? v.name : "GUEST",
          score: Number(v.score) || 0,
          solved: Number(v.solved) || 0,
          misses: Number(v.misses) || 0,
          maxCombo: Number(v.maxCombo) || 0,
          ts: typeof v.ts === "number" ? v.ts : 0,
        });
      });
      arr.sort((a, b) => b.score - a.score || a.ts - b.ts);
      cb(arr.slice(0, top));
    },
    () => cb([]),
  );
}
