import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

/**
 * Win-tier thresholds (multiplier relative to the bet).
 * Convention used in casino / slot-machine UX:
 *   small  (<  5×): subtle gold flash + result banner
 *   big    (5–49×): screen shake + "BIG WIN!" + coin rain
 *   mega   (50+× ): rainbow pulse + "MEGA WIN!" + confetti burst
 *   jackpot         : full overlay + gorila + celebration
 */
function getWinTier(multiplier: number, isJackpot: boolean) {
  if (isJackpot) return 'jackpot';
  if (multiplier >= 50)  return 'mega';
  if (multiplier >= 5)   return 'big';
  return 'small';
}

/** Generates an array of coin particle configs */
function generateCoins(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,   // % from left
    delay: Math.random() * 0.6,
    duration: 0.8 + Math.random() * 0.8,
    size: 16 + Math.random() * 14,
    rotate: Math.random() * 720 - 360,
  }));
}

export default function WinAnimation() {
  const { showWinAnimation, lastResult, dismissWinAnimation } = useGameStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const multiplier  = lastResult?.multiplier   ?? 0;
  const isJackpot   = lastResult?.jackpot       ?? false;
  const totalWin    = lastResult?.totalWin      ?? 0;
  const tier        = getWinTier(multiplier, isJackpot);

  const coins = generateCoins(tier === 'jackpot' ? 40 : tier === 'mega' ? 28 : tier === 'big' ? 18 : 8);

  // Auto-dismiss after a tier-appropriate delay
  useEffect(() => {
    if (!showWinAnimation) return;
    const delay = tier === 'jackpot' ? 4500 : tier === 'mega' ? 3500 : tier === 'big' ? 2800 : 1800;
    timerRef.current = setTimeout(dismissWinAnimation, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [showWinAnimation, tier, dismissWinAnimation]);

  const tierConfig = {
    small: {
      bg: 'from-yellow-900/60 via-transparent to-transparent',
      title: null,
      titleColor: '',
      glow: 'rgba(255,215,0,0.3)',
    },
    big: {
      bg: 'from-yellow-800/80 via-yellow-900/40 to-transparent',
      title: 'BIG WIN!',
      titleColor: 'from-yellow-400 via-brand-gold to-yellow-300',
      glow: 'rgba(255,215,0,0.5)',
    },
    mega: {
      bg: 'from-purple-900/80 via-yellow-900/50 to-transparent',
      title: 'MEGA WIN!',
      titleColor: 'from-purple-300 via-brand-gold to-pink-300',
      glow: 'rgba(200,100,255,0.6)',
    },
    jackpot: {
      bg: 'from-yellow-600/90 via-yellow-800/70 to-transparent',
      title: '🦍 JACKPOT! 🦍',
      titleColor: 'from-yellow-200 via-white to-yellow-300',
      glow: 'rgba(255,215,0,0.9)',
    },
  }[tier];

  return (
    <AnimatePresence>
      {showWinAnimation && (
        <motion.div
          className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={dismissWinAnimation}
          style={{ pointerEvents: 'auto' }}
        >
          {/* Background radial glow */}
          <motion.div
            className={`absolute inset-0 bg-gradient-to-b ${tierConfig.bg}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.7] }}
            transition={{ duration: 0.4, times: [0, 0.3, 1] }}
          />

          {/* Screen-edge flash (camera-flash effect on big wins) */}
          {(tier === 'big' || tier === 'mega' || tier === 'jackpot') && (
            <motion.div
              className="absolute inset-0 bg-white"
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            />
          )}

          {/* Coin rain */}
          {coins.map((coin) => (
            <motion.div
              key={coin.id}
              className="absolute top-0 select-none"
              style={{ left: `${coin.x}%`, fontSize: coin.size }}
              initial={{ y: '-10%', rotate: 0, opacity: 1 }}
              animate={{ y: '110vh', rotate: coin.rotate, opacity: [1, 1, 0] }}
              transition={{ duration: coin.duration, delay: coin.delay, ease: 'easeIn' }}
            >
              🪙
            </motion.div>
          ))}

          {/* Win title — only for big / mega / jackpot */}
          {tierConfig.title && (
            <motion.div
              className="relative flex flex-col items-center gap-4"
              initial={{ scale: 0.3, opacity: 0 }}
              animate={{ scale: [0.3, 1.15, 1], opacity: 1 }}
              transition={{ duration: 0.5, times: [0, 0.7, 1], ease: 'backOut' }}
            >
              {/* Outer glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full blur-3xl"
                style={{ background: tierConfig.glow }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              />

              <span
                className={`relative font-black text-5xl md:text-7xl lg:text-8xl tracking-widest bg-clip-text text-transparent bg-gradient-to-r ${tierConfig.titleColor} drop-shadow-2xl`}
                style={{ textShadow: `0 0 40px ${tierConfig.glow}` }}
              >
                {tierConfig.title}
              </span>

              {/* Win amount */}
              <motion.div
                className="relative text-white font-numbers text-3xl md:text-5xl font-black"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <span className="text-brand-gold">
                  R$ {totalWin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </motion.div>

              <motion.p
                className="text-gray-300 text-sm tracking-widest"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Toque para continuar
              </motion.p>
            </motion.div>
          )}

          {/* Small win: just a compact banner at the bottom */}
          {tier === 'small' && (
            <motion.div
              className="absolute bottom-24 left-1/2 -translate-x-1/2 px-8 py-3 bg-brand-gold/20 border border-brand-gold/50 rounded-2xl backdrop-blur-sm"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            >
              <span className="text-brand-gold font-bold text-xl">
                +R$ {totalWin.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
