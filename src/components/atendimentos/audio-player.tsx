
// src/components/atendimentos/audio-player.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

interface AudioPlayerProps {
  src: string;
}

const formatTime = (timeInSeconds: number): string => {
    if (isNaN(timeInSeconds) || !isFinite(timeInSeconds) || timeInSeconds < 0) {
        return "00:00";
    }
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

export function AudioPlayer({ src }: AudioPlayerProps): React.ReactElement {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    
    const resetAudio = (): void => {
        if (audio) {
            audio.currentTime = 0;
        }
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
    }
    resetAudio();

    if (!audio) return;
    
    const setAudioData = (): void => {
      if (isFinite(audio.duration)) {
          setDuration(audio.duration);
      }
    };

    const setAudioTime = (): void => setCurrentTime(audio.currentTime);
    const setAudioEnd = (): void => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('ended', setAudioEnd);

    if (audio.readyState >= 1) {
        setAudioData();
    }

    return (): void => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('ended', setAudioEnd);
    };
  }, [src]);
  
  const togglePlayPause = (): void => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(e => console.error("Audio play failed", e));
    }
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (value: number[]): void => {
    const audio = audioRef.current;
    const newTime = value[0];
    if (!audio || newTime === undefined) return;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  return (
    <div className="flex items-center gap-2 w-full">
      <audio ref={audioRef} src={src} preload="metadata" />
      <Button variant="ghost" size="icon" onClick={togglePlayPause} className="h-10 w-10 shrink-0 rounded-full bg-primary/20 text-primary-foreground hover:bg-primary/30">
        {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current pl-0.5" />}
      </Button>
      <div className="flex-1">
        <Slider
            value={[currentTime]}
            max={duration || 1}
            onValueChange={handleSliderChange}
            className="w-full"
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground whitespace-nowrap">{formatTime(currentTime)} / {formatTime(duration)}</span>
    </div>
  );
}
