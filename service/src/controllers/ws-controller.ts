import { Elysia, t } from 'elysia';
import { RoomModel } from '../models/room';
import { logger } from '../lib/logger';

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

                    room.secretWord = 'Elephant';
                    room.phaseEndTime = Date.now() + (room.timerConfig.quiz * 1000);
                    await room.save();

                    const updatePayload = JSON.stringify({ type: 'game_started', room: room.toJSON() });
                    ws.publish(`room:${roomId}`, updatePayload);
                    ws.send(updatePayload);

                    if (room.timerConfig.autoTransition) {
                        setTimeout(async () => {
                            const currentRoom = await RoomModel.findOne({ roomId });
                            if (currentRoom && currentRoom.status === 'playing' && currentRoom.phaseEndTime && Date.now() >= currentRoom.phaseEndTime) {
                                logger.info({ roomId }, 'Quiz timer expired, auto-transitioning to showdown');
                                currentRoom.status = 'showdown_discussion';
                                currentRoom.phaseEndTime = Date.now() + (currentRoom.timerConfig.discussion * 1000);
                                await currentRoom.save();
                                const transitionPayload = JSON.stringify({ type: 'room_state_update', room: currentRoom.toJSON() });
                                ws.publish(`room:${roomId}`, transitionPayload);
                                ws.send(transitionPayload);
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
                    room.phaseEndTime = Date.now() + (room.timerConfig.discussion * 1000);
                    await room.save();
                    const transitionPayload = JSON.stringify({ type: 'room_state_update', room: room.toJSON() });
                    ws.publish(`room:${roomId}`, transitionPayload);
                    ws.send(transitionPayload);
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
