import { Elysia, t } from 'elysia';
import { RoomModel, RoomType } from '../models/room';
import { logger } from '../lib/logger';

/**
 * Determines the winner based on votes and whether the word was guessed
 * @param room - Current room state with votes
 * @param wordGuessed - Whether the secret word was correctly guessed
 * @returns Object containing winner, whether insider was identified, and most voted player ID
 */
function determineWinner(room: RoomType, wordGuessed: boolean): {
    winner: 'commons' | 'insider';
    insiderIdentified: boolean;
    mostVotedPlayerId: string | null;
} {
    // Tally votes
    const voteCounts = new Map<string, number>();
    room.votes.forEach(vote => {
        voteCounts.set(vote.targetId, (voteCounts.get(vote.targetId) || 0) + 1);
    });

    // Find player with most votes
    let maxVotes = 0;
    let mostVotedPlayerId: string | null = null;
    voteCounts.forEach((count, playerId) => {
        if (count > maxVotes) {
            maxVotes = count;
            mostVotedPlayerId = playerId;
        }
    });

    // Find actual insider
    const insiderPlayer = room.players.find(p => p.inGameRole === 'insider');
    const insiderIdentified = mostVotedPlayerId === insiderPlayer?.id;

    // Determine winner based on rules:
    // Commons & Host win: word guessed AND insider identified
    // Insider wins: word NOT guessed OR insider NOT identified
    const winner = (wordGuessed && insiderIdentified) ? 'commons' : 'insider';

    return { winner, insiderIdentified, mostVotedPlayerId };
}

/**
 * Schedule a transition to voting phase after discussion timer expires
 * This is extracted to a separate function to avoid closure issues with nested setTimeouts
 */
async function scheduleVotingTransition(roomId: string, discussionDuration: number, ws: any) {
    logger.info({ roomId, discussionDuration }, 'Scheduling voting transition');
    console.log(`[Voting Transition] Scheduled for room ${roomId} in ${discussionDuration}ms`);

    await new Promise(resolve => setTimeout(resolve, discussionDuration));

    try {
        logger.info({ roomId }, 'Voting transition timeout completed');
        console.log(`[Voting Transition] Timeout completed for room ${roomId}`);
        
        const discussionRoom = await RoomModel.findOne({ roomId });
        if (!discussionRoom) {
            logger.warn({ roomId }, 'Room not found for voting transition');
            console.log(`[Voting Transition] Room ${roomId} not found`);
            return;
        }

        console.log(`[Voting Transition] Room ${roomId} status: ${discussionRoom.status}`);
        if (discussionRoom.status !== 'showdown_discussion') {
            logger.info({ roomId, status: discussionRoom.status }, 'Room not in discussion phase, skipping voting transition');
            console.log(`[Voting Transition] Room ${roomId} not in discussion phase (${discussionRoom.status})`);
            return;
        }

        if (!discussionRoom.phaseEndTime || Date.now() < discussionRoom.phaseEndTime) {
            logger.info({ roomId }, 'Discussion timer not yet expired, skipping voting transition');
            console.log(`[Voting Transition] Timer not expired for room ${roomId}`);
            return;
        }

        logger.info({ roomId }, 'Discussion timer expired, starting voting');
        console.log(`[Voting Transition] Starting voting for room ${roomId}`);

        discussionRoom.status = 'showdown_voting';
        discussionRoom.phaseEndTime = null;
        await discussionRoom.save();

        const eligiblePlayers = discussionRoom.players.filter(
            p => p.inGameRole !== 'host' && p.isOnline
        );

        console.log(`[Voting Transition] Eligible players: ${eligiblePlayers.length}`);
        console.log(`[Voting Transition] All players:`, discussionRoom.players.map((p: any) => ({
            name: p.name,
            isAdmin: p.isAdmin,
            inGameRole: p.inGameRole,
            isOnline: p.isOnline
        })));
        console.log(`[Voting Transition] Eligible player names:`, eligiblePlayers.map((p: any) => `${p.name}${p.isAdmin ? ' (admin)' : ''}`));
        
        // Debug: Show why players were filtered out
        const filteredOutHost = discussionRoom.players.filter(p => p.inGameRole === 'host');
        const filteredOutOffline = discussionRoom.players.filter(p => !p.isOnline);
        console.log(`[Voting Transition] Filtered out (host):`, filteredOutHost.map((p: any) => p.name));
        console.log(`[Voting Transition] Filtered out (offline):`, filteredOutOffline.map((p: any) => p.name));
        console.log(`[Voting Transition] Filtered out (null role):`, discussionRoom.players.filter(p => !p.inGameRole).map((p: any) => p.name));
        
        const votingPayload = JSON.stringify({
            type: 'voting_started',
            eligiblePlayers
        });

        // Broadcast to all players in the room using the ws context
        logger.info({ roomId }, 'Broadcasting voting_started event');
        console.log(`[Voting Transition] Broadcasting voting_started to room ${roomId}`);
        ws.publish(`room:${roomId}`, votingPayload);
        console.log(`[Voting Transition] Broadcast complete`);
    } catch (err) {
        logger.error({ err, roomId }, 'Error in discussion timer timeout');
        console.error(`[Voting Transition] Error:`, err);
    }
}

