import React, { useEffect, useRef, useState } from 'react';

const Preview = ({ onStreamAvailable }) => {
  const videoRef = useRef(null);
  const [audioDevices, setAudioDevices] = useState([]);
  const [selectedAudioDevice, setSelectedAudioDevice] = useState('');
  const currentStreamRef = useRef(null);

  useEffect(() => {
    // Get list of audio input devices
    async function getAudioDevices() {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        setAudioDevices(audioInputs);
        if (audioInputs.length > 0) {
          setSelectedAudioDevice(audioInputs[0].deviceId);
        }
      } catch (err) {
        console.error('Error getting audio devices:', err);
      }
    }

    getAudioDevices();
  }, []);

  useEffect(() => {
    async function setupCamera() {
      try {
        // Stop any existing stream
        if (currentStreamRef.current) {
          currentStreamRef.current.getTracks().forEach(track => track.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          },
          audio: {
            deviceId: selectedAudioDevice ? { exact: selectedAudioDevice } : undefined,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false
          }
        });
        
        currentStreamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          onStreamAvailable(stream);
        }
      } catch (err) {
        console.error('Error accessing camera:', err);
      }
    }

    if (selectedAudioDevice) {
      setupCamera();
    }

    return () => {
      if (currentStreamRef.current) {
        currentStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [selectedAudioDevice, onStreamAvailable]);

  const handleAudioDeviceChange = (event) => {
    setSelectedAudioDevice(event.target.value);
  };

  return (
    <div className="preview-container">
      <h3>Camera Preview</h3>
      <div className="audio-device-selector">
        <label>Audio Input:</label>
        <select 
          value={selectedAudioDevice}
          onChange={handleAudioDeviceChange}
          className="audio-select"
        >
          {audioDevices.map(device => (
            <option key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${device.deviceId.slice(0, 5)}...`}
            </option>
          ))}
        </select>
      </div>
      <video 
        ref={videoRef}
        autoPlay 
        playsInline 
        muted 
        style={{ 
          width: '100%',
          maxWidth: '640px',
          borderRadius: '8px',
          backgroundColor: '#000',
          marginTop: '1rem'
        }}
      />
    </div>
  );
};

export default Preview; 