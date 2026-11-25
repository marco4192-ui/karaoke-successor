/**
 * Media presence predicates — the "what does this song's UltraStar txt
 * actually define?" checks shared by the editor library filters
 * ("No Video" / "No Cover" / "No Background") and the Metadata Studio
 * missing-count badges.
 *
 * Field semantics (mirrors the parser + video-classification):
 *   • Video: the #VIDEO tag (videoFile), any streaming-platform URL field,
 *     a direct video URL (videoUrl / http videoBackground) or a resolved
 *     local video file (relativeVideoPath). A live blob: URL counts too —
 *     it is the runtime handle of a real video file.
 *   • Cover: #COVER tag (coverFile), the resolved/loaded cover image
 *     (coverImage — may be a restored blob:) or a local cover file
 *     (relativeCoverPath).
 *   • Background: #BACKGROUND tag (backgroundFile / backgroundImage /
 *     relativeBackgroundPath). A #BACKGROUND VIDEO (videoBackground) also
 *     proves the tag exists — such a song has nothing "missing" on the
 *     background axis even though the value renders as a video.
 */

import type { Song } from '@/types/game';

/** True when the song has ANY video source (tag, platform URL or local file). */
export function songHasVideo(song: Song): boolean {
  return Boolean(
    song.videoFile ||
    song.youtubeUrl ||
    song.dailymotionUrl ||
    song.vimeoUrl ||
    song.rutubeUrl ||
    song.vkVideoUrl ||
    song.bilibiliUrl ||
    song.nicovideoUrl ||
    song.videoUrl ||
    song.videoBackground ||
    song.relativeVideoPath
  );
}

/** True when the song has a cover (tag, image URL or local file). */
export function songHasCover(song: Song): boolean {
  return Boolean(
    song.coverImage ||
    song.coverFile ||
    song.relativeCoverPath
  );
}

/** True when the song has a #BACKGROUND definition (image or video). */
export function songHasBackground(song: Song): boolean {
  return Boolean(
    song.backgroundImage ||
    song.backgroundFile ||
    song.relativeBackgroundPath ||
    song.videoBackground
  );
}
