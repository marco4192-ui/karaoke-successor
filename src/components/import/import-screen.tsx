'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { parseUltraStarTxt, convertUltraStarToSong } from '@/lib/parsers/ultrastar-parser';
import { 
  scanFolderWithPicker, 
  scanFilesFromFileList, 
  convertScannedSongToSong, 
  isFileSystemAccessSupported,
  ScannedSong 
} from '@/lib/parsers/folder-scanner';
import { addSong, addSongs, getAllSongs, reloadLibrary, clearCustomSongs } from '@/lib/game/song-library';
import { storeMedia } from '@/lib/db/media-db';
import { Song } from '@/types/game';

// Duplicate detection result
interface DuplicateInfo {
  index: number;
  song: ScannedSong;
  existingSong: Song;
  matchType: 'exact' | 'similar' | 'none';
}

interface ImportScreenProps {
  onImport: (song: Song) => void;
  onCancel: () => void;
}

// Check for duplicates
function findDuplicates(scannedSongs: ScannedSong[], existingSongs: Song[]): DuplicateInfo[] {
  return scannedSongs.map((song, index) => {
    const exactMatch = existingSongs.find(existing => 
      existing.title.toLowerCase() === song.title.toLowerCase() &&
      existing.artist.toLowerCase() === song.artist.toLowerCase()
    );
    
    if (exactMatch) {
      return { index, song, existingSong: exactMatch, matchType: 'exact' };
    }
    
    const similarMatch = existingSongs.find(existing => 
      existing.title.toLowerCase() === song.title.toLowerCase() ||
      existing.artist.toLowerCase() === song.artist.toLowerCase()
    );
    
    if (similarMatch) {
      return { index, song, existingSong: similarMatch, matchType: 'similar' };
    }
    
    return { index, song, existingSong: null as unknown as Song, matchType: 'none' };
  });
}

