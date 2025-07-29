import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Copy, Check, Crown, Settings } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import VideoPlayer from './VideoPlayer';
import ChatPanel from './ChatPanel';
import ParticipantGrid from './ParticipantGrid';

interface Participant {
  id: string;
  username: string;
  socketId: string;
}

interface MovieRoomProps {
  roomCode: string;
  onLeaveRoom: () => void;
}

const MovieRoom: React.FC<MovieRoomProps> = ({ roomCode, onLeaveRoom }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [roomInfo, setRoomInfo] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setConnected(true);
      newSocket.emit('join-room', {
        roomCode,
        user
      });
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    newSocket.on('room-state', (data) => {
      setParticipants(data.participants || []);
      setRoomInfo(data);
    });

    newSocket.on('user-joined', (data) => {
      setParticipants(data.participants || []);
    });

    newSocket.on('user-left', (data) => {
      setParticipants(data.participants || []);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [roomCode, user]);

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Always use roomInfo.hostId for host detection
  const isHost = roomInfo?.hostId && user?.id && roomInfo.hostId === user.id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={onLeaveRoom}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Leave Room</span>
            </button>
            
            <div className="flex items-center space-x-2">
              <span className="text-white font-medium">Room Code:</span>
              <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1 rounded-lg">
                <span className="text-purple-400 font-mono text-lg">{roomCode}</span>
                <button
                  onClick={copyRoomCode}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isHost && (
              <div className="flex items-center space-x-2 bg-amber-600 px-3 py-1 rounded-lg">
                <Crown className="w-4 h-4 text-white" />
                <span className="text-white font-medium">Host</span>
              </div>
            )}
            
            <div className={`flex items-center space-x-2 px-3 py-1 rounded-lg ${
              connected ? 'bg-green-600' : 'bg-red-600'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                connected ? 'bg-white' : 'bg-white animate-pulse'
              }`} />
              <span className="text-white text-sm">
                {connected ? 'Connected' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-3">
            <VideoPlayer
              socket={socket}
              isHost={isHost}
              currentUser={user}
            />
          </div>

          {/* Participants */}
          <div className="lg:col-span-1">
            <ParticipantGrid
              participants={participants}
              currentUser={
                participants.find(p => p.id === user?.id) ||
                (user ? { id: user.id, username: user.username, socketId: '' } : { id: '', username: '', socketId: '' })
              }
              hostId={roomInfo?.hostId || ''}
            />
          </div>
        </div>

        {/* Chat Panel */}
        <div className="mt-6">
          <ChatPanel
            socket={socket}
            currentUser={user}
          />
        </div>
      </div>
    </div>
  );
};

export default MovieRoom;