import { initializeApp } from "firebase/app";
import {
  getDatabase,
  ref,
  push,
  set,
  get,
  query,
  orderByChild,
  limitToLast,
  type Database,
} from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAHAp3vpF2S3uhvdX8_jEoIvZei0jp81tY",
  authDomain: "suusokubattle.firebaseapp.com",
  databaseURL: "https://suusokubattle-default-rtdb.firebaseio.com",
  projectId: "suusokubattle",
  storageBucket: "suusokubattle.firebasestorage.app",
  messagingSenderId: "897573122707",
  appId: "1:897573122707:web:72cea311428d09b570d366",
};

const app = initializeApp(firebaseConfig);
const db: Database = getDatabase(app);

export type ScoreEntry = {
  name: string;
  score: number;
  difficulty: string;
  mode: string;
  timestamp: number;
};

/** スコアを送信する */
export async function submitScore(
  name: string,
  score: number,
  difficulty: string,
  mode: string
): Promise<void> {
  const scoresRef = ref(db, "scores");
  const newRef = push(scoresRef);
  await set(newRef, {
    name: name.trim() || "名無し",
    score,
    difficulty,
    mode,
    timestamp: Date.now(),
  });
}

/** 上位N件のスコアを取得（スコア降順） */
export async function fetchTopScores(limit = 10): Promise<ScoreEntry[]> {
  const scoresRef = ref(db, "scores");
  // orderByChild + limitToLast でスコア上位を取得
  const q = query(scoresRef, orderByChild("score"), limitToLast(limit));
  const snapshot = await get(q);

  if (!snapshot.exists()) return [];

  const list: ScoreEntry[] = [];
  snapshot.forEach((child) => {
    const val = child.val();
    if (val && typeof val.score === "number") {
      list.push({
        name: val.name || "名無し",
        score: val.score,
        difficulty: val.difficulty || "?",
        mode: val.mode || "?",
        timestamp: val.timestamp || 0,
      });
    }
  });

  // limitToLast は昇順で来るので降順に並べ替え
  return list.sort((a, b) => b.score - a.score);
}
