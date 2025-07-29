import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Users, LogOut, Video, Search, Code } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  code: string;
  hostUsername: string;
  participants: any[];
  createdAt: string;
}

interface DashboardProps {
  onJoinRoom: (roomCode: string) => void;
  onCreateRoom: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onJoinRoom, onCreateRoom }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, logout, token } = useAuth();

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/rooms', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (err) {
      console.error('Failed to fetch rooms:', err);
    }
  };

  const handleJoinRoom = async (roomCode: string) => {
    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:3001/api/rooms/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ roomCode: roomCode.toUpperCase() }),
      });

      if (response.ok) {
        onJoinRoom(roomCode.toUpperCase());
      } else {
        const error = await response.json();
        setError(error.message);
      }
    } catch (err) {
      setError('Failed to join room');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Video className="w-8 h-8 text-purple-400" />
              <h1 className="text-2xl font-bold text-white">MovieStream</h1>
            </div>
            <div className="hidden md:block text-slate-400">
              Welcome back, {user?.username}!
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
              
              <div className="space-y-4">
                <button
                  onClick={onCreateRoom}
                  className="w-full flex items-center space-x-3 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create New Room</span>
                </button>

                <div className="relative">
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Code className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Enter room code"
                        maxLength={6}
                      />
                    </div>
                    <button
                      onClick={() => handleJoinRoom(joinCode)}
                      disabled={loading}
                      className="px-4 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-600/50 text-white rounded-lg transition-colors duration-200 flex items-center"
                    >
                      {loading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Search className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Public Rooms */}
          <div className="lg:col-span-2">
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
              <h2 className="text-xl font-semibold text-white mb-6">Public Rooms</h2>
              
              {rooms.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No public rooms available</p>
                  <p className="text-sm mt-2">Create a room to get started!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rooms.map((room) => (
                    <div
                      key={room.id}
                      className="bg-slate-700 rounded-lg p-4 hover:bg-slate-600 transition-colors duration-200 cursor-pointer"
                      onClick={() => handleJoinRoom(room.code)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white truncate">{room.name}</h3>
                        <span className="text-xs text-slate-400 bg-slate-600 px-2 py-1 rounded">
                          {room.code}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between text-sm text-slate-400">
                        <span>Host: {room.hostUsername}</span>
                        <div className="flex items-center space-x-1">
                          <Users className="w-4 h-4" />
                          <span>{room.participants.length}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-slate-500 mt-2">
                        Created {formatDate(room.createdAt)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;