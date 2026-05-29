export type MessageType = 'text' | 'image' | 'voice' | 'video' | 'file';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface Chat {
  id: string;
  title: string;
  peerDeviceId: string;
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  id: string;
  chatId: string;
  from: string;
  to: string;
  text?: string;
  type: MessageType;
  timestamp: number;
  isOutgoing: boolean;
  fileUri?: string;
  base64Payload?: string;
  mimeType?: string;
  duration?: number;
  status: MessageStatus;
}

export interface RelayPayload {
  id: string;
  chatId: string;
  from: string;
  to: string;
  text?: string;
  type: MessageType;
  timestamp: number;
  base64Payload?: string;
  mimeType?: string;
  duration?: number;
}
