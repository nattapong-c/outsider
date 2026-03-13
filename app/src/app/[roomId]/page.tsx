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
    const [localTimerConfig, setLocalTimerConfig] = useState({ quiz: 180, discussion: 180, votingModeAuto: false }); // Default to manual
    const [selectedDifficulty, setSelectedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
    const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'thai'>('english');
    const [isWordVisible, setIsWordVisible] = useState(false);
    const [isRoleHidden, setIsRoleHidden] = useState(true); // Hide role by default for privacy
    const [copied, setCopied] = useState(false); // Copy feedback state
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
            const response = await api.rooms.join(roomId, nickname, deviceId);
            console.log('Join room response:', response);
            
            // Axios returns { data, status, headers, ... }
            // Backend returns { room: {...} }
            const responseData = response.data || response;
            const roomData = responseData.room;
            
            if (!roomData) {
                throw new Error('No room data in response');
            }
            
            setRoomState(roomData);
            setHasJoined(true);
            connectWebSocket();
        } catch (err: any) {
            console.error('Failed to join room:', err);
            console.error('Error details:', err.response?.data || err.message);
            setError(`Failed to join room: ${err.response?.data || err.message}`);
        }
    };

    const connectWebSocket = () => {
        if (!deviceId) return;
        
        // Use wss:// for production (HTTPS), ws:// for localhost
        let wsUrl = process.env.NEXT_PUBLIC_WS_URL;
        
        if (!wsUrl) {
            // Auto-detect protocol based on current page
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host || 'localhost:3001';
            wsUrl = `${protocol}//${host}`;
        }
        
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
                const response = await api.rooms.get(roomId);
                console.log('Check existing session:', response);
                
                // Axios returns { data, status, headers, ... }
                // Backend returns { room: {...} }
                const responseData = response.data || response;
                const room = responseData.room;
                
                if (!room) {
                    console.warn('No room data found');
                    return;
                }
                
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
            await api.rooms.leave(roomId, deviceId);
            router.push('/');
        } catch (error: any) {
            console.error('Failed to leave room', error);
            alert(`Failed to leave room: ${error.response?.data || error.message}`);
        }
    };

    const handleCopyRoomId = async () => {
        try {
            // Get the full URL with room ID (no prefix)
            const fullUrl = `${window.location.origin}/${roomId}`;
            await navigator.clipboard.writeText(fullUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error('Failed to copy room ID:', err);
            // Fallback for older browsers
            const fullUrl = `${window.location.origin}/${roomId}`;
            const textArea = document.createElement('textarea');
            textArea.value = fullUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!deviceId) return (
        <div className="min-h-screen modern-bg flex items-center justify-center font-sans">
            <div className="modern-card p-8 text-center">
                <div className="modern-glow text-2xl mb-4">⏳</div>
                <p className="text-yellow-500 tracking-widest uppercase">Loading Identity...</p>
            </div>
        </div>
    );

    if (!hasJoined) {
        return (
            <div className="min-h-screen modern-bg flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
                {/* Floating Particles */}
                <div className="">
                    <div className="" style={{ left: '10%', animationDelay: '0s' }}></div>
                    <div className="" style={{ left: '30%', animationDelay: '1.5s' }}></div>
                    <div className="" style={{ left: '70%', animationDelay: '0.8s' }}></div>
                    <div className="" style={{ left: '90%', animationDelay: '2s' }}></div>
                </div>
                
                <div className="modern-card p-8 w-full max-w-md relative z-10">
                    <h2 className="text-2xl mb-6 text-center font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent tracking-wider">
                        Join Room: {roomId}
                    </h2>
                    {error && (
                        <div className="mb-6 p-4 modern-card bg-red-900/50 text-red-200 rounded-lg animate-pulse">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">❌</span>
                                <span className="font-bold">{error}</span>
                            </div>
                        </div>
                    )}
                    <form onSubmit={handleJoin} className="flex flex-col gap-6">
                        <div>
                            <label className="block text-gray-400 mb-2 tracking-wider uppercase text-sm">Nickname</label>
                            <input
                                type="text"
                                placeholder="Enter your name"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className="w-full modern-input p-4 text-center text-xl tracking-widest"
                                maxLength={15}
                                autoFocus
                            />
                        </div>
                        <button 
                            type="submit" 
                            className="w-full modern-button text-gray-900 text-xl tracking-[0.15em] uppercase"
                        >
                            <span className="flex items-center justify-center gap-3">
                                <span className="text-2xl">🚪</span>
                                Enter Lobby
                            </span>
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
        <div className="min-h-screen modern-bg font-sans p-4 md:p-8 relative overflow-hidden">
            <header className="flex flex-col md:flex-row justify-between items-center mb-8 pb-4 gap-4 relative z-10 modern-card">
                <h1 className="text-2xl md:text-3xl font-bold tracking-[0.2em] bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
                    OUTSIDER
                </h1>
                <div className="flex items-center gap-4 flex-wrap justify-center">
                    {roomState?.phaseEndTime &&
                     (roomState?.status === 'playing' || roomState?.status === 'showdown_discussion') &&
                     remainingTime !== null && (
                        <div className={`px-4 py-2 rounded-lg border font-bold text-sm md:text-base tracking-wider flex items-center gap-2 ${
                            remainingTime === 0
                                ? 'border-red-500/50 bg-red-900/20 text-red-400 animate-pulse'
                                : 'border-green-500/50 bg-green-900/20 text-green-400'
                        }`}>
                            <span>⏱</span>
                            {formatTime(remainingTime)}
                        </div>
                    )}
                    <button
                        onClick={handleCopyRoomId}
                        className={`px-4 py-2 rounded-lg border border-gray-700 bg-gray-900/50 cursor-pointer transition-all hover:bg-gray-800/50 active:scale-95 ${
                            copied ? 'border-green-500/50 bg-green-900/20' : ''
                        }`}
                        title="Click to copy room link"
                    >
                        <span className="text-gray-400 tracking-wider">Room:</span>{' '}
                        <span className={`font-bold ${
                            copied ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                            {copied ? '✓ COPIED!' : roomId}
                        </span>
                        <span className="ml-2 text-xs text-gray-500">📋</span>
                    </button>
                    <button
                        onClick={handleLeaveRoom}
                        className="px-4 py-2 modern-button bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 text-white text-sm tracking-[0.1em] uppercase"
                    >
                        Leave
                    </button>
                </div>
            </header>

            <main className="grid grid-cols-1 lg:grid-cols-4 gap-8 relative z-10">
                {/* Player List Sidebar */}
                <div className="col-span-1 modern-card p-6 h-fit">
                    <h2 className="text-lg mb-4 font-bold text-gray-300 tracking-wider text-sm uppercase flex items-center gap-2">
                        <span className="text-yellow-500">👥</span>
                        Players ({roomState?.players?.length}/8)
                    </h2>
                    <ul className="space-y-2">
                        {roomState?.players?.map((player: any) => (
                            <li
                                key={player.id}
                                className={`flex items-center gap-2 p-2.5 rounded-lg border ${
                                    player.deviceId === deviceId
                                        ? 'bg-blue-900/20 border-blue-500/50'
                                        : 'bg-gray-900/50 border-gray-700'
                                } ${!player.isOnline ? 'opacity-40 grayscale' : ''}`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        {player.isAdmin && (
                                            <span title="Admin" className="text-yellow-400 text-sm">👑</span>
                                        )}
                                        <span className="font-medium truncate tracking-wide text-white text-sm">{player.name}</span>
                                        {player.deviceId === deviceId && (
                                            <span className="text-xs text-blue-400 bg-blue-900/50 px-1.5 py-0.5 rounded-full flex-shrink-0">You</span>
                                        )}
                                    </div>
                                    {!player.isOnline && (
                                        <span className="text-xs text-red-400 block mt-0.5 tracking-wide">Disconnected</span>
                                    )}
                                </div>
                                <div className="flex gap-1.5 flex-shrink-0">
                                    {isAdmin && roomState?.status === 'lobby' && (
                                        <button
                                            onClick={() => setSelectedHostId(player.id)}
                                            className={`text-xs px-2.5 py-1.5 modern-button flex-shrink-0 ${
                                                selectedHostId === player.id
                                                    ? 'bg-yellow-500 text-gray-900'
                                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                            } tracking-wider uppercase`}
                                            title="Select as Host"
                                        >
                                            {selectedHostId === player.id ? '✓' : 'Host'}
                                        </button>
                                    )}
                                    {isAdmin && player.deviceId !== deviceId && (
                                        <button
                                            onClick={() => wsRef.current?.send(JSON.stringify({ type: 'kick_player', targetPlayerId: player.id }))}
                                            className="text-red-400 hover:text-red-300 text-xs px-2.5 py-1.5 modern-button bg-red-900/30 tracking-wider uppercase flex-shrink-0"
                                            title="Kick player"
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
                <div className="col-span-1 lg:col-span-3 modern-card min-h-[500px] flex flex-col p-4 md:p-6">
                    {roomState?.status === 'lobby' ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center">
                            <h2 className="text-2xl md:text-3xl text-gray-400 mb-4 font-bold tracking-wider">
                                Waiting in Lobby
                            </h2>
                            <p className="text-sm md:text-base text-gray-500 mb-6 max-w-md">
                                {isAdmin
                                    ? "Select a player to be the Host, configure timers, then start the game."
                                    : "The admin will select a Host and start the game."}
                            </p>

                            {isAdmin && (
                                <div className="modern-card p-6 w-full max-w-md mb-8">
                                    <h3 className="text-lg text-yellow-500 mb-4 font-bold tracking-wider uppercase flex items-center gap-2">
                                        <span className="text-xl">⚙️</span>
                                        Game Settings
                                    </h3>

                                    {/* Word Language Selection */}
                                    <div className="flex flex-col gap-4 mb-6">
                                        <label className="text-gray-400 text-sm tracking-wider uppercase">Word Language</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedLanguage('english')}
                                                className={`py-3 px-4 modern-button transition-all flex flex-col items-center justify-center ${
                                                    selectedLanguage === 'english'
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className="text-lg text-center">🇬🇧 English</div>
                                                <div className="text-xs mt-1 tracking-wider text-center">Common nouns</div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedLanguage('thai')}
                                                className={`py-3 px-4 modern-button transition-all flex flex-col items-center justify-center ${
                                                    selectedLanguage === 'thai'
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className="text-lg text-center">🇹🇭 ไทย</div>
                                                <div className="text-xs mt-1 tracking-wider text-center">คำนามภาษาไทย</div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Word Difficulty Selection */}
                                    <div className="flex flex-col gap-4 mb-6">
                                        <label className="text-gray-400 text-sm tracking-wider uppercase">Word Difficulty</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDifficulty('easy')}
                                                className={`py-3 px-2 modern-button transition-all flex flex-col items-center justify-center ${
                                                    selectedDifficulty === 'easy'
                                                        ? 'bg-green-600 text-white'
                                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className="text-sm text-center">🟢 Easy</div>
                                                <div className="text-xs mt-1 tracking-wider text-center">Common</div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDifficulty('medium')}
                                                className={`py-3 px-2 modern-button transition-all flex flex-col items-center justify-center ${
                                                    selectedDifficulty === 'medium'
                                                        ? 'bg-yellow-600 text-white'
                                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className="text-sm text-center">🟡 Medium</div>
                                                <div className="text-xs mt-1 tracking-wider text-center">Specific</div>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSelectedDifficulty('hard')}
                                                className={`py-3 px-2 modern-button transition-all flex flex-col items-center justify-center ${
                                                    selectedDifficulty === 'hard'
                                                        ? 'bg-red-600 text-white'
                                                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                                }`}
                                            >
                                                <div className="text-sm text-center">🔴 Hard</div>
                                                <div className="text-xs mt-1 tracking-wider text-center">Complex</div>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Current Settings Display */}
                                    <div className="modern-card p-3 bg-gray-900/50 mb-6">
                                        <p className="text-gray-400 text-xs mb-2 tracking-wider uppercase">Current Settings:</p>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`px-3 py-1 modern-badge ${
                                                selectedLanguage === 'english'
                                                    ? 'bg-blue-900/50 text-blue-400 border border-blue-500'
                                                    : 'bg-red-900/50 text-red-400 border border-red-500'
                                            }`}>
                                                {selectedLanguage === 'english' ? '🇬🇧 EN' : '🇹🇭 TH'}
                                            </span>
                                            <span className={`px-3 py-1 modern-badge ${
                                                selectedDifficulty === 'easy'
                                                    ? 'bg-green-900/50 text-green-400 border border-green-500'
                                                    : selectedDifficulty === 'medium'
                                                    ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-500'
                                                    : 'bg-red-900/50 text-red-400 border border-red-500'
                                            }`}>
                                                {selectedDifficulty === 'easy' ? 'Easy' : selectedDifficulty === 'medium' ? 'Medium' : 'Hard'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Timer Configuration */}
                                    <div className="modern-card p-4 bg-gray-900/30">
                                        <h3 className="text-base text-yellow-500 mb-4 font-bold tracking-wider uppercase flex items-center gap-2">
                                            <span className="text-lg">⏱️</span>
                                            Timer Configuration
                                        </h3>

                                        <div className="flex flex-col gap-4">
                                            <div className="flex justify-between items-center">
                                                <label className="text-gray-400 text-sm tracking-wider">Quiz Phase (seconds)</label>
                                                <input
                                                    type="number"
                                                    value={localTimerConfig.quiz}
                                                    onChange={(e) => setLocalTimerConfig(prev => ({ ...prev, quiz: parseInt(e.target.value) || 0 }))}
                                                    onBlur={() => wsRef.current?.send(JSON.stringify({ type: 'update_timer_config', config: localTimerConfig }))}
                                                    className="w-24 modern-input p-2 text-right"
                                                />
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-gray-400 text-sm tracking-wider">Discussion Phase (seconds)</label>
                                                <input
                                                    type="number"
                                                    value={localTimerConfig.discussion}
                                                    onChange={(e) => setLocalTimerConfig(prev => ({ ...prev, discussion: parseInt(e.target.value) || 0 }))}
                                                    onBlur={() => wsRef.current?.send(JSON.stringify({ type: 'update_timer_config', config: localTimerConfig }))}
                                                    className="w-24 modern-input p-2 text-right"
                                                />
                                            </div>
                                            {/* Auto Voting disabled - default to manual phase transitions
                                            <div className="flex justify-between items-center pt-2">
                                                <label className="text-gray-400 text-sm tracking-wider">Auto Voting (Timer)</label>
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
                                            */}
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
                                    className="modern-button bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-2xl tracking-[0.2em] uppercase disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <span className="flex items-center justify-center gap-3">
                                        <span className="text-3xl">🎮</span>
                                        Start Game
                                    </span>
                                </button>
                            ) : (
                                <div className="text-yellow-500 text-xl tracking-wider modern-glow flex items-center gap-2">
                                    <span className="animate-pulse">⏳</span>
                                    Waiting for Admin to start...
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col">
                            {/* Role & Secret Word Display - Mobile First */}
                            <div className="modern-card p-4 md:p-6 mb-6">
                                <div className="flex flex-col gap-4">
                                    {/* Your Role Section - Mobile Optimized */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-gray-400 text-xs uppercase mb-2 tracking-wider">Your Role</h3>
                                            {/* Host always sees their role, Commons & Insider can toggle */}
                                            {currentPlayer?.inGameRole === 'host' ? (
                                                <div className="text-2xl md:text-3xl font-bold text-yellow-400 modern-glow tracking-wider">
                                                    {currentPlayer?.inGameRole?.toUpperCase()}
                                                </div>
                                            ) : isRoleHidden ? (
                                                <div 
                                                    onClick={() => setIsRoleHidden(false)}
                                                    className="text-2xl md:text-3xl font-bold text-gray-500 tracking-wider cursor-pointer select-none flex items-center gap-2"
                                                    title="Tap to reveal"
                                                >
                                                    <span>••••••</span>
                                                    <span className="text-lg">👁️</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2">
                                                    <div className={`text-2xl md:text-3xl font-bold tracking-wider ${
                                                        currentPlayer?.inGameRole === 'insider' ? 'text-red-500 modern-glow' :
                                                        'text-blue-400'
                                                    }`}>
                                                        {currentPlayer?.inGameRole?.toUpperCase()}
                                                    </div>
                                                    <button
                                                        onClick={() => setIsRoleHidden(true)}
                                                        className="p-2 modern-card hover:bg-gray-700/50 transition-all"
                                                        title="Hide role"
                                                    >
                                                        <span className="text-lg">🙈</span>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Secret Word Section - Mobile Optimized */}
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-gray-400 text-xs uppercase tracking-wider">Secret Word</h3>
                                            {roomState?.timerConfig?.difficulty && roomState?.timerConfig?.language && (
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 modern-badge text-xs ${
                                                        roomState.timerConfig.language === 'english'
                                                            ? 'bg-blue-900/50 text-blue-400 border border-blue-500'
                                                            : 'bg-red-900/50 text-red-400 border border-red-500'
                                                    }`}>
                                                        {roomState.timerConfig.language === 'english' ? '🇬🇧' : '🇹🇭'}
                                                    </span>
                                                    <span className={`px-2 py-1 modern-badge text-xs ${
                                                        roomState.timerConfig.difficulty === 'easy'
                                                            ? 'bg-green-900/50 text-green-400 border border-green-500'
                                                            : roomState.timerConfig.difficulty === 'medium'
                                                            ? 'bg-yellow-900/50 text-yellow-400 border border-yellow-500'
                                                            : 'bg-red-900/50 text-red-400 border border-red-500'
                                                    }`}>
                                                        {roomState.timerConfig.difficulty === 'easy' ? '🟢' :
                                                         roomState.timerConfig.difficulty === 'medium' ? '🟡' : '🔴'}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        
                                        {currentPlayer?.inGameRole === 'host' || currentPlayer?.inGameRole === 'insider' ? (
                                            <button
                                                onClick={() => setIsWordVisible(!isWordVisible)}
                                                className="w-full text-xl md:text-2xl font-bold tracking-[0.2em] modern-card bg-gray-900/50 px-4 py-3
                                                         hover:bg-gray-800/50 transition-all modern-glow flex items-center justify-center gap-3"
                                                title="Click to toggle visibility"
                                            >
                                                {isWordVisible ? (
                                                    <>
                                                        <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent text-center">
                                                            {roomState?.secretWord}
                                                        </span>
                                                        <span className="text-xl">🙈</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>••••••••</span>
                                                        <span className="text-xl">👁️</span>
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <div
                                                className="w-full text-xl md:text-2xl font-bold tracking-[0.2em] modern-card bg-gray-900/50 px-4 py-3
                                                         flex items-center justify-center gap-3 cursor-not-allowed opacity-50"
                                                title="Only the Host and Insider can reveal the secret word."
                                            >
                                                <span>••••••••</span>
                                                <span className="text-xl">👁️</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Quiz Phase Area - Clean placeholder for future chat UI */}
                            {roomState?.status === 'playing' && remainingTime !== null && remainingTime > 0 && (
                                <div className="flex-1 modern-card border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-4 bg-gray-900/30">
                                    <div className="text-center">
                                        <p className="text-gray-400 text-lg mb-2">Quiz Phase</p>
                                        <p className="text-gray-500 text-sm">Ask Yes/No questions to the Host</p>
                                    </div>
                                </div>
                            )}

                            {/* Host Controls - Quiz Phase Buttons */}
                            {currentPlayer?.inGameRole === 'host' && roomState?.status === 'playing' && (
                                <div className="mt-6 flex flex-col gap-4 items-center">
                                    {/* Always show - Players guessed the word */}
                                    <button
                                        onClick={() => wsRef.current?.send(JSON.stringify({ 
                                            type: 'trigger_showdown',
                                            wordGuessed: true  // Explicitly tell backend word was guessed
                                        }))}
                                        className="modern-button text-white text-xl tracking-[0.15em] uppercase
                                                 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400
                                                 w-full md:w-auto md:px-12 py-4"
                                    >
                                        <span className="flex items-center justify-center gap-3">
                                            <span className="text-3xl">✅</span>
                                            Word Guessed!
                                        </span>
                                    </button>

                                    {/* Only show when timer expires - No one guessed the word */}
                                    {remainingTime === 0 && (
                                        <button
                                            onClick={() => wsRef.current?.send(JSON.stringify({ 
                                                type: 'trigger_showdown',
                                                wordGuessed: false  // Explicitly tell backend word was NOT guessed
                                            }))}
                                            className="modern-button text-white text-lg tracking-[0.1em] uppercase
                                                     bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400
                                                     w-full md:w-auto md:px-12 py-4"
                                        >
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="text-2xl">⏰</span>
                                                Time's Up - End Quiz
                                            </span>
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* Force End Round - Admin Only (Only show when game is not completed) */}
                            {isAdmin && roomState?.status !== 'completed' && (
                                <div className="mt-8 pt-6 border-t-2 border-gray-700 flex justify-end">
                                    <button
                                        onClick={() => wsRef.current?.send(JSON.stringify({ type: 'end_round' }))}
                                        className="modern-button text-white text-sm tracking-[0.1em] uppercase
                                                 bg-gradient-to-r from-red-900 to-red-800 hover:from-red-800 hover:to-red-700"
                                    >
                                        Force End Round
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Showdown Discussion Phase */}
                    {roomState?.status === 'showdown_discussion' && (
                        <div className="flex-1 flex flex-col animate-fade-in mt-8">
                            {/* Phase Header */}
                            <div className="modern-card p-6 mb-6 border-purple-500/50 modern-glow">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-3xl">🎯</span>
                                    <h2 className="text-2xl font-bold text-white">Showdown Phase</h2>
                                </div>
                                <p className="text-gray-400">
                                    Discuss and analyze: Who is the Insider?
                                </p>
                            </div>

                            {/* Host Control - Manual Voting */}
                            {currentPlayer?.inGameRole === 'host' && roomState.timerConfig.votingMode === 'manual' && (
                                <div className="mb-6">
                                    <button
                                        onClick={() => wsRef.current?.send(JSON.stringify({ type: 'start_voting' }))}
                                        className="w-full modern-button bg-purple-600 hover:bg-purple-500 text-white text-lg tracking-wide"
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <span>🗳️</span>
                                            Start Voting Phase
                                        </span>
                                    </button>
                                </div>
                            )}

                            {/* Waiting Message */}
                            <div className="flex-1 modern-card border-dashed border-gray-700 p-8 flex items-center justify-center">
                                <p className="text-gray-400 text-center">
                                    {roomState.timerConfig.votingMode === 'auto'
                                        ? (
                                            <>
                                                <span className="block text-2xl mb-2">⏱️</span>
                                                Voting starts automatically when timer ends
                                            </>
                                        )
                                        : (
                                            <>
                                                <span className="block text-2xl mb-2">⏳</span>
                                                Waiting for Host to start voting...
                                            </>
                                        )}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Showdown Voting Phase */}
                    {roomState?.status === 'showdown_voting' && (
                        <div className="flex-1 flex flex-col animate-fade-in mt-8">
                            {/* Phase Header */}
                            <div className="modern-card p-6 mb-6 border-red-500/50 modern-glow-red">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-3xl">🗳️</span>
                                    <h2 className="text-2xl font-bold text-white">Voting Phase</h2>
                                </div>
                                <p className="text-gray-400">
                                    Vote for who you think is the Insider
                                </p>
                            </div>

                            {/* Vote Count Progress */}
                            <div className="modern-card p-6 mb-6">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-gray-400 text-sm font-medium">Votes Submitted</p>
                                    <p className="text-2xl font-bold text-white">
                                        {roomState.votes?.length || 0} / {roomState.players?.filter((p: any) => p.inGameRole !== 'host').length}
                                    </p>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-3">
                                    <div
                                        className="bg-gradient-to-r from-red-600 to-red-500 h-3 rounded-full transition-all duration-500"
                                        style={{
                                            width: `${((roomState.votes?.length || 0) / Math.max(1, roomState.players?.filter((p: any) => p.inGameRole !== 'host').length)) * 100}%`
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* Voting Cards - Commons & Insider Only */}
                            {currentPlayer?.inGameRole !== 'host' && (
                                <div className="mb-6">
                                    <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wide">
                                        Cast Your Vote
                                        {roomState.votes?.some((v: any) => v.voterId === currentPlayer.id) && (
                                            <span className="text-xs ml-2 text-yellow-400">(Click any player to change vote)</span>
                                        )}
                                    </h3>
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
                                                            // Always allow voting or changing vote
                                                            wsRef.current?.send(JSON.stringify({
                                                                type: 'submit_vote',
                                                                targetId: player.id
                                                            }));
                                                        }}
                                                        className={`modern-card p-4 text-left transition-all duration-200 ${
                                                            votedForMe
                                                                ? 'bg-red-600/20 border-red-500 ring-2 ring-red-500'
                                                                : 'hover:bg-red-600/10 hover:border-red-500/50'
                                                        }`}
                                                    >
                                                        <div className="font-semibold text-white mb-1">{player.name}</div>
                                                        {votedForMe ? (
                                                            <div className="flex items-center gap-1 text-red-400 text-sm">
                                                                <span>✓</span>
                                                                <span>{hasVoted ? 'Your Vote' : 'Selected'}</span>
                                                            </div>
                                                        ) : (
                                                            <div className="text-gray-500 text-sm">
                                                                {hasVoted ? 'Click to change' : 'Tap to vote'}
                                                            </div>
                                                        )}
                                                    </button>
                                                );
                                            })
                                        }
                                    </div>
                                </div>
                            )}

                            {/* Host View */}
                            {currentPlayer?.inGameRole === 'host' && (
                                <div className="flex-1 modern-card border-dashed border-gray-700 p-8 flex items-center justify-center mb-6">
                                    <p className="text-gray-400 text-center">
                                        <span className="block text-3xl mb-2">⏳</span>
                                        Waiting for all players to vote...
                                    </p>
                                </div>
                            )}

                            {/* Reveal Roles Button - Host Only */}
                            {currentPlayer?.inGameRole === 'host' && (
                                <div>
                                    <button
                                        onClick={() => wsRef.current?.send(JSON.stringify({ type: 'reveal_roles' }))}
                                        disabled={roomState.votes?.length < roomState.players?.filter((p: any) => p.inGameRole !== 'host').length}
                                        className="w-full modern-button bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-white text-lg tracking-wide disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <span>🔓</span>
                                            Reveal Roles & Results
                                        </span>
                                    </button>
                                    {roomState.votes?.length < roomState.players?.filter((p: any) => p.inGameRole !== 'host').length && (
                                        <p className="text-gray-500 text-xs mt-2 text-center">
                                            All players must vote before revealing
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Game Completed - Results Screen */}
                    {roomState?.status === 'completed' && roomState.gameResult && (
                        <div className="flex-1 flex flex-col animate-fade-in">
                            {/* Winner Announcement */}
                            <div className={`modern-card p-8 mb-6 text-center ${
                                roomState.gameResult.winner === 'commons'
                                    ? 'border-green-500/50 modern-glow-green'
                                    : 'border-red-500/50 modern-glow-red'
                            }`}>
                                <div className="text-3xl md:text-4xl mb-2">
                                    {roomState.gameResult.winner === 'commons' ? '🎉' : '👤'}
                                </div>
                                <h2 className={`text-xl md:text-2xl font-bold mb-4 ${
                                    roomState.gameResult.winner === 'commons' ? 'text-green-400' : 'text-red-400'
                                }`}>
                                    {roomState.gameResult.winner === 'commons' ? 'COMMONS WIN' : 'INSIDER WINS'}
                                </h2>
                                <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                                    <div className="modern-card p-3">
                                        <p className="text-gray-400 text-xs mb-1 uppercase">Word</p>
                                        <p className={`text-sm md:text-base font-bold ${roomState.gameResult.wordGuessed ? 'text-green-400' : 'text-red-400'}`}>
                                            {roomState.gameResult.wordGuessed ? '✓' : '✗'}
                                        </p>
                                    </div>
                                    <div className="modern-card p-3">
                                        <p className="text-gray-400 text-xs mb-1 uppercase">Insider</p>
                                        <p className={`text-sm md:text-base font-bold ${roomState.gameResult.insiderIdentified ? 'text-green-400' : 'text-red-400'}`}>
                                            {roomState.gameResult.insiderIdentified ? '✓' : '✗'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Role Reveals - List Layout for Scalability */}
                            <div className="mb-6">
                                <h3 className="text-base font-bold text-gray-300 mb-3 flex items-center gap-2">
                                    <span>🎭</span>
                                    Roles
                                </h3>
                                <div className="space-y-2">
                                    {roomState.players.map((player: any) => (
                                        <div
                                            key={player.id}
                                            className={`modern-card p-3 flex items-center justify-between ${
                                                player.inGameRole === 'host'
                                                    ? 'border-yellow-500/50 modern-glow'
                                                    : player.inGameRole === 'insider'
                                                    ? 'border-red-500/50 modern-glow-red'
                                                    : 'border-blue-500/50'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                {player.isAdmin && <span className="text-base flex-shrink-0">👑</span>}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-medium text-white text-sm truncate">{player.name}</span>
                                                        {player.deviceId === deviceId && (
                                                            <span className="text-xs text-blue-400 bg-blue-900/50 px-2 py-0.5 rounded-full flex-shrink-0">You</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`text-sm md:text-base font-bold flex-shrink-0 ${
                                                player.inGameRole === 'host' ? 'text-yellow-400' :
                                                player.inGameRole === 'insider' ? 'text-red-400' : 'text-blue-400'
                                            }`}>
                                                {player.inGameRole?.toUpperCase()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Voting Results - Compact List */}
                            {roomState.votes && roomState.votes.length > 0 && (
                                <div className="mb-6">
                                    <h3 className="text-base font-bold text-gray-300 mb-3 flex items-center gap-2">
                                        <span>📊</span>
                                        Votes
                                    </h3>
                                    <div className="modern-card p-4">
                                        {roomState.players
                                            .filter((p: any) => p.inGameRole !== 'host')
                                            .map((voter: any) => {
                                                const vote = roomState.votes.find((v: any) => v.voterId === voter.id);
                                                const target = roomState.players.find((p: any) => p.id === vote?.targetId);

                                                return (
                                                    <div
                                                        key={voter.id}
                                                        className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0 last:pb-0"
                                                    >
                                                        <div className="flex items-center gap-2 flex-1 min-w-0">
                                                            <span className="font-medium text-white text-sm truncate">{voter.name}</span>
                                                            <span className="text-gray-500 text-xs">→</span>
                                                            <span className={`font-medium text-sm truncate ${
                                                                target?.inGameRole === 'insider' ? 'text-green-400' : 'text-red-400'
                                                            }`}>
                                                                {target?.name || '?'}
                                                            </span>
                                                        </div>
                                                        {vote && target && (
                                                            <span className={`text-xs font-medium ml-2 flex-shrink-0 ${
                                                                target.inGameRole === 'insider' ? 'text-green-400' : 'text-red-400'
                                                            }`}>
                                                                {target.inGameRole === 'insider' ? '✓' : '✗'}
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
                                        className="w-full modern-button bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-lg tracking-wide"
                                    >
                                        <span className="flex items-center justify-center gap-2">
                                            <span>🔄</span>
                                            Play Again
                                        </span>
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
