#!/usr/bin/env python3
"""R10 byte-identity verifier: checks that every logic/JSX block moved out of
the two jukebox monoliths appears VERBATIM (same indentation, same comments,
same dep arrays) in its new module. Exit != 0 on any mismatch."""
import sys

ORIG_HOOK = "/home/z/my-project/tmp-analysis/r10-use-jukebox-ORIG.ts"
ORIG_VIEW = "/home/z/my-project/tmp-analysis/r10-jukebox-player-view-ORIG.tsx"
BASE = "/home/z/my-project/src/components/screens/jukebox/"

def lines(path):
    with open(path, encoding="utf-8") as f:
        return f.read().split("\n")

orig_hook = lines(ORIG_HOOK)
orig_view = lines(ORIG_VIEW)

def block(src, a, b):
    """1-based inclusive line range → text block."""
    return "\n".join(src[a-1:b])

new_files = {}
def fget(name):
    if name not in new_files:
        new_files[name] = open(BASE + name, encoding="utf-8").read()
    return new_files[name]

# (source_lines, start, end, target_file, label)
hook_blocks = [
    (131, 137, "hooks/use-jukebox-library.ts", "loadSongs effect"),
    (141, 161, "hooks/use-jukebox-library.ts", "genres/artists/eras/years memos"),
    (34, 55, "hooks/use-jukebox-filters.ts", "filter/config states + poolChangeCounter"),
    (165, 184, "hooks/use-jukebox-filters.ts", "deferredSearchQuery + searchSuggestions"),
    (188, 245, "hooks/use-jukebox-filters.ts", "filteredSongs memo"),
    (277, 280, "hooks/use-jukebox-queue.ts", "prepareSong"),
    (284, 350, "hooks/use-jukebox-queue.ts", "generatePlaylist"),
    (352, 381, "hooks/use-jukebox-queue.ts", "insertManualSong + ref assign"),
    (387, 413, "hooks/use-jukebox-queue.ts", "insertSongIntoQueue"),
    (415, 458, "hooks/use-jukebox-queue.ts", "addVideoToQueue + addVideoToQueueRef"),
    (460, 467, "hooks/use-jukebox-queue.ts", "addVideoListToQueue"),
    (471, 524, "hooks/use-jukebox-queue.ts", "addSongToQueue + addSongToQueueRef"),
    (526, 535, "hooks/use-jukebox-queue.ts", "addSongsToQueue"),
    (537, 555, "hooks/use-jukebox-queue.ts", "removeQueueVideo"),
    (557, 606, "hooks/use-jukebox-queue.ts", "enqueueLibraryPlaylist"),
    (608, 617, "hooks/use-jukebox-queue.ts", "video-add event effect"),
    (619, 654, "hooks/use-jukebox-queue.ts", "wishlist polling effect"),
    (1100, 1120, "hooks/use-jukebox-queue.ts", "#17 live shuffle toggle"),
    (1124, 1131, "hooks/use-jukebox-queue.ts", "N10 exportPlaylist"),
    (658, 705, "hooks/use-jukebox-playback.ts", "playNext + playNextRef assign"),
    (709, 739, "hooks/use-jukebox-playback.ts", "playPrevious"),
    (743, 764, "hooks/use-jukebox-playback.ts", "handleMediaEnd"),
    (768, 798, "hooks/use-jukebox-playback.ts", "startJukebox/stopJukebox"),
    (800, 814, "hooks/use-jukebox-playback.ts", "N4 timer effect"),
    (816, 824, "hooks/use-jukebox-playback.ts", "jukebox:start listener"),
    (826, 834, "hooks/use-jukebox-playback.ts", "pool-changed listener"),
    (836, 863, "hooks/use-jukebox-fullscreen.ts", "fullscreen: toggle + 2 effects"),
    (865, 894, "hooks/use-jukebox-media.ts", "togglePlayPause + platformPaused reset"),
    (896, 909, "hooks/use-jukebox-media.ts", "F3 toggleMute"),
    (911, 926, "hooks/use-jukebox-media.ts", "F1 seekTo"),
    (928, 962, "hooks/use-jukebox-media.ts", "VOLUME: loudness + apply effects"),
    (964, 1000, "hooks/use-jukebox-media.ts", "#4 robust auto-play"),
    (1002, 1037, "hooks/use-jukebox-media.ts", "#12 time tracking"),
    (1039, 1072, "hooks/use-jukebox-lyrics.ts", "F5 energy saving + lyrics tracking"),
    (1074, 1096, "hooks/use-jukebox-cleanup.ts", "cleanup on unmount"),
    (1133, 1154, "hooks/use-jukebox-sync.ts", "companion remote events"),
    (1156, 1167, "hooks/use-jukebox-sync.ts", "youtube time → state time"),
]

