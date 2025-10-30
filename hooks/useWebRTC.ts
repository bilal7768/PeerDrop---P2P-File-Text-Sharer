import { useState, useRef, useCallback, useEffect } from 'react';
import type { ConnectionState, ReceivedMessage, TextMessage, FileInfo, FileMetaMessage, FileEndMessage } from '../types';

const PEER_CONNECTION_CONFIG: RTCConfiguration = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
};

const CHUNK_SIZE = 16384; // 16KB

export const useWebRTC = () => {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [receivedMessages, setReceivedMessages] = useState<ReceivedMessage[]>([]);
  const [offerSdp, setOfferSdp] = useState<string | null>(null);
  const [answerSdp, setAnswerSdp] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const pc = useRef<RTCPeerConnection | null>(null);
  const dc = useRef<RTCDataChannel | null>(null);

  const fileReceiver = useRef<{ info: FileInfo, chunks: ArrayBuffer[] } | null>(null);

  const resetState = useCallback(() => {
    pc.current?.close();
    pc.current = null;
    dc.current?.close();
    dc.current = null;
    setConnectionState('disconnected');
    setReceivedMessages([]);
    setOfferSdp(null);
    setAnswerSdp(null);
    fileReceiver.current = null;
    setErrorMessage(null);
  }, []);
  
  const handleDataChannelMessage = useCallback((event: MessageEvent) => {
    if (typeof event.data === 'string') {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'file-meta') {
            const fileMeta = message as FileMetaMessage;
            fileReceiver.current = { info: fileMeta.payload, chunks: [] };
        } else if (message.type === 'file-end' && fileReceiver.current) {
            const { info, chunks } = fileReceiver.current;
            const fileBlob = new Blob(chunks, { type: info.type });
            const downloadUrl = URL.createObjectURL(fileBlob);
            const fileMessage = {
                type: 'file' as const,
                id: crypto.randomUUID(),
                sender: 'peer' as const,
                timestamp: Date.now(),
                fileInfo: info,
                downloadUrl,
            };
            setReceivedMessages(prev => [...prev, fileMessage]);
            fileReceiver.current = null;
        } else if (message.type === 'text') {
            const textMessage: TextMessage = {
                ...message,
                sender: 'peer'
            };
            setReceivedMessages(prev => [...prev, textMessage]);
        }
      } catch (error) {
        // If parsing fails, assume it's a plain text message.
        const textMessage: TextMessage = {
            type: 'text',
            id: crypto.randomUUID(),
            content: event.data,
            sender: 'peer',
            timestamp: Date.now(),
        };
        setReceivedMessages(prev => [...prev, textMessage]);
      }
    } else if (event.data instanceof ArrayBuffer) {
        if (fileReceiver.current) {
            fileReceiver.current.chunks.push(event.data);
        }
    }
  }, []);

  const setupDataChannel = useCallback((dataChannel: RTCDataChannel) => {
    dc.current = dataChannel;
    dc.current.binaryType = 'arraybuffer';
    dc.current.onopen = () => setConnectionState('connected');
    dc.current.onclose = () => resetState();
    dc.current.onmessage = handleDataChannelMessage;
  }, [handleDataChannelMessage, resetState]);

  const createPeerConnection = useCallback(() => {
    const peerConnection = new RTCPeerConnection(PEER_CONNECTION_CONFIG);

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        // Trickle ICE candidates are not used in this manual setup.
        // We wait for all candidates to be gathered.
      } else {
        const sdp = JSON.stringify(peerConnection.localDescription);
        if (peerConnection.localDescription?.type === 'offer') {
          setOfferSdp(sdp);
        } else {
          setAnswerSdp(sdp);
        }
      }
    };
    
    peerConnection.onconnectionstatechange = () => {
        if (peerConnection.connectionState === 'failed') {
            setErrorMessage("Connection failed. This could be due to a network issue or firewall.");
            setConnectionState('failed');
        }
    };
    
    peerConnection.ondatachannel = (event) => {
        setupDataChannel(event.channel);
    };

    pc.current = peerConnection;
  }, [setupDataChannel, resetState]);

  const createOffer = useCallback(async () => {
    resetState();
    createPeerConnection();
    const dataChannel = pc.current!.createDataChannel('sendChannel');
    setupDataChannel(dataChannel);
    const offer = await pc.current!.createOffer();
    await pc.current!.setLocalDescription(offer);
    setConnectionState('connecting');
  }, [createPeerConnection, resetState, setupDataChannel]);

  const createAnswer = useCallback(async (remoteOfferSdp: string) => {
    if (!pc.current) {
      resetState();
      createPeerConnection();
    }
    try {
      const offer = JSON.parse(remoteOfferSdp);
      await pc.current!.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.current!.createAnswer();
      await pc.current!.setLocalDescription(answer);
      setConnectionState('connecting');
    } catch (error) {
        console.error("Failed to create answer:", error);
        setErrorMessage("Invalid session offer. Please copy the entire offer text and try again.");
        setConnectionState('failed');
    }
  }, [createPeerConnection, resetState]);
  
  const setRemoteAnswer = useCallback(async (remoteAnswerSdp: string) => {
    if (!pc.current) return;
    try {
        const answer = JSON.parse(remoteAnswerSdp);
        await pc.current!.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
        console.error("Failed to set remote answer:", error);
        setErrorMessage("Invalid session answer. Please copy the entire answer text and try again.");
        setConnectionState('failed');
    }
  }, []);

  const sendText = useCallback((text: string) => {
    if (dc.current?.readyState === 'open') {
      const message: Omit<TextMessage, 'sender'> = {
        type: 'text',
        id: crypto.randomUUID(),
        content: text,
        timestamp: Date.now()
      };
      dc.current.send(JSON.stringify(message));
      setReceivedMessages(prev => [...prev, { ...message, sender: 'me' }]);
    }
  }, []);

  const sendFile = useCallback((file: File) => {
    if (dc.current?.readyState !== 'open') return;
    
    const fileInfo: FileInfo = { name: file.name, size: file.size, type: file.type };
    const fileMetaMessage: FileMetaMessage = { type: 'file-meta', payload: fileInfo };
    dc.current.send(JSON.stringify(fileMetaMessage));

    const reader = new FileReader();
    reader.onload = e => {
        const buffer = e.target?.result as ArrayBuffer;
        let offset = 0;

        const sendChunk = () => {
            if (offset >= buffer.byteLength) {
                const fileEndMessage: FileEndMessage = { type: 'file-end' };
                dc.current!.send(JSON.stringify(fileEndMessage));

                // Add to local message list immediately for UI feedback
                 setReceivedMessages(prev => [...prev, {
                    type: 'file',
                    id: crypto.randomUUID(),
                    sender: 'me',
                    timestamp: Date.now(),
                    fileInfo: fileInfo,
                    downloadUrl: URL.createObjectURL(file), // Local blob for sender
                }]);
                return;
            }
            // Simple flow control
            if (dc.current!.bufferedAmount > dc.current!.bufferedAmountLowThreshold) {
                dc.current!.onbufferedamountlow = () => {
                    dc.current!.onbufferedamountlow = null;
                    sendChunk();
                };
                return;
            }

            const chunk = buffer.slice(offset, offset + CHUNK_SIZE);
            dc.current!.send(chunk);
            offset += chunk.byteLength;
            // Use setTimeout to avoid blocking the main thread for large files
            setTimeout(sendChunk, 0);
        };
        sendChunk();
    };
    reader.readAsArrayBuffer(file);
  }, []);
  
  useEffect(() => {
    // Cleanup on unmount
    return () => {
      pc.current?.close();
      dc.current?.close();
    };
  }, []);

  return { 
    connectionState, 
    receivedMessages,
    offerSdp,
    answerSdp,
    errorMessage,
    createOffer,
    createAnswer,
    setRemoteAnswer,
    sendText,
    sendFile,
    resetConnection: resetState,
  };
};