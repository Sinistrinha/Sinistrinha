import { create } from 'zustand';
import type { SpinResult, BackendSpinResponse } from '../types/game.types';
import { SYMBOL_KEYS, backendToReels } from '../types/game.types';
import api from '../lib/api';
import { useAuthStore } from './authStore';

// Generate a random reel column (3 visible symbols) — used for initial display
function randomReelColumn(): string[] {
  return Array.from({ length: 3 }, () =>
    SYMBOL_KEYS[Math.floor(Math.random() * SYMBOL_KEYS.length)]
  );
}

function generateRandomReels(): string[][] {
  return Array.from({ length: 5 }, () => randomReelColumn());
}

interface GameStoreState {
  balance: number;
  bet: number;
  minBet: number;
  maxBet: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  freeSpins: number;
  isSpinning: boolean;
  reelsDone: boolean;
  pendingWin: boolean;
  reels: string[][];
  lastResult: SpinResult | null;
  jackpotValue: number;
  showWinAnimation: boolean;
  showLevelUp: boolean;
  error: string | null;

  setBet: (bet: number) => void;
  increaseBet: () => void;
  decreaseBet: () => void;
  maxBetAction: () => void;
  spin: () => void;
  onReelsComplete: () => void;
  dismissWinAnimation: () => void;
  dismissLevelUp: () => void;
  fetchJackpot: () => void;
  syncFromAuth: () => void;
  collect: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  balance: 0,
  bet: 10,
  minBet: 1,
  maxBet: 500,
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  freeSpins: 0,
  isSpinning: false,
  reelsDone: true,
  pendingWin: false,
  reels: generateRandomReels(),
  lastResult: null,
  jackpotValue: 0,
  showWinAnimation: false,
  showLevelUp: false,
  error: null,

  setBet: (bet) => set({ bet: Math.max(get().minBet, Math.min(get().maxBet, bet)) }),
  increaseBet: () => {
    const { bet, maxBet } = get();
    const steps = [1, 2, 5, 10, 25, 50, 100, 250, 500];
    const next = steps.find((s) => s > bet) ?? maxBet;
    set({ bet: Math.min(next, maxBet) });
  },
  decreaseBet: () => {
    const { bet, minBet } = get();
    const steps = [1, 2, 5, 10, 25, 50, 100, 250, 500];
    const prev = [...steps].reverse().find((s) => s < bet) ?? minBet;
    set({ bet: Math.max(prev, minBet) });
  },
  maxBetAction: () => set({ bet: get().maxBet }),

  /** Send a real spin request to the backend */
  spin: async () => {
    const { balance, bet, isSpinning } = get();
    if (isSpinning || balance < bet) return;

    set({ isSpinning: true, reelsDone: false, pendingWin: false, lastResult: null, showWinAnimation: false, error: null });

    try {
      const { data } = await api.post<BackendSpinResponse>('/game/spin/', {
        bet_amount: bet.toFixed(2),
        use_free_spin: false,
      });

      // Convert backend flat reels to 5x3 grid
      const reelGrid = backendToReels(data.reels);

      const result: SpinResult = {
        reels: reelGrid,
        totalWin: data.payout,
        xpGained: data.xp_earned,
        jackpot: data.is_jackpot,
        combinationType: data.combination_type,
        multiplier: data.multiplier,
        matchCount: data.match_count ?? 0,
        freeSpinsAwarded: data.free_spins_awarded,
        winningSymbol: data.winning_symbol,
      };

      const oldLevel = get().level;

      const hasPayout = data.payout > 0;
      const reelsDone = get().reelsDone;

      // Update reels WITHOUT clearing isSpinning — the Reel component's useEffect
      // depends on both isSpinning and finalSymbols. If we clear isSpinning here
      // (same render as the new reels), the effect fires with isSpinning=false and
      // never rebuilds the strip with the correct symbols. Instead, isSpinning is
      // cleared in onReelsComplete, which fires after the animation lands.
      set({
        reels: reelGrid,
        lastResult: result,
        balance: data.new_balance,
        level: data.new_level,
        xp: data.new_xp,
        freeSpins: data.free_spins_remaining,
        pendingWin: hasPayout && !reelsDone,
        showWinAnimation: hasPayout && reelsDone,
        showLevelUp: data.new_level > oldLevel,
      });

      // Sync auth store balance/level too
      useAuthStore.getState().updateBalance(data.new_balance);
      useAuthStore.getState().updateLevel(data.new_level, data.new_xp);
      useAuthStore.getState().updateFreeSpins(data.free_spins_remaining);

    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
        || 'Spin failed';
      set({ isSpinning: false, error: msg });
    }
  },

  onReelsComplete: () => {
    const { pendingWin } = get();
    set({ reelsDone: true, isSpinning: false, ...(pendingWin ? { showWinAnimation: true, pendingWin: false } : {}) });
  },

  dismissWinAnimation: () => set({ showWinAnimation: false }),
  dismissLevelUp: () => set({ showLevelUp: false }),
  collect: () => set({ showWinAnimation: false, lastResult: null }),

  /** Fetch current jackpot value from backend */
  fetchJackpot: async () => {
    try {
      const { data } = await api.get('/game/jackpot/');
      set({ jackpotValue: parseFloat(data.current_amount) });
    } catch {
      // silently fail — jackpot is non-critical
    }
  },

  /** Pull balance/level/freeSpins from auth store into game store */
  syncFromAuth: () => {
    const user = useAuthStore.getState().user;
    if (user) {
      set({
        balance: user.balance,
        level: user.level,
        xp: user.xp,
        freeSpins: user.freeSpins,
      });
    }
  },
}));