export function ImportScreen({ onImport, onCancel }: ImportScreenProps) {
  const [importType, setImportType] = useState<'ultrastar' | 'folder'>('ultrastar');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<{ stage: string; progress: number; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Files
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [ultrastarFile, setUltrastarFile] = useState<File | null>(null);
  
  // URLs
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [videoUrl, setVideoUrl] = useState<string>('');
  
  // Metadata
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [useVideoAudio, setUseVideoAudio] = useState(false);
  
  // Preview
  const [previewSong, setPreviewSong] = useState<Song | null>(null);
  
  // Folder scan results
  const [scannedSongs, setScannedSongs] = useState<ScannedSong[]>([]);
  const [selectedScanned, setSelectedScanned] = useState<Set<number>>(new Set());
  const [scanErrors, setScanErrors] = useState<string[]>([]);
  
  // Duplicate detection
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  
  // Existing songs for duplicate check
  const existingSongs = useMemo(() => getAllSongs(), []);
  
  // File input refs
  const audioInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const ultrastarInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Parse UltraStar file
  const parseUltrastarFile = async (file: File) => {
    try {
      const text = await file.text();
      const ultraStar = parseUltraStarTxt(text);
      
      setTitle(ultraStar.title);
      setArtist(ultraStar.artist);
    } catch (err) {
      setError('Failed to parse UltraStar file: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  // Handle file selection
  const handleFileSelect = useCallback((type: 'audio' | 'video' | 'ultrastar', file: File) => {
    setError(null);
    setPreviewSong(null);
    
    switch (type) {
      case 'audio':
        setAudioFile(file);
        const audioObjUrl = URL.createObjectURL(file);
        setAudioUrl(audioObjUrl);
        if (!title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
        }
        break;
      case 'video':
        setVideoFile(file);
        const videoObjUrl = URL.createObjectURL(file);
        setVideoUrl(videoObjUrl);
        if (!audioFile && !title) {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
          setUseVideoAudio(true);
        }
        break;
      case 'ultrastar':
        setUltrastarFile(file);
        parseUltrastarFile(file);
        break;
    }
  }, [title, audioFile]);

  // Process UltraStar import
  const processUltrastarImport = async () => {
    if (!ultrastarFile) {
      setError('Please provide an UltraStar txt file');
      return;
    }
    
    if (!audioFile && !videoFile) {
      setError('Please provide an audio or video file');
      return;
    }
    
    setIsProcessing(true);
    setProgress({ stage: 'loading', progress: 0, message: 'Processing UltraStar import...' });
    
    try {
      const text = await ultrastarFile.text();
      const ultraStar = parseUltraStarTxt(text);
      
      const finalAudioUrl = audioUrl || (useVideoAudio ? videoUrl : '');
      
      const song = convertUltraStarToSong(ultraStar, finalAudioUrl, videoUrl || undefined);
      
      if (title && title !== ultraStar.title) song.title = title;
      if (artist && artist !== ultraStar.artist) song.artist = artist;
      
      if (useVideoAudio && videoFile && !audioFile) {
        song.hasEmbeddedAudio = true;
        song.audioUrl = videoUrl;
      }
      
      setProgress({ stage: 'processing', progress: 50, message: 'Storing media files...' });
      
      try {
        // Store TXT file content for on-demand lyrics loading
        if (ultrastarFile) {
          const txtContent = await ultrastarFile.text();
          if (txtContent && txtContent.length > 0) {
            const txtBlob = new Blob([txtContent], { type: 'text/plain' });
            await storeMedia(song.id, 'txt', txtBlob);
            song.storedTxt = true;
            console.log('[Import] Cached TXT content in IndexedDB');
          }
        }
        
        // For single UltraStar imports, store files in AppData (small scale is acceptable)
        // For large library imports, use folder scan which stores only paths
        const { storeSongFiles, isTauri } = await import('@/lib/tauri-file-storage');
        const { generateSongFolderName } = await import('@/lib/tauri-file-storage');
        
        if (isTauri() && (audioFile || videoFile)) {
          const songFolder = generateSongFolderName(song.title, song.artist);
          const storedPaths = await storeSongFiles(songFolder, {
            audio: audioFile || undefined,
            video: videoFile || undefined,
            txt: ultrastarFile || undefined,
            cover: undefined,
          });
          
          // Store relative paths for later loading
          if (storedPaths.audioPath) song.relativeAudioPath = storedPaths.audioPath;
          if (storedPaths.videoPath) song.relativeVideoPath = storedPaths.videoPath;
          if (storedPaths.txtPath) song.relativeTxtPath = storedPaths.txtPath;
          
          console.log('[Import] Stored files in AppData:', storedPaths);
        }
      } catch (mediaErr) {
        console.warn('[Import] Failed to store media:', mediaErr);
      }
      
      setPreviewSong(song);
      setProgress({ stage: 'complete', progress: 100, message: 'Import complete!' });
    } catch (err) {
      setError('Failed to import: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setProgress({ stage: 'error', progress: 0, message: 'Import failed' });
    }
    
    setIsProcessing(false);
  };

  // Scan folder
  const handleScanFolder = async () => {
    setIsProcessing(true);
    setError(null);
    setScannedSongs([]);
    setScanErrors([]);
    setDuplicates([]);
    setProgress({ stage: 'loading', progress: 0, message: 'Scanning folder...' });
    
    try {
      let result;
      
      if (isFileSystemAccessSupported()) {
        result = await scanFolderWithPicker();
      } else if (folderInputRef.current?.files?.length) {
        result = await scanFilesFromFileList(folderInputRef.current.files);
      } else {
        setError('Folder scanning not supported. Please use Chrome or Edge browser.');
        setIsProcessing(false);
        return;
      }
      
      setScannedSongs(result.songs);
      setScanErrors(result.errors);
      
      setProgress({ stage: 'processing', progress: 90, message: 'Checking for duplicates...' });
      const duplicateResults = findDuplicates(result.songs, existingSongs);
      setDuplicates(duplicateResults);
      
      const nonDuplicateIndexes = duplicateResults
        .filter(d => d.matchType === 'none')
        .map(d => d.index);
      setSelectedScanned(new Set(nonDuplicateIndexes));
      
      setProgress({ 
        stage: 'complete', 
        progress: 100, 
        message: `Found ${result.songs.length} songs${result.errors.length ? ` (${result.errors.length} errors)` : ''}` 
      });
    } catch (err) {
      setError('Failed to scan folder: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
    
    setIsProcessing(false);
  };

  // Import selected scanned songs
  const importSelectedScanned = async () => {
    if (selectedScanned.size === 0) {
      setError('No songs selected');
      return;
    }
    
    setIsProcessing(true);
    setProgress({ stage: 'loading', progress: 0, message: 'Importing songs...' });
    
    const songsToImport: Song[] = [];
    const selectedArray = Array.from(selectedScanned);
    
    for (let i = 0; i < selectedArray.length; i++) {
      const index = selectedArray[i];
      const scanned = scannedSongs[index];
      
      try {
        // convertScannedSongToSong already stores all media files in IndexedDB
        const song = await convertScannedSongToSong(scanned);
        songsToImport.push(song);
        
        setProgress({ 
          stage: 'processing', 
          progress: ((i + 1) / selectedArray.length) * 100, 
          message: `Importing ${i + 1}/${selectedArray.length}: ${scanned.title}` 
        });
      } catch (err) {
        setScanErrors(prev => [...prev, `Failed to import ${scanned.title}: ${(err as Error).message}`]);
      }
    }
    
    if (songsToImport.length > 0) {
      addSongs(songsToImport);
    }
    
    setProgress({ 
      stage: 'complete', 
      progress: 100, 
      message: `Imported ${songsToImport.length} songs!` 
    });
    
    setIsProcessing(false);
    
    if (songsToImport.length > 0) {
      setTimeout(() => {
        onImport(songsToImport[0]);
      }, 1500);
    }
  };

  // Confirm import for single song
  const confirmImport = () => {
    if (previewSong) {
      addSong(previewSong);
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
    <div className="space-y-6">
      <Tabs value={importType} onValueChange={(v) => setImportType(v as typeof importType)}>
        <TabsList className="mb-6">
          <TabsTrigger value="ultrastar">UltraStar Import</TabsTrigger>
          <TabsTrigger value="folder">Folder Scan</TabsTrigger>
        </TabsList>

        {/* UltraStar Import Tab */}
        <TabsContent value="ultrastar">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>UltraStar File *</CardTitle>
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

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Audio File</CardTitle>
                <CardDescription>MP3, OGG, WAV, M4A (optional if video has audio)</CardDescription>
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

            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle>Video File</CardTitle>
                <CardDescription>MP4, WebM, MKV - can include audio</CardDescription>
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
                      {!audioFile && (
                        <label className="flex items-center gap-2 mt-2 text-sm">
                          <input
                            type="checkbox"
                            checked={useVideoAudio}
                            onChange={(e) => setUseVideoAudio(e.target.checked)}
                            className="rounded"
                          />
                          Use video's audio
                        </label>
                      )}
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
        </TabsContent>

        {/* Folder Scan Tab */}
        <TabsContent value="folder">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Scan Folder for Songs</CardTitle>
              <CardDescription>
                Select a folder containing karaoke songs (audio/video + txt files)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-white/60 mb-4">
                  Each subfolder should contain song files (audio, video, txt, cover)
                </p>
                
                {isFileSystemAccessSupported() ? (
                  <Button 
                    onClick={handleScanFolder}
                    disabled={isProcessing}
                    className="bg-gradient-to-r from-cyan-500 to-purple-500"
                  >
                    {isProcessing ? 'Scanning...' : 'Select Folder'}
                  </Button>
                ) : (
                  <>
                    <Button 
                      onClick={() => folderInputRef.current?.click()}
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-cyan-500 to-purple-500"
                    >
                      {isProcessing ? 'Scanning...' : 'Select Folder'}
                    </Button>
                    <input
                      ref={folderInputRef}
                      type="file"
                      // @ts-ignore
                      webkitdirectory="true"
                      directory=""
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.length) {
                          setIsProcessing(true);
                          scanFilesFromFileList(e.target.files).then(result => {
                            setScannedSongs(result.songs);
                            setScanErrors(result.errors);
                            setSelectedScanned(new Set(result.songs.map((_, i) => i)));
                            setIsProcessing(false);
                          });
                        }
                      }}
                    />
                  </>
                )}
              </div>

              {scannedSongs.length > 0 && (
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">
                      Found {scannedSongs.length} songs
                      {duplicates.filter(d => d.matchType === 'exact').length > 0 && (
                        <span className="ml-2 text-yellow-400 text-sm">
                          ({duplicates.filter(d => d.matchType === 'exact').length} duplicates)
                        </span>
                      )}
                    </h3>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const nonDupIndexes = duplicates
                            .filter(d => d.matchType === 'none')
                            .map(d => d.index);
                          setSelectedScanned(new Set(nonDupIndexes));
                        }}
                        className="border-white/20 text-white"
                      >
                        Select New Only
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedScanned(new Set(scannedSongs.map((_, i) => i)))}
                        className="border-white/20 text-white"
                      >
                        Select All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedScanned(new Set())}
                        className="border-white/20 text-white"
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  
                  {duplicates.filter(d => d.matchType === 'exact').length > 0 && (
                    <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                      <p className="text-yellow-400 text-sm">
                        ⚠️ {duplicates.filter(d => d.matchType === 'exact').length} duplicate song(s) detected. 
                        They have been deselected by default.
                      </p>
                    </div>
                  )}
                  
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {scannedSongs.map((song, index) => {
                      const dupInfo = duplicates[index];
                      const isDuplicate = dupInfo?.matchType === 'exact';
                      const isSimilar = dupInfo?.matchType === 'similar';
                      
                      return (
                        <label
                          key={index}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isDuplicate 
                              ? 'bg-yellow-500/10 border border-yellow-500/30 hover:bg-yellow-500/20' 
                              : isSimilar
                              ? 'bg-orange-500/10 border border-orange-500/30 hover:bg-orange-500/20'
                              : 'bg-white/5 hover:bg-white/10'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedScanned.has(index)}
                            onChange={(e) => {
                              const newSet = new Set(selectedScanned);
                              if (e.target.checked) {
                                newSet.add(index);
                              } else {
                                newSet.delete(index);
                              }
                              setSelectedScanned(newSet);
                            }}
                            className="rounded"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium truncate">{song.title}</p>
                              {isDuplicate && (
                                <Badge className="bg-yellow-500 text-xs">Duplicate</Badge>
                              )}
                              {isSimilar && (
                                <Badge className="bg-orange-500 text-xs">Similar</Badge>
                              )}
                            </div>
                            <p className="text-sm text-white/60 truncate">{song.artist}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            {song.audioFile && <Badge variant="outline" className="text-xs">Audio</Badge>}
                            {song.videoFile && <Badge variant="outline" className="text-xs">Video</Badge>}
                            {song.txtFile && <Badge variant="outline" className="text-xs">TXT</Badge>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {scanErrors.length > 0 && (
                <div className="mt-4 p-4 bg-red-500/10 rounded-lg">
                  <p className="text-red-400 font-medium mb-2">Errors:</p>
                  <ul className="text-sm text-red-300 list-disc list-inside">
                    {scanErrors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {scanErrors.length > 5 && <li>...and {scanErrors.length - 5} more</li>}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {progress && progress.stage !== 'complete' && (
        <Card className="bg-white/5 border-white/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-4">
              <Progress value={progress.progress} className="flex-1" />
              <span className="text-sm text-white/60">{progress.message}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-4 text-red-400">{error}</CardContent>
        </Card>
      )}

      {previewSong && (
        <Card className="bg-white/5 border-white/10">
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
              {previewSong.hasEmbeddedAudio && (
                <Badge className="bg-purple-500">Video Audio</Badge>
              )}
            </div>
            {audioUrl && (
              <audio controls src={audioUrl} className="w-full mt-4" />
            )}
            {videoUrl && (
              <video src={videoUrl} controls className="w-full h-48 rounded-lg object-cover mt-4" />
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end gap-4">
        {importType === 'ultrastar' && (
          <Button 
            onClick={processUltrastarImport}
            disabled={!ultrastarFile || (!audioFile && !videoFile) || isProcessing}
            className="bg-gradient-to-r from-cyan-500 to-purple-500"
          >
            {isProcessing ? 'Processing...' : 'Process'}
          </Button>
        )}
        {importType === 'folder' && scannedSongs.length > 0 && (
          <Button 
            onClick={importSelectedScanned}
            disabled={selectedScanned.size === 0 || isProcessing}
            className="bg-gradient-to-r from-cyan-500 to-purple-500"
          >
            Import {selectedScanned.size} Songs
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
