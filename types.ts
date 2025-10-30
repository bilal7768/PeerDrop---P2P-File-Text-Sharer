
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'failed';

export interface TextMessage {
  type: 'text';
  id: string;
  content: string;
  sender: 'me' | 'peer';
  timestamp: number;
}

export interface FileInfo {
  name: string;
  size: number;
  type: string;
}

export interface FileMessage {
  type: 'file';
  id: string;
  fileInfo: FileInfo;
  downloadUrl: string;
  sender: 'me' | 'peer';
  timestamp: number;
}

export type ReceivedMessage = TextMessage | FileMessage;

// Internal message types for file transfer protocol
export interface FileMetaMessage {
  type: 'file-meta';
  payload: FileInfo;
}

export interface FileEndMessage {
    type: 'file-end';
}
