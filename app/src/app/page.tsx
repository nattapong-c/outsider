'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function Home() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [joinRoomId, setJoinRoomId] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleCreateRoom = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await api.rooms.create();
            const responseData = response.data || response;
            const roomId = responseData.roomId;

            if (roomId) {
                window.location.href = `/${roomId}`;
            } else {
                setError('Failed to create room: No room ID returned');
                setIsLoading(false);
            }
        } catch (error: any) {
            setError(`Failed to create room: ${error.response?.data || error.message}`);
            setIsLoading(false);
        }
    };

    const handleJoinRoom = (e: React.FormEvent) => {
        e.preventDefault();
        if (joinRoomId.trim()) {
            router.push(`/${joinRoomId.trim().toUpperCase()}`);
        }
    };

    return (
        <main className="min-h-screen modern-bg flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl animate-fade-in">
                {/* Title */}
                <div className="text-center mb-12">
                    <h1 className="text-5xl md:text-7xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
                        OUTSIDER
                    </h1>
                    <p className="text-gray-400 text-sm md:text-base tracking-widest uppercase">
                        Social Deduction Game
                    </p>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 modern-card border-red-500/50">
                        <div className="flex items-center gap-3 text-red-400 p-4">
                            <span className="text-xl">⚠️</span>
                            <span>{error}</span>
                        </div>
                    </div>
                )}

                {/* Main Card */}
                <div className="modern-card p-6 md:p-8">
                    {/* Create Room */}
                    <div className="mb-8">
                        <button
                            onClick={handleCreateRoom}
                            disabled={isLoading}
                            className="w-full modern-button modern-button-primary text-lg md:text-xl font-bold tracking-wide py-5"
                        >
                            <span className="flex items-center justify-center gap-3">
                                {isLoading ? (
                                    <>
                                        <span className="animate-spin text-2xl">⏳</span>
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <span className="text-2xl">🎮</span>
                                        Create New Room
                                    </>
                                )}
                            </span>
                        </button>
                    </div>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                        <hr className="flex-1 border-gray-700" />
                        <span className="text-gray-500 text-sm font-medium">OR</span>
                        <hr className="flex-1 border-gray-700" />
                    </div>

                    {/* Join Room Form */}
                    <form onSubmit={handleJoinRoom} className="flex flex-col gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="ENTER ROOM ID"
                                value={joinRoomId}
                                onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                                className="w-full modern-input p-4 text-center text-lg tracking-widest"
                                maxLength={6}
                                autoComplete="off"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs">
                                {joinRoomId.length}/6
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={!joinRoomId.trim()}
                            className="w-full modern-button modern-button-success text-lg md:text-xl font-bold tracking-wide py-5"
                        >
                            <span className="flex items-center justify-center gap-3">
                                <span className="text-2xl">🚪</span>
                                Join Room
                            </span>
                        </button>
                    </form>
                </div>

                {/* Footer Info */}
                <div className="mt-8 text-center text-gray-500 text-xs tracking-widest">
                    <p className="flex items-center justify-center gap-4 flex-wrap">
                        <span className="flex items-center gap-1.5">
                            <span>👥</span>
                            4-8 Players
                        </span>
                        <span className="text-gray-700">•</span>
                        <span className="flex items-center gap-1.5">
                            <span>⏱️</span>
                            5-10 Min
                        </span>
                        <span className="text-gray-700">•</span>
                        <span className="flex items-center gap-1.5">
                            <span>🎯</span>
                            Social Deduction
                        </span>
                    </p>
                </div>
            </div>
        </main>
    );
}
