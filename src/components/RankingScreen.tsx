import { useEffect, useState } from "react";
import Backdrop from "./Backdrop";
import { fetchTopScores, type ScoreEntry } from "../lib/firebase";
import { DIFF_INFO, MODE_INFO, type Difficulty, type ProblemMode } from "../lib/problems";
import { sfxSelect } from "../lib/audio";

type Props = {
  onClose: () => void;
  lightweight: boolean;
};

export default function RankingScreen({ onClose, lightweight }: Props) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchTopScores(10);
        if (!cancelled) {
          setScores(data);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError("ランキングの取得に失敗しました");
          setLoading(false);
          console.error(e);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getDiffLabel = (d: string) => {
    const info = DIFF_INFO[d as Difficulty];
    return info ? info.label : d;
  };

  const getModeLabel = (m: string) => {
    const info = MODE_INFO[m as ProblemMode];
    return info ? info.label : m;
  };

  const getDiffColor = (d: string) => {
    const info = DIFF_INFO[d as Difficulty];
    return info ? info.color : "#9aa7c7";
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Backdrop accent="#22e4ff" intensity={0.6} lightweight={lightweight} />

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-4 py-6">
        <div className="wipe-in clip-panel relative w-full max-w-2xl border border-cyan-400/30 bg-black/70 px-5 py-6 backdrop-blur-md md:px-8">
          <div className="mb-4 flex items-center justify-between font-mono2 text-[10px] tracking-[0.35em] text-cyan-300/60">
            <span>ONLINE RANKING // TOP 10</span>
            <span className="pulse-soft">LIVE</span>
          </div>

          <h2 className="mb-5 text-center font-display text-2xl font-black tracking-[0.2em] text-white neon md:text-3xl">
            ランキング
          </h2>

          {loading && (
            <div className="py-12 text-center font-mono2 text-sm tracking-widest text-cyan-300/70">
              LOADING...
            </div>
          )}

          {error && (
            <div className="py-8 text-center font-ui text-sm text-red-400">{error}</div>
          )}

          {!loading && !error && scores.length === 0 && (
            <div className="py-12 text-center font-ui text-sm text-white/50">
              まだスコアがありません
            </div>
          )}

          {!loading && !error && scores.length > 0 && (
            <div className="space-y-1.5">
              {scores.map((s, i) => (
                <div
                  key={`${s.timestamp}-${i}`}
                  className="flex items-center gap-3 border-b border-white/10 py-2"
                >
                  <div
                    className="w-8 shrink-0 text-center font-display text-lg font-black"
                    style={{
                      color:
                        i === 0 ? "#ffe45e" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "#9aa7c7",
                    }}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-display text-base font-bold text-white">
                      {s.name}
                    </div>
                    <div className="flex gap-2 font-mono2 text-[10px] tracking-wider text-white/40">
                      <span style={{ color: getDiffColor(s.difficulty) }}>
                        {getDiffLabel(s.difficulty)}
                      </span>
                      <span>{getModeLabel(s.mode)}</span>
                    </div>
                  </div>
                  <div className="shrink-0 font-display text-xl font-black text-cyan-300">
                    {String(s.score).padStart(3, "0")}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="mt-6 flex justify-center">
            <button
              onClick={() => {
                sfxSelect();
                onClose();
              }}
              className="clip-btn border border-white/25 bg-white/5 px-10 py-3 font-display text-lg font-black tracking-[0.3em] text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
