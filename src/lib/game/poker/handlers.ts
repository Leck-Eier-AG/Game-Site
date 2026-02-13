/**
 * Poker Socket.IO Handlers
 * Orchestrates Texas Hold'em game loop with state machine, pot calculator, hand evaluator
 */

import type { Socket, Server } from 'socket.io';
import type { PrismaClient } from '@prisma/client';
import {
  applyPokerAction,
  createPokerState,
  type PokerGameState,
  type PokerPlayer,
  type PokerAction,
  type PokerSettings,
} from './state-machine.js';
import { calculateSidePots, distributePots, type PlayerContribution } from './pot-calculator.js';
import { findBestHand, evaluateHand, getHandName } from './hand-evaluator.js';
import { createDeck, shuffleDeck } from '../cards/deck.js';
import type { Card } from '../cards/types.js';

interface RoomManager {
  getRoom: (roomId: string) => any;
}

interface PokerActionData {
  roomId: string;
  action: 'fold' | 'check' | 'call' | 'raise' | 'all_in';
  amount?: number;
}

interface PokerRebuyData {
  roomId: string;
  amount: number;
}

interface PokerEndGameData {
  roomId: string;
}

interface PokerSitData {
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
 * Helper: Emit personalized poker state to each player
 * CRITICAL: Filter hole cards - each player sees only their own
 */
function emitPokerState(
  io: Server,
  roomId: string,
  room: any,
  gameState: PokerGameState
) {
  const sockets = io.sockets.adapter.rooms.get(roomId);
  if (!sockets) return;

  const isShowdown = gameState.phase === 'showdown';

  for (const socketId of sockets) {
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) continue;

    const userId = socket.data.userId;

    // Create personalized state with filtered hole cards
    const personalizedState: PokerGameState = {
      ...gameState,
      players: gameState.players.map((player) => ({
        ...player,
        holeCards:
          isShowdown || player.userId === userId
            ? player.holeCards // Show own cards or all cards in showdown
            : [], // Hide other players' cards
      })),
    };

    socket.emit('game:state-update', { state: personalizedState, roomId });
  }
}

/**
 * Action timer management
 */
const actionTimers = new Map<string, NodeJS.Timeout>();

function startActionTimer(
  roomId: string,
  io: Server,
  roomManager: RoomManager,
  prisma: PrismaClient
) {
  clearActionTimer(roomId);
  const room = roomManager.getRoom(roomId);
  if (!room || !room.gameState) return;

  const gameState = room.gameState as PokerGameState;
  if (gameState.phase === 'showdown' || gameState.phase === 'hand_end' || gameState.phase === 'game_end') return;

  const activePlayer = gameState.players[gameState.activePlayerIndex];
  if (!activePlayer || activePlayer.isAllIn || activePlayer.isFolded) return;

  const timeout = setTimeout(async () => {
    // Auto-fold on timeout
    const updatedRoom = roomManager.getRoom(roomId);
    if (!updatedRoom) return;

    const updatedState = updatedRoom.gameState as PokerGameState;
    const action: PokerAction = { type: 'FOLD' };

    const result = applyPokerAction(updatedState, action, activePlayer.userId);

    if (result instanceof Error) {
      console.error('Auto-fold error:', result.message);
      return;
    }

    updatedRoom.gameState = result;
    sendSystemMessage(roomId, io, `${activePlayer.displayName} hat gefoldet (Zeitüberschreitung)`, roomManager);

    await handlePokerStateUpdate(updatedRoom, roomId, result, io, roomManager, prisma);
  }, 30000); // 30 seconds

  actionTimers.set(roomId, timeout);
}

function clearActionTimer(roomId: string) {
  const timer = actionTimers.get(roomId);
  if (timer) {
    clearTimeout(timer);
    actionTimers.delete(roomId);
  }
}

/**
 * Handle poker state updates after actions
 * Checks for round completion, phase advancement, showdown
 */
