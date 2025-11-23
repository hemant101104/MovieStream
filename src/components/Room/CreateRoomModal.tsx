import React, { useState } from 'react';
import { X, Video, Lock, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (roomCode: string) => void;
}

const CreateRoomModal: React.FC<CreateRoomModalProps> = ({ isOpen, onClose, onRoomCreated }) => {
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { token } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!token) {
      setError('You must be signed in to create a room');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:3001/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: roomName, isPrivate }),
      });

      if (response.ok) {
        const room = await response.json();
        onRoomCreated(room.code);
        onClose();
      } else {
        // Try to parse JSON error message, fallback to generic
        try {
          const error = await response.json();
          setError(error.message || 'Failed to create room');
        } catch {
          setError('Failed to create room');
        }
      }
    } catch (err) {
      setError('Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md border border-slate-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Create New Room</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Room Name
            </label>
            <div className="relative">
              <Video className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter room name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Room Type
            </label>
            <div className="space-y-2">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="roomType"
                  checked={!isPrivate}
                  onChange={() => setIsPrivate(false)}
                  className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 focus:ring-purple-500"
                />
                <div className="flex items-center space-x-2">
                  <Globe className="w-4 h-4 text-green-400" />
                  <span className="text-white">Public</span>
                </div>
                <span className="text-slate-400 text-sm">Anyone can join</span>
              </label>
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="radio"
                  name="roomType"
                  checked={isPrivate}
                  onChange={() => setIsPrivate(true)}
                  className="w-4 h-4 text-purple-600 bg-slate-700 border-slate-600 focus:ring-purple-500"
                />
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span className="text-white">Private</span>
                </div>
                <span className="text-slate-400 text-sm">Invite only</span>
              </label>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors duration-200 flex items-center justify-center"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Create Room'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;