import React, { useRef, useEffect, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Upload, Link } from 'lucide-react';

import type { Socket } from 'socket.io-client';
interface VideoPlayerProps {
  socket: Socket;
  isHost: boolean;
}

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ socket, isHost }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [inputUrl, setInputUrl] = useState('');
  // New state for additional features
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRY_ATTEMPTS = 3;

  useEffect(() => {
    // Load YouTube IFrame Player API if not already loaded
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    // Initialize or update YouTube player when video URL changes
    const initYouTubePlayer = () => {
      if (videoUrl && isYoutubeUrl(videoUrl) && window.YT) {
        if (youtubePlayerRef.current) {
          youtubePlayerRef.current.destroy();
        }

        youtubePlayerRef.current = new window.YT.Player('youtube-player', {
          height: '100%',
          width: '100%',
          videoId: getYoutubeVideoId(videoUrl),
          playerVars: {
            autoplay: isPlaying ? 1 : 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
            enablejsapi: 1
          },
          events: {
            onReady: (event: any) => {
              console.log('YouTube player ready');
              const player = event.target;
              player.setVolume(volume * 100);
              if (isMuted) player.mute();
              if (isPlaying) player.playVideo();
            },
            onStateChange: (event: any) => {
              console.log('YouTube player state changed:', event.data);
              switch (event.data) {
                case window.YT.PlayerState.PLAYING:
                  setIsPlaying(true);
                  break;
                case window.YT.PlayerState.PAUSED:
                  setIsPlaying(false);
                  break;
                case window.YT.PlayerState.ENDED:
                  setIsPlaying(false);
                  setCurrentTime(0);
                  break;
              }
            },
            onError: (event: any) => {
              console.error('YouTube player error:', event.data);
              setError('Error playing video. Please try again.');
            }
          }
        });
      }
    };

    // Set up YouTube API callback
    if (window.YT && window.YT.Player) {
      initYouTubePlayer();
    } else {
      window.onYouTubeIframeAPIReady = initYouTubePlayer;
    };
  }, [videoUrl, isPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleLoadedMetadata = () => setDuration(video.duration);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleVideoSync = (data: { action: 'play' | 'pause'; currentTime: number }) => {
      const video = videoRef.current;
      if (!video) return;
      const timeDiff = Math.abs(video.currentTime - data.currentTime);
      if (timeDiff > 1) video.currentTime = data.currentTime;
      if (data.action === 'play') {
        video.play(); setIsPlaying(true);
      } else if (data.action === 'pause') {
        video.pause(); setIsPlaying(false);
      }
    };

    // Listen for video selection and sync events
    const handleVideoSelected = ({ url }: { url: string }) => {
      setVideoUrl(url);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
      setCurrentTime(0);
      setIsPlaying(false);
    };

    socket.on('video-sync', handleVideoSync);
    socket.on('set-video', handleVideoSelected);

    return () => {
      socket.off('video-sync', handleVideoSync);
      socket.off('video-selected', handleVideoSelected);
    };
  }, [socket]);

  const handlePlay = () => {
    if (!isHost) return;

    if (isYoutubeUrl(videoUrl)) {
      const player = youtubePlayerRef.current;
      if (!player) return;

      if (isPlaying) {
        player.pauseVideo();
        setIsPlaying(false);
        socket.emit('video-action', {
          action: 'pause',
          currentTime: player.getCurrentTime(),
        });
      } else {
        player.playVideo();
        setIsPlaying(true);
        socket.emit('video-action', {
          action: 'play',
          currentTime: player.getCurrentTime(),
        });
      }
    } else {
      const video = videoRef.current;
      if (!video) return;

      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
        socket.emit('video-action', {
          action: 'pause',
          currentTime: video.currentTime,
        });
      } else {
        video.play();
        setIsPlaying(true);
        socket.emit('video-action', {
          action: 'play',
          currentTime: video.currentTime,
        });
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHost) return;

    const video = videoRef.current;
    if (!video || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newTime = (clickX / rect.width) * duration;

    video.currentTime = newTime;
    setCurrentTime(newTime);

    socket.emit('video-action', {
      action: isPlaying ? 'play' : 'pause',
      currentTime: newTime,
    });
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    video.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isMuted) {
      video.volume = volume;
      setIsMuted(false);
    } else {
      video.volume = 0;
      setIsMuted(true);
    }
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  // Host: handle local file upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isHost) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please select a valid video file');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create local URL for immediate playback
      const localUrl = URL.createObjectURL(file);
      setVideoUrl(localUrl);
      setCurrentTime(0);
      setIsPlaying(true);
      
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        // Ensure video starts playing immediately
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.error("Video playback failed:", error);
          });
        }
      }

      // In parallel, upload to server
      const formData = new FormData();
      formData.append('video', file);

      const response = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed: ' + response.statusText);
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error('No URL received from server');
      }
      const url = data.url;
      
      // After successful upload, use the server URL
      setVideoUrl(url);
      
      // Broadcast to all participants
      if (socket) socket.emit('set-video', { url });
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to upload video');
    } finally {
      setIsLoading(false);
    }

    // Clean up object URL when component unmounts
    return () => {
      if (videoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  };

  // Extract YouTube video ID from various URL formats
  const getYoutubeVideoId = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      let videoId: string | null = null;
      
      if (urlObj.hostname.includes('youtube.com')) {
        // Handle youtube.com URLs
        if (urlObj.pathname === '/watch') {
          videoId = urlObj.searchParams.get('v');
        } else if (urlObj.pathname.startsWith('/embed/')) {
          videoId = urlObj.pathname.split('/')[2];
        } else if (urlObj.pathname.startsWith('/v/')) {
          videoId = urlObj.pathname.split('/')[2];
        }
      } else if (urlObj.hostname === 'youtu.be') {
        // Handle youtu.be URLs
        videoId = urlObj.pathname.slice(1);
      }
      
      // Validate video ID format (typically 11 characters)
      if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
        return videoId;
      }
    } catch (error) {
      console.error('Error parsing YouTube URL:', error);
    }
    return null;
  };

  const isYoutubeUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'youtube.com' || 
             urlObj.hostname === 'www.youtube.com' || 
             urlObj.hostname === 'youtu.be';
    } catch {
      return false;
    }
  };

  // Convert YouTube URL to embed URL or return original URL for direct video files
  const getVideoUrl = (url: string): string => {
    if (isYoutubeUrl(url)) {
      const videoId = getYoutubeVideoId(url);
      if (videoId) {
        // Add necessary YouTube player parameters
        return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&controls=1&rel=0&autoplay=${isPlaying ? 1 : 0}&modestbranding=1&origin=${window.location.origin}`;
      }
      throw new Error('Invalid YouTube URL');
    }
    return url;
  };

  // Host: handle direct video/YouTube URL
  const handleUrlSubmit = () => {
    if (!inputUrl.trim() || !isHost) return;
    
    try {
      // Validate URL format first
      try {
        new URL(inputUrl);
      } catch {
        throw new Error('Invalid URL format. Please enter a valid URL.');
      }

      // Check if it's a valid YouTube URL
      if (!isYoutubeUrl(inputUrl)) {
        throw new Error('Invalid URL. Please enter a valid YouTube URL.');
      }

      const videoId = getYoutubeVideoId(inputUrl);
      if (!videoId) {
        throw new Error('Could not extract video ID. Please check the URL.');
      }

      const processedUrl = getVideoUrl(inputUrl);
      setVideoUrl(processedUrl); // Set the URL locally first
      if (socket) socket.emit('set-video', { url: processedUrl });
      setShowUrlInput(false);
      setInputUrl('');
      setError(null);
      setCurrentTime(0);
      setIsPlaying(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Invalid video URL');
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video loading error:', e);
    setVideoUrl(''); // Reset URL on error
    // You might want to show an error message to the user here
  };

  return (
    <div className="w-full bg-slate-900 rounded-xl overflow-hidden shadow-2xl">
      <div className="relative">
        {/* Render either YouTube iframe or video element */}
        {videoUrl && isYoutubeUrl(videoUrl) ? (
          <div className="w-full h-96 bg-black relative">
            <div
              id="youtube-player"
              className="w-full h-full"
            />
            {isHost && (
              <div 
                className="absolute inset-0 cursor-pointer" 
                onClick={handlePlay}
                style={{ pointerEvents: 'none' }}
              />
            )}
          </div>
        ) : (
          <video
            ref={videoRef}
            className="w-full h-96 bg-black"
            src={videoUrl || undefined}
            onClick={handlePlay}
            controls={!!videoUrl}
            autoPlay={true}
            onLoadedMetadata={() => {
              if (videoRef.current && isPlaying) {
                videoRef.current.play();
              }
            }}
            onError={handleVideoError}
            playsInline // Better mobile support
          />
        )}

        {/* Overlay for host to select/upload video if none is loaded */}
        {!videoUrl && isHost && (
          <div className="absolute inset-0 bg-slate-800 text-white flex flex-col items-center justify-center space-y-4 z-10">
            <label className="cursor-pointer bg-purple-600 px-4 py-2 rounded-lg flex items-center space-x-2">
              <Upload className="w-4 h-4" />
              <span>Upload Video</span>
              <input type="file" accept="video/*" onChange={handleFileUpload} className="hidden" />
            </label>
            <button
              onClick={() => setShowUrlInput(true)}
              className="bg-amber-600 px-4 py-2 rounded-lg flex items-center space-x-2"
            >
              <Link className="w-4 h-4" />
              <span>Add Video URL</span>
            </button>
          </div>
        )}

        {/* Overlay for participants if no video is loaded */}
        {!videoUrl && !isHost && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-400 z-10">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                <Play className="w-12 h-12" />
              </div>
              <p className="text-lg mb-2">Waiting for host to select a video...</p>
            </div>
          </div>
        )}

        {/* Controls (always visible for layout, but only enabled if videoUrl) */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
          <div
            className="w-full h-2 bg-gray-700 rounded-full cursor-pointer mb-3"
            onClick={handleSeek}
            style={{ pointerEvents: videoUrl ? 'auto' : 'none', opacity: videoUrl ? 1 : 0.5 }}
          >
            <div
              className="h-full bg-purple-500 rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-white">
            <div className="flex items-center gap-4">
              <button onClick={handlePlay} disabled={!isHost || !videoUrl}>
                {isPlaying ? <Pause /> : <Play />}
              </button>
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} disabled={!videoUrl}>
                  {isMuted ? <VolumeX /> : <Volume2 />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20"
                  disabled={!videoUrl}
                />
              </div>
              <span className="text-sm">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>
            <button onClick={handleFullscreen} disabled={!videoUrl}>
              <Maximize />
            </button>
          </div>
        </div>
      </div>

      {/* URL Input Modal */}
      {showUrlInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 p-6 rounded-lg w-full max-w-md space-y-4">
            <h2 className="text-white text-lg">Enter Video URL</h2>
            <input
              type="url"
              className="w-full p-2 rounded bg-slate-700 text-white"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Enter video URL (MP4 or YouTube)"
            />
            <div className="text-xs text-slate-400 space-y-1">
              <p>Supported formats:</p>
              <ul className="list-disc list-inside space-y-1 pl-2">
                <li>YouTube URLs (e.g., https://youtube.com/watch?v=VIDEO_ID)</li>
                <li>Short YouTube URLs (e.g., https://youtu.be/VIDEO_ID)</li>
                <li>Direct video files (MP4, WebM, etc.)</li>
              </ul>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowUrlInput(false)} className="text-white bg-gray-600 px-4 py-2 rounded">
                Cancel
              </button>
              <button onClick={handleUrlSubmit} className="text-white bg-purple-600 px-4 py-2 rounded">
                Add Video
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;

