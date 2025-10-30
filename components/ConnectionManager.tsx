
import React, { useState, useCallback } from 'react';
import { CopyIcon, CheckIcon } from './icons';

interface ConnectionManagerProps {
  offerSdp: string | null;
  answerSdp: string | null;
  createOffer: () => void;
  createAnswer: (offer: string) => void;
  setRemoteAnswer: (answer: string) => void;
}

const CopyableTextarea: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [value]);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-text-secondary mb-1">{label}</label>
      <div className="relative">
        <textarea
          readOnly
          value={value}
          className="w-full h-32 p-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-text-secondary focus:ring-brand-primary focus:border-brand-primary"
          placeholder="Session data will appear here..."
        />
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-text-secondary"
          title={copied ? 'Copied!' : 'Copy to clipboard'}
        >
          {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export const ConnectionManager: React.FC<ConnectionManagerProps> = ({
  offerSdp,
  answerSdp,
  createOffer,
  createAnswer,
  setRemoteAnswer,
}) => {
  const [remoteSdp, setRemoteSdp] = useState('');
  const [mode, setMode] = useState<'idle' | 'creating' | 'joining'>('idle');

  const startCreating = () => {
    setMode('creating');
    createOffer();
  };

  const startJoining = () => {
    setMode('joining');
  };
  
  const handleJoin = () => {
    if (remoteSdp.trim()) {
        createAnswer(remoteSdp);
    }
  };

  const handleConnect = () => {
    if (remoteSdp.trim()) {
        setRemoteAnswer(remoteSdp);
    }
  };


  if (mode === 'idle') {
    return (
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <button onClick={startCreating} className="w-full sm:w-auto text-lg font-semibold px-8 py-4 bg-brand-primary hover:bg-brand-secondary rounded-lg shadow-lg transition-transform transform hover:scale-105">
          Create Share Session
        </button>
        <button onClick={startJoining} className="w-full sm:w-auto text-lg font-semibold px-8 py-4 bg-surface hover:bg-gray-600 border border-gray-600 rounded-lg shadow-lg transition-transform transform hover:scale-105">
          Join a Session
        </button>
      </div>
    );
  }

  if (mode === 'creating') {
    return (
      <div className="w-full max-w-lg space-y-4">
        <h2 className="text-xl font-bold">1. Send this offer to your peer</h2>
        <p className="text-text-secondary text-sm">Your peer needs to paste this into their "Join a Session" screen.</p>
        <CopyableTextarea value={offerSdp || 'Generating...'} label="Session Offer" />

        <h2 className="text-xl font-bold">2. Paste their answer here</h2>
        <p className="text-text-secondary text-sm">Once they generate an answer, paste it below and click connect.</p>
        <textarea
          value={remoteSdp}
          onChange={(e) => setRemoteSdp(e.target.value)}
          className="w-full h-32 p-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-text-primary focus:ring-brand-primary focus:border-brand-primary"
          placeholder="Paste peer's session answer here..."
        />
        <button onClick={handleConnect} className="w-full font-semibold px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors" disabled={!remoteSdp.trim()}>
          Connect
        </button>
      </div>
    );
  }

  if (mode === 'joining') {
    return (
      <div className="w-full max-w-lg space-y-4">
        <h2 className="text-xl font-bold">1. Paste peer's offer here</h2>
        <p className="text-text-secondary text-sm">Get the "Session Offer" from the person who created the session.</p>
        <textarea
          value={remoteSdp}
          onChange={(e) => setRemoteSdp(e.target.value)}
          className="w-full h-32 p-2 bg-gray-800 border border-gray-600 rounded-md text-sm text-text-primary focus:ring-brand-primary focus:border-brand-primary"
          placeholder="Paste peer's session offer here..."
          disabled={!!answerSdp}
        />
        {!answerSdp && (
          <button onClick={handleJoin} className="w-full font-semibold px-6 py-3 bg-brand-primary hover:bg-brand-secondary rounded-lg transition-colors" disabled={!remoteSdp.trim()}>
            Generate Answer
          </button>
        )}

        {answerSdp && (
            <>
                <h2 className="text-xl font-bold">2. Send this answer back</h2>
                <p className="text-text-secondary text-sm">Copy this and send it back to the session creator.</p>
                <CopyableTextarea value={answerSdp} label="Your Session Answer" />
                <p className="text-center text-brand-light animate-pulse">Waiting for peer to connect...</p>
            </>
        )}
      </div>
    );
  }

  return null;
};
