'use client';

import * as React from 'react';
import { Music, Pause, Play, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

export type MediaType = 'video' | 'audio';

export interface MediaPlayerProps {
  type: MediaType;
  src: string; // URL to media file
  thumbnailUrl?: string; // For video poster
  title?: string;
  className?: string;
  autoPlay?: boolean;
  controls?: boolean; // Use native controls or custom
}

export function MediaPlayer({
  type,
  src,
  thumbnailUrl,
  title,
  className = '',
  autoPlay = false,
  controls = true,
}: MediaPlayerProps) {
  const mediaRef = React.useRef<HTMLVideoElement | HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(1);
  const [muted, setMuted] = React.useState(false);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const togglePlay = () => {
    if (mediaRef.current) {
      if (playing) {
        mediaRef.current.pause();
      } else {
        mediaRef.current.play()
          .catch((err) => {
            console.error('Playback error:', err);
            setError('Failed to play media');
          });
      }
      setPlaying(!playing);
    }
  };

  const handleTimeUpdate = () => {
    if (mediaRef.current) {
      setCurrentTime(mediaRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (mediaRef.current) {
      setDuration(mediaRef.current.duration);
      setLoading(false);
    }
  };

  const handleLoadStart = () => {
    setLoading(true);
  };

  const handleCanPlay = () => {
    setLoading(false);
  };

  const handleError = (e: React.SyntheticEvent<HTMLVideoElement | HTMLAudioElement, Event>) => {
    console.error('Media error:', e);
    setError('Failed to load media file');
    setLoading(false);
  };

  const handleSeek = (value: number[]) => {
    if (mediaRef.current) {
      mediaRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (mediaRef.current) {
      mediaRef.current.volume = value[0];
      setVolume(value[0]);
      setMuted(value[0] === 0);
    }
  };

  const toggleMute = () => {
    if (mediaRef.current) {
      mediaRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!fullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setFullscreen(!fullscreen);
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        if (mediaRef.current) {
          mediaRef.current.currentTime = Math.max(0, mediaRef.current.currentTime - 5);
        }
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        if (mediaRef.current) {
          mediaRef.current.currentTime = Math.min(duration, mediaRef.current.currentTime + 5);
        }
      }
      if (e.code === 'KeyM') {
        e.preventDefault();
        toggleMute();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playing, duration]);

  if (error) {
    return (
      <div className={cn('rounded-lg border border-destructive bg-destructive/10 p-6 text-center', className)}>
        <p className="text-destructive font-medium">Error loading media</p>
        <p className="text-sm text-muted-foreground mt-2">{error}</p>
      </div>
    );
  }

  if (type === 'video') {
    return (
      <div ref={containerRef} className={cn('relative rounded-lg overflow-hidden bg-black', className)}>
        <video
          ref={mediaRef as React.RefObject<HTMLVideoElement>}
          src={src}
          poster={thumbnailUrl}
          className="w-full h-full"
          controls={controls}
          autoPlay={autoPlay}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={handleError}
          preload="metadata"
        >
          Your browser does not support video playback.
        </video>

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        )}

        {!controls && !loading && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent p-4 space-y-2">
            {/* Progress bar */}
            <Slider
              value={[currentTime]}
              max={duration || 100}
              step={0.1}
              onValueChange={handleSeek}
              className="cursor-pointer"
            />

            {/* Controls */}
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                onClick={togglePlay}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleMute}
                  className="text-white hover:bg-white/20 h-8 w-8"
                >
                  {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <Slider
                  value={[muted ? 0 : volume]}
                  max={1}
                  step={0.01}
                  onValueChange={handleVolumeChange}
                  className="w-20"
                />
              </div>

              <span className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              <div className="flex-1"></div>

              <Button
                size="icon"
                variant="ghost"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20 h-8 w-8"
              >
                {fullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === 'audio') {
    return (
      <div className={cn('rounded-lg border bg-card p-4', className)}>
        <audio
          ref={mediaRef as React.RefObject<HTMLAudioElement>}
          src={src}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onLoadStart={handleLoadStart}
          onCanPlay={handleCanPlay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onError={handleError}
          preload="metadata"
          className="hidden"
        />

        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-purple-400 to-purple-600 text-white shrink-0">
            <Music className="h-6 w-6" />
          </div>

          <div className="flex-1 space-y-2">
            {title && <div className="font-medium">{title}</div>}

            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span>Loading audio...</span>
              </div>
            ) : (
              <>
                {/* Progress bar */}
                <Slider
                  value={[currentTime]}
                  max={duration || 100}
                  step={0.1}
                  onValueChange={handleSeek}
                  className="cursor-pointer"
                />

                {/* Controls */}
                <div className="flex items-center gap-3">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={togglePlay}
                    className="h-8 w-8"
                  >
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>

                  <span className="text-sm text-muted-foreground">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  <div className="flex-1"></div>

                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={toggleMute}
                    className="h-8 w-8"
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>

                  <Slider
                    value={[muted ? 0 : volume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="w-20"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
