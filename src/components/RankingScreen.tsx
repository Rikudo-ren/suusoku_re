import { useEffect, useMemo, useState } from "react";
import Backdrop from "./Backdrop";
import { DIFF_INFO, MODE_INFO, MODE_ORDER, TITLE_DIFFS, type Difficulty, type ProblemMode } from "../lib/problems";
import { boardKey, loadPlayerName, savePlayerName, subscribeBoard, type RankEntry } from "../lib/ranking";
import { sfxSelect, sfxUI } from "../lib/audio";

type Props = {
  lightweight: boolean;
  initialMode?: ProblemMode;
  initialDifficulty?: Difficulty;
  onBack: () => void;
};

const MEDAL = ["#ffe45e", "#d7e2f5", "#ff9a4d"];

function fmtDate(ts: number) {
  if (!ts) return "―";
  const d = new Date(ts);
  return d.toLocaleString("ja-JP", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function RankingScreen({ lightweight, initialMode, initialDifficulty, onBack }: Props) {
  const [selMode, setSelMode] = useState<ProblemMode>(initialMode ?? "random");
  const [selDiff, setSelDiff] = useState<Difficulty>(initialDifficulty ?? "normal");
  const [boards, setBoards] = useState<Partial<Record<string, RankEntry[]>>>({});
  const [name, setName] = useState(() => loadPlayerName());
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(name);

  const mi = MODE_INFO[selMode];
  const di = DIFF_INFO[selDiff];

  useEffect(() => {
    const unsubs = MODE_ORDER.flatMap((m) =>
      TITLE_DIFFS.map((d) =>
        subscribeBoard(m, d, 20, (entries) => {
          setBoards((prev) => ({ ...prev, [boardKey(m, d)]: entries }));
        }),
      ),
    );
    return () => unsubs.forEach((u) => u());
  }, []);

  const activeKey = boardKey(selMode, selDiff);
  const activeEntries = boards[activeKey];
  const loading = activeEntries === undefined;

  const top1ByCell = useMemo(() => {
    const map: Partial<Record<string, RankEntry>> = {};
    for (const m of MODE_ORDER) {
      for (const d of TITLE_DIFFS) {
        const arr = boards[boardKey(m, d)];
        if (arr && arr.length) map[boardKey(m, d)] = arr[0];
      }
    }
    return map;
  }, [boards]);

  const commitName = () => {
    const saved = savePlayerName(nameDraft);
    setName(saved);
    setNameDraft(saved);
    setEditingName(false);
  };

  return (
    <div className="relative h-full w-full overflow-hidden">
      <Backdrop accent={mi.color} intensity={0.75} lightweight={lightweight} />

      <div className="relative z-10 flex h-full w-full flex-col items-center overflow-y-auto px-4 py-5 md:px-8">
        <div className="flex w-full max-w-5xl items-center justify-between font-mono2 text-[10px] tracking-[0.3em] text-cyan-300/60">
          <span>SYS://RANKING.EXE</span>
          <span className="flex items-center gap-2">
            <span className="pulse-soft">LIVE</span>
          </span>
        </div>

        <div className="mt-1 flex w-full max-w-5xl items-center justify-between">
          <h1 className="glitch font-display text-3xl font-black tracking-tight text-white neon md:text-4xl" data-text="GLOBAL RANKING">
            GLOBAL RANKING
          </h1>
          <button
            onClick={() => {
              sfxSelect();
              onBack();
            }}
            className="clip-btn border border-white/25 bg-white/5 px-5 py-2 font-display text-sm font-black tracking-[0.25em] text-white/75 transition-colors hover:bg-white/10 hover:text-white"
          >
            ← TITLE
          </button>
        </div>

        {/* player name */}
        <div className="clip-panel mt-3 flex w-full max-w-5xl items-center justify-between gap-3 border border-cyan-400/20 bg-black/45 px-4 py-2.5 backdrop-blur-sm">
          <span className="font-mono2 text-[10px] tracking-[0.3em] text-cyan-300/60">PILOT NAME</span>
          {editingName ? (
            <div className="flex flex-1 items-center gap-2">
              <input
                autoFocus
                value={nameDraft}
                maxLength={12}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitName();
                  if (e.key === "Escape") {
                    setNameDraft(name);
                    setEditingName(false);
                  }
                }}
                className="w-full max-w-[220px] border border-cyan-400/40 bg-black/60 px-2 py-1 font-display text-sm font-bold tracking-wider text-white outline-none"
              />
              <button
                onClick={commitName}
                className="clip-chip bg-cyan-400/80 px-3 py-1 font-display text-xs font-black tracking-wider text-black"
              >
                SAVE
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                sfxUI();
                setNameDraft(name);
                setEditingName(true);
              }}
              className="font-display text-sm font-black tracking-wider text-white/90 underline decoration-cyan-400/50 decoration-dashed underline-offset-4 hover:text-cyan-200"
              title="クリックして名前を変更"
            >
              {name} <span className="ml-1 font-mono2 text-[9px] text-white/30">EDIT</span>
            </button>
          )}
        </div>

        {/* 12-board overview grid */}
        <div className="mt-3 w-full max-w-5xl">
          <div className="mb-1.5 flex items-center gap-2 font-mono2 text-[10px] tracking-[0.3em] text-cyan-300/60">
            <span className="h-1.5 w-1.5 rotate-45 bg-cyan-400" /> 分野 × 難易度 — 12 BOARDS
          </div>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 md:gap-2">
            {MODE_ORDER.flatMap((m) =>
              TITLE_DIFFS.map((d) => {
                const mInfo = MODE_INFO[m];
                const dInfo = DIFF_INFO[d];
                const key = boardKey(m, d);
                const top = top1ByCell[key];
                const selected = selMode === m && selDiff === d;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setSelMode(m);
                      setSelDiff(d);
                      sfxSelect();
                    }}
                    className="clip-btn relative overflow-hidden px-2.5 py-2 text-left transition-transform duration-150 hover:scale-[1.02] active:scale-95"
                    style={{
                      background: selected
                        ? `linear-gradient(135deg, ${mInfo.accent}0.3), ${dInfo.accent}0.12))`
                        : "rgba(255,255,255,0.03)",
                      border: `1px solid ${selected ? dInfo.color : "rgba(255,255,255,0.12)"}`,
                      boxShadow: selected ? `0 0 22px ${dInfo.accent}0.35), inset 0 0 20px ${mInfo.accent}0.1)` : "none",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono2 text-[9px] tracking-[0.2em]" style={{ color: mInfo.color }}>
                        {mInfo.label}
                      </span>
                      <span className="font-mono2 text-[9px] tracking-[0.2em]" style={{ color: dInfo.color }}>
                        {dInfo.label}
                      </span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-1.5">
                      {top ? (
                        <>
                          <span className="truncate font-ui text-[11px] text-white/70">{top.name}</span>
                          <span className="ml-auto font-display text-base font-black text-white">{top.score}</span>
                        </>
                      ) : (
                        <span className="font-mono2 text-[10px] tracking-widest text-white/25">NO DATA</span>
                      )}
                    </div>
                    {selected && (
                      <div
                        className="absolute inset-x-0 bottom-0 h-0.5"
                        style={{ background: `linear-gradient(90deg, transparent, ${dInfo.color}, transparent)` }}
                      />
                    )}
                  </button>
                );
              }),
            )}
          </div>
        </div>

        {/* selected board detail */}
        <div className="clip-panel mt-3 mb-6 w-full max-w-5xl border border-cyan-400/20 bg-black/50 px-4 py-4 backdrop-blur-sm md:px-6 md:py-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-mono2 text-[10px] tracking-[0.3em]" style={{ color: mi.color }}>
                {mi.label} / {mi.sub}
              </span>
              <span className="font-mono2 text-[10px] tracking-[0.3em]" style={{ color: di.color }}>
                × {di.label}
              </span>
            </div>
            <span className="font-mono2 text-[9px] tracking-[0.25em] text-white/30">TOP {activeEntries?.length ?? 0}</span>
          </div>

          {loading && <div className="py-8 text-center font-mono2 text-xs tracking-widest text-white/30">LOADING…</div>}

          {!loading && activeEntries.length === 0 && (
            <div className="py-8 text-center font-mono2 text-xs tracking-widest text-white/30">
              まだ記録がありません。最初のランカーになろう。
            </div>
          )}

          {!loading && activeEntries.length > 0 && (
            <div className="space-y-1">
              {activeEntries.map((e, i) => {
                const isYou = e.name === name;
                return (
                  <div
                    key={e.id}
                    className="rise-fade flex items-center gap-3 border-b border-white/8 px-1 py-1.5"
                    style={{
                      animationDelay: `${Math.min(i, 10) * 0.03}s`,
                      background: isYou ? "rgba(34,228,255,0.08)" : "transparent",
                    }}
                  >
                    <span
                      className="w-8 shrink-0 text-center font-display text-sm font-black md:w-10 md:text-base"
                      style={{ color: MEDAL[i] ?? "rgba(255,255,255,0.4)" }}
                    >
                      {i < 3 ? "●" : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-ui text-[13px] font-semibold text-white/85 md:text-sm">
                      {e.name}
                      {isYou && (
                        <span className="ml-2 clip-chip bg-cyan-400/20 px-1.5 py-0.5 font-mono2 text-[8px] tracking-widest text-cyan-200">
                          YOU
                        </span>
                      )}
                    </span>
                    <span className="hidden shrink-0 font-mono2 text-[10px] tracking-wider text-white/30 sm:block">
                      MISS {e.misses} · MAX×{e.maxCombo}
                    </span>
                    <span className="hidden shrink-0 font-mono2 text-[9px] tracking-wider text-white/25 md:block">{fmtDate(e.ts)}</span>
                    <span className="w-16 shrink-0 text-right font-display text-lg font-black text-white md:w-20 md:text-xl">
                      {e.score}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
