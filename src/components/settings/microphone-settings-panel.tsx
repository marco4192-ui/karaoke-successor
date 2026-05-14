'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InfoIcon, PlusIcon } from '@/components/settings/settings-icons';
import { MAX_MICROPHONES } from '@/lib/audio/microphone-manager';
import { MicrophoneCard } from '@/components/settings/microphone-card';
import { useMicrophoneSettings } from '@/components/settings/use-microphone-settings';
import { useTranslation } from '@/lib/i18n/translations';

export function MicrophoneSettingsPanel({
  onSettingsChange,
}: {
  onSettingsChange?: (_settings: Record<string, import('@/lib/audio/microphone-manager').ExtendedMicConfig>) => void;
}) {
  const {
    devices,
    assignedMics,
    expandedMics,
    isAddingMic,
    selectedDeviceId,
    setSelectedDeviceId,
    setIsAddingMic,
    handleAddMicrophone,
    handleRemoveMicrophone,
    handleUpdateConfig,
    handleUpdateName,
    toggleExpanded,
    handleApplyOptimalToAll,
    handleRefreshDevices,
    refreshMessage,
    handleEnableStereoSplit,
    handleDisableStereoSplit,
  } = useMicrophoneSettings(onSettingsChange);

  const { t } = useTranslation();

  const SUPPORTED_MICS = [
    { icon: '🎤', title: 'USB Mics', desc: 'Blue Yeti, AT2020' },
    { icon: '🎮', title: 'SingStar Mics', desc: 'PS2/PS3 Dongles' },
    { icon: '🔌', title: '3.5mm Jack', desc: 'Headset Mics' },
    { icon: '📱', title: 'Mobile', desc: 'Phone as Mic' },
  ];

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <InfoIcon className="w-5 h-5 text-cyan-400" />
            {t('settingsMicPanel.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-white/70">
            <p><strong className="text-white">{t('settingsMicPanel.upTo4Mics')}</strong> {t('settingsMicPanel.eachOwnSettings')}</p>
            <p><strong className="text-white">{t('settingsMicPanel.ultraStarStandard')}</strong> {t('settingsMicPanel.ultraStarDesc')}</p>
            <p><strong className="text-white">{t('settingsMicPanel.customNames')}</strong> {t('settingsMicPanel.customNamesDesc')}</p>
            <ul className="text-xs text-white/50 mt-3 space-y-1">
              <li>• <strong>AGC (Auto Gain Control)</strong> {t('settingsMicPanel.agcInfo')}</li>
              <li>• <strong>Echo Cancellation</strong> / <strong>Noise Suppression</strong> {t('settingsMicPanel.echoInfo')}</li>
              <li>• <strong>FFT Size 4096</strong> {t('settingsMicPanel.fftInfo')}</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Assigned Microphones */}
      {assignedMics.map((mic) => (
        <MicrophoneCard
          key={mic.id}
          mic={mic}
          devices={devices}
          onUpdateConfig={handleUpdateConfig}
          onUpdateName={handleUpdateName}
          onRemove={handleRemoveMicrophone}
          isExpanded={expandedMics.has(mic.id)}
          onToggleExpand={() => toggleExpanded(mic.id)}
          onEnableStereoSplit={handleEnableStereoSplit}
          onDisableStereoSplit={handleDisableStereoSplit}
        />
      ))}

      {/* Add Microphone */}
      {assignedMics.length < MAX_MICROPHONES && (
        <Card className="bg-white/5 border-white/10 border-dashed">
          <CardContent className="py-6">
            {isAddingMic ? (
              <div className="flex items-center gap-2">
                <Select value={selectedDeviceId} onValueChange={setSelectedDeviceId}>
                  <SelectTrigger className="flex-1 bg-white/10 border-white/20">
                    <SelectValue placeholder={t('settingsMicPanel.selectMic')} />
                  </SelectTrigger>
                  <SelectContent>
                    {devices.filter(d => d.deviceId).map((device) => (
                      <SelectItem key={device.deviceId} value={device.deviceId}>
                        {device.label}{device.isDefault && ` ${t('settingsMicPanel.default')}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleAddMicrophone} className="bg-green-500 hover:bg-green-400">{t('settingsMicPanel.add')}</Button>
                <Button variant="outline" onClick={() => setIsAddingMic(false)} className="border-white/20">{t('settingsMicPanel.cancel')}</Button>
              </div>
            ) : (
              <button onClick={() => setIsAddingMic(true)} className="w-full flex items-center justify-center gap-2 py-4 text-white/60 hover:text-white transition-colors">
                <PlusIcon className="w-5 h-5" />
                <span>{t('settingsMicPanel.addMic').replace('{n}', String(assignedMics.length + 1)).replace('{m}', String(MAX_MICROPHONES - assignedMics.length)).replace('{max}', String(MAX_MICROPHONES))}</span>
              </button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Max microphones reached */}
      {assignedMics.length >= MAX_MICROPHONES && (
        <div className="p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-center">
          <p className="text-cyan-400 text-sm">{t('settingsMicPanel.maxReached').replace('{max}', String(MAX_MICROPHONES))}</p>
        </div>
      )}

      {/* Quick Actions */}
      {assignedMics.length > 0 && (
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleApplyOptimalToAll} className="flex-1 border-white/20 text-white hover:bg-white/10">
            {t('settingsMicPanel.applyOptimal')}
          </Button>
          <Button variant="outline" onClick={handleRefreshDevices} className="border-white/20 text-white hover:bg-white/10">
            {t('settingsMicPanel.refreshDevices')}
          </Button>
        </div>
      )}

      {/* Refresh Message */}
      {refreshMessage && (
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-center">
          <p className="text-cyan-400 text-sm">🔄 {refreshMessage}</p>
        </div>
      )}

      {/* Supported Microphones Info */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader><CardTitle className="text-sm">{t('settingsMicPanel.supportedMics')}</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SUPPORTED_MICS.map(({ icon, title, desc }) => (
              <div key={title} className="text-center p-2 bg-white/5 rounded-lg">
                <div className="text-xl mb-1">{icon}</div>
                <p className="text-xs font-medium">{title}</p>
                <p className="text-xs text-white/40">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default MicrophoneSettingsPanel;
