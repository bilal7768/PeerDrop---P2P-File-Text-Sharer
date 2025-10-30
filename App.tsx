
import React from 'react';
import { useWebRTC } from './hooks/useWebRTC';
import { ConnectionManager } from './components/ConnectionManager';
import { ShareInterface } from './components/ShareInterface';

function App() {
  const { 
    connectionState, 
    receivedMessages, 
    offerSdp, 
    answerSdp, 
    createOffer, 
    createAnswer, 
    setRemoteAnswer,
    sendText,
    sendFile,
    resetConnection
  } = useWebRTC();

  const renderContent = () => {
    switch (connectionState) {
      case 'disconnected':
      case 'failed':
        return (
          <>
            <h1 className="text-4xl md:text-5xl font-extrabold text-center mb-2">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-primary to-brand-secondary">
                PeerDrop
              </span>
            </h1>
            <p className="text-center text-text-secondary mb-8">Securely share files & text directly between devices.</p>
            {connectionState === 'failed' && (
              <p className="text-center text-red-500 mb-4 font-semibold">Connection failed. Please try again.</p>
            )}
            <ConnectionManager 
              offerSdp={offerSdp}
              answerSdp={answerSdp}
              createOffer={createOffer}
              createAnswer={createAnswer}
              setRemoteAnswer={setRemoteAnswer}
            />
          </>
        );
      case 'connecting':
        return (
            <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-16 h-16 border-4 border-t-brand-primary border-gray-600 rounded-full animate-spin"></div>
                <p className="text-xl text-text-secondary">Connecting...</p>
            </div>
        );
      case 'connected':
        return (
            <ShareInterface 
                messages={receivedMessages}
                sendText={sendText}
                sendFile={sendFile}
                resetConnection={resetConnection}
            />
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center p-4">
      {renderContent()}
    </main>
  );
}

export default App;
