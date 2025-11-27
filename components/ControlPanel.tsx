import React from 'react';
import { CameraSettings, LutPreset, AspectRatioGuide } from '../types';
import { Camera, Aperture, Timer, Sun, PlayCircle, StopCircle, Type, Ghost, Clapperboard, Palette, ImagePlus, Zap, Smartphone, Monitor, Hand } from 'lucide-react';

interface ControlPanelProps {
  settings: CameraSettings;
  onUpdate: (s: CameraSettings) => void;
  onToggleRecord: () => void;
  isRecording: boolean;
  recordingDuration?: number;
  onToggleTeleprompter: () => void;
  isTeleprompterActive: boolean;
  // New Props
  onCaptureGhost: () => void;
  onToggleGhost: () => void;
  isGhostVisible: boolean;
  hasGhostImage: boolean;
  activeLut: LutPreset;
  onChangeLut: (lut: LutPreset) => void;
  onToggleChroma: () => void;
  isChromaActive: boolean;
  onSyncSlate: () => void;
  activeGuide: AspectRatioGuide;
  onChangeGuide: (guide: AspectRatioGuide) => void;
  isAudioTriggerActive: boolean;
  onToggleAudioTrigger: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ 
  settings, 
  onUpdate, 
  onToggleRecord, 
  isRecording,
  recordingDuration = 0,
  onToggleTeleprompter,
  isTeleprompterActive,
  onCaptureGhost,
  onToggleGhost,
  isGhostVisible,
  hasGhostImage,
  activeLut,
  onChangeLut,
  onToggleChroma,
  isChromaActive,
  onSyncSlate,
  activeGuide,
  onChangeGuide,
  isAudioTriggerActive,
  onToggleAudioTrigger
}) => {
  
  const adjustISO = (delta: number) => {
      const newVal = Math.max(100, Math.min(25600, settings.iso + delta));
      onUpdate({ ...settings, iso: newVal });
  };

  const adjustAperture = (delta: number) => {
      const newVal = Math.max(1.4, Math.min(22, settings.aperture + delta));
      onUpdate({ ...settings, aperture: parseFloat(newVal.toFixed(1)) });
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Cycle through guides: None -> 9:16 -> 4:5 -> 1:1 -> None
  const toggleGuide = () => {
    if (activeGuide === 'none') onChangeGuide('9:16');
    else if (activeGuide === '9:16') onChangeGuide('4:5');
    else if (activeGuide === '4:5') onChangeGuide('1:1');
    else onChangeGuide('none');
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col gap-4 shadow-lg h-full overflow-y-auto custom-scrollbar">
       
        {/* Primary Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button 
              onClick={onToggleRecord}
              className={`py-4 rounded-lg font-bold text-sm flex flex-col items-center justify-center gap-2 transition-all ${
                  isRecording 
                  ? 'bg-zinc-800 text-red-500 border border-red-900/50 hover:bg-zinc-700' 
                  : 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/20 shadow-lg'
              }`}
          >
              {isRecording ? <StopCircle size={24} /> : <PlayCircle size={24} />}
              {isRecording ? (
                <div className="flex flex-col items-center">
                    <span>STOP REC</span>
                    <span className="text-xs font-mono font-normal opacity-80">{formatTime(recordingDuration)}</span>
                </div>
              ) : 'REC'}
          </button>

          <button 
              onClick={onToggleTeleprompter}
              className={`py-4 rounded-lg font-bold text-sm flex flex-col items-center justify-center gap-2 transition-all border ${
                  isTeleprompterActive
                  ? 'bg-blue-600 text-white border-blue-500 shadow-lg' 
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
              }`}
          >
              <Type size={24} />
              {isTeleprompterActive ? 'PROMPTER ON' : 'PROMPTER'}
          </button>
        </div>

        {/* --- CREATOR TOOLS SECTION --- */}
        <div className="space-y-3 pt-2 border-t border-zinc-800">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Creator Tools</h3>
          
          <div className="grid grid-cols-5 gap-2">
            {/* 1. SYNC SLATE */}
            <button 
              onClick={onSyncSlate}
              className="col-span-1 bg-zinc-800 hover:bg-zinc-700 text-yellow-500 p-2 rounded flex flex-col items-center justify-center gap-1 border border-zinc-700 active:bg-yellow-500 active:text-black transition-colors"
              title="Digital Slate Sync (Flash + Beep)"
            >
              <Zap size={18} />
            </button>

            {/* 2. CHROMA KEY */}
            <button 
              onClick={onToggleChroma}
              className={`col-span-1 p-2 rounded flex flex-col items-center justify-center gap-1 border transition-colors ${
                isChromaActive ? 'bg-green-900/30 text-green-500 border-green-500/50' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
              }`}
              title="Green Screen Preview"
            >
              <ImagePlus size={18} />
            </button>

             {/* 3. SOCIAL GUIDES (NEW) */}
             <button 
              onClick={toggleGuide}
              className={`col-span-1 p-2 rounded flex flex-col items-center justify-center gap-1 border transition-colors ${
                activeGuide !== 'none' ? 'bg-indigo-900/30 text-indigo-400 border-indigo-500/50' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
              }`}
              title="Social Media Aspect Ratios"
            >
              {activeGuide === 'none' ? <Monitor size={18}/> : <Smartphone size={18}/>}
              {activeGuide !== 'none' && <span className="text-[8px] font-bold">{activeGuide}</span>}
            </button>

            {/* 4. MAGIC SNAP (AUDIO TRIGGER) */}
             <button 
              onClick={onToggleAudioTrigger}
              className={`col-span-1 p-2 rounded flex flex-col items-center justify-center gap-1 border transition-colors ${
                isAudioTriggerActive ? 'bg-pink-900/30 text-pink-400 border-pink-500/50 animate-pulse' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
              }`}
              title="Magic Snap (Clap to Record)"
            >
              <Hand size={18} />
            </button>


            {/* 5. GHOST MODE */}
            <div className="col-span-1 flex gap-1">
              <button 
                onClick={onCaptureGhost}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 p-2 rounded border border-zinc-700 flex items-center justify-center"
                title="Capture Frame for Ghost"
              >
                <Camera size={14} />
              </button>
              <button 
                onClick={onToggleGhost}
                disabled={!hasGhostImage}
                className={`flex-1 flex flex-col items-center justify-center p-1 rounded border transition-colors hidden ${
                   isGhostVisible ? 'bg-purple-900/30 text-purple-400 border-purple-500/50' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                } ${!hasGhostImage && 'opacity-50 cursor-not-allowed'}`}
                title="Toggle Ghost Overlay"
              >
                <Ghost size={16} />
              </button>
            </div>
          </div>
          
           {/* GHOST TOGGLE EXTENDED */}
           {hasGhostImage && (
              <button 
                  onClick={onToggleGhost}
                  className={`w-full py-1 text-xs rounded border flex items-center justify-center gap-2 ${
                      isGhostVisible ? 'bg-purple-900/30 text-purple-400 border-purple-500/50' : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                  }`}
              >
                  <Ghost size={12} /> {isGhostVisible ? 'HIDE GHOST OVERLAY' : 'SHOW GHOST OVERLAY'}
              </button>
           )}


          {/* LUTs */}
          <div className="bg-zinc-950 p-2 rounded border border-zinc-800">
             <div className="flex items-center gap-2 text-xs text-zinc-400 mb-2">
               <Palette size={12} />
               <span>LUT PREVIEW</span>
             </div>
             <div className="grid grid-cols-5 gap-1">
                {(['none', 'cinematic', 'bw', 'rec709', 'teal-orange'] as LutPreset[]).map(lut => (
                  <button
                    key={lut}
                    onClick={() => onChangeLut(lut)}
                    className={`h-6 w-full rounded text-[8px] font-bold uppercase transition-all ${
                      activeLut === lut ? 'bg-orange-600 text-white ring-1 ring-white' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                    }`}
                  >
                    {lut === 'teal-orange' ? 'T&O' : lut.slice(0,4)}
                  </button>
                ))}
             </div>
          </div>
        </div>


        {/* Exposure Settings Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800">
            {/* ISO */}
            <div className="bg-black/40 p-2 rounded border border-zinc-800">
                <div className="flex justify-between text-zinc-400 text-[10px] mb-1">
                    <span className="flex items-center gap-1"><Sun size={10}/> ISO</span>
                </div>
                <div className="flex items-center justify-between">
                    <button onClick={() => adjustISO(-100)} className="text-zinc-500 hover:text-white text-lg font-bold">-</button>
                    <span className="text-lg font-mono font-bold text-white">{settings.iso}</span>
                    <button onClick={() => adjustISO(100)} className="text-zinc-500 hover:text-white text-lg font-bold">+</button>
                </div>
            </div>

            {/* Aperture */}
            <div className="bg-black/40 p-2 rounded border border-zinc-800">
                <div className="flex justify-between text-zinc-400 text-[10px] mb-1">
                    <span className="flex items-center gap-1"><Aperture size={10}/> APERTURE</span>
                </div>
                <div className="flex items-center justify-between">
                    <button onClick={() => adjustAperture(-0.1)} className="text-zinc-500 hover:text-white text-lg font-bold">-</button>
                    <span className="text-lg font-mono font-bold text-white">f/{settings.aperture}</span>
                    <button onClick={() => adjustAperture(0.1)} className="text-zinc-500 hover:text-white text-lg font-bold">+</button>
                </div>
            </div>

             {/* Shutter */}
             <div className="bg-black/40 p-2 rounded border border-zinc-800">
                <div className="flex justify-between text-zinc-400 text-[10px] mb-1">
                    <span className="flex items-center gap-1"><Timer size={10}/> SHUTTER</span>
                </div>
                <div className="flex items-center justify-center">
                    <span className="text-lg font-mono font-bold text-white">{settings.shutterSpeed}</span>
                </div>
            </div>

            {/* WB */}
            <div className="bg-black/40 p-2 rounded border border-zinc-800">
                <div className="flex justify-between text-zinc-400 text-[10px] mb-1">
                    <span className="flex items-center gap-1">WB</span>
                </div>
                <div className="flex items-center justify-center">
                    <span className="text-lg font-mono font-bold text-white">{settings.wb}</span>
                </div>
            </div>
        </div>
    </div>
  );
};