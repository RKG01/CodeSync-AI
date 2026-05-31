import { useState, useRef, useCallback, useEffect } from 'react';

/**
 * @module hooks/useVoiceChat
 * @description WebRTC-based voice chat hook for peer-to-peer audio communication.
 * Works with both duel and collaborative editing sessions.
 * 
 * Usage:
 *   const { isActive, isMicMuted, isRemoteMuted, connectionState, toggleVoice, toggleMic, toggleRemoteMute } = useVoiceChat(ws, userId);
 */

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
];

export default function useVoiceChat(ws, userId) {
  const [isActive, setIsActive] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [connectionState, setConnectionState] = useState('disconnected'); // disconnected | connecting | connected

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const isInitiatorRef = useRef(false);

  // Create a persistent audio element for remote audio
  useEffect(() => {
    const audioEl = new Audio();
    audioEl.autoplay = true;
    remoteAudioRef.current = audioEl;
    return () => {
      audioEl.pause();
      audioEl.srcObject = null;
    };
  }, []);

  // Listen for WebRTC signaling messages
  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (payload.type === 'webrtc:offer') {
        handleRemoteOffer(payload.data);
      } else if (payload.type === 'webrtc:answer') {
        handleRemoteAnswer(payload.data);
      } else if (payload.type === 'webrtc:ice-candidate') {
        handleRemoteIceCandidate(payload.data);
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => {
      ws.removeEventListener('message', handleMessage);
    };
  }, [ws]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
    setIsActive(false);
    setIsMicMuted(false);
    setIsRemoteMuted(false);
    setConnectionState('disconnected');
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    pc.onicecandidate = (event) => {
      if (event.candidate && ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'webrtc:ice-candidate',
          data: { candidate: event.candidate },
        }));
      }
    };

    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected') {
        setConnectionState('connected');
      } else if (state === 'connecting' || state === 'new') {
        setConnectionState('connecting');
      } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        setConnectionState('disconnected');
        if (state === 'failed') {
          cleanup();
        }
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [ws, cleanup]);

  const startVoice = useCallback(async () => {
    try {
      setConnectionState('connecting');
      
      // Get microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Create peer connection and add tracks
      const pc = createPeerConnection();
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // We are the initiator — create offer
      isInitiatorRef.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'webrtc:offer',
          data: { sdp: offer },
        }));
      }

      setIsActive(true);
    } catch (err) {
      console.error('Failed to start voice chat:', err);
      cleanup();
    }
  }, [ws, createPeerConnection, cleanup]);

  const handleRemoteOffer = useCallback(async (data) => {
    try {
      setConnectionState('connecting');

      // Get microphone access
      if (!localStreamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
      }

      // Create peer connection
      const pc = createPeerConnection();
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });

      // Set remote description and create answer
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'webrtc:answer',
          data: { sdp: answer },
        }));
      }

      setIsActive(true);
    } catch (err) {
      console.error('Failed to handle remote offer:', err);
      cleanup();
    }
  }, [ws, createPeerConnection, cleanup]);

  const handleRemoteAnswer = useCallback(async (data) => {
    try {
      const pc = peerConnectionRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      }
    } catch (err) {
      console.error('Failed to handle remote answer:', err);
    }
  }, []);

  const handleRemoteIceCandidate = useCallback(async (data) => {
    try {
      const pc = peerConnectionRef.current;
      if (pc && data.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    } catch (err) {
      console.error('Failed to add ICE candidate:', err);
    }
  }, []);

  // Toggle voice chat on/off
  const toggleVoice = useCallback(async () => {
    if (isActive) {
      cleanup();
    } else {
      await startVoice();
    }
  }, [isActive, cleanup, startVoice]);

  // Toggle local microphone mute
  const toggleMic = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle remote audio mute (local-only, just mutes playback)
  const toggleRemoteMute = useCallback(() => {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = !remoteAudioRef.current.muted;
      setIsRemoteMuted(remoteAudioRef.current.muted);
    }
  }, []);

  return {
    isActive,
    isMicMuted,
    isRemoteMuted,
    connectionState,
    toggleVoice,
    toggleMic,
    toggleRemoteMute,
  };
}
