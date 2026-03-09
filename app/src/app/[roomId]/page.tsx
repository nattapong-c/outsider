'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useDeviceId } from '@/hooks/useDeviceId';
import { api } from '@/lib/api';

export default function RoomPage() {
    const { roomId } = useParams() as { roomId: string };
    const deviceId = useDeviceId();
    const router = useRouter();
    
    const [nickname, setNickname] = useState('');
    const [hasJoined, setHasJoined] = useState(false);
    const [roomState, setRoomState] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    const handleJoin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nickname.trim() || !deviceId) return;

        try {
            const { data, error: apiError } = await api.rooms[roomId].join.post({
                name: nickname,
                deviceId
            });

            if (apiError) {
                setError('Failed to join room');
                return;
            }

            setRoomState((data as any).room);
            setHasJoined(true);
            connectWebSocket();
        } catch (err) {
            setError('An error occurred while joining.');
        }
    };

    const connectWebSocket = () => {
        if (!deviceId) return;
        // In production this should dynamically use ws:// or wss:// based on the current window location
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
        const ws = new WebSocket(`${wsUrl}/ws/rooms/${roomId}?deviceId=${deviceId}`);
        
        ws.onopen = () => console.log('WS Connected');
        ws.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'room_state_update' || message.type === 'game_started' || message.type === 'round_ended') {
                    setRoomState(message.room);
                }
            } catch (e) {
                console.error('Failed to parse WS message', e);
            }
        };
        ws.onclose = () => console.log('WS Disconnected. Will try to reconnect on wake.');
        wsRef.current = ws;
    };

    // Auto-reconnect logic
    useEffect(() => {
        if (!deviceId) return;

        const checkExistingSession = async () => {
            try {
                const { data, error: apiError } = await api.rooms[roomId].get();
                if (apiError || !data) return;

                const room = (data as any).room;
                const isAlreadyInRoom = room.players.some((p: any) => p.deviceId === deviceId);

                if (isAlreadyInRoom) {
                    setRoomState(room);
                    setHasJoined(true);
                    connectWebSocket();
                }
            } catch (err) {
                console.error('Failed to check room session', err);
            }
        };

        checkExistingSession();
    }, [deviceId, roomId]);

    // Cleanup websocket on unmount only. We do not explicitly leave on refresh.
    useEffect(() => {
        return () => {
            if (wsRef.current) wsRef.current.close();
        };
    }, []);

    // Detect if kicked
    useEffect(() => {
        if (hasJoined && roomState && deviceId) {
            const stillInRoom = roomState.players.some((p: any) => p.deviceId === deviceId);
            if (!stillInRoom) {
                // If we are no longer in the room state but we had joined, we were kicked or removed
                router.push('/');
            }
        }
    }, [roomState, deviceId, hasJoined, router]);

    const handleLeaveRoom = async () => {
        if (!deviceId || !roomId) return;
        try {
            await api.rooms[roomId].leave.post({ deviceId });
            router.push('/');
        } catch (error) {
            console.error('Failed to leave room', error);
        }
    };

    if (!deviceId) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center font-mono">Loading Identity...</div>;

    if (!hasJoined) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-gray-900 text-white font-mono">
                <div className="bg-gray-800 p-8 rounded-lg border-4 border-gray-700 w-full max-w-md shadow-[8px_8px_0px_rgba(0,0,0,0.5)]">
                    <h2 className="text-3xl mb-6 text-center font-bold">Join Room: {roomId}</h2>
                    {error && <p className="text-red-400 mb-4 text-center bg-red-900/30 p-2 rounded">{error}</p>}
                    <form onSubmit={handleJoin} className="flex flex-col gap-6">
                        <div>
                            <label className="block text-gray-400 mb-2">Nickname</label>
                            <input
                                type="text"
                                placeholder="Enter your name"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className="w-full p-4 bg-gray-900 border-2 border-gray-600 rounded text-white focus:outline-none focus:border-blue-500 text-xl"
                                maxLength={15}
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-4 rounded border-b-4 border-green-800 hover:border-green-700 active:border-b-0 active:translate-y-1 transition-all text-xl">
                            ENTER LOBBY
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const currentPlayer = roomState?.players?.find((p: any) => p.deviceId === deviceId);
    const isAdmin = currentPlayer?.isAdmin;

    return (
        <div className="min-h-screen bg-gray-900 text-white font-mono p-4 md:p-8">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b-4 border-gray-800 pb-4 gap-4">
                <h1 className="text-3xl font-bold tracking-widest text-blue-400">OUTSIDER</h1>
                <div className="flex items-center gap-4">
                    <div className="bg-gray-800 px-4 py-2 rounded border-2 border-gray-700">
                        Room: <span className="font-bold text-yellow-400">{roomId}</span>
                    </div>
                    <button onClick={handleLeaveRoom} className="bg-red-900 hover:bg-red-800 text-white text-sm font-bold py-2 px-4 rounded border-b-4 border-red-950 active:border-b-0 active:translate-y-1 transition-all">
                        LEAVE
                    </button>
                </div>
            </header>
            
            <main className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Player List Sidebar */}
                <div className="col-span-1 bg-gray-800 p-6 rounded-lg border-4 border-gray-700 h-fit shadow-[4px_4px_0px_rgba(0,0,0,0.3)]">
                    <h2 className="text-xl mb-4 font-bold text-gray-300 uppercase tracking-wider">Players ({roomState?.players?.length}/8)</h2>
                    <ul className="space-y-3">
                        {roomState?.players?.map((player: any) => (
                            <li key={player.id} className={`flex items-center gap-3 p-3 rounded border-2 ${player.deviceId === deviceId ? 'bg-blue-900/40 border-blue-700' : 'bg-gray-900 border-gray-700'} ${!player.isOnline ? 'opacity-40 grayscale' : ''}`}>
                                <div className="flex-1 overflow-hidden">
                                    <div className="flex items-center gap-2">
                                        {player.isAdmin && <span title="Admin" className="text-yellow-400 text-xl">👑</span>}
                                        <span className="font-bold truncate">{player.name}</span>
                                        {player.deviceId === deviceId && <span className="text-xs text-blue-400">(You)</span>}
                                    </div>
                                    {!player.isOnline && <span className="text-xs text-red-400 block mt-1">Disconnected</span>}
                                </div>
                                {isAdmin && player.deviceId !== deviceId && (
                                    <button 
                                        onClick={() => wsRef.current?.send(JSON.stringify({ type: 'kick_player', targetPlayerId: player.id }))}
                                        className="text-red-500 hover:text-red-400 text-xs px-2 py-1 bg-gray-800 rounded border border-red-900"
                                    >
                                        Kick
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
                
                {/* Game Area */}
                <div className="col-span-1 lg:col-span-3 bg-gray-800 p-6 lg:p-12 rounded-lg border-4 border-gray-700 min-h-[500px] flex flex-col shadow-[8px_8px_0px_rgba(0,0,0,0.3)]">
                    {roomState?.status === 'lobby' ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <h2 className="text-4xl text-gray-400 mb-8 font-bold">Waiting in Lobby</h2>
                            <p className="text-xl text-gray-500 mb-12 max-w-lg">
                                Ensure everyone has joined. The admin will randomly assign the secret roles and start the game.
                            </p>
                            {isAdmin ? (
                                <button 
                                    onClick={() => wsRef.current?.send(JSON.stringify({ type: 'start_game' }))}
                                    disabled={roomState?.players?.length < 3} // Mock limit for testing, real game is 4
                                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-6 px-12 rounded border-b-4 border-blue-800 hover:border-blue-700 active:border-b-0 active:translate-y-1 transition-all text-2xl disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    START GAME
                                </button>
                            ) : (
                                <div className="text-yellow-500 text-xl animate-pulse">Waiting for Admin to start...</div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-8 bg-gray-900 p-6 rounded border-2 border-gray-700">
                                <div>
                                    <h3 className="text-gray-400 text-sm uppercase mb-1">Your Role</h3>
                                    <div className={`text-2xl font-bold ${currentPlayer?.inGameRole === 'insider' ? 'text-red-500' : currentPlayer?.inGameRole === 'host' ? 'text-yellow-400' : 'text-blue-400'}`}>
                                        {currentPlayer?.inGameRole?.toUpperCase()}
                                    </div>
                                </div>
                                {(currentPlayer?.inGameRole === 'host' || currentPlayer?.inGameRole === 'insider') && (
                                    <div className="text-right">
                                        <h3 className="text-gray-400 text-sm uppercase mb-1">Secret Word</h3>
                                        <div className="text-3xl font-bold tracking-widest bg-gray-800 px-4 py-1 rounded border border-gray-600">
                                            {roomState?.secretWord}
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex-1 flex items-center justify-center border-4 border-dashed border-gray-700 rounded-lg p-8">
                                <p className="text-gray-500 text-xl text-center">
                                    [Quiz Phase / Chat UI will be implemented here]
                                </p>
                            </div>

                            {isAdmin && (
                                <div className="mt-8 pt-6 border-t-2 border-gray-700 flex justify-end">
                                    <button 
                                        onClick={() => wsRef.current?.send(JSON.stringify({ type: 'end_round' }))}
                                        className="bg-red-900 hover:bg-red-800 text-white text-sm font-bold py-3 px-6 rounded border-b-4 border-red-950 active:border-b-0 active:translate-y-1"
                                    >
                                        FORCE END ROUND
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
