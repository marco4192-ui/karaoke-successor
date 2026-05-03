'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Icons
function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 3l1.912 5.813a2 2 0 001.272 1.272L21 12l-5.813 1.912a2 2 0 00-1.272 1.272L12 21l-1.912-5.813a2 2 0 00-1.272-1.272L3 12l5.813-1.912a2 2 0 001.272-1.272L12 3z" />
    </svg>
  );
}

// Preset prompts for common assets
const IMAGE_PRESETS = [
  { name: 'Title Background', prompt: 'Karaoke game title screen background, neon lights, microphone silhouette on stage, vibrant purple and cyan gradient, musical notes floating, concert stage atmosphere, no text' },
  { name: 'Game Background', prompt: 'Concert stage view from singer perspective, crowd silhouette, spotlights and stage lights, dramatic lighting, purple and blue atmosphere' },
  { name: 'Bronze Rank Badge', prompt: 'bronze microphone badge icon, simple design, warm bronze metallic color, gaming achievement style, clean vector art' },
  { name: 'Silver Rank Badge', prompt: 'silver microphone badge icon, shiny silver metallic color, gaming achievement style, clean vector art' },
  { name: 'Gold Rank Badge', prompt: 'gold microphone badge icon, elegant design, shiny gold metallic color, gaming achievement style, clean vector art' },
  { name: 'Platinum Rank Badge', prompt: 'platinum microphone badge icon, premium design, gleaming platinum metallic color, gaming achievement style, clean vector art' },
  { name: 'Diamond Rank Badge', prompt: 'diamond microphone badge icon, luxury design, sparkling diamond crystal effect, gaming achievement style, clean vector art' },
  { name: 'Achievement Trophy', prompt: 'achievement icon, golden trophy cup with star, winner celebration, gaming style icon, clean design' },
];

const AUDIO_PRESETS = [
  { name: 'Level Up!', text: 'Level Up!' },
  { name: 'High Score!', text: 'New High Score!' },
  { name: 'Challenge Complete!', text: 'Challenge Complete!' },
  { name: 'Perfect Score!', text: 'Perfect Score!' },
  { name: 'Achievement!', text: 'Achievement Unlocked!' },
  { name: 'Welcome!', text: 'Welcome to Karaoke Successor!' },
  { name: 'Get Ready!', text: 'Get ready to sing!' },
  { name: 'Amazing!', text: 'Amazing performance!' },
];

