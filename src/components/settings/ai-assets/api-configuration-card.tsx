'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api-client';

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

interface APIConfigurationCardProps {
  onConfigChange?: () => void;
}

export function APIConfigurationCard({ onConfigChange }: APIConfigurationCardProps) {
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
        const data = await apiClient.getConfig();
        if (data.success && data.config) {
          setApiBaseUrl((data.config as { baseUrl?: string }).baseUrl?.replace('/v1', '') || '');
          setHasApiKey((data.config as { hasApiKey?: boolean }).hasApiKey || false);
        }
      } catch (err) {
        console.error('Failed to load config:', err);
      } finally {
        setConfigLoading(false);
      }
    };
    loadConfig();
  }, []);

  const saveConfig = async () => {
    setConfigSaving(true);
    setConfigMessage(null);
    try {
      const data = await apiClient.saveConfig({
        baseUrl: apiBaseUrl,
        apiKey: apiKey,
      });
      if (data.success) {
        setHasApiKey(!!apiKey);
        setApiKey('');
        setConfigMessage({ type: 'success', text: '✅ Configuration saved successfully!' });
        onConfigChange?.();
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

  const testConnection = async () => {
    try {
      const data = await apiClient.testConfig({ baseUrl: apiBaseUrl, apiKey });
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
  };

  if (configLoading) {
    return (
      <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
        <CardContent className="py-4">
          <div className="animate-pulse text-white/40">Loading configuration...</div>
        </CardContent>
      </Card>
    );
  }

  return (
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
              onClick={testConnection}
              disabled={!apiBaseUrl}
              className="border-purple-500/50 text-purple-400 hover:bg-purple-500/10"
            >
              Test Connection
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
