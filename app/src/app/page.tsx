'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';

export default function Home() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [joinRoomId, setJoinRoomId] = useState('');

    const handleCreateRoom = async () => {
        setIsLoading(true);
        try {
            const response = await api.rooms.post({});
            if (response.data && 'roomId' in response.data) {
                router.push(`/${response.data.roomId}`);
            }
        } catch (error) {
            console.error('Failed to create room:', error);
        } finally {
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
        <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gray-900 text-white font-mono">
            <h1 className="text-6xl font-bold mb-8 tracking-widest text-center" style={{ textShadow: '4px 4px 0px #3b82f6' }}>
                OUTSIDER
            </h1>
            <p className="text-xl mb-12 text-gray-300 text-center">The Digital Evolution of the Physical Board Game</p>
            
            <div className="flex flex-col gap-8 w-full max-w-sm">
                <button 
                    onClick={handleCreateRoom}
                    disabled={isLoading}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded border-b-4 border-blue-800 hover:border-blue-700 active:border-b-0 active:mt-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xl"
                >
                    {isLoading ? 'CREATING...' : 'CREATE NEW ROOM'}
                </button>

                <div className="flex items-center gap-4 my-2">
                    <hr className="flex-1 border-gray-600" />
                    <span className="text-gray-400 font-bold">OR</span>
                    <hr className="flex-1 border-gray-600" />
                </div>

                <form onSubmit={handleJoinRoom} className="flex flex-col gap-4">
                    <input 
                        type="text" 
                        placeholder="ENTER ROOM ID" 
                        value={joinRoomId}
                        onChange={(e) => setJoinRoomId(e.target.value.toUpperCase())}
                        className="w-full p-4 bg-gray-800 border-2 border-gray-600 rounded text-center text-white focus:outline-none focus:border-green-500 text-xl uppercase tracking-widest"
                        maxLength={6}
                    />
                    <button 
                        type="submit"
                        disabled={!joinRoomId.trim()}
                        className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 px-8 rounded border-b-4 border-green-800 hover:border-green-700 active:border-b-0 active:mt-4 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xl"
                    >
                        JOIN ROOM
                    </button>
                </form>
            </div>
        </main>
    );
}
