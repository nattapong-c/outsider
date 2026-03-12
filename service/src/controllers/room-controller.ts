import { Elysia, t } from 'elysia';
import { RoomModel, RoomSchema, PlayerType } from '../models/room';
import crypto from 'crypto';
import { logger } from '../lib/logger';

export const roomRoutes = new Elysia({ prefix: '/rooms' })
    .post('/', async () => {
        const roomId = crypto.randomUUID().substring(0, 6).toUpperCase();

        const newRoom = new RoomModel({
            roomId,
            status: 'lobby',
            secretWord: '',
            timerConfig: { quiz: 180, discussion: 180, votingMode: 'auto' },
            phaseEndTime: null,
            players: []
        });

        await newRoom.save();
        logger.info({ roomId }, 'New room created');

        return { roomId };
    }, {
        response: t.Object({ roomId: t.String() })
    })
    .get('/:roomId', async ({ params: { roomId }, set }) => {
        const room = await RoomModel.findOne({ roomId });
        if (!room) {
            set.status = 404;
            return 'Room not found';
        }
        return { room: room.toJSON() };
    }, {
        params: t.Object({ roomId: t.String() }),
        response: {
            200: t.Object({ room: RoomSchema }),
            404: t.String()
        }
    })
    .post('/:roomId/join', async ({ params: { roomId }, body, set }) => {
        const { name, deviceId } = body;
        const room = await RoomModel.findOne({ roomId });

        if (!room) {
            logger.warn({ roomId, deviceId }, 'Failed to join: Room not found');
            set.status = 404;
            return 'Room not found';
        }

        const existingPlayer = room.players.find(p => p.deviceId === deviceId);

        if (existingPlayer) {
            existingPlayer.isOnline = true;
            if (name) existingPlayer.name = name; // Update name just in case
            await room.save();
            logger.info({ roomId, deviceId, name: existingPlayer.name }, 'Player reconnected to room');
            return { room: room.toJSON() };
        }

        if (room.players.length >= 8) {
            logger.warn({ roomId, deviceId }, 'Failed to join: Room is full');
            set.status = 400;
            return 'Room is full';
        }

        const newPlayer: PlayerType = {
            id: crypto.randomUUID(),
            name,
            deviceId,
            isAdmin: room.players.length === 0, // First player is admin
            isOnline: true,
            inGameRole: null
        };

        room.players.push(newPlayer);
        await room.save();
        logger.info({ roomId, deviceId, name, isAdmin: newPlayer.isAdmin }, 'New player joined room');

        return { room: room.toJSON() };
    }, {
        params: t.Object({ roomId: t.String() }),
        body: t.Object({ name: t.String(), deviceId: t.String() }),
        response: {
            200: t.Object({ room: RoomSchema }),
            400: t.String(),
            404: t.String()
        }
    })
    .post('/:roomId/leave', async ({ params: { roomId }, body, set }) => {
        const { deviceId } = body;
        const room = await RoomModel.findOne({ roomId });

        if (!room) {
            set.status = 404;
            return 'Room not found';
        }

        const initialLength = room.players.length;
        room.players = room.players.filter(p => p.deviceId !== deviceId);

        if (room.players.length !== initialLength) {
             if (room.players.length === 0) {
                  await RoomModel.deleteOne({ roomId });
                  logger.info({ roomId }, 'Room deleted because all players left');
             } else {
                  // Reassign admin if the leaving player was the admin
                  if (!room.players.some(p => p.isAdmin)) {
                       room.players[0].isAdmin = true;
                       logger.info({ roomId, newAdminDeviceId: room.players[0].deviceId }, 'Admin role reassigned due to previous admin leaving');
                  }
                  await room.save();
             }
             logger.info({ roomId, deviceId }, 'Player explicitly left the room');
        }

        return { success: true };
    }, {
        params: t.Object({ roomId: t.String() }),
        body: t.Object({ deviceId: t.String() }),
        response: {
            200: t.Object({ success: t.Boolean() }),
            404: t.String()
        }
    });
