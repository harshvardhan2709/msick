export interface ServerInfo {
  ip: string;
  port: number;
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  base64Size?: number;
}

export interface TransferProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}