view_blocks = [
    (29, 54, "player/format-utils.ts", "duration/timer formatters"),
    (58, 307, "player/jukebox-platform-video.tsx", "platform video constants + component"),
    (311, 403, "player/pool-selector.tsx", "PoolSelector"),
    (407, 456, "player/fullscreen-header.tsx", "FullscreenHeader"),
    (460, 489, "player/lyrics-overlay.tsx", "LyricsOverlay"),
    (493, 537, "player/progress-bar.tsx", "ProgressBar"),
    (541, 600, "player/volume-control.tsx", "VolumeControl"),
    (604, 670, "player/video-overlay.tsx", "VideoOverlay"),
    (674, 789, "player/controls-bar.tsx", "ControlsBar"),
    (793, 1002, "player/playlist-sidebar.tsx", "PlaylistSidebar"),
    (1006, 1073, "player/song-display.tsx", "SongDisplay"),
    (1081, 1144, "jukebox-player-view.tsx", "JukeboxPlayerView JSX body"),
]

def run(src, blocks, kind):
    fails = 0
    export_only = 0
    for (a, b, target, label) in blocks:
        text = block(src, a, b)
        if text in fget(target):
            print(f"  OK   {kind} {a}-{b} {label} -> {target}")
        else:
            # Allowed, documented delta: the moved top-level declaration(s)
            # gained an `export ` keyword — the rest must stay byte-identical.
            # Try substituting line-initial `function` lines (all of them).
            tl = text.split("\n")
            cand = "\n".join(
                ("export " + ln) if ln.startswith("function ") else ln
                for ln in tl
            )
            if cand in fget(target):
                export_only += 1
                n_exp = sum(1 for ln in tl if ln.startswith("function "))
                print(f"  OK*  {kind} {a}-{b} {label} -> {target}  (delta: `export ` keyword on {n_exp} moved declaration(s))")
                continue
            fails += 1
            print(f"  FAIL {kind} {a}-{b} {label} -> {target}")
            tgt_join = fget(target)
            first = text.split("\n")[0]
            if first in tgt_join:
                # find where it diverges
                idx = tgt_join.index(first)
                seg = tgt_join[idx:idx+len(text)]
                if seg:
                    for ln, (o, n) in enumerate(zip(text.split("\n"), seg.split("\n"))):
                        if o != n:
                            print(f"       diverges at block line {ln+1}:")
                            print(f"       ORIG: {o!r}")
                            print(f"       NEW : {n!r}")
                            break
            else:
                print(f"       first line not found: {first!r}")
    print(f"  ({export_only} blocks with documented export-keyword-only delta)")
    return fails

print("use-jukebox.ts blocks:")
f1 = run(orig_hook, hook_blocks, "hook")
print("jukebox-player-view.tsx blocks:")
f2 = run(orig_view, view_blocks, "view")

total = len(hook_blocks) + len(view_blocks)
print(f"\n{total - f1 - f2}/{total} blocks byte-identical, {f1+f2} failures")
sys.exit(1 if (f1 + f2) else 0)
