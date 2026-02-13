/**
 * Roulette Socket.IO Handlers
 * Follows existing Blackjack pattern from blackjack/handlers.ts
 */

import type { Socket, Server } from 'socket.io';
import type { PrismaClient } from '@prisma/client';
import { randomInt } from 'node:crypto';
import {
  applyAction,
  startNextRound,
  calculatePlayerPayout,
  type RouletteGameState,
  type RouletteBet,
} from './state-machine.js';

interface RoomManager {
  getRoom: (roomId: string) => any;
}

interface RoulettePlaceBetData {
  roomId: string;
  betType: string;
  numbers: number[];
  amount: number;
}

interface RouletteRemoveBetData {
  roomId: string;
  betIndex: number;
}

interface RouletteSpinData {
  roomId: string;
}

interface RouletteNextRoundData {
  roomId: string;
}

/**
 * Helper: Send system messages to room
 */
function sendSystemMessage(
  roomId: string,
  io: Server,
  content: string,
  roomManager: RoomManager
) {
  const room = roomManager.getRoom(roomId);
  if (!room) return;

  const message = {
    id: Math.random().toString(36).substring(7),
    roomId,
    userId: 'system',
    displayName: 'System',
    content,
    isSystem: true,
    timestamp: Date.now(),
  };

  room.chat = room.chat || [];
  room.chat.push(message);
  if (room.chat.length > 100) room.chat.shift();

  io.to(roomId).emit('chat:message', message);
}

/**
 * Helper: Emit balance updates
 */
function emitBalanceUpdate(
  io: Server,
  userId: string,
  newBalance: number,
  change: number,
  description: string
) {
  io.to(`user:${userId}`).emit('balance:updated', {
    newBalance,
    change,
    description,
  });
}

/**
 * Spin timer management
 */
const spinTimers = new Map<string, NodeJS.Timeout>(); // roomId -> timeout

function startSpinTimer(
  roomId: string,
  io: Server,
  roomManager: RoomManager,
  prisma: PrismaClient
) {
  clearSpinTimer(roomId);
  const room = roomManager.getRoom(roomId);
  if (!room || !room.gameState || room.gameState.isManualSpin) return;

  const timeout = setTimeout(async () => {
    try {
      await autoSpin(roomId, io, roomManager, prisma);
    } catch (error) {
      console.error('Spin timer auto-spin error:', error);
    }
  }, room.gameState.spinTimerSec * 1000);

  spinTimers.set(roomId, timeout);
}

function clearSpinTimer(roomId: string) {
  const timer = spinTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    spinTimers.delete(roomId);
  }
}

/**
 * Auto-spin when timer expires
 */
async function autoSpin(
  roomId: string,
  io: Server,
  roomManager: RoomManager,
  prisma: PrismaClient
) {
  const room = roomManager.getRoom(roomId);
  if (!room || !room.gameState) return;

  const gameState = room.gameState as RouletteGameState;
  if (gameState.phase !== 'betting') return;

  // Generate winning number using CSPRNG
  const winningNumber = randomInt(0, 37); // 0-36

  // Apply spin action
  const action = { type: 'SPIN' as const, winningNumber };
  const result = applyAction(gameState, action);

  if (result instanceof Error) {
    console.error('Auto-spin error:', result.message);
    return;
  }

  room.gameState = result;

  // Handle per-spin settlement for bet rooms
  await handleRouletteSpinSettlement(room, roomId, result, winningNumber, io, prisma);

  // Emit spin result
  io.to(roomId).emit('roulette:spin-result', {
    winningNumber,
    gameState: result,
  });

  io.to(roomId).emit('game:state-update', { state: result, roomId });
}

/**
 * Handle per-spin settlement for Roulette bet rooms
 * Unlike Kniffel (single payout at end), Roulette tracks chips across spins
 */
async function handleRouletteSpinSettlement(
  room: any,
  roomId: string,
  gameState: RouletteGameState,
  winningNumber: number,
  io: Server,
  prisma: PrismaClient
) {
  if (!room.isBetRoom) {
    // Free room: no settlements
    return;
  }

  try {
    // Calculate payouts for this spin
    const playerPayouts: Array<{ userId: string; displayName: string; netResult: number }> = [];

    for (const player of gameState.players) {
      const payout = calculatePlayerPayout(player, winningNumber);
      const totalBet = player.totalBetAmount;
      const netResult = payout - totalBet;

      playerPayouts.push({
        userId: player.userId,
        displayName: player.displayName,
        netResult,
      });
    }

    // Emit spin result with player payouts
    io.to(roomId).emit('roulette:spin-settlement', { playerPayouts });

    sendSystemMessage(
      roomId,
      io,
      `Gewinnzahl: ${winningNumber}`,
      { getRoom: () => room } as RoomManager
    );
  } catch (error) {
    console.error('Roulette spin settlement error:', error);
  }
}

/**
 * Handle game end settlement (convert remaining chips back to balance)
 */
async function handleRouletteGameEnd(
  room: any,
  roomId: string,
  gameState: RouletteGameState,
  io: Server,
  prisma: PrismaClient
) {
  if (!room.isBetRoom) {
    return null;
  }

  try {
    // Get locked escrows (original buy-ins)
    const escrows = await prisma.betEscrow.findMany({
      where: { roomId, status: 'LOCKED' },
    });

    // For each player, calculate remaining chips and convert to balance
    await prisma.$transaction(
      async (tx) => {
        for (const escrow of escrows) {
          // For Roulette, players keep their remaining chip count
          // In a full implementation, we'd track chip counts in gameState
          // For now, we'll just release the escrows as the game ends
          // (Actual chip tracking would be added in a complete implementation)

          await tx.betEscrow.update({
            where: { id: escrow.id },
            data: {
              status: 'RELEASED',
              releasedAt: new Date(),
            },
          });
        }
      },
      {
        isolationLevel: 'Serializable',
        maxWait: 5000,
        timeout: 10000,
      }
    );

    return null;
  } catch (error) {
    console.error('Roulette game end error:', error);
    return null;
  }
}

