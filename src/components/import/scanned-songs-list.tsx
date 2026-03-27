'use client';

import { Badge } from '@/components/ui/badge';
import { ScannedSong } from '@/lib/parsers/folder-scanner';

interface DuplicateInfo {
  index: number;
  song: ScannedSong;
  existingSong: { title: string; artist: string } | null;
  matchType: 'exact' | 'similar' | 'none';
}

interface ScannedSongsListProps {
  scannedSongs: ScannedSong[];
  duplicates: DuplicateInfo[];
  selectedScanned: Set<number>;
  onSelectionChange: (newSelection: Set<number>) => void;
}

export function ScannedSongsList({
  scannedSongs,
  duplicates,
  selectedScanned,
  onSelectionChange,
}: ScannedSongsListProps) {
  if (scannedSongs.length === 0) return null;

  const exactDuplicatesCount = duplicates.filter((d) => d.matchType === 'exact').length;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">
          Found {scannedSongs.length} songs
          {exactDuplicatesCount > 0 && (
            <span className="ml-2 text-yellow-400 text-sm">
              ({exactDuplicatesCount} duplicates)
            </span>
          )}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => {
              const nonDupIndexes = duplicates
                .filter((d) => d.matchType === 'none')
                .map((d) => d.index);
              onSelectionChange(new Set(nonDupIndexes));
            }}
            className="px-3 py-1 text-sm border border-white/20 rounded hover:bg-white/10"
          >
            Select New Only
          </button>
          <button
            onClick={() => onSelectionChange(new Set(scannedSongs.map((_, i) => i)))}
            className="px-3 py-1 text-sm border border-white/20 rounded hover:bg-white/10"
          >
            Select All
          </button>
          <button
            onClick={() => onSelectionChange(new Set())}
            className="px-3 py-1 text-sm border border-white/20 rounded hover:bg-white/10"
          >
            Deselect All
          </button>
        </div>
      </div>

      {exactDuplicatesCount > 0 && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-400 text-sm">
            ⚠️ {exactDuplicatesCount} duplicate song(s) detected. They have been
            deselected by default.
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
                  onSelectionChange(newSet);
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
                {song.audioFile && (
                  <Badge variant="outline" className="text-xs">
                    Audio
                  </Badge>
                )}
                {song.videoFile && (
                  <Badge variant="outline" className="text-xs">
                    Video
                  </Badge>
                )}
                {song.txtFile && (
                  <Badge variant="outline" className="text-xs">
                    TXT
                  </Badge>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
