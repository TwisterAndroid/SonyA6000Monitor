export interface CameraSettings {
  iso: number;
  aperture: number;
  shutterSpeed: string;
  wb: string;
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  isExternal: boolean; // True if it looks like a USB/Wireless mic
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface AudioStats {
  peak: number; // 0 to 1
  average: number; // 0 to 1
  history: { time: number; level: number }[];
}

export type PermissionState = 'prompt' | 'granted' | 'denied';

// --- NEW FEATURES TYPES ---

export interface Shot {
  id: string;
  name: string;
  completed: boolean;
  take: number;
}

export type LutPreset = 'none' | 'cinematic' | 'bw' | 'rec709' | 'teal-orange';

export type AspectRatioGuide = 'none' | '9:16' | '4:5' | '1:1';

export interface ProductionState {
  activeLut: LutPreset;
  ghostImage: string | null; // Data URL
  isGhostVisible: boolean;
  isChromaActive: boolean;
  chromaColor: string; // Hex
  aspectRatioGuide: AspectRatioGuide;
  isAudioTriggerActive: boolean; // Magic Snap
}