'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { DropZone } from './drop-zone';

interface UltrastarTabProps {
  title: string;
  setTitle: (t: string) => void;
  artist: string;
  setArtist: (a: string) => void;
  useVideoAudio: boolean;
  setUseVideoAudio: (v: boolean) => void;
  audioFile: File | null;
  videoFile: File | null;
  ultrastarFile: File | null;
  audioInputRef: React.RefObject<HTMLInputElement | null>;
  videoInputRef: React.RefObject<HTMLInputElement | null>;
  ultrastarInputRef: React.RefObject<HTMLInputElement | null>;
  handleDrop: (e: React.DragEvent, type: 'audio' | 'video' | 'ultrastar') => void;
  handleFileSelect: (type: 'audio' | 'video' | 'ultrastar', file: File) => void;
}

export function UltrastarTab({
  title, setTitle, artist, setArtist, useVideoAudio, setUseVideoAudio,
  audioFile, videoFile, ultrastarFile,
  audioInputRef, videoInputRef, ultrastarInputRef,
  handleDrop, handleFileSelect,
}: UltrastarTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>UltraStar File *</CardTitle>
          <CardDescription>Drop your .txt file here</CardDescription>
        </CardHeader>
        <CardContent>
          <DropZone
            file={ultrastarFile}
            accept=".txt"
            inputRef={ultrastarInputRef}
            icon="📄"
            label="Drop UltraStar .txt file here"
            description="Click to change"
            onDrop={(e) => handleDrop(e, 'ultrastar')}
            onFileChange={(f) => handleFileSelect('ultrastar', f)}
          />
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Audio File</CardTitle>
          <CardDescription>MP3, OGG, WAV, M4A (optional if video has audio)</CardDescription>
        </CardHeader>
        <CardContent>
          <DropZone
            file={audioFile}
            accept="audio/*,.mp3,.ogg,.wav,.m4a"
            inputRef={audioInputRef}
            icon="🎵"
            label="Drop audio file here"
            onDrop={(e) => handleDrop(e, 'audio')}
            onFileChange={(f) => handleFileSelect('audio', f)}
          />
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Video File</CardTitle>
          <CardDescription>MP4, WebM, MKV - can include audio</CardDescription>
        </CardHeader>
        <CardContent>
          <DropZone
            file={videoFile}
            accept="video/*,.mp4,.webm,.mkv,.avi"
            inputRef={videoInputRef}
            icon="🎬"
            label="Drop video file here"
            accentColor="purple"
            extra={
              !audioFile ? (
                <label className="flex items-center gap-2 mt-2 text-sm">
                  <input
                    type="checkbox"
                    checked={useVideoAudio}
                    onChange={(e) => setUseVideoAudio(e.target.checked)}
                    className="rounded"
                  />
                  Use video&apos;s audio
                </label>
              ) : undefined
            }
            onDrop={(e) => handleDrop(e, 'video')}
            onFileChange={(f) => handleFileSelect('video', f)}
          />
        </CardContent>
      </Card>

      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Song Info</CardTitle>
          <CardDescription>Review/edit details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-white/60 mb-1 block">Title</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Song title"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-white/60 mb-1 block">Artist</label>
            <Input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Artist name"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
