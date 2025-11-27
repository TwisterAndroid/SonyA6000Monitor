import React, { useState, useEffect, useRef } from 'react';
import { CameraSettings, ConnectionState, Shot, LutPreset, AspectRatioGuide } from './types';
import { LiveView } from './components/LiveView';
import { AudioMonitor } from './components/AudioMonitor';
import { ControlPanel } from './components/ControlPanel';
import { Teleprompter } from './components/Teleprompter';
import { ShotList } from './components/ShotList';
import { Wifi, Settings } from 'lucide-react';

export default function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showTeleprompter, setShowTeleprompter] = useState(false);
  
  // --- PRODUCTION TOOLS STATE ---
  const [shots, setShots] = useState<Shot[]>([]);
  const [activeShotId, setActiveShotId] = useState<string | null>(null);
  
  const [activeLut, setActiveLut] = useState<LutPreset>('none');
  const [ghostImage, setGhostImage] = useState<string | null>(null);
  const [isGhostVisible, setIsGhostVisible] = useState(false);
  const [isChromaActive, setIsChromaActive] = useState(false);
  const [isSyncFlashActive, setIsSyncFlashActive] = useState(false);
  const [activeGuide, setActiveGuide] = useState<AspectRatioGuide>('none');
  const [isAudioTriggerActive, setIsAudioTriggerActive] = useState(false);

  const [settings, setSettings] = useState<CameraSettings>({
    iso: 800,
    aperture: 2.8,
    shutterSpeed: '1/50',
    wb: '5600K'
  });

  // Media Streams for Recording and Teleprompter
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  // Simulate Connection Sequence
  useEffect(() => {
    const timer1 = setTimeout(() => setConnectionState(ConnectionState.CONNECTING), 1000);
    const timer2 = setTimeout(() => setConnectionState(ConnectionState.CONNECTED), 3500);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, []);

  // --- SHOT LIST HANDLERS ---
  const handleAddShot = (name: string) => {
    const newShot: Shot = {
      id: Date.now().toString(),
      name,
      completed: false,
      take: 1
    };
    setShots([...shots, newShot]);
    if (!activeShotId) setActiveShotId(newShot.id);
  };

  const handleDeleteShot = (id: string) => {
    setShots(shots.filter(s => s.id !== id));
    if (activeShotId === id) setActiveShotId(null);
  };

  const handleToggleShotComplete = (id: string) => {
    setShots(shots.map(s => s.id === id ? { ...s, completed: !s.completed } : s));
  };

  // --- GHOST MODE HANDLER ---
  const handleCaptureGhost = () => {
    const video = document.getElementById('live-video-element') as HTMLVideoElement;
    if (video) {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            setGhostImage(dataUrl);
            setIsGhostVisible(true);
        }
    }
  };

  // --- DIGITAL SLATE SYNC LOGIC ---
  const handleSyncSlate = () => {
    // 1. Visual Flash
    setIsSyncFlashActive(true);
    setTimeout(() => setIsSyncFlashActive(false), 100); // 3 frames approx at 30fps

    // 2. Audio Beep
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.value = 1000; // 1kHz tone
        gain.gain.value = 0.5;
        
        osc.start();
        osc.stop(ctx.currentTime + 0.1); // 100ms beep
    }
  };


  // --- RECORDING LOGIC ---
  const handleToggleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const getSupportedMimeType = () => {
    const types = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4'
    ];
    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return '';
  };

  const startRecording = () => {
    if (!videoStream && !audioStream) {
       // Allow voice recorder mode
       if (!audioStream) {
          alert("No source detected. Cannot record.");
          return;
       }
    }

    try {
      const tracks: MediaStreamTrack[] = [];
      if (videoStream) {
        const videoTracks = videoStream.getVideoTracks();
        if (videoTracks.length > 0) tracks.push(...videoTracks);
      }
      if (audioStream) {
        const audioTracks = audioStream.getAudioTracks();
        if (audioTracks.length > 0) tracks.push(...audioTracks);
      }

      const combinedStream = new MediaStream(tracks);
      const mimeType = getSupportedMimeType();
      const options: MediaRecorderOptions = mimeType ? { mimeType } : {};
      
      const recorder = new MediaRecorder(combinedStream, options);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onerror = (event) => {
        console.error("Recorder error:", event);
        stopRecording();
      };

      recorder.onstop = () => {
        const type = mimeType || 'video/webm';
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        const url = URL.createObjectURL(blob);
        
        const isMp4 = type.includes('mp4');
        const ext = isMp4 ? 'mp4' : 'webm';

        // Generate Filename from Shot List
        const activeShot = shots.find(s => s.id === activeShotId);
        let filename = `A6000_REC`;
        
        if (activeShot) {
            filename = `${activeShot.name.replace(/\s+/g, '_')}_Take${activeShot.take}`;
            // Auto increment take
            setShots(prev => prev.map(s => s.id === activeShot.id ? { ...s, take: s.take + 1 } : s));
        } else {
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}${String(now.getMinutes()).padStart(2,'0')}`;
            filename += `_${timestamp}`;
        }

        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${filename}.${ext}`;
        
        document.body.appendChild(a);
        a.click();
        
        setTimeout(() => {
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }, 100);
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      
      setRecordingDuration(0);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Failed to start recording:", err);
      alert(`Failed to start recording: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  // --- AUDIO TRIGGER HANDLER ---
  const handleAudioTrigger = () => {
      console.log("Magic Snap Triggered!");
      // 3 second countdown logic could be added here
      handleToggleRecord();
  };

  return (
    <div className="min-h-[100dvh] bg-zinc-950 text-zinc-200 flex flex-col">
      {/* Header */}
      <header className="h-14 border-b border-zinc-800 bg-black/50 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
            <div className="bg-orange-600 text-white font-bold px-2 py-0.5 rounded text-sm">PRO</div>
            <h1 className="font-semibold text-lg tracking-tight">A6000 MONITOR</h1>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-full border border-zinc-800">
                <Wifi size={14} className={connectionState === ConnectionState.CONNECTED ? 'text-blue-500' : 'text-zinc-500'} />
                <span className="text-xs font-mono text-zinc-400">
                    {connectionState === ConnectionState.CONNECTED ? 'DIRECT-A6000:CONNECTED' : 'DISCONNECTED'}
                </span>
            </div>
            <button className="p-2 hover:bg-zinc-800 rounded-full transition-colors">
                <Settings size={20} className="text-zinc-400" />
            </button>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="flex-1 p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-[1920px] mx-auto w-full">
        
        {/* Left Column: Live View (Large) */}
        <section className="lg:col-span-8 flex flex-col gap-4">
             <div className="aspect-video w-full bg-black rounded-lg shadow-2xl relative overflow-hidden group">
                <LiveView 
                    connectionState={connectionState} 
                    settings={settings}
                    isRecording={isRecording}
                    onStreamReady={setVideoStream}
                    // Production Tools Props
                    activeLut={activeLut}
                    ghostImage={ghostImage}
                    isGhostVisible={isGhostVisible}
                    isChromaActive={isChromaActive}
                    isSyncFlashActive={isSyncFlashActive}
                    activeGuide={activeGuide}
                />
                
                {/* Teleprompter Overlay */}
                {showTeleprompter && (
                  <Teleprompter 
                    audioStream={audioStream} 
                    onClose={() => setShowTeleprompter(false)}
                    isRecording={isRecording}
                    onToggleRecord={handleToggleRecord}
                    recordingDuration={recordingDuration}
                  />
                )}
             </div>
             
             {/* Bottom Bar: Shot List & Info */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide items-center">
                    {['S-Log2', 'XAVC S', '4K Output: OFF', 'SteadyShot: ON'].map((tag, i) => (
                        <span key={i} className="px-3 py-1 bg-zinc-900 border border-zinc-800 rounded text-xs font-mono text-zinc-500 whitespace-nowrap">
                            {tag}
                        </span>
                    ))}
                 </div>
                 
                 {/* Shot List (Placed here for horizontal layout on larger screens) */}
                 <div className="hidden lg:block">
                     {/* Can be placed here if we want wide layout, but putting it in sidebar for now */}
                 </div>
             </div>
        </section>

        {/* Right Column: Controls & Audio */}
        <section className="lg:col-span-4 flex flex-col gap-6 h-[calc(100vh-6rem)] overflow-hidden">
            
            {/* Audio Monitor */}
            <div className="flex-[0.4] min-h-[250px]">
                <AudioMonitor 
                  active={true} 
                  onStreamReady={setAudioStream}
                  isAudioTriggerActive={isAudioTriggerActive}
                  onTrigger={handleAudioTrigger}
                />
            </div>

            {/* Shot List (Mobile/Desktop) */}
            <div className="flex-[0.25] min-h-[150px]">
              <ShotList 
                shots={shots}
                activeShotId={activeShotId}
                onSelectShot={setActiveShotId}
                onAddShot={handleAddShot}
                onToggleComplete={handleToggleShotComplete}
                onDeleteShot={handleDeleteShot}
              />
            </div>

            {/* Camera Controls & Tools */}
            <div className="flex-[0.35] min-h-[300px] overflow-hidden">
                <ControlPanel 
                    settings={settings} 
                    onUpdate={setSettings}
                    isRecording={isRecording}
                    recordingDuration={recordingDuration}
                    onToggleRecord={handleToggleRecord}
                    onToggleTeleprompter={() => setShowTeleprompter(prev => !prev)}
                    isTeleprompterActive={showTeleprompter}
                    // Production Tools Props
                    activeLut={activeLut}
                    onChangeLut={setActiveLut}
                    isGhostVisible={isGhostVisible}
                    hasGhostImage={!!ghostImage}
                    onCaptureGhost={handleCaptureGhost}
                    onToggleGhost={() => setIsGhostVisible(prev => !prev)}
                    isChromaActive={isChromaActive}
                    onToggleChroma={() => setIsChromaActive(prev => !prev)}
                    onSyncSlate={handleSyncSlate}
                    activeGuide={activeGuide}
                    onChangeGuide={setActiveGuide}
                    isAudioTriggerActive={isAudioTriggerActive}
                    onToggleAudioTrigger={() => setIsAudioTriggerActive(prev => !prev)}
                />
            </div>

        </section>
      </main>
    </div>
  );
}