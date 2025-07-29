import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, Crown, Users } from 'lucide-react';

interface Participant {
  id: string;
  username: string;
  socketId: string;
}

interface ParticipantGridProps {
  participants: Participant[];
  currentUser: Participant;
  hostId: string;
}

const ParticipantGrid: React.FC<ParticipantGridProps> = ({
  participants,
  currentUser,
  hostId
}) => {
  // Filter out current user from participants to avoid double rendering
  const otherParticipants = participants.filter(p => p.id !== currentUser.id);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    startLocalVideo();
    // Clean up only on unmount
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startLocalVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing media devices:', err);
    }
  };

  const toggleVideo = async () => {
    if (videoEnabled && localStream) {
      // Turn off camera: stop all video tracks, clear ref and state
      localStream.getVideoTracks().forEach(track => track.stop());
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      setLocalStream(null);
      setVideoEnabled(false);
    } else if (!videoEnabled) {
      // Turn on camera: reacquire stream using startLocalVideo
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setVideoEnabled(true);
      } catch (err) {
        setVideoEnabled(false);
        console.error('Error accessing media devices:', err);
      }
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };

  const isHost = (participantId: string) => participantId === hostId;

  // State for YouTube URL input
  const [youtubeUrl, setYoutubeUrl] = useState('');
  // State for local video file
  const [localVideoFile, setLocalVideoFile] = useState<File | null>(null);

  // Handler for YouTube URL submit
  const handleYoutubeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (youtubeUrl.trim()) {
      // TODO: Emit or handle YouTube URL for playback (integration with VideoPlayer needed)
      alert('YouTube URL submitted: ' + youtubeUrl);
      setYoutubeUrl('');
    }
  };

  // Handler for local video file upload
  const handleLocalVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLocalVideoFile(e.target.files[0]);
      // TODO: Emit or handle local video file for playback (integration with VideoPlayer needed)
      alert('Local video selected: ' + e.target.files[0].name);
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
      {/* Host-only: Video/YouTube controls */}
      {isHost(currentUser.id) && (
        <div className="mb-6">
          <h4 className="text-white text-md font-semibold mb-2">Add Video to Room</h4>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Local Video Upload */}
            <label className="flex flex-col items-start gap-2 bg-slate-900 p-4 rounded-lg border border-slate-700 w-full md:w-1/2 cursor-pointer hover:bg-slate-700 transition-colors">
              <span className="text-white font-medium">Upload Local Video</span>
              <input type="file" accept="video/*" onChange={handleLocalVideoChange} className="hidden" />
              <span className="text-slate-400 text-xs">Choose a video file from your PC</span>
              {localVideoFile && <span className="text-green-400 text-xs">Selected: {localVideoFile.name}</span>}
            </label>
            {/* YouTube URL Input */}
            <form onSubmit={handleYoutubeSubmit} className="flex flex-col gap-2 bg-slate-900 p-4 rounded-lg border border-slate-700 w-full md:w-1/2">
              <span className="text-white font-medium">Add YouTube URL</span>
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={e => setYoutubeUrl(e.target.value)}
                className="w-full px-3 py-2 rounded bg-slate-800 text-white border border-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
              <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded transition-colors mt-1">Add YouTube Video</button>
            </form>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Participants ({1 + otherParticipants.length})
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Current User */}
        <div className="relative bg-slate-900 rounded-lg overflow-hidden">
          {videoEnabled ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-32 object-cover"
            />
          ) : (
            <div className="w-full h-32 flex items-center justify-center bg-slate-700">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold">
                    {currentUser.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-white text-sm">Camera off</p>
              </div>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                      <span className="text-white text-sm font-medium flex items-center gap-1">
                        {currentUser.username} (You)
                        {isHost(currentUser.id) && <Crown className="w-4 h-4 text-amber-400" />}
                      </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleAudio}
                  className={`p-1 rounded ${
                    audioEnabled ? 'bg-green-600' : 'bg-red-600'
                  } text-white`}
                >
                  {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleVideo}
                  className={`p-1 rounded ${
                    videoEnabled ? 'bg-green-600' : 'bg-red-600'
                  } text-white`}
                >
                  {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Other Participants */}
        {otherParticipants.map((participant) => (
          <div
            key={participant.id}
            className="relative bg-slate-900 rounded-lg overflow-hidden"
          >
            <div className="w-full h-32 flex items-center justify-center bg-slate-700">
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-white font-bold">
                    {participant.username.charAt(0).toUpperCase()}
                  </span>
                </div>
                <p className="text-white text-sm">Camera off</p>
              </div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-white text-sm font-medium">
                    {participant.username}
                  </span>
                  {isHost(participant.id) && (
                    <Crown className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="p-1 rounded bg-red-600 text-white">
                    <MicOff className="w-4 h-4" />
                  </div>
                  <div className="p-1 rounded bg-red-600 text-white">
                    <VideoOff className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ParticipantGrid;