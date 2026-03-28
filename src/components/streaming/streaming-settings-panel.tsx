'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getTwitchService, TwitchUser } from '@/lib/streaming/twitch-service';
import { getStreamingService, StreamStats, KaraokeSongRequest } from '@/lib/streaming/streaming-service';
import { getStreamingOverlayService } from '@/lib/streaming/streaming-overlay-service';
import { ChatOverlay, StreamStatsDisplay } from './chat-overlay';

export function StreamingSettingsPanel() {
  const [twitchUser, setTwitchUser] = useState<TwitchUser | null>(null);
  const [isTwitchAuth, setIsTwitchAuth] = useState(false);
  const [overlayKey, setOverlayKey] = useState('');
  const [commandPrefix, setCommandPrefix] = useState('!');
  const [enableSongRequests, setEnableSongRequests] = useState(true);
  const [maxQueueSize, setMaxQueueSize] = useState(20);
  const [maxSongsPerUser, setMaxSongsPerUser] = useState(3);
  const [songQueue, setSongQueue] = useState<KaraokeSongRequest[]>([]);

  // Check Twitch auth status
  useEffect(() => {
    const twitch = getTwitchService();
    twitch.initialize({ usePKCE: true });

    if (twitch.isAuthenticated()) {
      setIsTwitchAuth(true);
      setTwitchUser(twitch.getUser());
    }

    // Get overlay key
    const overlay = getStreamingOverlayService();
    setOverlayKey(overlay.getOverlayKey());

    // Get song queue
    const streaming = getStreamingService();
    setSongQueue(streaming.getSongQueue());

    // Subscribe to queue updates
    const unsubStats = streaming.onStats(() => {
      setSongQueue(streaming.getSongQueue());
    });

    return unsubStats;
  }, []);

  // Handle Twitch auth
  const handleTwitchConnect = useCallback(() => {
    const twitch = getTwitchService();
    window.location.href = twitch.getAuthUrl();
  }, []);

  // Handle Twitch logout
  const handleTwitchLogout = useCallback(() => {
    const twitch = getTwitchService();
    twitch.logout();
    setIsTwitchAuth(false);
    setTwitchUser(null);
  }, []);

  // Copy overlay URL
  const handleCopyOverlayUrl = useCallback(() => {
    const url = `${window.location.origin}/overlay?key=${overlayKey}`;
    navigator.clipboard.writeText(url);
  }, [overlayKey]);

  // Update queue settings
  useEffect(() => {
    const streaming = getStreamingService();
    streaming.setQueueLimits(maxQueueSize, maxSongsPerUser);
  }, [maxQueueSize, maxSongsPerUser]);

  // Update command prefix
  useEffect(() => {
    const twitch = getTwitchService();
    twitch.setCommandPrefix(commandPrefix);
  }, [commandPrefix]);

  // Remove song from queue
  const handleRemoveSong = useCallback((requestId: string) => {
    const streaming = getStreamingService();
    streaming.removeSong(requestId);
    setSongQueue(streaming.getSongQueue());
  }, []);

  // Clear queue
  const handleClearQueue = useCallback(() => {
    const streaming = getStreamingService();
    streaming.clearQueue();
    setSongQueue([]);
  }, []);

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          🎬 Streaming Settings
        </h2>
        <p className="text-white/60">Configure Twitch integration and OBS overlay</p>
      </div>

      <Tabs defaultValue="twitch" className="space-y-4">
        <TabsList className="bg-white/5">
          <TabsTrigger value="twitch">Twitch</TabsTrigger>
          <TabsTrigger value="overlay">OBS Overlay</TabsTrigger>
          <TabsTrigger value="commands">Chat Commands</TabsTrigger>
          <TabsTrigger value="queue">Song Queue</TabsTrigger>
        </TabsList>

        {/* Twitch Tab */}
        <TabsContent value="twitch">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Twitch Connection</CardTitle>
              <CardDescription>
                Connect your Twitch account for chat integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isTwitchAuth && twitchUser ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                    <img
                      src={twitchUser.profile_image_url}
                      alt={twitchUser.display_name}
                      className="w-12 h-12 rounded-full"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{twitchUser.display_name}</p>
                      <p className="text-sm text-white/50">@{twitchUser.login}</p>
                      {twitchUser.broadcaster_type && (
                        <Badge className="mt-1 bg-purple-500/20 text-purple-400 border-purple-500/30">
                          {twitchUser.broadcaster_type}
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleTwitchLogout}
                    >
                      Disconnect
                    </Button>
                  </div>

                  <ChatOverlay maxHeight="300px" showInput={true} showEvents={true} />
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="text-white/60 mb-4">
                    Connect your Twitch account to enable chat integration
                  </p>
                  <Button
                    onClick={handleTwitchConnect}
                    className="bg-purple-600 hover:bg-purple-500"
                  >
                    📺 Connect Twitch
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* OBS Overlay Tab */}
        <TabsContent value="overlay">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>OBS Browser Source</CardTitle>
              <CardDescription>
                Add this URL as a browser source in OBS to show your karaoke overlay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Overlay URL</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}/overlay?key=${overlayKey}`}
                    readOnly
                    className="bg-white/5 border-white/10 text-white"
                  />
                  <Button onClick={handleCopyOverlayUrl}>
                    📋 Copy
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Overlay Key</Label>
                <div className="flex gap-2">
                  <Input
                    value={overlayKey}
                    readOnly
                    className="bg-white/5 border-white/10 text-white font-mono"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      const overlay = getStreamingOverlayService();
                      setOverlayKey(overlay.getOverlayKey());
                    }}
                  >
                    🔄 Regenerate
                  </Button>
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-lg space-y-2">
                <p className="font-medium">OBS Setup Instructions:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm text-white/70">
                  <li>Copy the overlay URL above</li>
                  <li>In OBS, add a new "Browser" source</li>
                  <li>Paste the URL in the URL field</li>
                  <li>Set width to 400 and height to 300</li>
                  <li>Position the overlay where you want it</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Commands Tab */}
        <TabsContent value="commands">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle>Chat Commands</CardTitle>
              <CardDescription>
                Configure chat commands for song requests and interaction
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Command Prefix</Label>
                  <Input
                    value={commandPrefix}
                    onChange={(e) => setCommandPrefix(e.target.value)}
                    className="bg-white/5 border-white/10 text-white w-20"
                  />
                </div>
              </div>

              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Song Requests</Label>
                    <p className="text-sm text-white/50">Allow viewers to request songs</p>
                  </div>
                  <Switch
                    checked={enableSongRequests}
                    onCheckedChange={setEnableSongRequests}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Max Queue Size</Label>
                    <p className="text-sm text-white/50">Maximum songs in the queue</p>
                  </div>
                  <Input
                    type="number"
                    value={maxQueueSize}
                    onChange={(e) => setMaxQueueSize(parseInt(e.target.value) || 20)}
                    className="bg-white/5 border-white/10 text-white w-20"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Max Songs Per User</Label>
                    <p className="text-sm text-white/50">Maximum songs each user can request</p>
                  </div>
                  <Input
                    type="number"
                    value={maxSongsPerUser}
                    onChange={(e) => setMaxSongsPerUser(parseInt(e.target.value) || 3)}
                    className="bg-white/5 border-white/10 text-white w-20"
                  />
                </div>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <p className="font-medium mb-2">Available Commands:</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><code className="text-purple-400">{commandPrefix}sr &lt;song&gt;</code> - Request a song</div>
                  <div><code className="text-purple-400">{commandPrefix}queue</code> - Show queue</div>
                  <div><code className="text-purple-400">{commandPrefix}skip</code> - Skip current song (mod)</div>
                  <div><code className="text-purple-400">{commandPrefix}stats</code> - Show current stats</div>
                  <div><code className="text-purple-400">{commandPrefix}link</code> - Get song link</div>
                  <div><code className="text-purple-400">{commandPrefix}help</code> - Show commands</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Song Queue Tab */}
        <TabsContent value="queue">
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Song Queue</CardTitle>
                  <CardDescription>
                    Manage song requests from chat
                  </CardDescription>
                </div>
                {songQueue.length > 0 && (
                  <Button variant="outline" size="sm" onClick={handleClearQueue}>
                    Clear All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {songQueue.length === 0 ? (
                <div className="text-center py-8 text-white/50">
                  <p>No songs in queue</p>
                  <p className="text-sm mt-1">Viewers can request songs with !sr &lt;song&gt;</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {songQueue.map((request, index) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-white/50 w-6">{index + 1}.</span>
                        <div>
                          <p className="font-medium">{request.query}</p>
                          <p className="text-sm text-white/50">
                            Requested by {request.requestedBy.displayName}
                            {request.requestedBy.isMod && ' 🛡️'}
                            {request.requestedBy.isSubscriber && ' ⭐'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={
                            request.status === 'playing' ? 'bg-green-500' :
                            request.status === 'played' ? 'bg-gray-500' :
                            request.status === 'skipped' ? 'bg-red-500' :
                            'bg-blue-500'
                          }
                        >
                          {request.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveSong(request.id)}
                        >
                          ✕
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
