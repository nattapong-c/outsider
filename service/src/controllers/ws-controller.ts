import { Elysia, t } from 'elysia';
import { RoomModel } from '../models/room';
import { logger } from '../lib/logger';
import { getRandomWord } from '../services/word-service';

// Track active timers to prevent orphaned timeouts
const activeTimers = new Map<string, { quizTimeout?: NodeJS.Timeout; discussionTimeout?: NodeJS.Timeout }>();

export const wsRoutes = new Elysia({ prefix: '/ws/rooms' })
    .ws('/:roomId', {
        query: t.Object({ deviceId: t.String() }),
        body: t.Any(),
        async open(ws) {
            const { roomId } = ws.data.params;
            const { deviceId } = ws.data.query;

            ws.subscribe(`room:${roomId}`);
            logger.info({ roomId, deviceId }, 'WebSocket connected');

            const room = await RoomModel.findOne({ roomId });
            if (room) {
                const player = room.players.find(p => p.deviceId === deviceId);
                if (player) {
                    player.isOnline = true;
                    await room.save();

                    const updatePayload = JSON.stringify({ type: 'room_state_update', room: room.toJSON() });
                    ws.publish(`room:${roomId}`, updatePayload);
                    ws.send(updatePayload);
                }
            }
        },
        async message(ws, message: any) {
            const { roomId } = ws.data.params;
            const { deviceId } = ws.data.query;

            let parsedMessage = message;
            if (typeof message === 'string') {
                try {
                    parsedMessage = JSON.parse(message);
                } catch(e) { return; }
            }

            const room = await RoomModel.findOne({ roomId });
            if (!room) return;

            const player = room.players.find(p => p.deviceId === deviceId);
            if (!player) return;

            // Admin Actions
            if (player.isAdmin) {
                if (parsedMessage.type === 'start_game') {
                    if (!parsedMessage.hostPlayerId) {
                        logger.warn({ roomId, deviceId }, 'Admin tried to start game without selecting a host');
                        return;
                    }

                    const hostPlayer = room.players.find(p => p.id === parsedMessage.hostPlayerId);
                    if (!hostPlayer) {
                        logger.warn({ roomId, deviceId, hostPlayerId: parsedMessage.hostPlayerId }, 'Selected host player not found');
                        return;
                    }

                    logger.info({ roomId, deviceId, hostPlayerId: parsedMessage.hostPlayerId }, 'Admin started the game');

                    // Clear any existing timers for this room
                    const existingTimers = activeTimers.get(roomId);
                    if (existingTimers) {
                        if (existingTimers.quizTimeout) clearTimeout(existingTimers.quizTimeout);
                        if (existingTimers.discussionTimeout) clearTimeout(existingTimers.discussionTimeout);
                    }

                    room.status = 'playing';
                    hostPlayer.inGameRole = 'host';

                    const otherPlayers = room.players.filter(p => p.id !== parsedMessage.hostPlayerId);
                    if (otherPlayers.length > 0) {
                        const shuffled = [...otherPlayers].sort(() => 0.5 - Math.random());
                        shuffled[0].inGameRole = 'insider';
                        for (let i = 1; i < shuffled.length; i++) {
                            shuffled[i].inGameRole = 'common';
                        }
                    }

                    // Select word based on difficulty and language from start_game message
                    const difficulty = parsedMessage.difficulty || room.timerConfig.difficulty || 'medium';
                    const language = parsedMessage.language || room.timerConfig.language || 'english';
                    
                    // Update room config with selected difficulty and language
                    room.timerConfig.difficulty = difficulty;
                    room.timerConfig.language = language;
                    
                    const secretWord = await getRandomWord(
                        difficulty as 'easy' | 'medium' | 'hard',
                        language as 'english' | 'thai'
                    );

                    room.secretWord = secretWord;
                    room.phaseEndTime = Date.now() + (room.timerConfig.quiz * 1000);
                    await room.save();

                    logger.info({ roomId, difficulty, language, secretWord }, 'Game started with word');

                    const updatePayload = JSON.stringify({ type: 'game_started', room: room.toJSON() });
                    ws.publish(`room:${roomId}`, updatePayload);
                    ws.send(updatePayload);

                    // Initialize timer tracking for this room
                    activeTimers.set(roomId, {});

                    // Auto-transition logic based on votingMode
                    if (room.timerConfig.votingMode === 'auto') {
                        // Quiz timer expiry - auto transition to showdown_discussion
                        const quizTimeout = setTimeout(async () => {
                            const currentRoom = await RoomModel.findOne({ roomId });
                            if (!currentRoom) {
                                logger.error({ roomId }, 'Room not found in quiz timeout');
                                return;
                            }

                            if (currentRoom && currentRoom.status === 'playing' && currentRoom.phaseEndTime && Date.now() >= currentRoom.phaseEndTime) {
                                logger.info({ roomId }, 'Quiz timer expired, auto-transitioning to showdown discussion');
                                currentRoom.status = 'showdown_discussion';
                                currentRoom.phaseEndTime = Date.now() + (currentRoom.timerConfig.discussion * 1000);
                                await currentRoom.save();
                                const transitionPayload = JSON.stringify({ type: 'room_state_update', room: currentRoom.toJSON() });
                                
                                // Publish to room channel - this will reach all subscribed clients
                                ws.publish(`room:${roomId}`, transitionPayload);
                                
                                // Also send directly to this WebSocket if still open
                                if (ws.readyState === 1) { // WebSocket.OPEN
                                    ws.send(transitionPayload);
                                }

                                // Auto-transition to voting after discussion timer (only if still auto mode)
                                if (currentRoom.timerConfig.votingMode === 'auto') {
                                    const timers = activeTimers.get(roomId) || {};
                                    timers.discussionTimeout = setTimeout(async () => {
                                        const discussionRoom = await RoomModel.findOne({ roomId });
                                        if (discussionRoom && discussionRoom.status === 'showdown_discussion' && discussionRoom.timerConfig.votingMode === 'auto') {
                                            logger.info({ roomId }, 'Discussion timer expired, auto-starting voting');
                                            discussionRoom.status = 'showdown_voting';
                                            discussionRoom.phaseEndTime = null;
                                            discussionRoom.votes = [];
                                            await discussionRoom.save();
                                            const votingPayload = JSON.stringify({ type: 'voting_started', room: discussionRoom.toJSON() });
                                            ws.publish(`room:${roomId}`, votingPayload);
                                            
                                            // Also send directly to this WebSocket if still open
                                            if (ws.readyState === 1) {
                                                ws.send(votingPayload);
                                            }
                                        }
                                    }, currentRoom.timerConfig.discussion * 1000);
                                    activeTimers.set(roomId, timers);
                                }
                            } else {
                                logger.warn({ roomId, status: currentRoom?.status }, 'Quiz timeout fired but conditions not met - no transition');
                            }
                        }, room.timerConfig.quiz * 1000);

                        // Store quiz timeout reference
                        const timers = activeTimers.get(roomId) || {};
                        timers.quizTimeout = quizTimeout;
                        activeTimers.set(roomId, timers);
                    }

                } else if (parsedMessage.type === 'update_timer_config') {
                    logger.info({ roomId, deviceId, config: parsedMessage.config }, 'Admin updated timer config');
                    if (parsedMessage.config) {
                        room.timerConfig = {
                            quiz: parsedMessage.config.quiz || 180,
                            discussion: parsedMessage.config.discussion || 180,
                            votingMode: parsedMessage.config.votingModeAuto ? 'auto' : 'manual',
                            difficulty: room.timerConfig.difficulty || 'medium',
                            language: room.timerConfig.language || 'english'
                        };
                        await room.save();
                        const updatePayload = JSON.stringify({ type: 'room_state_update', room: room.toJSON() });
                        ws.publish(`room:${roomId}`, updatePayload);
                        ws.send(updatePayload);
                    }
                } else if (parsedMessage.type === 'end_round') {
                    logger.info({ roomId, deviceId }, 'Admin ended the round');
                    
                    // Clear all timers for this room
                    const roomTimers = activeTimers.get(roomId);
                    if (roomTimers) {
                        if (roomTimers.quizTimeout) clearTimeout(roomTimers.quizTimeout);
                        if (roomTimers.discussionTimeout) clearTimeout(roomTimers.discussionTimeout);
                        activeTimers.delete(roomId);
                    }
                    
                    room.status = 'lobby';
                    room.players.forEach(p => p.inGameRole = null);
                    room.secretWord = '';
                    room.phaseEndTime = null;
                    room.votes = [];
                    room.gameResult = null;
                    await room.save();

                    const updatePayload = JSON.stringify({ type: 'room_state_update', room: room.toJSON() });
                    ws.publish(`room:${roomId}`, updatePayload);
                    ws.send(updatePayload);
                } else if (parsedMessage.type === 'kick_player') {
                    logger.info({ roomId, adminDeviceId: deviceId, targetPlayerId: parsedMessage.targetPlayerId }, 'Admin kicked player');
                    room.players = room.players.filter(p => p.id !== parsedMessage.targetPlayerId);
                    await room.save();
                    const updatePayload = JSON.stringify({ type: 'room_state_update', room: room.toJSON() });
                    ws.publish(`room:${roomId}`, updatePayload);
                    ws.send(updatePayload);
                }
            }

            // Host Actions
            if (player.inGameRole === 'host') {
                if (parsedMessage.type === 'trigger_showdown' && room.status === 'playing') {
                    logger.info({ roomId, deviceId }, 'Host triggered showdown phase manually');
                    
                    // Clear quiz timeout since host manually triggered
                    const roomTimers = activeTimers.get(roomId);
                    if (roomTimers && roomTimers.quizTimeout) {
                        clearTimeout(roomTimers.quizTimeout);
                        roomTimers.quizTimeout = undefined;
                    }
                    
                    room.status = 'showdown_discussion';
                    room.phaseEndTime = Date.now() + (room.timerConfig.discussion * 1000);
                    await room.save();
                    const transitionPayload = JSON.stringify({ type: 'room_state_update', room: room.toJSON() });
                    ws.publish(`room:${roomId}`, transitionPayload);
                    ws.send(transitionPayload);

                    // Auto-transition to voting if votingMode is auto
                    if (room.timerConfig.votingMode === 'auto') {
                        const timers = activeTimers.get(roomId) || {};
                        timers.discussionTimeout = setTimeout(async () => {
                            const discussionRoom = await RoomModel.findOne({ roomId });
                            if (discussionRoom && discussionRoom.status === 'showdown_discussion' && discussionRoom.timerConfig.votingMode === 'auto') {
                                logger.info({ roomId }, 'Discussion timer expired (after manual trigger), auto-starting voting');
                                discussionRoom.status = 'showdown_voting';
                                discussionRoom.phaseEndTime = null;
                                discussionRoom.votes = [];
                                await discussionRoom.save();
                                const votingPayload = JSON.stringify({ type: 'voting_started', room: discussionRoom.toJSON() });
                                ws.publish(`room:${roomId}`, votingPayload);
                            }
                        }, room.timerConfig.discussion * 1000);
                        activeTimers.set(roomId, timers);
                    }
                }
                
                // Manual start voting (for manual votingMode)
                if (parsedMessage.type === 'start_voting' && room.status === 'showdown_discussion') {
                    logger.info({ roomId, deviceId }, 'Host manually started voting phase');
                    
                    // Clear discussion timeout
                    const roomTimers = activeTimers.get(roomId);
                    if (roomTimers && roomTimers.discussionTimeout) {
                        clearTimeout(roomTimers.discussionTimeout);
                        roomTimers.discussionTimeout = undefined;
                    }
                    
                    room.status = 'showdown_voting';
                    room.phaseEndTime = null;
                    room.votes = [];
                    await room.save();

                    const payload = JSON.stringify({
                        type: 'voting_started',
                        room: room.toJSON()
                    });
                    ws.publish(`room:${roomId}`, payload);
                    ws.send(payload);
                }
                
                // Reveal roles and end game
                if (parsedMessage.type === 'reveal_roles' && room.status === 'showdown_voting') {
                    logger.info({ roomId, deviceId }, 'Host revealed roles and ended game');
                    
                    // Calculate results
                    const insider = room.players.find(p => p.inGameRole === 'insider');
                    const insiderVotes = room.votes.filter(v => v.targetId === insider?.id).length;
                    const totalVotes = room.votes.length;
                    const insiderIdentified = totalVotes > 0 && insiderVotes > totalVotes / 2;
                    const wordGuessed = true; // Already guessed to reach this phase
                    const commonsWin = wordGuessed && insiderIdentified;
                    
                    // Update state
                    room.status = 'completed';
                    room.gameResult = {
                        winner: commonsWin ? 'commons' : 'insider',
                        insiderIdentified,
                        wordGuessed
                    };
                    
                    await room.save();
                    
                    // Broadcast full reveal
                    const revealPayload = JSON.stringify({
                        type: 'roles_revealed',
                        room: room.toJSON(),
                        votes: room.votes,
                        result: room.gameResult
                    });
                    ws.publish(`room:${roomId}`, revealPayload);
                }
            }
            
            // Player Actions (Commons & Insider)
            if (parsedMessage.type === 'submit_vote' && room.status === 'showdown_voting') {
                const { targetId } = parsedMessage;
                
                // Validation: Cannot vote self
                if (targetId === player.id) {
                    ws.send(JSON.stringify({ 
                        type: 'error', 
                        message: 'Cannot vote for yourself' 
                    }));
                    return;
                }
                
                // Validation: Host cannot vote
                if (player.inGameRole === 'host') {
                    ws.send(JSON.stringify({ 
                        type: 'error', 
                        message: 'Host cannot vote' 
                    }));
                    return;
                }
                
                // Validation: Target must exist and not be host
                const targetPlayer = room.players.find(p => p.id === targetId);
                if (!targetPlayer || targetPlayer.inGameRole === 'host') {
                    ws.send(JSON.stringify({ 
                        type: 'error', 
                        message: 'Invalid vote target' 
                    }));
                    return;
                }
                
                // Store or update vote
                const existingVote = room.votes.find(v => v.voterId === player.id);
                if (existingVote) {
                    existingVote.targetId = targetId; // Allow vote change
                } else {
                    room.votes.push({ voterId: player.id, targetId });
                }

                await room.save();

                // Broadcast vote count (not individual votes)
                const eligibleVoters = room.players.filter(p => p.inGameRole !== 'host').length;
                const voteCountPayload = JSON.stringify({
                    type: 'vote_tallied',
                    voteCount: room.votes.length,
                    eligibleVoters,
                    room: room.toJSON()
                });
                ws.publish(`room:${roomId}`, voteCountPayload);
                
                // Also send directly to the voter's WebSocket to ensure they receive it
                if (ws.readyState === 1) { // WebSocket.OPEN
                    ws.send(voteCountPayload);
                }
            }
        },
        async close(ws) {
            const { roomId } = ws.data.params;
            const { deviceId } = ws.data.query;

            logger.info({ roomId, deviceId }, 'WebSocket disconnected');

            const room = await RoomModel.findOne({ roomId });
            if (room) {
                const player = room.players.find(p => p.deviceId === deviceId);
                if (player) {
                    player.isOnline = false;
                    await room.save();
                }
                ws.publish(`room:${roomId}`, JSON.stringify({ type: 'room_state_update', room: room.toJSON() }));
            }
        }
    });
