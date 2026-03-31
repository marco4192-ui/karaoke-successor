'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/lib/game/store';
import { getAllSongs } from '@/lib/game/song-library';
import { PerformanceDisplay } from '@/components/game/game-enhancements';
import { 
  MusicIcon, 
  PlayIcon, 
  PartyIcon, 
  MicIcon, 
  PhoneIcon,
  UserIcon
} from '@/components/icons';
import type { Screen } from '@/types/screens';

interface HomeScreenProps {
  onNavigate: (screen: Screen) => void;
}

export function HomeScreen({ onNavigate }: HomeScreenProps) {
  const { profiles, activeProfileId, setActiveProfile } = useGameStore();
  // Track if component is mounted (to avoid hydration mismatch)
  const [isMounted, setIsMounted] = useState(false);
  
  // Only run on client after mount
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Get song count from library - only on client
  const songCount = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    return getAllSongs().length;
  }, []);
  
  return (
    <div className="w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500 mb-6 shadow-2xl shadow-purple-500/30">
          <MusicIcon className="w-14 h-14 text-white" />
        </div>
        <h1 className="text-5xl font-black mb-4 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
          Karaoke Successor
        </h1>
        <p className="text-xl text-white/60 mb-8 max-w-2xl mx-auto">
          The ultimate karaoke experience. Sing your heart out with real-time pitch detection, 
          compete with friends, and enjoy party games!
        </p>
        
        <div className="flex items-center justify-center gap-4">
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white px-8 py-6 text-lg"
            onClick={() => onNavigate('library')}
          >
            <PlayIcon className="w-5 h-5 mr-2" /> Start Singing
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="bg-transparent hover:bg-white/10 text-white px-8 py-6 text-lg border-2 border-pink-400/50"
            onClick={() => onNavigate('party')}
          >
            <PartyIcon className="w-5 h-5 mr-2" /> Party Mode
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-cyan-400">{isMounted ? songCount : 0}</div>
            <div className="text-white/60 text-sm">Songs Available</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-purple-400">{isMounted ? profiles.length : 0}</div>
            <div className="text-white/60 text-sm">Characters Created</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-pink-400">5</div>
            <div className="text-white/60 text-sm">Party Games</div>
          </CardContent>
        </Card>
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="pt-6">
            <div className="text-3xl font-bold text-yellow-400">3</div>
            <div className="text-white/60 text-sm">Difficulty Levels</div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Stats */}
      <Card className="bg-white/5 border-white/10 mb-8">
        <CardContent className="pt-6">
          {isMounted ? (
            <PerformanceDisplay />
          ) : (
            <div className="text-center text-white/40 py-4">Loading stats...</div>
          )}
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <Card className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/30">
          <CardHeader>
            <CardTitle className="text-cyan-400 flex items-center gap-2">
              <MicIcon className="w-6 h-6" /> Real-Time Pitch Detection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70">
              Advanced YIN algorithm detects your singing pitch in real-time with high accuracy. 
              See your voice visualized as you sing!
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30">
          <CardHeader>
            <CardTitle className="text-purple-400 flex items-center gap-2">
              <PartyIcon className="w-6 h-6" /> Party Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70">
              Pass the Mic, Medley Contest, Missing Words, Duel Mode, and Blind Karaoke - 
              endless entertainment for your parties!
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 border-orange-500/30">
          <CardHeader>
            <CardTitle className="text-orange-400 flex items-center gap-2">
              <PhoneIcon className="w-6 h-6" /> Mobile Integration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/70">
              Use your smartphone as a microphone or remote control! 
              Simply scan the QR code to connect.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Select Profile */}
      {isMounted && profiles.length > 0 && (
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Select Your Character</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {profiles.filter(p => p.isActive !== false).map((profile) => (
                <button
                  key={profile.id}
                  onClick={() => setActiveProfile(profile.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeProfileId === profile.id 
                      ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white' 
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: profile.color }}
                  >
                    {profile.avatar ? (
                      <img src={profile.avatar} alt={profile.name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      profile.name[0].toUpperCase()
                    )}
                  </div>
                  <span className="font-medium">{profile.name}</span>
                </button>
              ))}
              <button
                onClick={() => onNavigate('character')}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-dashed border-white/20 hover:bg-white/10 transition-all"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white/60">
                  +
                </div>
                <span className="text-white/60">Create New</span>
              </button>
            </div>
            {profiles.filter(p => p.isActive === false).length > 0 && (
              <p className="text-xs text-white/40 mt-3">
                {profiles.filter(p => p.isActive === false).length} inactive profile(s) hidden. Enable them in Character settings.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