export function AIAssetsGeneratorTab() {
  const [assetType, setAssetType] = useState<'image' | 'audio'>('image');
  const [prompt, setPrompt] = useState('');
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAssets, setGeneratedAssets] = useState<Array<{ type: string; data: string; filename: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  
  // API Configuration state
  const [apiBaseUrl, setApiBaseUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [configLoading, setConfigLoading] = useState(true);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMessage, setConfigMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  
  // Load config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/config');
        const data = await response.json();
        if (data.success && data.config) {
          setApiBaseUrl(data.config.baseUrl?.replace('/v1', '') || '');
          setHasApiKey(data.config.hasApiKey || false);
        }
      } catch (err) {
        console.error('Failed to load config:', err);
      } finally {
        setConfigLoading(false);
      }
    };
    loadConfig();
  }, []);
  
  // Save config
  const saveConfig = async () => {
    setConfigSaving(true);
    setConfigMessage(null);
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: apiBaseUrl,
          apiKey: apiKey,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setHasApiKey(!!apiKey);
        setApiKey(''); // Clear input for security
        setConfigMessage({ type: 'success', text: '✅ Configuration saved successfully!' });
      } else {
        setConfigMessage({ type: 'error', text: `❌ ${data.error || 'Failed to save configuration'}` });
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration';
      setConfigMessage({ type: 'error', text: `❌ ${errorMessage}` });
    } finally {
      setConfigSaving(false);
      setTimeout(() => setConfigMessage(null), 5000);
    }
  };

  const generateAsset = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      if (assetType === 'image') {
        if (!prompt.trim()) {
          setError('Please enter a prompt for the image');
          setIsGenerating(false);
          return;
        }

        const response = await fetch('/api/assets/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'image',
            prompt: prompt,
            filename: `generated-${Date.now()}.png`,
            size: '1024x1024'
          })
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate image');
        }

        setGeneratedAssets(prev => [...prev, { 
          type: 'image', 
          data: data.image, 
          filename: data.filename 
        }]);
      } else {
        if (!text.trim()) {
          setError('Please enter text for the audio');
          setIsGenerating(false);
          return;
        }

        const response = await fetch('/api/assets/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'audio',
            text: text,
            filename: `audio-${Date.now()}.wav`
          })
        });

        const data = await response.json();
        
        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to generate audio');
        }

        setGeneratedAssets(prev => [...prev, { 
          type: 'audio', 
          data: data.audio, 
          filename: data.filename 
        }]);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadAsset = (asset: { type: string; data: string; filename: string }) => {
    const link = document.createElement('a');
    if (asset.type === 'image') {
      link.href = `data:image/png;base64,${asset.data}`;
    } else {
      link.href = `data:audio/wav;base64,${asset.data}`;
    }
    link.download = asset.filename;
    link.click();
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <SparkleIcon className="w-6 h-6 text-purple-400" />
          AI Asset Generator
        </h2>
        <p className="text-white/60">Generate images and audio for your karaoke game using AI</p>
      </div>

      {/* API Configuration Section */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardHeader className="cursor-pointer" onClick={() => setShowConfig(!showConfig)}>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-purple-400" />
              API Configuration
            </span>
            <div className="flex items-center gap-2">
              {hasApiKey ? (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Configured</Badge>
              ) : (
                <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">⚠ Not Configured</Badge>
              )}
              <span className="text-white/40">{showConfig ? '▼' : '▶'}</span>
            </div>
          </CardTitle>
        </CardHeader>
        {showConfig && (
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-white/80">API Base URL</label>
              <Input
                placeholder="e.g., https://api.example.com"
                value={apiBaseUrl}
                onChange={(e) => setApiBaseUrl(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <p className="text-xs text-white/40">The base URL of your AI API (without /v1 suffix)</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-white/80">API Key</label>
              <Input
                type="password"
                placeholder={hasApiKey ? '••••••••••••••••' : 'Enter your API key'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
              />
              <p className="text-xs text-white/40">{hasApiKey ? 'Key already saved. Enter new key to update.' : 'Your API authentication key'}</p>
            </div>
            {configMessage && (
              <div className={`p-3 rounded-lg text-sm ${configMessage.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {configMessage.text}
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={saveConfig}
                disabled={configSaving || !apiBaseUrl}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
              >
                {configSaving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Saving...</>
                ) : (
                  <><SettingsIcon className="w-4 h-4 mr-2" />Save Configuration</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/config', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ baseUrl: apiBaseUrl, apiKey }),
                    });
                    const data = await response.json();
                    if (data.success) {
                      setConfigMessage({ type: 'success', text: '✅ Connection successful!' });
                    } else {
                      setConfigMessage({ type: 'error', text: `❌ ${data.error}` });
                    }
                  } catch (err: unknown) {
                    const errorMessage = err instanceof Error ? err.message : 'Connection failed';
                    setConfigMessage({ type: 'error', text: `❌ ${errorMessage}` });
                  }
                  setTimeout(() => setConfigMessage(null), 5000);
                }}
                disabled={!apiBaseUrl}
                className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
              >
                Test Connection
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Type Toggle */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>Asset Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              onClick={() => setAssetType('image')}
              className={assetType === 'image' ? 'bg-purple-500' : 'bg-white/10'}
            >
              🖼️ Image
            </Button>
            <Button
              onClick={() => setAssetType('audio')}
              className={assetType === 'audio' ? 'bg-purple-500' : 'bg-white/10'}
            >
              🔊 Audio
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Generator */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle>{assetType === 'image' ? 'Image Generation' : 'Text-to-Speech'}</CardTitle>
          <CardDescription>
            {assetType === 'image' 
              ? 'Describe the image you want to generate'
              : 'Enter text to convert to speech'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assetType === 'image' ? (
            <>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., A neon-lit karaoke stage with microphones..."
                className="w-full h-24 bg-white/5 border border-white/10 rounded-lg p-3 text-white placeholder:text-white/40 resize-none focus:outline-none focus:border-purple-500"
              />
              {/* Preset Buttons */}
              <div>
                <p className="text-sm text-white/60 mb-2">Quick presets:</p>
                <div className="flex flex-wrap gap-2">
                  {IMAGE_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      size="sm"
                      variant="outline"
                      onClick={() => setPrompt(preset.prompt)}
                      className="border-white/20 text-white/70 hover:text-white"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g., Level Up!"
                className="bg-white/5 border-white/10 text-white"
              />
              {/* Preset Buttons */}
              <div>
                <p className="text-sm text-white/60 mb-2">Quick presets:</p>
                <div className="flex flex-wrap gap-2">
                  {AUDIO_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      size="sm"
                      variant="outline"
                      onClick={() => setText(preset.text)}
                      className="border-white/20 text-white/70 hover:text-white"
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <Button
            onClick={generateAsset}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Generating...
              </>
            ) : (
              <>
                <SparkleIcon className="w-4 h-4 mr-2" />
                Generate {assetType === 'image' ? 'Image' : 'Audio'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Assets */}
      {generatedAssets.length > 0 && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle>Generated Assets</CardTitle>
            <CardDescription>Click to download your generated assets</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {generatedAssets.map((asset, index) => (
                <button
                  key={index}
                  onClick={() => downloadAsset(asset)}
                  className="bg-white/5 rounded-lg p-4 hover:bg-white/10 transition-colors text-center"
                >
                  {asset.type === 'image' ? (
                    <img 
                      src={`data:image/png;base64,${asset.data}`} 
                      alt={asset.filename}
                      className="w-full aspect-square object-cover rounded-lg mb-2"
                    />
                  ) : (
                    <div className="w-full aspect-square flex items-center justify-center bg-purple-500/20 rounded-lg mb-2">
                      <span className="text-4xl">🔊</span>
                    </div>
                  )}
                  <p className="text-sm text-white/60 truncate">{asset.filename}</p>
                  <p className="text-xs text-purple-400 mt-1">Click to download</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info Card */}
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <SparkleIcon className="w-5 h-5 text-purple-400 mt-0.5" />
            <div className="text-sm text-white/70">
              <p className="font-medium text-white mb-1">About AI Asset Generation</p>
              <p>Images and audio are generated using AI. For best results:</p>
              <ul className="list-disc list-inside mt-2 space-y-1 text-white/60">
                <li>Be specific in your image descriptions</li>
                <li>Include style keywords like "gaming", "neon", "vector"</li>
                <li>Audio supports multiple voices and languages</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
