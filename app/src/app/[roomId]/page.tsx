'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { useDeviceId } from '@/hooks/useDeviceId';
import { api } from '@/lib/api';

// Timer calculation hook
const useCountdown = (endTime: number | null) => {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);

    useEffect(() => {
        if (!endTime) {
            setTimeLeft(null);
            return;
        }

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
            setTimeLeft(remaining);
            if (remaining <= 0) clearInterval(interval);
        }, 1000);

        // Initial calculate immediately
        setTimeLeft(Math.max(0, Math.floor((endTime - Date.now()) / 1000)));

        return () => clearInterval(interval);
    }, [endTime]);

    return timeLeft;
};

export default function RoomPage() {
    const { roomId } = useParams() as { roomId: string };
    const deviceId = useDeviceId();
    const router = useRouter();
    
    const [nickname, setNickname] = useState('');
    const [hasJoined, setHasJoined] = useState(false);
    const [roomState, setRoomState] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
    const [localTimerConfig, setLocalTimerConfig] = useState({ quiz: 180, discussion: 180, votingModeAuto: true });
    const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'thai'>('english');
    const [isWordVisible, setIsWordVisible] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);
    const remainingTime = useCountdown(roomState?.phaseEndTime);

    // Auto-hide the secret word after a few seconds to prevent accidental exposure
    useEffect(() => {
        if (isWordVisible) {
            const timeout = setTimeout(() => setIsWordVisible(false), 3000);
            return () => clearTimeout(timeout);
        }
    }, [isWordVisible]);

    // Sync local timer config with room state when it changes (only if we aren't actively editing)
    useEffect(() => {
        if (roomState?.timerConfig) {
            setLocalTimerConfig({
                quiz: roomState.timerConfig.quiz || 180,
                discussion: roomState.timerConfig.discussion || 180,
                votingModeAuto: roomState.timerConfig.votingMode === 'auto'
            });
        }
    }, [roomState?.timerConfig]);

    // Cleanup host selection if player leaves or game state changes
    useEffect(() => {
        if (roomState?.status !== 'lobby') {
            setSelectedHostId(null);
        } else if (selectedHostId && roomState?.players) {
            const hostStillExists = roomState.players.some((p: any) => p.id === selectedHostId);
            if (!hostStillExists) {
                setSelectedHostId(null);
            }
        }
    }, [roomState, selectedHostId]);

    // Reset difficulty and language when game ends
    useEffect(() => {
        if (roomState?.status === 'lobby') {
            setSelectedDifficulty('medium');
            setSelectedLanguage('english');
        }
    }, [roomState?.status]);

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
                if (
                    message.type === 'room_state_update' ||
                    message.type === 'game_started' ||
                    message.type === 'round_ended' ||
                    message.type === 'voting_started' ||
                    message.type === 'vote_tallied' ||
                    message.type === 'roles_revealed'
                ) {
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

    const formatTime = (seconds: number | null) => {
        if (seconds === null) return '--:--';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white font-mono p-4 md:p-8">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 border-b-4 border-gray-800 pb-4 gap-4">
                <h1 className="text-3xl font-bold tracking-widest text-blue-400">OUTSIDER</h1>
                <div className="flex items-center gap-4">
                    {roomState?.phaseEndTime && (
                        <div className={`px-4 py-2 rounded border-2 font-bold text-xl ${remainingTime === 0 ? 'bg-red-900 border-red-500 text-white animate-pulse' : 'bg-gray-800 border-gray-600 text-green-400'}`}>
                            ⏱ {formatTime(remainingTime)}
                        </div>
                    )}
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
                                <div className="flex flex-col gap-2">
                                    {isAdmin && roomState?.status === 'lobby' && (
                                        <button 
                                            onClick={() => setSelectedHostId(player.id)}
                                            className={`text-xs px-3 py-1 rounded border transition-all ${selectedHostId === player.id ? 'bg-yellow-600 border-yellow-400 text-white font-bold shadow-[2px_2px_0px_#ca8a04]' : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'}`}
                                        >
                                            {selectedHostId === player.id ? 'Host Selected' : 'Select as Host'}
                                        </button>
                                    )}
                                    {isAdmin && player.deviceId !== deviceId && (
                                        <button 
                                            onClick={() => wsRef.current?.send(JSON.stringify({ type: 'kick_player', targetPlayerId: player.id }))}
                                            className="text-red-500 hover:text-red-400 text-xs px-2 py-1 bg-gray-800 rounded border border-red-900"
                                        >
                                            Kick
                                        </button>
                                    )}
                                </div>
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
                                {isAdmin ? "Select a player to be the Host, configure timers, then start the game." : "Ensure everyone has joined. The admin will select the Host and start the game."}
                            </p>
                            
                            {isAdmin && (
                                <div className="mb-12 bg-gray-900 p-6 rounded-lg border-2 border-gray-700 w-full max-w-md text-left">
                                    <h3 className="text-xl text-blue-400 mb-4 font-bold border-b-2 border-gray-800 pb-2">Game Settings</h3>

                                    {/* Word Language Selection */}
                                    <div className="flex flex-col gap-4 mb-4">
                                        <label className="text-gray-300">Word Language</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedLanguage('english')}
                                                className={`py-3 px-4 rounded border-4 transition-all ${
                                                    selectedLanguage === 'english'
                                                        ? 'bg-blue-600 border-blue-400 text-white font-bold shadow-[2px_2px_0px_#1e3a8a]'
                                                        : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className="text-lg">🇬🇧 English</div>
                                                <div className="text-xs mt-1">Common nouns</div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedLanguage('thai')}
                                                className={`py-3 px-4 rounded border-4 transition-all ${
                                                    selectedLanguage === 'thai'
                                                        ? 'bg-red-600 border-red-400 text-white font-bold shadow-[2px_2px_0px_#7f1d1d]'
                                                        : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className="text-lg">🇹🇭 ไทย</div>
                                                <div className="text-xs mt-1">คำนามภาษาไทย</div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Word Difficulty Selection */}
                                    <div className="flex flex-col gap-4 mb-4">
                                        <label className="text-gray-300">Word Difficulty</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDifficulty('easy')}
                                                className={`py-3 px-2 rounded border-4 transition-all ${
                                                    selectedDifficulty === 'easy'
                                                        ? 'bg-green-600 border-green-400 text-white font-bold shadow-[2px_2px_0px_#14532d]'
                                                        : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className="text-sm">🟢 Easy</div>
                                                <div className="text-xs mt-1">Common</div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDifficulty('medium')}
                                                className={`py-3 px-2 rounded border-4 transition-all ${
                                                    selectedDifficulty === 'medium'
                                                        ? 'bg-yellow-600 border-yellow-400 text-white font-bold shadow-[2px_2px_0px_#78350f]'
                                                        : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className="text-sm">🟡 Medium</div>
                                                <div className="text-xs mt-1">Specific</div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDifficulty('hard')}
                                                className={`py-3 px-2 rounded border-4 transition-all ${
                                                    selectedDifficulty === 'hard'
                                                        ? 'bg-red-600 border-red-400 text-white font-bold shadow-[2px_2px_0px_#7f1d1d]'
                                                        : 'bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className="text-sm">🔴 Hard</div>
                                                <div className="text-xs mt-1">Complex</div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Current Settings Display */}
                                    <div className="mt-4 p-3 bg-gray-800 rounded border-2 border-gray-600">
                                        <p className="text-gray-400 text-sm mb-2">Current Settings:</p>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-3 py-1 rounded font-bold text-sm ${
                                                selectedLanguage === 'english'
                                                    ? 'bg-blue-900 text-blue-400'
                                                    : 'bg-red-900 text-red-400'
                                            }`}>
                                                {selectedLanguage === 'english' ? '🇬🇧 EN' : '🇹🇭 TH'}
                                            </span>
                                            <span className={`px-3 py-1 rounded font-bold text-sm ${
                                                selectedDifficulty === 'easy'
                                                    ? 'bg-green-900 text-green-400'
                                                    : selectedDifficulty === 'medium'
                                                    ? 'bg-yellow-900 text-yellow-400'
                                                    : 'bg-red-900 text-red-400'
                                            }`}>
                                                {selectedDifficulty === 'easy' ? 'Easy' : selectedDifficulty === 'medium' ? 'Medium' : 'Hard'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Timer Configuration */}
                                    <h3 className="text-xl text-blue-400 mb-4 font-bold border-b-2 border-gray-800 pb-2 mt-6">Timer Configuration</h3>

                                    <div className="flex flex-col gap-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-gray-300">Quiz Phase (seconds)</label>
                                            <input
                                                type="number"
                                                value={localTimerConfig.quiz}
                                                onChange={(e) => setLocalTimerConfig(prev => ({ ...prev, quiz: parseInt(e.target.value) || 0 }))}
                                                onBlur={() => wsRef.current?.send(JSON.stringify({ type: 'update_timer_config', config: localTimerConfig }))}
                                                className="w-24 p-2 bg-gray-800 border border-gray-600 rounded text-right text-white"
                                            />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <label className="text-gray-300">Discussion Phase (seconds)</label>
                                            <input
                                                type="number"
                                                value={localTimerConfig.discussion}
                                                onChange={(e) => setLocalTimerConfig(prev => ({ ...prev, discussion: parseInt(e.target.value) || 0 }))}
                                                onBlur={() => wsRef.current?.send(JSON.stringify({ type: 'update_timer_config', config: localTimerConfig }))}
                                                className="w-24 p-2 bg-gray-800 border border-gray-600 rounded text-right text-white"
                                            />
                                        </div>
                                        <div className="flex justify-between items-center pt-2">
                                            <label className="text-gray-300">Auto Voting (Timer)</label>
                                            <input
                                                type="checkbox"
                                                checked={localTimerConfig.votingModeAuto}
                                                onChange={(e) => {
                                                    const newConfig = { 
                                                        ...localTimerConfig, 
                                                        votingModeAuto: e.target.checked 
                                                    };
                                                    setLocalTimerConfig(newConfig);
                                                    wsRef.current?.send(JSON.stringify({ 
                                                        type: 'update_timer_config', 
                                                        config: newConfig 
                                                    }));
                                                }}
                                                className="w-6 h-6 bg-gray-800 border-gray-600 rounded"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isAdmin ? (
                                <button
                                    onClick={() => wsRef.current?.send(JSON.stringify({ 
                                        type: 'start_game', 
                                        hostPlayerId: selectedHostId,
                                        difficulty: selectedDifficulty,
                                        language: selectedLanguage
                                    }))}
                                    disabled={roomState?.players?.length < 3 || !selectedHostId}
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
                                <div className="text-right flex flex-col items-end gap-2">
                                    <h3 className="text-gray-400 text-sm uppercase mb-1">Secret Word</h3>
                                    {currentPlayer?.inGameRole === 'host' || currentPlayer?.inGameRole === 'insider' ? (
                                        <button
                                            onClick={() => setIsWordVisible(!isWordVisible)}
                                            className="text-3xl font-bold tracking-widest bg-gray-800 px-4 py-1 rounded border border-gray-600 hover:bg-gray-700 transition-colors focus:outline-none flex items-center gap-2"
                                            title="Click to toggle visibility"
                                        >
                                            {isWordVisible ? roomState?.secretWord : '••••••••'}
                                            <span className="text-sm text-gray-400 ml-2">{isWordVisible ? '🙈' : '👁️'}</span>
                                        </button>
                                    ) : (
                                        <div
                                            className="text-3xl font-bold tracking-widest bg-gray-800 px-4 py-1 rounded border border-gray-600 flex items-center gap-2 cursor-not-allowed opacity-50"
                                            title="Only the Host and Insider can reveal the secret word."
                                        >
                                            ••••••••
                                            <span className="text-sm text-gray-400 ml-2">👁️</span>
                                        </div>
                                    )}
                                    {/* Display word language and difficulty */}
                                    {roomState?.timerConfig?.difficulty && roomState?.timerConfig?.language && (
                                        <div className="flex items-center gap-2 justify-end">
                                            <span className={`px-2 py-1 rounded border-2 font-bold text-xs ${
                                                roomState.timerConfig.language === 'english'
                                                    ? 'bg-blue-900/40 border-blue-500 text-blue-400'
                                                    : 'bg-red-900/40 border-red-500 text-red-400'
                                            }`}>
                                                {roomState.timerConfig.language === 'english' ? '🇬🇧 EN' : '🇹🇭 TH'}
                                            </span>
                                            <span className={`px-2 py-1 rounded border-2 font-bold text-xs ${
                                                roomState.timerConfig.difficulty === 'easy'
                                                    ? 'bg-green-900/40 border-green-500 text-green-400'
                                                    : roomState.timerConfig.difficulty === 'medium'
                                                    ? 'bg-yellow-900/40 border-yellow-500 text-yellow-400'
                                                    : 'bg-red-900/40 border-red-500 text-red-400'
                                            }`}>
                                                {roomState.timerConfig.difficulty === 'easy' ? 'Easy' : roomState.timerConfig.difficulty === 'medium' ? 'Medium' : 'Hard'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex-1 flex items-center justify-center border-4 border-dashed border-gray-700 rounded-lg p-8 flex-col gap-4">
                                <p className="text-gray-500 text-xl text-center mb-4">
                                    [Quiz Phase / Chat UI will be implemented here]
                                </p>

                                {currentPlayer?.inGameRole === 'host' && roomState?.status === 'playing' && (
                                    <div className="flex flex-col gap-4 items-center">
                                        <button
                                            onClick={() => wsRef.current?.send(JSON.stringify({ type: 'trigger_showdown' }))}
                                            className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-8 rounded border-b-4 border-green-800 hover:border-green-700 active:border-b-0 active:translate-y-1 transition-all text-lg shadow-[4px_4px_0px_#14532d]"
                                        >
                                            ✅ Word Guessed!
                                        </button>

                                        {roomState.timerConfig.votingMode === 'manual' && remainingTime === 0 && (
                                            <button
                                                onClick={() => wsRef.current?.send(JSON.stringify({ type: 'trigger_showdown' }))}
                                                className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 px-8 rounded border-b-4 border-yellow-800 hover:border-yellow-700 active:border-b-0 active:translate-y-1 transition-all text-lg"
                                            >
                                                ⏳ Time's Up - Proceed to Discussion
                                            </button>
                                        )}
                                    </div>
                                )}
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

                    {/* Showdown Discussion Phase */}
                    {roomState?.status === 'showdown_discussion' && (
                        <div className="flex-1 flex flex-col">
                            <div className="bg-purple-900/30 border-4 border-purple-600 p-6 rounded-lg mb-6">
                                <h2 className="text-2xl font-bold text-purple-400 mb-2">
                                    🎯 SHOWDOWN PHASE
                                </h2>
                                <p className="text-gray-300">
                                    Discuss and analyze: Who is the Insider? The word has been guessed!
                                </p>
                            </div>

                            {currentPlayer?.inGameRole === 'host' && roomState.timerConfig.votingMode === 'manual' && (
                                <div className="mb-6">
                                    <button
                                        onClick={() => wsRef.current?.send(JSON.stringify({ type: 'start_voting' }))}
                                        className="bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-8 rounded border-b-4 border-purple-800 hover:border-purple-700 active:border-b-0 active:translate-y-1 transition-all text-xl w-full"
                                    >
                                        🗳️ START VOTING PHASE
                                    </button>
                                </div>
                            )}

                            <div className="flex-1 flex items-center justify-center border-4 border-dashed border-purple-700 rounded-lg p-8">
                                <p className="text-purple-300 text-xl text-center">
                                    {roomState.timerConfig.votingMode === 'auto' 
                                        ? `Voting will start automatically when timer ends`
                                        : `Waiting for Host to start voting...`
                                    }
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Showdown Voting Phase */}
                    {roomState?.status === 'showdown_voting' && (
                        <div className="flex-1 flex flex-col">
                            <div className="bg-red-900/30 border-4 border-red-600 p-6 rounded-lg mb-6">
                                <h2 className="text-2xl font-bold text-red-400 mb-2">
                                    🗳️ VOTING PHASE
                                </h2>
                                <p className="text-gray-300">
                                    Vote for who you think is the Insider!
                                </p>
                            </div>

                            {/* Vote Count Progress */}
                            <div className="mb-6 bg-gray-900 p-4 rounded border-2 border-gray-700">
                                <p className="text-gray-400 text-sm mb-2">Votes Submitted</p>
                                <div className="text-3xl font-bold text-white">
                                    {roomState.votes?.length || 0} / {roomState.players?.filter((p: any) => p.inGameRole !== 'host').length}
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-4 mt-2">
                                    <div 
                                        className="bg-red-600 h-4 rounded-full transition-all"
                                        style={{ 
                                            width: `${((roomState.votes?.length || 0) / Math.max(1, roomState.players?.filter((p: any) => p.inGameRole !== 'host').length)) * 100}%` 
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* Voting Cards - Commons & Insider Only */}
                            {currentPlayer?.inGameRole !== 'host' && (
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-gray-300 mb-4">Cast Your Vote</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {roomState.players
                                            .filter((p: any) => p.deviceId !== deviceId && p.inGameRole !== 'host')
                                            .map((player: any) => {
                                                const hasVoted = roomState.votes?.some((v: any) => v.voterId === currentPlayer.id);
                                                const votedForMe = roomState.votes?.some((v: any) =>
                                                    v.targetId === player.id && v.voterId === currentPlayer.id
                                                );

                                                return (
                                                    <button
                                                        key={player.id}
                                                        onClick={() => {
                                                            if (!hasVoted || votedForMe) {
                                                                wsRef.current?.send(JSON.stringify({
                                                                    type: 'submit_vote',
                                                                    targetId: player.id
                                                                }));
                                                            }
                                                        }}
                                                        disabled={hasVoted && !votedForMe}
                                                        className={`p-4 rounded border-4 transition-all ${
                                                            votedForMe
                                                                ? 'bg-red-600 border-red-400 text-white font-bold'
                                                                : hasVoted
                                                                ? 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                                                                : 'bg-gray-800 border-gray-600 hover:bg-red-900/50 hover:border-red-600 text-white'
                                                        }`}
                                                    >
                                                        <div className="text-lg">{player.name}</div>
                                                        {votedForMe && <div className="text-sm">✓ Selected</div>}
                                                        {hasVoted && !votedForMe && <div className="text-sm">Vote Submitted</div>}
                                                    </button>
                                                );
                                            })
                                        }
                                    </div>
                                </div>
                            )}

                            {/* Host View */}
                            {currentPlayer?.inGameRole === 'host' && (
                                <div className="flex-1 flex items-center justify-center">
                                    <p className="text-gray-400 text-xl">
                                        Waiting for all players to vote...
                                    </p>
                                </div>
                            )}

                            {/* Reveal Roles Button - Host Only */}
                            {currentPlayer?.inGameRole === 'host' && (
                                <div className="mt-6">
                                    <button
                                        onClick={() => wsRef.current?.send(JSON.stringify({ type: 'reveal_roles' }))}
                                        disabled={roomState.votes?.length < roomState.players?.filter((p: any) => p.inGameRole !== 'host').length}
                                        className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded border-b-4 border-yellow-800 hover:border-yellow-700 active:border-b-0 active:translate-y-1 transition-all text-xl disabled:border-gray-600"
                                    >
                                        🔓 REVEAL ROLES & RESULTS
                                    </button>
                                    <p className="text-gray-500 text-sm mt-2 text-center">
                                        All players must vote before revealing
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Game Completed - Results Screen */}
                    {roomState?.status === 'completed' && roomState.gameResult && (
                        <div className="flex-1 flex flex-col">
                            {/* Winner Announcement */}
                            <div className={`p-8 rounded-lg border-4 mb-6 ${
                                roomState.gameResult.winner === 'commons'
                                    ? 'bg-green-900/40 border-green-500'
                                    : 'bg-red-900/40 border-red-500'
                            }`}>
                                <h2 className={`text-4xl font-bold mb-4 text-center ${
                                    roomState.gameResult.winner === 'commons' ? 'text-green-400' : 'text-red-400'
                                }`}>
                                    {roomState.gameResult.winner === 'commons' ? '🎉 COMMONS WIN! 🎉' : '👤 INSIDER WINS! 👤'}
                                </h2>
                                <div className="grid grid-cols-2 gap-4 text-center text-xl">
                                    <div className="bg-gray-900 p-4 rounded">
                                        <p className="text-gray-400 text-sm">Word Guessed</p>
                                        <p className={roomState.gameResult.wordGuessed ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                            {roomState.gameResult.wordGuessed ? '✅ YES' : '❌ NO'}
                                        </p>
                                    </div>
                                    <div className="bg-gray-900 p-4 rounded">
                                        <p className="text-gray-400 text-sm">Insider Identified</p>
                                        <p className={roomState.gameResult.insiderIdentified ? 'text-green-400 font-bold' : 'text-red-400 font-bold'}>
                                            {roomState.gameResult.insiderIdentified ? '✅ YES' : '❌ NO'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Role Reveals */}
                            <div className="mb-6">
                                <h3 className="text-2xl font-bold text-gray-300 mb-4">Player Roles</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {roomState.players.map((player: any) => (
                                        <div
                                            key={player.id}
                                            className={`p-4 rounded border-4 ${
                                                player.inGameRole === 'host'
                                                    ? 'bg-yellow-900/30 border-yellow-600'
                                                    : player.inGameRole === 'insider'
                                                    ? 'bg-red-900/30 border-red-600'
                                                    : 'bg-blue-900/30 border-blue-600'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                {player.isAdmin && <span>👑</span>}
                                                <span className="font-bold text-lg">{player.name}</span>
                                                {player.deviceId === deviceId && <span className="text-blue-400">(You)</span>}
                                            </div>
                                            <div className={`text-xl mt-2 font-bold ${
                                                player.inGameRole === 'host' ? 'text-yellow-400' :
                                                player.inGameRole === 'insider' ? 'text-red-400' : 'text-blue-400'
                                            }`}>
                                                {player.inGameRole?.toUpperCase()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Voting Results */}
                            {roomState.votes && roomState.votes.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-2xl font-bold text-gray-300 mb-4">Voting Results</h3>
                                    <div className="bg-gray-900 p-6 rounded border-2 border-gray-700">
                                        {roomState.players
                                            .filter((p: any) => p.inGameRole !== 'host')
                                            .map((voter: any) => {
                                                const vote = roomState.votes.find((v: any) => v.voterId === voter.id);
                                                const target = roomState.players.find((p: any) => p.id === vote?.targetId);
                                                
                                                return (
                                                    <div key={voter.id} className="flex items-center justify-between py-3 border-b border-gray-800 last:border-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold">{voter.name}</span>
                                                            <span className="text-gray-500">voted for</span>
                                                            <span className={`font-bold ${
                                                                target?.inGameRole === 'insider' ? 'text-green-400' : 'text-red-400'
                                                            }`}>
                                                                {target?.name || 'Unknown'}
                                                            </span>
                                                        </div>
                                                        {vote && target && (
                                                            <span className={target.inGameRole === 'insider' ? 'text-green-400' : 'text-red-400'}>
                                                                {target.inGameRole === 'insider' ? '✅ Correct' : '❌ Wrong'}
                                                            </span>
                                                        )}
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>
                                </div>
                            )}

                            {/* Play Again - Admin Only */}
                            {isAdmin && (
                                <div className="mt-6">
                                    <button
                                        onClick={() => wsRef.current?.send(JSON.stringify({ type: 'end_round' }))}
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded border-b-4 border-blue-800 hover:border-blue-700 active:border-b-0 active:translate-y-1 transition-all text-xl"
                                    >
                                        🔄 PLAY AGAIN (Reset to Lobby)
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
