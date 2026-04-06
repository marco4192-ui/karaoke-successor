'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrashIcon, CheckIcon } from '@/components/settings/settings-icons';
import { useGameStore } from '@/lib/game/store';
import type { PlayerProfile } from '@/types/game';

// ===================== TYPES =====================
interface CompanionClient {
  id: string;
  connectionCode: string;
  name: string;
  type: string;
  connected: number;
  lastActivity: number;
  profile: { id: string; name: string; avatar?: string; color: string } | null;
  queueCount: number;
  hasPitch: boolean;
  hasRemoteControl: boolean;
}

interface CompanionListResponse {
  success: boolean;
  clients: CompanionClient[];
  connectedCount: number;
  remoteControl?: { isLocked: boolean; lockedByName: string | null };
}

// ===================== HELPERS =====================
function formatDuration(connectedAt: number): string {
  const diff = Date.now() - connectedAt;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainMin = minutes % 60;
  return `${hours}h ${remainMin}m`;
}

function getLastSeen(lastActivity: number): string {
  const diff = Date.now() - lastActivity;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return 'active';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ago`;
}

// ===================== COMPONENT =====================
export function CompanionListSection() {
  const [companions, setCompanions] = useState<CompanionClient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Get active profiles from store for character assignment dropdown
  const profiles = useGameStore((state) => state.profiles);
  const activeProfiles = profiles.filter((p: PlayerProfile) => p.isActive !== false);

  // Fetch connected companions
  const fetchCompanions = useCallback(async () => {
    try {
      const res = await fetch('/api/mobile?action=clients');
      const data: CompanionListResponse = await res.json();
      if (data.success) {
        setCompanions(data.clients || []);
      }
      setError(null);
    } catch {
      setError('Failed to fetch companions');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll for updates every 3 seconds
  useEffect(() => {
    fetchCompanions();
    const interval = setInterval(fetchCompanions, 3000);
    return () => clearInterval(interval);
  }, [fetchCompanions]);

  // Force refresh counter for lastSeen timestamps
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

  // Kick a companion
  const handleKick = async (companionId: string, companionName: string) => {
    if (!confirm(`Kick "${companionName}"? They will be disconnected and their queue will be cleared.`)) return;
    setKickingId(companionId);
    try {
      const res = await fetch(`/api/mobile?action=kick&kickClientId=${encodeURIComponent(companionId)}`);
      const data = await res.json();
      if (data.success) {
        showSuccess(`"${companionName}" has been kicked`);
        fetchCompanions(); // Immediate refresh
      } else {
        setError(data.message || 'Failed to kick companion');
      }
    } catch {
      setError('Failed to kick companion');
    } finally {
      setKickingId(null);
    }
  };

  // Assign/change character for a companion
  const handleAssignCharacter = async (companionId: string, profile: PlayerProfile | null) => {
    setAssigningId(companionId);
    try {
      const payload = profile
        ? { targetClientId: companionId, profile: { id: profile.id, name: profile.name, avatar: profile.avatar, color: profile.color, createdAt: profile.createdAt } }
        : { targetClientId: companionId, profile: null };

      const res = await fetch('/api/mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'assigncharacter', payload }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(data.message);
        fetchCompanions(); // Immediate refresh
      } else {
        setError(data.message || 'Failed to assign character');
      }
    } catch {
      setError('Failed to assign character');
    } finally {
      setAssigningId(null);
    }
  };

  // Flash success message
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  if (isLoading) {
    return (
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            Connected Companions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-white/40">
            Loading companions...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className={`w-2.5 h-2.5 rounded-full ${companions.length > 0 ? 'bg-green-500' : 'bg-white/30'}`} />
              Connected Companions
              {companions.length > 0 && (
                <Badge className="ml-2 bg-cyan-500/20 text-cyan-400 border-0 text-xs">
                  {companions.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              Manage connected mobile devices and their assigned characters
            </CardDescription>
          </div>
          {companions.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={fetchCompanions}
              className="border-white/20 text-white hover:bg-white/10"
            >
              Refresh
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Success/Error Messages */}
        {successMessage && (
          <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm flex items-center gap-2">
            <CheckIcon className="w-4 h-4" />
            {successMessage}
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
            <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
          </div>
        )}

        {/* No companions connected */}
        {companions.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-white/40">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-lg font-medium text-white/60">No companions connected</p>
            <p className="text-sm mt-1">Companions will appear here when they scan the QR code and connect</p>
          </div>
        )}

        {/* Companion List */}
        {companions.length > 0 && (
          <div className="space-y-3">
            {companions.map((companion) => (
              <CompanionCard
                key={companion.id}
                companion={companion}
                activeProfiles={activeProfiles}
                isKicking={kickingId === companion.id}
                isAssigning={assigningId === companion.id}
                onKick={handleKick}
                onAssignCharacter={handleAssignCharacter}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ===================== COMPANION CARD =====================
interface CompanionCardProps {
  companion: CompanionClient;
  activeProfiles: PlayerProfile[];
  isKicking: boolean;
  isAssigning: boolean;
  onKick: (id: string, name: string) => void;
  onAssignCharacter: (id: string, profile: PlayerProfile | null) => void;
}

function CompanionCard({
  companion,
  activeProfiles,
  isKicking,
  isAssigning,
  onKick,
  onAssignCharacter,
}: CompanionCardProps) {
  const [showCharacterDropdown, setShowCharacterDropdown] = useState(false);
  const companionName = companion.profile?.name || companion.name;
  const companionColor = companion.profile?.color || '#6B7280';

  // Check if current character is used by another companion (to prevent assignment to two companions)
  const assignedProfileIds = new Set<string>(); // We don't have the full list here, so allow any assignment

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors">
      {/* Top Row: Avatar, Name, Code, Status */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: companionColor }}
        >
          {companion.profile?.avatar ? (
            <img src={companion.profile.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            companionName.charAt(0).toUpperCase()
          )}
        </div>

        {/* Name & Code */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-white truncate">{companionName}</span>
            <code className="text-xs bg-white/10 px-1.5 py-0.5 rounded text-cyan-400 font-mono shrink-0">
              {companion.connectionCode}
            </code>
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {/* Connection duration */}
            <span className="text-xs text-white/40">
              Connected: {formatDuration(companion.connected)}
            </span>
            <span className="text-xs text-white/20">|</span>
            <span className="text-xs text-white/40">
              Last seen: {getLastSeen(companion.lastActivity)}
            </span>
          </div>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-1.5 shrink-0">
          {companion.hasPitch && (
            <Badge className="bg-green-500/20 text-green-400 border-0 text-xs px-2">
              Mic Active
            </Badge>
          )}
          {companion.hasRemoteControl && (
            <Badge className="bg-purple-500/20 text-purple-400 border-0 text-xs px-2">
              Remote
            </Badge>
          )}
          {companion.queueCount > 0 && (
            <Badge className="bg-orange-500/20 text-orange-400 border-0 text-xs px-2">
              {companion.queueCount} in queue
            </Badge>
          )}
        </div>
      </div>

      {/* Bottom Row: Character Assignment & Kick */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
        {/* Character Assignment */}
        <div className="relative flex items-center gap-2">
          <span className="text-xs text-white/50">Character:</span>

          {activeProfiles.length === 0 ? (
            <span className="text-xs text-white/30 italic">No characters created yet</span>
          ) : (
            <>
              <button
                onClick={() => setShowCharacterDropdown(!showCharacterDropdown)}
                disabled={isAssigning}
                className="flex items-center gap-1.5 text-xs bg-white/10 hover:bg-white/15 px-2.5 py-1 rounded-md text-white transition-colors disabled:opacity-50"
              >
                {companion.profile ? (
                  <>
                    <div
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-white text-[8px] font-bold shrink-0"
                      style={{ backgroundColor: companion.profile.color }}
                    >
                      {companion.profile.avatar ? (
                        <img src={companion.profile.avatar} alt="" className="w-3.5 h-3.5 rounded-full" />
                      ) : (
                        companion.profile.name.charAt(0)
                      )}
                    </div>
                    {companion.profile.name}
                  </>
                ) : (
                  <span className="text-white/40">Not assigned</span>
                )}
                <svg className={`w-3 h-3 transition-transform ${showCharacterDropdown ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown */}
              {showCharacterDropdown && (
                <>
                  {/* Backdrop to close dropdown */}
                  <div className="fixed inset-0 z-40" onClick={() => setShowCharacterDropdown(false)} />
                  <div className="absolute left-0 top-full mt-1 bg-gray-900 border border-white/20 rounded-lg shadow-xl z-50 min-w-[200px] max-h-[240px] overflow-y-auto">
                    {/* Option to remove character assignment */}
                    {companion.profile && (
                      <button
                        onClick={() => {
                          onAssignCharacter(companion.id, null);
                          setShowCharacterDropdown(false);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-white/50 hover:bg-white/10 flex items-center gap-2 border-b border-white/10"
                      >
                        <TrashIcon className="w-3.5 h-3.5" />
                        Remove character
                      </button>
                    )}

                    {/* Available characters */}
                    {activeProfiles.map((profile: PlayerProfile) => (
                      <button
                        key={profile.id}
                        onClick={() => {
                          onAssignCharacter(companion.id, profile);
                          setShowCharacterDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-white/10 flex items-center gap-2 transition-colors ${
                          companion.profile?.id === profile.id ? 'text-cyan-400 bg-cyan-500/10' : 'text-white'
                        }`}
                      >
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0"
                          style={{ backgroundColor: profile.color }}
                        >
                          {profile.avatar ? (
                            <img src={profile.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                          ) : (
                            profile.name.charAt(0)
                          )}
                        </div>
                        <span className="truncate">{profile.name}</span>
                        {companion.profile?.id === profile.id && (
                          <CheckIcon className="w-3.5 h-3.5 ml-auto shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Kick Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onKick(companion.id, companionName)}
          disabled={isKicking}
          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-500/50 text-xs px-3"
        >
          {isKicking ? (
            <>
              <div className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin mr-1" />
              Kicking...
            </>
          ) : (
            <>
              <TrashIcon className="w-3.5 h-3.5 mr-1" />
              Kick
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