async function handlePokerStateUpdate(
  room: any,
  roomId: string,
  gameState: PokerGameState,
  io: Server,
  roomManager: RoomManager,
  prisma: PrismaClient
) {
  // Check if we need to advance to showdown
  if (gameState.phase === 'showdown') {
    await handleShowdown(room, roomId, gameState, io, roomManager, prisma);
    return;
  }

  if (gameState.phase === 'hand_end') {
    // Hand ended (all but one folded)
    clearActionTimer(roomId);

    // Check if game should continue
    const activePlayers = gameState.players.filter(p => p.chips > 0 && !p.isSittingOut);
    if (activePlayers.length < 2) {
      gameState.phase = 'game_end';
      room.status = 'ended';
      emitPokerState(io, roomId, room, gameState);
      return;
    }

    // Emit state and wait for next hand
    emitPokerState(io, roomId, room, gameState);
    return;
  }

  // Continue betting round
  emitPokerState(io, roomId, room, gameState);
  startActionTimer(roomId, io, roomManager, prisma);
}

/**
 * Handle showdown: evaluate hands, calculate side pots, distribute winnings
 */
async function handleShowdown(
  room: any,
  roomId: string,
  gameState: PokerGameState,
  io: Server,
  roomManager: RoomManager,
  prisma: PrismaClient
) {
  clearActionTimer(roomId);

  const activePlayers = gameState.players.filter(p => !p.isFolded);

  // Evaluate all active hands
  const handEvaluations = activePlayers.map(player => {
    const bestHand = findBestHand(player.holeCards, gameState.communityCards);
    return {
      userId: player.userId,
      displayName: player.displayName,
      hand: bestHand,
    };
  });

  // Build hand rankings for pot distribution
  const handRankings = new Map<string, number>();
  for (const evaluation of handEvaluations) {
    // Use negative rank because lower rank is better (1 is Royal Flush)
    // Then add fractional value for tiebreaker
    const rankingValue = -(evaluation.hand.rank * 1000000) + (evaluation.hand.value || 0);
    handRankings.set(evaluation.userId, rankingValue);
  }

  // Build player contributions for side pot calculation
  const contributions: PlayerContribution[] = gameState.players.map(player => ({
    userId: player.userId,
    amount: player.totalBetInHand,
    isFolded: player.isFolded,
  }));

  // Calculate side pots
  const pots = calculateSidePots(contributions);

  // Distribute pots to winners
  const winnings = distributePots(pots, handRankings);

  // Apply winnings to player chips
  const updatedPlayers = gameState.players.map(player => {
    const winAmount = winnings.get(player.userId) || 0;
    return {
      ...player,
      chips: player.chips + winAmount,
    };
  });

  // Build showdown details for client
  const showdownDetails = handEvaluations.map(evaluation => ({
    userId: evaluation.userId,
    displayName: evaluation.displayName,
    holeCards: gameState.players.find(p => p.userId === evaluation.userId)?.holeCards || [],
    handName: evaluation.hand.name,
    handRank: evaluation.hand.rank,
    bestCards: evaluation.hand.cards,
    winAmount: winnings.get(evaluation.userId) || 0,
  }));

  // Update game state
  const updatedState: PokerGameState = {
    ...gameState,
    players: updatedPlayers,
    pot: 0,
  };

  room.gameState = updatedState;

  // Emit showdown event with all cards revealed
  io.to(roomId).emit('poker:showdown', {
    details: showdownDetails,
    pots: pots.map((pot, index) => ({
      number: index + 1,
      amount: pot.amount,
      eligiblePlayerIds: pot.eligiblePlayerIds,
    })),
  });

  // Emit updated state (all cards visible now)
  emitPokerState(io, roomId, room, updatedState);

  // Check if game should end
  const playersWithChips = updatedPlayers.filter(p => p.chips > 0 && !p.isSittingOut);
  if (playersWithChips.length < 2) {
    updatedState.phase = 'game_end';
    room.status = 'ended';
    room.gameState = updatedState;
    emitPokerState(io, roomId, room, updatedState);
  }
}

/**
 * Register poker-specific Socket.IO handlers
 */
