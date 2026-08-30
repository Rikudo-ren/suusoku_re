import { useCallback, useEffect, useRef, useState } from "react";
import TitleScreen from "./components/TitleScreen";
import GameScreen, { type GameStats } from "./components/GameScreen";
import ResultScreen from "./components/ResultScreen";
import RankingScreen from "./components/RankingScreen";
import { type Difficulty, type ProblemMode } from "./lib/problems";
import {
  initAudio,
  isMusicMuted,
  isSfxMuted,
  setMusicMode,
  setMusicMuted,
  setSfxMuted,
  startMusic,
  stopMusic,
} from "./lib/audio";

type Screen = "title" | "game" | "result" | "ranking";
type Prefs = { bgmOn: boolean; soundOn: boolean; lightweight: boolean };

const BEST_KEY = "numeric-velocity-best-v2";
const PREF_KEY = "numeric-velocity-prefs-v1";
const bestKey = (d: Difficulty, m: ProblemMode) => `${d}::${m}`;

const loadBest = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {};
};

const loadPrefs = (): Prefs => {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    if (raw) return { bgmOn: true, soundOn: true, lightweight: false, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return { bgmOn: !isMusicMuted(), soundOn: !isSfxMuted(), lightweight: false };
};

const savePrefs = (prefs: Prefs) => {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
};

export default function App() {
  const prefs = useRef(loadPrefs()).current;
  const [screen, setScreen] = useState<Screen>("title");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [mode, setMode] = useState<ProblemMode>("random");
  const [stats, setStats] = useState<GameStats | null>(null);
  const [isBest, setIsBest] = useState(false);
  const [best, setBest] = useState<Record<string, number>>(loadBest);
  const [audioReady, setAudioReady] = useState(false);
  const [bgmOn, setBgmOn] = useState(prefs.bgmOn);
  const [soundOn, setSoundOn] = useState(prefs.soundOn);
  const [lightweight, setLightweight] = useState(prefs.lightweight);
  const [runKey, setRunKey] = useState(0);
  const enabled = useRef(false);

  useEffect(() => {
    setMusicMuted(!bgmOn);
    setSfxMuted(!soundOn);
    savePrefs({ bgmOn, soundOn, lightweight });
  }, [bgmOn, soundOn, lightweight]);

  const screenMusic = useCallback(() => {
    if (screen === "result") return "result" as const;
    if (screen === "game") return "battle" as const;
    return "title" as const;
  }, [screen]);

  const enableAudio = useCallback(() => {
    if (enabled.current) return;
    enabled.current = true;
    initAudio();
    setMusicMuted(!bgmOn);
    setSfxMuted(!soundOn);
    if (bgmOn) startMusic(screenMusic());
    setAudioReady(true);
  }, [bgmOn, soundOn, screenMusic]);

  useEffect(() => {
    const h = () => enableAudio();
    window.addEventListener("pointerdown", h, { once: true });
    window.addEventListener("keydown", h, { once: true });
    return () => {
      window.removeEventListener("pointerdown", h);
      window.removeEventListener("keydown", h);
    };
  }, [enableAudio]);

  const start = (d: Difficulty, m: ProblemMode) => {
    setDifficulty(d);
    setMode(m);
    setRunKey((k) => k + 1);
    setScreen("game");
  };

  const finish = (s: GameStats) => {
    setStats(s);
    const prev = best[bestKey(s.difficulty, s.mode)] ?? 0;
    if (s.score > prev) {
      const nb = { ...best, [bestKey(s.difficulty, s.mode)]: s.score };
      setBest(nb);
      setIsBest(true);
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(nb));
      } catch {
        /* ignore */
      }
    } else {
      setIsBest(false);
    }
    setScreen("result");
  };

  const toTitle = () => {
    setScreen("title");
    stopMusic(0.3);
    window.setTimeout(() => {
      if (enabled.current && bgmOn) startMusic("title");
      setMusicMode("title");
    }, 340);
  };

  const retry = () => {
    stopMusic(0.18);
    setRunKey((k) => k + 1);
    setScreen("game");
  };

  const toggleBgm = () => {
    enableAudio();
    const next = !bgmOn;
    setBgmOn(next);
    setMusicMuted(!next);
    if (next && screen !== "game") startMusic(screenMusic());
  };

  const toggleSound = () => {
    enableAudio();
    const next = !soundOn;
    setSoundOn(next);
    setSfxMuted(!next);
  };

  const toggleLightweight = () => setLightweight((v) => !v);

  return (
    <div className="relative h-full w-full select-none bg-[#03060d] text-white">
      {screen === "title" && (
        <TitleScreen
          onStart={start}
          best={best}
          audioReady={audioReady}
          lightweight={lightweight}
          onEnableAudio={enableAudio}
          onRanking={() => setScreen("ranking")}
        />
      )}
      {screen === "game" && (
        <GameScreen
          key={runKey}
          difficulty={difficulty}
          mode={mode}
          bgmEnabled={bgmOn}
          lightweight={lightweight}
          onFinish={finish}
          onTitle={toTitle}
          onRetry={retry}
        />
      )}
      {screen === "result" && stats && (
        <ResultScreen
          stats={stats}
          isBest={isBest}
          lightweight={lightweight}
          onRetry={retry}
          onTitle={toTitle}
          onRanking={() => setScreen("ranking")}
        />
      )}
      {screen === "ranking" && (
        <RankingScreen lightweight={lightweight} onClose={() => setScreen(stats ? "result" : "title")} />
      )}

      <div
        className="fixed bottom-3 right-3 z-50 flex flex-col gap-1.5 md:flex-row"
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={toggleBgm}
          title="BGM ON/OFF"
          className="clip-chip border border-cyan-400/30 bg-black/65 px-3 py-2 font-mono2 text-[10px] tracking-[0.2em] text-cyan-200/75 backdrop-blur transition-colors hover:border-cyan-300 hover:text-cyan-100"
        >
          BGM {bgmOn ? "ON" : "OFF"}
        </button>
        <button
          onClick={toggleSound}
          title="SOUND ON/OFF"
          className="clip-chip border border-fuchsia-400/30 bg-black/65 px-3 py-2 font-mono2 text-[10px] tracking-[0.2em] text-fuchsia-200/75 backdrop-blur transition-colors hover:border-fuchsia-300 hover:text-fuchsia-100"
        >
          SOUND {soundOn ? "ON" : "OFF"}
        </button>
        <button
          onClick={toggleLightweight}
          title="軽量化モード"
          className="clip-chip border border-white/25 bg-black/65 px-3 py-2 font-mono2 text-[10px] tracking-[0.2em] text-white/70 backdrop-blur transition-colors hover:border-white/45 hover:text-white"
        >
          LITE {lightweight ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}
