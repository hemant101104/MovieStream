import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import LoginForm from './components/Auth/LoginForm';
import RegisterForm from './components/Auth/RegisterForm';
import Dashboard from './components/Dashboard/Dashboard';
import CreateRoomModal from './components/Room/CreateRoomModal';
import MovieRoom from './components/Room/MovieRoom';
import { Film } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<string | null>(null);

  const handleJoinRoom = (roomCode: string) => {
    setCurrentRoom(roomCode);
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
  };

  const handleCreateRoom = () => {
    setShowCreateRoom(true);
  };

  const handleRoomCreated = (roomCode: string) => {
    setCurrentRoom(roomCode);
    setShowCreateRoom(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4">
            <Film className="w-8 h-8 text-white animate-pulse" />
          </div>
          <p className="text-white text-lg">Loading MovieStream...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-600 rounded-full mb-4">
              <Film className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">MovieStream</h1>
            <p className="text-slate-400">Watch movies together with friends</p>
          </div>
          
          {isLoginMode ? (
            <LoginForm onToggleForm={() => setIsLoginMode(false)} />
          ) : (
            <RegisterForm onToggleForm={() => setIsLoginMode(true)} />
          )}
        </div>
      </div>
    );
  }

  if (currentRoom) {
    return (
      <MovieRoom
        roomCode={currentRoom}
        onLeaveRoom={handleLeaveRoom}
      />
    );
  }

  return (
    <>
      <Dashboard
        onJoinRoom={handleJoinRoom}
        onCreateRoom={handleCreateRoom}
      />
      <CreateRoomModal
        isOpen={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        onRoomCreated={handleRoomCreated}
      />
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;