export const wsRoutes = new Elysia({ prefix: '/ws/rooms' })
    .ws('/:roomId', {
        query: t.Object({ deviceId: t.String() }),
        body: t.Any(), // Will be typed strictly later
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
                    // Broadcast to everyone else in the room
                    ws.publish(`room:${roomId}`, updatePayload);
                    // Send to the newly connected client as well
                    ws.send(updatePayload);
                }
            }
        },
        async message(ws, message: any) {
            const { roomId } = ws.data.params;
            const { deviceId } = ws.data.query;
            
            // Handle if message is string instead of JSON object natively
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
                    
                    room.status = 'playing';
                    
                    // Assign host explicitly
                    hostPlayer.inGameRole = 'host';
                    
                    // Temporary simple role assignment (needs secure shuffle in production)
                    const otherPlayers = room.players.filter(p => p.id !== parsedMessage.hostPlayerId);
                    if (otherPlayers.length > 0) {
                        const shuffled = [...otherPlayers].sort(() => 0.5 - Math.random());
                        shuffled[0].inGameRole = 'insider';
                        for (let i = 1; i < shuffled.length; i++) {
                            shuffled[i].inGameRole = 'common';
                        }
                    }
                    
                    room.secretWord = 'Elephant'; // Mock word
                    room.phaseEndTime = Date.now() + (room.timerConfig.quiz * 1000);
                    await room.save();

                    // Log role assignment for debugging
                    console.log('[Game Start] Roles assigned:', room.players.map((p: any) => ({
                        name: p.name,
                        isAdmin: p.isAdmin,
                        inGameRole: p.inGameRole,
                        isOnline: p.isOnline
                    })));

                    const updatePayload = JSON.stringify({ type: 'game_started', room: room.toJSON() });
                    ws.publish(`room:${roomId}`, updatePayload);
                    ws.send(updatePayload); // publish doesn't send to self
                    
                    // Handle automatic transition if configured
                    if (room.timerConfig.autoTransition) {
                        const quizDuration = room.timerConfig.quiz * 1000;
                        setTimeout(async () => {
                            try {
                                const currentRoom = await RoomModel.findOne({ roomId });
                                if (currentRoom && currentRoom.status === 'playing' && currentRoom.phaseEndTime && Date.now() >= currentRoom.phaseEndTime) {
                                    logger.info({ roomId }, 'Quiz timer expired, auto-transitioning to showdown');
                                    currentRoom.status = 'showdown_discussion';
                                    const discussionEndTime = Date.now() + (currentRoom.timerConfig.discussion * 1000);
                                    currentRoom.phaseEndTime = discussionEndTime;
                                    await currentRoom.save();
                                    const transitionPayload = JSON.stringify({ type: 'room_state_update', room: currentRoom.toJSON() });
                                    ws.publish(`room:${roomId}`, transitionPayload);
                                    ws.send(transitionPayload);

                                    // Schedule transition to voting after discussion timer
                                    const discussionDuration = currentRoom.timerConfig.discussion * 1000;
                                    scheduleVotingTransition(roomId, discussionDuration, ws);
                                }
                            } catch (err) {
                                logger.error({ err, roomId }, 'Error in quiz timer timeout');
                            }
                        }, quizDuration);
                    } else {
                        // Non-auto-transition: Insider wins if timer expires
                        setTimeout(async () => {
                            const currentRoom = await RoomModel.findOne({ roomId });
                            if (currentRoom && currentRoom.status === 'playing' && 
                                currentRoom.phaseEndTime && Date.now() >= currentRoom.phaseEndTime) {
                                logger.info({ roomId }, 'Quiz timer expired - Insider wins');
                                
                                // Word was NOT guessed - Insider wins automatically
                                currentRoom.status = 'completed';
                                const insiderPlayer = currentRoom.players.find(p => p.inGameRole === 'insider');
                                currentRoom.gameResult = {
                                    winner: 'insider',
                                    insiderIdentified: false,
                                    wordGuessed: false,
                                    voteCounts: {},
                                    insiderPlayerId: insiderPlayer?.id
                                };
                                await currentRoom.save();
                                
                                const revealPayload = JSON.stringify({ 
                                    type: 'roles_revealed', 
                                    room: currentRoom.toJSON() 
                                });
                                ws.publish(`room:${roomId}`, revealPayload);
                                ws.send(revealPayload);
                            }
                        }, room.timerConfig.quiz * 1000);
                    }

                } else if (parsedMessage.type === 'update_timer_config') {
                    logger.info({ roomId, deviceId, config: parsedMessage.config }, 'Admin updated timer config');
                    if (parsedMessage.config) {
                        room.timerConfig = {
                            quiz: parsedMessage.config.quiz || 180,
                            discussion: parsedMessage.config.discussion || 180,
                            autoTransition: parsedMessage.config.autoTransition !== undefined ? parsedMessage.config.autoTransition : true
                        };
                        await room.save();
                        const updatePayload = JSON.stringify({ type: 'room_state_update', room: room.toJSON() });
                        ws.publish(`room:${roomId}`, updatePayload);
                        ws.send(updatePayload);
                    }
                } else if (parsedMessage.type === 'end_round') {
                    logger.info({ roomId, deviceId }, 'Admin ended the round');
                    room.status = 'lobby';
                    room.players.forEach(p => p.inGameRole = null);
                    room.secretWord = '';
                    room.phaseEndTime = null;
                    room.votes = [];
                    room.gameResult = undefined;
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
                    room.status = 'showdown_discussion';
                    const discussionEndTime = Date.now() + (room.timerConfig.discussion * 1000);
                    room.phaseEndTime = discussionEndTime;
                    await room.save();
                    const transitionPayload = JSON.stringify({ type: 'room_state_update', room: room.toJSON() });
                    ws.publish(`room:${roomId}`, transitionPayload);
                    ws.send(transitionPayload);

                    // Schedule transition to voting after discussion timer
                    if (room.timerConfig.autoTransition) {
                        const discussionDuration = room.timerConfig.discussion * 1000;
                        scheduleVotingTransition(roomId, discussionDuration, ws);
                    }
                }
                
                // Host can call time's up (word not guessed - Insider wins)
                if (parsedMessage.type === 'time_up' && room.status === 'playing') {
                    logger.info({ roomId, deviceId }, 'Host called time\'s up - Insider wins');
                    
                    // Word was NOT guessed - Insider wins
                    room.status = 'completed';
                    const insiderPlayer = room.players.find(p => p.inGameRole === 'insider');
                    room.gameResult = {
                        winner: 'insider',
                        insiderIdentified: false,
                        wordGuessed: false,
                        voteCounts: {},
                        insiderPlayerId: insiderPlayer?.id
                    };
                    await room.save();
                    
                    const revealPayload = JSON.stringify({ 
                        type: 'roles_revealed', 
                        room: room.toJSON() 
                    });
                    ws.publish(`room:${roomId}`, revealPayload);
                    ws.send(revealPayload);
                }
                
                // Host can reveal roles after voting
                if (parsedMessage.type === 'reveal_roles' && 
                    (room.status === 'showdown_voting' || room.status === 'showdown_discussion')) {
                    logger.info({ roomId, deviceId }, 'Host triggered role reveal');
                    
                    // Word was guessed (host triggered showdown manually)
                    const wordGuessed = true;
                    
                    // Determine winner
                    const { winner, insiderIdentified } = determineWinner(room, wordGuessed);
                    
                    // Tally final vote counts
                    const voteCounts: Record<string, number> = {};
                    room.votes.forEach(vote => {
                        voteCounts[vote.targetId] = (voteCounts[vote.targetId] || 0) + 1;
                    });
                    
                    // Find insider player ID
                    const insiderPlayer = room.players.find(p => p.inGameRole === 'insider');
                    
                    // Store game result
                    room.gameResult = {
                        winner,
                        insiderIdentified,
                        wordGuessed,
                        voteCounts,
                        insiderPlayerId: insiderPlayer?.id
                    };
                    
                    // Update game status
                    room.status = 'completed';
                    await room.save();
                    
                    // Broadcast to all players
                    const revealPayload = JSON.stringify({ 
                        type: 'roles_revealed', 
                        room: room.toJSON() 
                    });
                    
                    ws.publish(`room:${roomId}`, revealPayload);
                    ws.send(revealPayload);
                    
                    logger.info({ roomId, winner, insiderIdentified }, 'Game completed');
                }
            }
            
            // Voting Actions (all players except host)
            if (parsedMessage.type === 'submit_vote' && room.status === 'showdown_voting') {
                const { voterPlayerId, targetPlayerId } = parsedMessage;
                
                // Validation: Check voter exists
                const voter = room.players.find(p => p.id === voterPlayerId);
                if (!voter) {
                    logger.warn({ roomId, voterPlayerId }, 'Vote submitted by unknown player');
                    return;
                }
                
                // Validation: Check target exists
                const target = room.players.find(p => p.id === targetPlayerId);
                if (!target) {
                    logger.warn({ roomId, targetPlayerId }, 'Vote target not found');
                    return;
                }
                
                // Validation: Cannot vote for host
                const hostPlayer = room.players.find(p => p.inGameRole === 'host');
                if (targetPlayerId === hostPlayer?.id) {
                    logger.warn({ roomId, voterPlayerId }, 'Cannot vote for host');
                    return;
                }
                
                // Validation: Cannot vote for self
                if (targetPlayerId === voterPlayerId) {
                    logger.warn({ roomId, voterPlayerId }, 'Cannot vote for self');
                    return;
                }
                
                // Validation: Check if already voted
                const alreadyVoted = room.votes.some(v => v.voterId === voterPlayerId);
                if (alreadyVoted) {
                    logger.warn({ roomId, voterPlayerId }, 'Player already voted');
                    return;
                }
                
                // Record vote
                room.votes.push({ voterId: voterPlayerId, targetId: targetPlayerId });
                await room.save();
                
                // Tally votes
                const voteCounts: Record<string, number> = {};
                room.votes.forEach(vote => {
                    voteCounts[vote.targetId] = (voteCounts[vote.targetId] || 0) + 1;
                });
                
                // Get list of players who have voted
                const hasVoted = room.votes.map(v => v.voterId);
                
                // Broadcast updated vote counts
                const votePayload = JSON.stringify({ 
                    type: 'vote_tallied', 
                    voteCounts,
                    hasVoted
                });
                ws.publish(`room:${roomId}`, votePayload);
                ws.send(votePayload);
                
                // Check if all eligible players have voted
                const eligiblePlayers = room.players.filter(
                    p => p.inGameRole !== 'host' && p.isOnline
                );
                const allVoted = eligiblePlayers.every(p => hasVoted.includes(p.id));
                
                if (allVoted && eligiblePlayers.length > 0) {
                    // Auto-transition to voting finished
                    const votingFinishedPayload = JSON.stringify({ 
                        type: 'voting_finished', 
                        voteCounts,
                        message: 'All votes submitted. Waiting for host to reveal roles.'
                    });
                    ws.publish(`room:${roomId}`, votingFinishedPayload);
                    ws.send(votingFinishedPayload);
                }
                
                logger.info({ roomId, voterPlayerId, targetPlayerId }, 'Vote submitted successfully');
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
                // Broadcast state so other players see the offline status or the removal (if they explicitly left via REST just before closing)
                ws.publish(`room:${roomId}`, JSON.stringify({ type: 'room_state_update', room: room.toJSON() }));
            }
        }
    });
