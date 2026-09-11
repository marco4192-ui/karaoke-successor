import { describe, it, expect } from 'vitest';
import {
  detectVideoPlatform,
  isBilibiliUrl,
  extractBilibiliRef,
  isNiconicoUrl,
  extractNiconicoId,
  isVkVideoUrl,
  extractVkVideoRef,
  isRutubeUrl,
  extractRutubeId,
  platformAdLabel,
} from '@/lib/url-utils';

describe('url-utils — streaming platform detection (Rutube / VK / Bilibili / Niconico)', () => {
  describe('detectVideoPlatform', () => {
    it('detects all four new platforms', () => {
      expect(detectVideoPlatform('https://www.bilibili.com/video/BV1Kx411q7Eg')).toBe('bilibili');
      expect(detectVideoPlatform('https://www.nicovideo.jp/watch/sm9')).toBe('nicovideo');
      expect(detectVideoPlatform('https://vk.com/video_ext.php?oid=-1&id=2&hash=abc')).toBe('vk');
      expect(detectVideoPlatform('https://rutube.ru/video/9e4cd81a6b2566e9d949881dbb53905e/')).toBe('rutube');
    });

    it('still detects the legacy platforms', () => {
      expect(detectVideoPlatform('https://www.youtube.com/watch?v=abc')).toBe('youtube');
      expect(detectVideoPlatform('https://dai.ly/x84sh87')).toBe('dailymotion');
      expect(detectVideoPlatform('https://vimeo.com/123456789')).toBe('vimeo');
    });

    it('returns null for unknown and lookalike domains', () => {
      expect(detectVideoPlatform('https://example.com/video.mp4')).toBeNull();
      expect(detectVideoPlatform('https://notbilibili.com/video/BV1Kx411q7Eg')).toBeNull();
      expect(detectVideoPlatform('https://vk.com/wall-123')).toBeNull(); // VK but not a video path
      expect(detectVideoPlatform(undefined)).toBeNull();
      expect(detectVideoPlatform('')).toBeNull();
    });
  });

  describe('Bilibili', () => {
    it('isBilibiliUrl accepts watch pages and the embed player', () => {
      expect(isBilibiliUrl('https://www.bilibili.com/video/BV1Kx411q7Eg')).toBe(true);
      expect(isBilibiliUrl('https://player.bilibili.com/player.html?bvid=BV1Kx411q7Eg')).toBe(true);
      expect(isBilibiliUrl('https://m.bilibili.com/video/BV1Kx411q7Eg')).toBe(true);
      expect(isBilibiliUrl('https://notbilibili.com/video/BV1Kx411q7Eg')).toBe(false);
    });

    it('extracts bvid from watch URLs', () => {
      expect(extractBilibiliRef('https://www.bilibili.com/video/BV1Kx411q7Eg')).toEqual({
        bvid: 'BV1Kx411q7Eg',
        page: 1,
      });
    });

    it('extracts the page (P) query param', () => {
      const ref = extractBilibiliRef('https://www.bilibili.com/video/BV1Kx411q7Eg?p=3');
      expect(ref?.bvid).toBe('BV1Kx411q7Eg');
      expect(ref?.page).toBe(3);
    });

    it('extracts legacy av ids', () => {
      const ref = extractBilibiliRef('https://www.bilibili.com/video/av84267566');
      expect(ref?.aid).toBe('84267566');
      expect(ref?.page).toBe(1);
    });

    it('parses player.bilibili.com embed URLs with all params', () => {
      const ref = extractBilibiliRef('https://player.bilibili.com/player.html?bvid=BV1Kx411q7Eg&aid=84267566&cid=20681553&page=2');
      expect(ref?.bvid).toBe('BV1Kx411q7Eg');
      expect(ref?.aid).toBe('84267566');
      expect(ref?.cid).toBe('20681553');
      expect(ref?.page).toBe(2);
    });

    it('returns null for URLs without an id', () => {
      expect(extractBilibiliRef('https://www.bilibili.com/bangumi')).toBeNull();
    });
  });

  describe('Niconico', () => {
    it('isNiconicoUrl accepts watch and embed pages', () => {
      expect(isNiconicoUrl('https://www.nicovideo.jp/watch/sm9')).toBe(true);
      expect(isNiconicoUrl('https://embed.nicovideo.jp/watch/sm9?jsapi=1')).toBe(true);
      expect(isNiconicoUrl('https://notnicovideo.jp/watch/sm9')).toBe(false);
    });

    it('extracts sm / so / nm ids', () => {
      expect(extractNiconicoId('https://www.nicovideo.jp/watch/sm9')).toBe('sm9');
      expect(extractNiconicoId('https://embed.nicovideo.jp/watch/so35384944?jsapi=1&playerId=x')).toBe('so35384944');
      expect(extractNiconicoId('https://www.nicovideo.jp/watch/nm12345')).toBe('nm12345');
      expect(extractNiconicoId('https://www.nicovideo.jp/mylist/123')).toBeNull();
    });
  });

  describe('VK Video', () => {
    it('isVkVideoUrl accepts video pages and embeds on both domains', () => {
      expect(isVkVideoUrl('https://vk.com/video-22822305_456239528')).toBe(true);
      expect(isVkVideoUrl('https://vkvideo.ru/video-22822305_456239528')).toBe(true);
      expect(isVkVideoUrl('https://vk.com/video_ext.php?oid=-22822305&id=456239528&hash=abc')).toBe(true);
      expect(isVkVideoUrl('https://m.vk.com/video-22822305_456239528')).toBe(true);
      expect(isVkVideoUrl('https://vk.com/wall-22822305')).toBe(false);
      expect(isVkVideoUrl('https://evil.com/video_ext.php?oid=1')).toBe(false);
    });

    it('extracts oid/id/hash from video_ext.php Export URLs', () => {
      const ref = extractVkVideoRef('https://vk.com/video_ext.php?oid=-22822305&id=456239528&hash=e592e431c98bc184&js_api=1');
      expect(ref).toEqual({
        oid: '-22822305',
        videoId: '456239528',
        hash: 'e592e431c98bc184',
        list: undefined,
      });
    });

    it('extracts ids from watch URLs (hash missing)', () => {
      const ref = extractVkVideoRef('https://vkvideo.ru/video-22822305_456239528');
      expect(ref?.oid).toBe('-22822305');
      expect(ref?.videoId).toBe('456239528');
      expect(ref?.hash).toBeUndefined();
    });

    it('extracts positive (user) owner ids', () => {
      const ref = extractVkVideoRef('https://vk.com/video12345_67890');
      expect(ref?.oid).toBe('12345');
      expect(ref?.videoId).toBe('67890');
    });

    it('returns null for non-video VK paths', () => {
      expect(extractVkVideoRef('https://vk.com/feed')).toBeNull();
    });
  });

  describe('Rutube', () => {
    it('isRutubeUrl accepts video and embed pages', () => {
      expect(isRutubeUrl('https://rutube.ru/video/9e4cd81a6b2566e9d949881dbb53905e/')).toBe(true);
      expect(isRutubeUrl('https://rutube.ru/play/embed/9e4cd81a6b2566e9d949881dbb53905e/')).toBe(true);
      expect(isRutubeUrl('https://notrutube.ru/video/abc/')).toBe(false);
    });

    it('extracts the hex video id from both URL shapes', () => {
      expect(extractRutubeId('https://rutube.ru/video/9e4cd81a6b2566e9d949881dbb53905e/')).toBe('9e4cd81a6b2566e9d949881dbb53905e');
      expect(extractRutubeId('https://rutube.ru/play/embed/9e4cd81a6b2566e9d949881dbb53905e/?t=3')).toBe('9e4cd81a6b2566e9d949881dbb53905e');
      expect(extractRutubeId('https://rutube.ru/channels/123')).toBeNull();
    });
  });

  describe('platformAdLabel', () => {
    it('labels all platforms', () => {
      expect(platformAdLabel('rutube')).toBe('rutube.ru');
      expect(platformAdLabel('vk')).toBe('vk.com');
      expect(platformAdLabel('bilibili')).toBe('bilibili.com');
      expect(platformAdLabel('nicovideo')).toBe('nicovideo.jp');
      expect(platformAdLabel(null)).toBe('');
    });
  });
});
