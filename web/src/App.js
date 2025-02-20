import React, { useState, useRef } from 'react';
import { Routes, Route } from 'react-router-dom'

import Header from './components/header'
import Selection from './components/selection'
import PlayerPage from './components/player'
import Publish from './components/publish'
import Preview from './components/Preview';
import Settings from './components/Settings';

function App() {
  const [streamKey, setStreamKey] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const mediaStreamRef = useRef(null);
  const [settings, setSettings] = useState({
    maxBitrate: 30000000,
    preferredCodec: 'video/H264',
    disableEchoCancellation: true,
    disableNoiseSuppression: true,
    disableAGC: true
  });

  const handleSettingChange = (setting, value) => {
    setSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const createSDP = async (stream) => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ],
      iceTransportPolicy: 'all',
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require',
      iceCandidatePoolSize: 10
    });

    // Add tracks to the peer connection
    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Set codec preferences
    const transceiver = pc.getTransceivers().find(t => t.sender.track?.kind === 'video');
    if (transceiver) {
      const codecs = RTCRtpSender.getCapabilities('video').codecs;
      const preferredCodec = codecs.find(c => 
        c.mimeType.toLowerCase() === settings.preferredCodec.toLowerCase()
      );
      
      if (preferredCodec) {
        const orderedCodecs = [
          preferredCodec,
          ...codecs.filter(c => c !== preferredCodec && !c.mimeType.includes('rtx'))
        ];
        try {
          await transceiver.setCodecPreferences(orderedCodecs);
          console.log('Set codec preferences to:', preferredCodec.mimeType);
        } catch (error) {
          console.warn('Failed to set codec preferences:', error);
        }
      } else {
        console.warn('Preferred codec not available:', settings.preferredCodec);
      }
    }

    // Create and set local description
    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
      iceRestart: true
    });

    // Add bitrate restriction
    if (settings.maxBitrate) {
      offer.sdp = offer.sdp.replace(
        /(m=video.*\r\n)/g,
        `$1b=AS:${Math.floor(settings.maxBitrate / 1000)}\r\n`
      );
    }

    await pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete or timeout after 5 seconds
    await Promise.race([
      new Promise(resolve => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
        } else {
          pc.addEventListener('icegatheringstatechange', () => {
            if (pc.iceGatheringState === 'complete') {
              resolve();
            }
          });
        }
      }),
      new Promise(resolve => setTimeout(resolve, 5000))
    ]);

    // Log gathered candidates
    console.log('ICE gathering completed, candidates:', pc.localDescription.sdp.match(/a=candidate:.*/g));

    return pc;
  };

  const handlePublish = async () => {
    try {
      const whipEndpoint = process.env.REACT_APP_WEBRTC_CUSTOM_ENDPOINT;
      
      if (!whipEndpoint) {
        console.error('WHIP endpoint URL is not configured');
        throw new Error('WHIP endpoint URL is not configured. Please check your environment variables.');
      }

      setIsPublishing(true);
      const stream = mediaStreamRef.current;
      
      if (!stream) {
        console.error('No media stream available');
        return;
      }

      const pc = await createSDP(stream);
      
      console.log('Sending SDP to endpoint:', whipEndpoint);
      console.log('SDP offer:', pc.localDescription.sdp);

      // Send the SDP to the WHIP endpoint
      const response = await fetch(whipEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/sdp',
          'Accept': 'application/sdp',
          'Authorization': `Bearer ${streamKey}`,
          'Origin': window.location.origin
        },
        mode: 'cors',
        credentials: 'omit',
        body: pc.localDescription.sdp
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Server error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/sdp')) {
        console.error('Unexpected content type:', contentType);
        const responseText = await response.text();
        console.error('Response body:', responseText);
        throw new Error('Server did not respond with SDP answer');
      }

      const answerSDP = await response.text();
      console.log('Raw response:', answerSDP);

      // Validate SDP answer
      if (!answerSDP.trim().startsWith('v=0')) {
        console.error('Invalid SDP answer format:', answerSDP);
        throw new Error('Invalid SDP answer format received');
      }

      await pc.setRemoteDescription(new RTCSessionDescription({
        type: 'answer',
        sdp: answerSDP
      }));

      console.log('Publishing started successfully');
      
      // Add connection state logging
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log('Connection state:', state);
        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          console.log('Connection terminated:', state);
          setIsPublishing(false);
        }
      };
      
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.log('ICE connection state:', state);
        if (state === 'disconnected') {
          console.log('Attempting ICE restart...');
          pc.restartIce();
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log('ICE gathering state:', pc.iceGatheringState);
      };

      pc.onsignalingstatechange = () => {
        console.log('Signaling state:', pc.signalingState);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log('New ICE candidate:', event.candidate.candidate);
        }
      };
      
    } catch (error) {
      console.error('Error publishing stream:', error);
      setIsPublishing(false);
      throw error;
    }
  };

  const handleStreamAvailable = (stream) => {
    mediaStreamRef.current = stream;
  };

  return (
    <div className="app-container">
      <div className="header">
        <h1>Welcome to Broadcast Box</h1>
        <p>Broadcast Box is a tool that allows you to efficiently stream high-quality video in real time, using the latest in video codecs and WebRTC technology.</p>
      </div>

      <div className="main-content">
        <div className="preview-section">
          <Preview onStreamAvailable={handleStreamAvailable} />
        </div>

        <div className="controls-section">
          <div className="stream-key-input">
            <label>Stream Key</label>
            <input
              type="text"
              value={streamKey}
              onChange={(e) => setStreamKey(e.target.value)}
              placeholder="Enter your stream key"
            />
          </div>

          <Settings 
            settings={settings}
            onSettingChange={handleSettingChange}
          />

          <div className="action-buttons">
            <button 
              className="watch-button"
              onClick={() => window.location.href = `/${streamKey}`}
              disabled={!streamKey}
            >
              Watch Stream
            </button>
            <button 
              className="publish-button"
              onClick={handlePublish}
              disabled={!streamKey || isPublishing}
            >
              {isPublishing ? 'Publishing...' : 'Publish Stream'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App
