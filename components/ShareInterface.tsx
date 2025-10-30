
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ReceivedMessage } from '../types';
import { SendIcon, PaperclipIcon, DownloadIcon } from './icons';

interface ShareInterfaceProps {
  messages: ReceivedMessage[];
  sendText: (text: string) => void;
  sendFile: (file: File) => void;
  resetConnection: () => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const MessageItem: React.FC<{ message: ReceivedMessage }> = ({ message }) => {
    const isMe = message.sender === 'me';
    const bubbleClasses = isMe
        ? 'bg-brand-primary self-end'
        : 'bg-surface self-start';
    
    const renderContent = () => {
        if (message.type === 'text') {
            return <p className="text-white break-words">{message.content}</p>;
        }
        if (message.type === 'file') {
            return (
                <div className="flex items-center gap-3 p-2 bg-black bg-opacity-20 rounded-lg">
                    <div className="flex-shrink-0">
                        <DownloadIcon className="w-8 h-8 text-brand-light" />
                    </div>
                    <div className="flex-grow min-w-0">
                        <p className="font-semibold text-white truncate">{message.fileInfo.name}</p>
                        <p className="text-sm text-gray-300">{formatBytes(message.fileInfo.size)}</p>
                    </div>
                    <a 
                        href={message.downloadUrl} 
                        download={message.fileInfo.name} 
                        className="flex-shrink-0 p-2 bg-green-600 hover:bg-green-700 rounded-full transition-colors"
                        title={`Download ${message.fileInfo.name}`}
                    >
                        <DownloadIcon className="w-5 h-5 text-white" />
                    </a>
                </div>
            )
        }
        return null;
    }

    return (
        <div className={`flex flex-col w-full ${isMe ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-xs md:max-w-md lg:max-w-lg rounded-lg px-4 py-2 shadow-md ${bubbleClasses}`}>
                {renderContent()}
            </div>
             <p className="text-xs text-gray-500 mt-1">
                {new Date(message.timestamp).toLocaleTimeString()}
            </p>
        </div>
    );
};


export const ShareInterface: React.FC<ShareInterfaceProps> = ({ messages, sendText, sendFile, resetConnection }) => {
  const [text, setText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (text.trim()) {
      sendText(text);
      setText('');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      sendFile(file);
    }
    // Reset file input to allow selecting the same file again
    if(fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="w-full max-w-2xl h-[calc(100vh-8rem)] flex flex-col bg-surface rounded-lg shadow-2xl overflow-hidden border border-gray-700">
      <div className="p-4 border-b border-gray-700 flex justify-between items-center">
        <h2 className="text-lg font-bold text-white">Share Session Active</h2>
        <button 
          onClick={resetConnection}
          className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 rounded-md font-semibold transition-colors"
        >
          Disconnect
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <MessageItem key={msg.id} message={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button onClick={triggerFileSelect} className="p-2 text-gray-400 hover:text-white rounded-full bg-gray-700 hover:bg-gray-600 transition-colors">
            <PaperclipIcon />
          </button>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message or drop a file..."
            className="flex-1 px-4 py-2 bg-gray-700 text-white border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-brand-primary"
          />
          <button onClick={handleSend} className="p-3 bg-brand-primary hover:bg-brand-secondary text-white rounded-full transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed" disabled={!text.trim()}>
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
};
