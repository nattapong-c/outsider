import { edenTreaty } from '@elysiajs/eden';
import type { AppRouter } from '../src/index';

const api = edenTreaty<AppRouter>('http://localhost:3001');

async function testGameLoop() {
    console.log('--- Starting Game Loop Test ---');

    // 1. Create a Room
    console.log('1. Admin creating room...');
    const createRes = await api.rooms.post({});
    if (createRes.error) {
        console.error('Failed to create room:', createRes.error);
        return;
    }
    const roomId = createRes.data.roomId;
    console.log(`✅ Room created: ${roomId}`);

    // Generate test users
    const adminDeviceId = crypto.randomUUID();
    const player2DeviceId = crypto.randomUUID();
    const player3DeviceId = crypto.randomUUID();

    // 2. Admin joins
    console.log('2. Admin joining room...');
    const adminJoinRes = await api.rooms[roomId].join.post({
        name: 'AdminPlayer',
        deviceId: adminDeviceId
    });
    if (adminJoinRes.error) {
        console.error('Admin failed to join:', adminJoinRes.error);
        return;
    }
    console.log('✅ Admin joined successfully');

    // 3. Other players join
    console.log('3. Players 2 and 3 joining room...');
    await api.rooms[roomId].join.post({ name: 'Player2', deviceId: player2DeviceId });
    await api.rooms[roomId].join.post({ name: 'Player3', deviceId: player3DeviceId });
    console.log('✅ Players joined successfully');

    // 4. Admin starts the game via WebSocket
    console.log('4. Admin connecting via WS and starting game...');
    
    const wsUrl = `ws://localhost:3001/ws/rooms/${roomId}?deviceId=${adminDeviceId}`;
    
    return new Promise((resolve) => {
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = async () => {
            console.log('✅ WS Connected for Admin');
            
            // Get players to select a host
            const roomRes = await api.rooms[roomId].get();
            if (roomRes.error || !roomRes.data) return;
            const players = (roomRes.data as any).room.players;
            const hostId = players[1].id; // Select Player 2 as host
            
            // Wait briefly for connection to establish before sending message
            setTimeout(() => {
                console.log(`Sending start_game event with hostPlayerId: ${hostId}...`);
                ws.send(JSON.stringify({ type: 'start_game', hostPlayerId: hostId }));
            }, 500);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data.toString());
            console.log(`Received WS message: ${data.type}`);
            
            if (data.type === 'game_started') {
                console.log('✅ Game Started Successfully!');
                const room = data.room;
                console.log(`Room Status: ${room.status}`);
                console.log(`Secret Word: ${room.secretWord}`);
                room.players.forEach((p: any) => {
                    console.log(`- ${p.name}: ${p.inGameRole} (Admin: ${p.isAdmin})`);
                });
                
                // End round to test full loop
                console.log('5. Admin ending the round...');
                ws.send(JSON.stringify({ type: 'end_round' }));
            }

            if (data.type === 'room_state_update' && data.room.status === 'lobby') {
                console.log('✅ Round Ended Successfully. Room is back to lobby.');
                ws.close();
                resolve(true);
            }
        };

        ws.onerror = (error) => {
            console.error('WS Error:', error);
            resolve(false);
        };
    });
}

testGameLoop().then(() => {
    console.log('--- Test Complete ---');
    process.exit(0);
}).catch(console.error);
