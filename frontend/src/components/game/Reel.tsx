import { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import Symbol from './Symbol';
import { SYMBOL_KEYS } from '../../types/game.types';

interface ReelProps {
  index: number;
  isSpinning: boolean;
  finalSymbols: string[];   // [top, middle, bottom] — middle is the result row
  isWinningReel: boolean;   // true when this reel participates in the winning combo
  onAnimationComplete?: () => void;
}

const TOTAL_EXTRA_SPINS = 20;
// Strip layout: [3 old symbols] + [TOTAL_EXTRA_SPINS random] + [3 final symbols]
// onst STRIP_LENGTH = 3 + TOTAL_EXTRA_SPINS + 3; // = 26
// Starting y: scroll back so the 3 old symbols (bottom of strip) are visible.
// translateY(%) in CSS is relative to the element's OWN height, not the container.
// Correct offset = (number of symbols above the window) / total symbols * 100%.
// const START_Y_PCT = ((TOTAL_EXTRA_SPINS + 3) / STRIP_LENGTH) * 100; // ≈ 88.46

export default function Reel({ index, isSpinning, finalSymbols, isWinningReel, onAnimationComplete }: ReelProps) {
  const controls = useAnimation();
  const [strip, setStrip] = useState<string[]>(finalSymbols);

  useEffect(() => {
    if (isSpinning) {
      const randomFiller = Array.from({ length: TOTAL_EXTRA_SPINS }, () =>
        SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)]
      );

      setStrip(prevStrip => [...prevStrip.slice(0, 3), ...randomFiller, ...finalSymbols]);

      controls.set({ y: `-${(TOTAL_EXTRA_SPINS + 3) * 33.33}%` });
      controls.start({
        y: '0%',
        transition: {
          duration: 2.0 + (index * 0.2),
          ease: [0.17, 0.67, 0.83, 0.67],
          delay: index * 0.1,
        }
      }).then(() => onAnimationComplete?.());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpinning, finalSymbols, index, controls]);

  return (
    <div className={`relative w-full h-full overflow-hidden border-r border-[#ffffff10] last:border-r-0 bg-[#0a0a0f] transition-all duration-500 ${
      isWinningReel ? 'bg-[#1a1500]' : ''
    }`}>
      {/* Winning reel side glow */}
      {isWinningReel && (
        <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(255,215,0,0.25)] pointer-events-none z-20 rounded-sm" />
      )}

      <div className="absolute inset-0 inner-glow z-20 pointer-events-none rounded-sm" />

      <motion.div
        className="absolute top-0 left-0 w-full flex flex-col-reverse"
        style={{ height: `${(strip.length / 3) * 100}%` }}
        animate={controls}
      >
        {strip.map((symbolKey, idx) => {
          // idx 1 = middle row (the actual result). Only highlight if this reel won.
          // With flex-col-reverse, the visual middle row is at strip.length - 2 (second-to-last item)
          const isWinningSymbol = !isSpinning && idx === strip.length - 2 && isWinningReel;

          return (
            <div
              key={`${index}-${idx}-${symbolKey}`}
              className="w-full flex-grow flex items-center justify-center p-1 md:p-2"
              style={{ height: `${100 / strip.length}%` }}
            >
              <Symbol symbolKey={symbolKey} isWinning={isWinningSymbol} />
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