export function registerPokerHandlers(
  socket: Socket,
  io: Server,
  roomManager: RoomManager,
  prisma: PrismaClient
) {
  /**
   * Handle poker actions: fold, check, call, raise, all_in
   */
  socket.on('poker:action', async (data: PokerActionData, callback) => {
    try {
      const { roomId, action, amount } = data;
      const room = roomManager.getRoom(roomId);

      if (!room) {
        callback?.({ success: false, error: 'Room not found' });
        return;
      }

      if (room.gameType !== 'poker') {
        callback?.({ success: false, error: 'Not a poker room' });
        return;
      }

      const gameState = room.gameState as PokerGameState;
      const activePlayer = gameState.players[gameState.activePlayerIndex];

      if (activePlayer.userId !== socket.data.userId) {
        callback?.({ success: false, error: 'Not your turn' });
        return;
      }

      // Build action
      let pokerAction: PokerAction;
      switch (action) {
        case 'fold':
          pokerAction = { type: 'FOLD' };
          break;
        case 'check':
          pokerAction = { type: 'CHECK' };
          break;
        case 'call':
          pokerAction = { type: 'CALL' };
          break;
        case 'raise':
          if (amount === undefined) {
            callback?.({ success: false, error: 'Raise amount required' });
            return;
          }
          pokerAction = { type: 'RAISE', amount };
          break;
        case 'all_in':
          pokerAction = { type: 'ALL_IN' };
          break;
        default:
          callback?.({ success: false, error: 'Invalid action' });
          return;
      }

      // Apply action via state machine
      const result = applyPokerAction(gameState, pokerAction, socket.data.userId);

      if (result instanceof Error) {
        callback?.({ success: false, error: result.message });
        return;
      }

      room.gameState = result;

      // Clear AFK warnings for this player
      const warningKey = `${roomId}:${socket.data.userId}`;
      // Note: afkWarnings would need to be accessible here if we implement it

      callback?.({ success: true });

      // Handle state update (might trigger phase advancement)
      await handlePokerStateUpdate(room, roomId, result, io, roomManager, prisma);
    } catch (error) {
      console.error('poker:action error:', error);
      callback?.({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * Handle rebuy between hands
   */
  socket.on('poker:rebuy', async (data: PokerRebuyData, callback) => {
    try {
      const { roomId, amount } = data;
      const room = roomManager.getRoom(roomId);

      if (!room) {
        callback?.({ success: false, error: 'Room not found' });
        return;
      }

      if (room.gameType !== 'poker') {
        callback?.({ success: false, error: 'Not a poker room' });
        return;
      }

      const gameState = room.gameState as PokerGameState;

      // Can only rebuy between hands
      if (gameState.phase !== 'hand_end' && gameState.phase !== 'waiting') {
        callback?.({ success: false, error: 'Can only rebuy between hands' });
        return;
      }

      const player = gameState.players.find(p => p.userId === socket.data.userId);
      if (!player) {
        callback?.({ success: false, error: 'Not in game' });
        return;
      }

      // Check if bet room
      if (room.isBetRoom) {
        // Debit wallet, create escrow, add chips
        const wallet = await prisma.wallet.findUnique({
          where: { userId: socket.data.userId },
        });

        if (!wallet || wallet.balance < amount) {
          callback?.({ success: false, error: 'Insufficient balance' });
          return;
        }

        if (wallet.frozenAt !== null) {
          callback?.({ success: false, error: 'Wallet is frozen' });
          return;
        }

        await prisma.$transaction(
          async (tx) => {
            await tx.wallet.update({
              where: { userId: socket.data.userId },
              data: { balance: { decrement: amount } },
            });

            await tx.transaction.create({
              data: {
                type: 'BET_PLACED',
                amount,
                userId: socket.data.userId,
                description: `Poker Rebuy: ${room.name}`,
              },
            });

            await tx.betEscrow.create({
              data: {
                roomId,
                userId: socket.data.userId,
                amount,
                status: 'LOCKED',
                lockedAt: new Date(),
              },
            });
          },
          { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 }
        );

        emitBalanceUpdate(io, socket.data.userId, wallet.balance - amount, -amount, `Poker Rebuy: ${room.name}`);
      }

      // Add chips to player
      player.chips += amount;

      sendSystemMessage(roomId, io, `${player.displayName} hat ${amount} Chips nachgekauft`, roomManager);
      emitPokerState(io, roomId, room, gameState);

      callback?.({ success: true });
    } catch (error) {
      console.error('poker:rebuy error:', error);
      callback?.({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * Handle game end (host only)
   */
  socket.on('poker:end-game', async (data: PokerEndGameData, callback) => {
    try {
      const { roomId } = data;
      const room = roomManager.getRoom(roomId);

      if (!room) {
        callback?.({ success: false, error: 'Room not found' });
        return;
      }

      if (room.hostId !== socket.data.userId) {
        callback?.({ success: false, error: 'Only host can end game' });
        return;
      }

      if (room.gameType !== 'poker') {
        callback?.({ success: false, error: 'Not a poker room' });
        return;
      }

      const gameState = room.gameState as PokerGameState;

      // Convert chips back to balance
      if (room.isBetRoom) {
        await prisma.$transaction(
          async (tx) => {
            for (const player of gameState.players) {
              if (player.chips > 0) {
                // Credit chips back to balance
                await tx.wallet.update({
                  where: { userId: player.userId },
                  data: { balance: { increment: player.chips } },
                });

                await tx.transaction.create({
                  data: {
                    type: 'GAME_WIN',
                    amount: player.chips,
                    userId: player.userId,
                    description: `Poker Cashout: ${room.name}`,
                  },
                });

                emitBalanceUpdate(io, player.userId, 0, player.chips, `Poker Cashout: ${room.name}`);
              }
            }

            // Release all escrows
            await tx.betEscrow.updateMany({
              where: { roomId, status: 'LOCKED' },
              data: {
                status: 'RELEASED',
                releasedAt: new Date(),
              },
            });
          },
          { isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000 }
        );
      }

      clearActionTimer(roomId);
      gameState.phase = 'game_end';
      room.status = 'ended';
      room.gameState = gameState;

      sendSystemMessage(roomId, io, 'Spiel wurde vom Host beendet', roomManager);
      emitPokerState(io, roomId, room, gameState);

      callback?.({ success: true });
    } catch (error) {
      console.error('poker:end-game error:', error);
      callback?.({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * Handle sit-out
   */
  socket.on('poker:sit-out', (data: PokerSitData, callback) => {
    try {
      const { roomId } = data;
      const room = roomManager.getRoom(roomId);

      if (!room) {
        callback?.({ success: false, error: 'Room not found' });
        return;
      }

      const gameState = room.gameState as PokerGameState;
      const player = gameState.players.find(p => p.userId === socket.data.userId);

      if (!player) {
        callback?.({ success: false, error: 'Not in game' });
        return;
      }

      player.isSittingOut = true;

      sendSystemMessage(roomId, io, `${player.displayName} sitzt aus`, roomManager);
      emitPokerState(io, roomId, room, gameState);

      callback?.({ success: true });
    } catch (error) {
      console.error('poker:sit-out error:', error);
      callback?.({ success: false, error: 'Internal server error' });
    }
  });

  /**
   * Handle sit-in
   */
  socket.on('poker:sit-in', (data: PokerSitData, callback) => {
    try {
      const { roomId } = data;
      const room = roomManager.getRoom(roomId);

      if (!room) {
        callback?.({ success: false, error: 'Room not found' });
        return;
      }

      const gameState = room.gameState as PokerGameState;
      const player = gameState.players.find(p => p.userId === socket.data.userId);

      if (!player) {
        callback?.({ success: false, error: 'Not in game' });
        return;
      }

      player.isSittingOut = false;

      sendSystemMessage(roomId, io, `${player.displayName} ist wieder dabei`, roomManager);
      emitPokerState(io, roomId, room, gameState);

      callback?.({ success: true });
    } catch (error) {
      console.error('poker:sit-in error:', error);
      callback?.({ success: false, error: 'Internal server error' });
    }
  });
}
