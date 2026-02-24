'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseUltraStarTxt, convertUltraStarToSong } from '@/lib/parsers/ultrastar-parser';
import { AudioAnalyzer, createSongFromAnalysis, AnalysisProgress } from '@/lib/parsers/audio-analyzer';
import { Song } from '@/types/game';

interface ImportScreenProps {
  onImport: (song: Song) => void;
  onCancel: () => void;
}

export function ImportScreen({ onImport, onCancel }: ImportScreenProps) {
  const [importType, setImportType] = useState<'ultrastar' | 'audio'>('ultrastar');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Files
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [ultrastarFile, setUltrastarFile] = useState<File | null>(null);
  
  // URLs
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  
  // Metadata
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [bpm, setBpm] = useState(120);
  
  // Preview
  const [previewSong, setPreviewSong] = useState<Song | null>(null);
  const [previewAudio, setPreviewAudio] = useState<string>('');
  const [previewVideo, setPreviewVideo] = useState<string>('');
  
  // File input refs
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const ultrastarInputRef = useRef<HTMLInputElement>(null);

  // Parse UltraStar file
  const parseUltrastarFile = async (file: File) => {
    try {
      const text = await file.text();
      const ultraStar = parseUltraStarTxt(text);
      
      setTitle(ultraStar.title);
      setArtist(ultraStar.artist);
      setBpm(ultraStar.bpm);
    } catch (err) {
      setError('Failed to parse UltraStar file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Handle file selection
  const handleFileSelect = useCallback((type: 'audio' | 'video' | 'ultrastar', file: File) => {
    setError(null);
    
    switch (type) {
      case 'audio':
        setAudioFile(file);
        const audioObjUrl = URL.createObjectURL(file);
        setAudioUrl(audioObjUrl);
        setPreviewAudio(audioObjUrl);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
        break;
      case 'video':
        setVideoFile(file);
        const videoObjUrl = URL.createObjectURL(file);
        setVideoUrl(videoObjUrl);
        setPreviewVideo(videoObjUrl);
        break;
      case 'ultrastar':
        setUltrastarFile(file);
        parseUltrastarFile(file);
        break;
    }
  }, [title]);

  // Handle YouTube URL
  const handleYoutubeUrl = useCallback(() => {
    if (!youtubeUrl) return;
    
    let videoId = '';
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    ];
    
    for (const pattern of patterns) {
      const match = youtubeUrl.match(pattern);
      if (match) {
        videoId = match[1];
        break;
      }
    }
    
    if (videoId) {
      const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`;
      setVideoUrl(embedUrl);
      setPreviewVideo(embedUrl);
    } else {
      setError('Invalid YouTube URL');
    }
  }, [youtubeUrl]);

  // Process UltraStar import
  const processUltrastarImport = async () => {
    if (!ultrastarFile || !audioFile) {
      setError('Please provide both UltraStar txt file and audio file');
      return;
    }
    
    setIsProcessing(true);
    setProgress({ stage: 'loading', progress: 0, message: 'Processing UltraStar import...' });
    
    try {
      const text = await ultrastarFile.text();
      const ultraStar = parseUltraStarTxt(text);
      
      const song = convertUltraStarToSong(ultraStar, audioUrl, videoUrl || undefined);
      
      setPreviewSong(song);
      setProgress({ stage: 'complete', progress: 100, message: 'Import complete!' });
    } catch (err) {
      setError('Failed to import: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setProgress({ stage: 'error', progress: 0, message: 'Import failed' });
    }
    
    setIsProcessing(false);
  };

  // Process audio analysis import
  const processAudioAnalysis = async () => {
    if (!audioFile) {
      setError('Please provide an audio file');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const analyzer = new AudioAnalyzer((p) => setProgress(p));
      const result = await analyzer.analyzeAudioFile(audioFile);
      
      const song = createSongFromAnalysis(
        result.notes,
        result.duration,
        bpm,
        audioUrl,
        videoUrl || undefined,
        title || 'Unknown',
        artist || 'Unknown'
      );
      
      setPreviewSong(song);
    } catch (err) {
      setError('Failed to analyze audio: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    
    setIsProcessing(false);
  };

  // Confirm import
  const confirmImport = () => {
    if (previewSong) {
      onImport(previewSong);
    }
  };

  // Drag and drop handler
  const handleDrop = useCallback((e: React.DragEvent, type: 'audio' | 'video' | 'ultrastar') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(type, file);
    }
  }, [handleFileSelect]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Import Songs</h1>
        <p className="text-white/60">Import UltraStar songs or analyze audio files</p>
      </div>

      <Tabs value={importType} onValueChange={(v) => setImportType(v as typeof importType)}>
        <TabsList className="mb-6">
          <TabsTrigger value="ultrastar">UltraStar Import</TabsTrigger>
          <TabsTrigger value="audio">Audio Analysis</TabsTrigger>
        </TabsList>

        {/* UltraStar Import Tab */}
        <TabsContent value="ultrastar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* UltraStar txt file */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>UltraStar File</CardTitle>
                <CardDescription>Drop your .txt file here</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-cyan-500/50 transition-colors cursor-pointer"
                  onDrop={(e) => handleDrop(e, 'ultrastar')}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => ultrastarInputRef.current?.click()}
                >
                  {ultrastarFile ? (
                    <div className="text-cyan-400">
                      <p className="font-semibold">{ultrastarFile.name}</p>
                      <p className="text-sm text-white/60">Click to change</p>
                    </div>
                  ) : (
                    <div className="text-white/60">
                      <p className="text-4xl mb-2">📄</p>
                      <p>Drop UltraStar .txt file here</p>
                    </div>
                  )}
                </div>
                <input
                  ref={ultrastarInputRef}
                  type="file"
                  accept=".txt"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect('ultrastar', e.target.files[0])}
                />
              </CardContent>
            </Card>

            {/* Audio file */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Audio File</CardTitle>
                <CardDescription>MP3, OGG, WAV, or M4A</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-cyan-500/50 transition-colors cursor-pointer"
                  onDrop={(e) => handleDrop(e, 'audio')}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => audioInputRef.current?.click()}
                >
                  {audioFile ? (
                    <div className="text-cyan-400">
                      <p className="font-semibold">{audioFile.name}</p>
                    </div>
                  ) : (
                    <div className="text-white/60">
                      <p className="text-4xl mb-2">🎵</p>
                      <p>Drop audio file here</p>
                    </div>
                  )}
                </div>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*,.mp3,.ogg,.wav,.m4a"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect('audio', e.target.files[0])}
                />
              </CardContent>
            </Card>

            {/* Video file (optional) */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Video Background (Optional)</CardTitle>
                <CardDescription>MP4, WebM, MKV, AVI</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-purple-500/50 transition-colors cursor-pointer"
                  onDrop={(e) => handleDrop(e, 'video')}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => videoInputRef.current?.click()}
                >
                  {videoFile ? (
                    <div className="text-purple-400">
                      <p className="font-semibold">{videoFile.name}</p>
                    </div>
                  ) : (
                    <div className="text-white/60">
                      <p className="text-4xl mb-2">🎬</p>
                      <p>Drop video file here</p>
                    </div>
                  )}
                </div>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*,.mp4,.webm,.mkv,.avi"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect('video', e.target.files[0])}
                />
              </CardContent>
            </Card>

            {/* YouTube URL */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>YouTube Video</CardTitle>
                <CardDescription>Use YouTube as background</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                />
                <Button onClick={handleYoutubeUrl} variant="outline" className="w-full border-white/20 text-white">
                  Load YouTube Video
                </Button>
                {videoUrl && videoUrl.includes('youtube') && (
                  <p className="text-sm text-green-400">✓ YouTube video loaded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Audio Analysis Tab */}
        <TabsContent value="audio">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Audio File</CardTitle>
                <CardDescription>AI will detect notes automatically</CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-cyan-500/50 transition-colors cursor-pointer"
                  onDrop={(e) => handleDrop(e, 'audio')}
                  onDragOver={(e) => e.preventDefault()}
                  onClick={() => audioInputRef.current?.click()}
                >
                  {audioFile ? (
                    <div className="text-cyan-400">
                      <p className="font-semibold">{audioFile.name}</p>
                    </div>
                  ) : (
                    <div className="text-white/60">
                      <p className="text-4xl mb-2">🎵</p>
                      <p>Drop audio file here</p>
                      <p className="text-sm">Notes detected automatically</p>
                    </div>
                  )}
                </div>
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*,.mp3,.ogg,.wav,.m4a"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect('audio', e.target.files[0])}
                />
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Song Info</CardTitle>
                <CardDescription>Enter song details</CardDescription>
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
                <div>
                  <label className="text-sm text-white/60 mb-1 block">BPM</label>
                  <Input
                    type="number"
                    value={bpm}
                    onChange={(e) => setBpm(parseInt(e.target.value) || 120)}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Progress */}
      {progress && progress.stage !== 'complete' && (
        <Card className="bg-white/5 border-white/10 mt-6">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Progress value={progress.progress} className="flex-1" />
              <span className="text-sm text-white/60">{progress.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/30 mt-6">
          <CardContent className="py-4 text-red-400">{error}</CardContent>
        </Card>
      )}

      {/* Preview */}
      {previewSong && (
        <Card className="bg-white/5 border-white/10 mt-6">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="text-xl font-bold">{previewSong.title}</h3>
            <p className="text-white/60">{previewSong.artist}</p>
            <div className="flex gap-2 mt-2">
              <Badge>{previewSong.bpm} BPM</Badge>
              <Badge variant="outline" className="border-white/20">{previewSong.difficulty}</Badge>
              <Badge variant="outline" className="border-white/20">
                {previewSong.lyrics.reduce((acc, l) => acc + l.notes.length, 0)} notes
              </Badge>
            </div>
            {previewAudio && (
              <audio controls src={previewAudio} className="w-full mt-4" />
            )}
            {previewVideo && (
              <div className="mt-4">
                {previewVideo.includes('youtube') ? (
                  <iframe src={previewVideo} className="w-full h-48 rounded-lg" allow="autoplay" />
                ) : (
                  <video src={previewVideo} controls className="w-full h-48 rounded-lg object-cover" />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-4 mt-6">
        <Button variant="outline" onClick={onCancel} className="border-white/20 text-white">
          Cancel
        </Button>
        {importType === 'ultrastar' && (
          <Button 
            onClick={processUltrastarImport}
            disabled={!ultrastarFile || !audioFile || isProcessing}
            className="bg-gradient-to-r from-cyan-500 to-purple-500"
          >
            {isProcessing ? 'Processing...' : 'Import'}
          </Button>
        )}
        {importType === 'audio' && (
          <Button 
            onClick={processAudioAnalysis}
            disabled={!audioFile || isProcessing}
            className="bg-gradient-to-r from-cyan-500 to-purple-500"
          >
            {isProcessing ? 'Analyzing...' : 'Analyze'}
          </Button>
        )}
        {previewSong && (
          <Button onClick={confirmImport} className="bg-green-500 hover:bg-green-400">
            Add to Library
          </Button>
        )}
      </div>
    </div>
  );
}
