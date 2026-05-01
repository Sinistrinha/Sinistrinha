import { useGameStore } from '../../store/gameStore';
import Reel from './Reel';

export default function SlotMachine() {
  const { reels, isSpinning, lastResult, onReelsComplete } = useGameStore();

  /**
   * Returns [reelIndex]: true if that reel's center symbol is part of the win.
   * Only reels 0..matchCount-1 participate (left-to-right adjacency rule).
   */
  const { reelsDone } = useGameStore();

  const winningReels: boolean[] = reels.map((_, idx) => {
    if (!reelsDone || !lastResult || lastResult.totalWin <= 0) return false;
    return idx < lastResult.matchCount;
  });

  return (
    <div className="relative w-full h-full max-h-[500px] slot-machine-casing p-2 md:p-4 perspective-1000">

      {/* Decorative top badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-32 h-6 bg-brand-gold rounded-b-xl border-x-4 border-b-4 border-yellow-700 flex items-center justify-center shadow-[0_5px_15px_rgba(255,215,0,0.5)] z-20">
        <span className="text-[10px] font-black tracking-widest text-black">PAYLINE</span>
      </div>

      {/* Main Reels Container */}
      <div className="w-full h-full bg-[#0a0a0a] rounded-lg border-2 border-white/10 shadow-inner overflow-hidden flex relative">

        {/* Active Payline Indicator — center row, clearly visible */}
        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-[34%] pointer-events-none z-10">
          {/* Top border line */}
          <div className="absolute top-0 left-0 w-full h-[2px] bg-brand-gold/70 shadow-[0_0_8px_rgba(255,215,0,0.9)]" />
          {/* Bottom border line */}
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-gold/70 shadow-[0_0_8px_rgba(255,215,0,0.9)]" />
          {/* Subtle fill to mark the active zone */}
          <div className="absolute inset-0 bg-brand-gold/5" />
        </div>

        {/* 5 Reels */}
        {reels.map((reelSymbols, idx) => (
          <div key={`reel-col-${idx}`} className="flex-1 h-full relative">
            <Reel
              index={idx}
              isSpinning={isSpinning}
              finalSymbols={reelSymbols}
              isWinningReel={winningReels[idx]}
              onAnimationComplete={idx === reels.length - 1 ? onReelsComplete : undefined}
            />
          </div>
        ))}

        {/* Inner Glass Reflection */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none z-30 rounded-lg" />
      </div>
    </div>
  );
}