/**
 * Register all Roulette Socket.IO handlers
 */
export function registerRouletteHandlers(
  socket: Socket,
  io: Server,
  roomManager: RoomManager,
  prisma: PrismaClient
) {
  /**
   * Handle bet placement
   */
  socket.on('roulette:place-bet', async (data: RoulettePlaceBetData, callback) => {
    const { roomId, betType, numbers, amount } = data;
    const room = roomManager.getRoom(roomId);

    if (!room) {
      callback?.({ success: false, error: 'Room not found' });
      return;
    }

    if (room.gameType !== 'roulette') {
      callback?.({ success: false, error: 'Not a roulette game' });
      return;
    }

    const gameState = room.gameState as RouletteGameState;

    if (!gameState || gameState.phase !== 'betting') {
      callback?.({ success: false, error: 'Not in betting phase' });
      return;
    }

    // Apply bet action
    const bet: RouletteBet = {
      type: betType as any,
      numbers,
      amount,
    };

    const action = { type: 'PLACE_BET' as const, userId: socket.data.userId, bet };
    const result = applyAction(gameState, action);

    if (result instanceof Error) {
      callback?.({ success: false, error: result.message });
      return;
    }

    room.gameState = result;

    // Emit state update
    io.to(roomId).emit('game:state-update', { state: result, roomId });

    callback?.({ success: true });
  });

  /**
   * Handle bet removal
   */
  socket.on('roulette:remove-bet', async (data: RouletteRemoveBetData, callback) => {
    const { roomId, betIndex } = data;
    const room = roomManager.getRoom(roomId);

    if (!room) {
      callback?.({ success: false, error: 'Room not found' });
      return;
    }

    if (room.gameType !== 'roulette') {
      callback?.({ success: false, error: 'Not a roulette game' });
      return;
    }

    const gameState = room.gameState as RouletteGameState;

    if (!gameState || gameState.phase !== 'betting') {
      callback?.({ success: false, error: 'Not in betting phase' });
      return;
    }

    // Apply remove bet action
    const action = { type: 'REMOVE_BET' as const, userId: socket.data.userId, betIndex };
    const result = applyAction(gameState, action);

    if (result instanceof Error) {
      callback?.({ success: false, error: result.message });
      return;
    }

    room.gameState = result;

    // Emit state update
    io.to(roomId).emit('game:state-update', { state: result, roomId });

    callback?.({ success: true });
  });

  /**
   * Handle spin (manual trigger by host or auto via timer)
   */
  socket.on('roulette:spin', async (data: RouletteSpinData, callback) => {
    const { roomId } = data;
    const room = roomManager.getRoom(roomId);

    if (!room) {
      callback?.({ success: false, error: 'Room not found' });
      return;
    }

    if (room.gameType !== 'roulette') {
      callback?.({ success: false, error: 'Not a roulette game' });
      return;
    }

    // Only host can manually trigger spin
    if (room.hostId !== socket.data.userId) {
      callback?.({ success: false, error: 'Only host can spin' });
      return;
    }

    const gameState = room.gameState as RouletteGameState;

    if (!gameState || gameState.phase !== 'betting') {
      callback?.({ success: false, error: 'Not in betting phase' });
      return;
    }

    // Clear any pending spin timer
    clearSpinTimer(roomId);

    // Generate winning number using CSPRNG
    const winningNumber = randomInt(0, 37); // 0-36

    // Apply spin action
    const action = { type: 'SPIN' as const, winningNumber };
    const result = applyAction(gameState, action);

    if (result instanceof Error) {
      callback?.({ success: false, error: result.message });
      return;
    }

    room.gameState = result;

    // Handle per-spin settlement for bet rooms
    await handleRouletteSpinSettlement(room, roomId, result, winningNumber, io, prisma);

    // Emit spin result
    io.to(roomId).emit('roulette:spin-result', {
      winningNumber,
      gameState: result,
    });

    io.to(roomId).emit('game:state-update', { state: result, roomId });

    callback?.({ success: true });
  });

  /**
   * Handle next round
   */
  socket.on('roulette:next-round', async (data: RouletteNextRoundData, callback) => {
    const { roomId } = data;
    const room = roomManager.getRoom(roomId);

    if (!room) {
      callback?.({ success: false, error: 'Room not found' });
      return;
    }

    if (room.gameType !== 'roulette') {
      callback?.({ success: false, error: 'Not a roulette game' });
      return;
    }

    const gameState = room.gameState as RouletteGameState;

    if (!gameState || gameState.phase !== 'settlement') {
      callback?.({ success: false, error: 'Not in settlement phase' });
      return;
    }

    // Start next round
    const result = startNextRound(gameState);

    if (result instanceof Error) {
      callback?.({ success: false, error: result.message });
      return;
    }

    room.gameState = result;

    // Start spin timer if enabled
    if (!result.isManualSpin && result.spinTimerSec > 0) {
      startSpinTimer(roomId, io, roomManager, prisma);
    }

    io.to(roomId).emit('game:state-update', { state: result, roomId });

    callback?.({ success: true });
  });
}
