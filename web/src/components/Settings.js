import React from 'react';

const Settings = ({ settings, onSettingChange }) => {
  const bitrateOptions = [
    { label: '2 Mbps', value: 2000000 },
    { label: '5 Mbps', value: 5000000 },
    { label: '10 Mbps', value: 10000000 },
    { label: '15 Mbps', value: 15000000 },
    { label: '20 Mbps', value: 20000000 },
    { label: '25 Mbps', value: 25000000 },
    { label: '30 Mbps', value: 30000000 },
  ];

  const codecOptions = [
    { label: 'H.264', value: 'video/H264' },
    { label: 'H.265', value: 'video/H265' },
    { label: 'VP9', value: 'video/VP9' }
  ];

  return (
    <div className="settings-panel">
      <h3>Stream Settings</h3>
      
      <div className="setting-group">
        <label>Max Bitrate:</label>
        <select 
          value={settings.maxBitrate} 
          onChange={(e) => onSettingChange('maxBitrate', parseInt(e.target.value))}
        >
          {bitrateOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="setting-group">
        <label>Preferred Codec:</label>
        <select 
          value={settings.preferredCodec} 
          onChange={(e) => onSettingChange('preferredCodec', e.target.value)}
        >
          {codecOptions.map(codec => (
            <option key={codec.value} value={codec.value}>
              {codec.label}
            </option>
          ))}
        </select>
      </div>

      <div className="setting-group">
        <label>Audio Settings:</label>
        <div className="checkbox-group">
          <label>
            <input
              type="checkbox"
              checked={settings.disableEchoCancellation}
              onChange={(e) => onSettingChange('disableEchoCancellation', e.target.checked)}
            />
            Disable Echo Cancellation
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.disableNoiseSuppression}
              onChange={(e) => onSettingChange('disableNoiseSuppression', e.target.checked)}
            />
            Disable Noise Suppression
          </label>
          <label>
            <input
              type="checkbox"
              checked={settings.disableAGC}
              onChange={(e) => onSettingChange('disableAGC', e.target.checked)}
            />
            Disable AGC
          </label>
        </div>
      </div>
    </div>
  );
};

export default Settings; 