import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Settings2, AlertCircle, RefreshCw } from 'lucide-react';
import { AreaChart, Area, YAxis, ResponsiveContainer } from 'recharts';
import { AudioDevice, PermissionState } from '../types';

interface AudioMonitorProps {
  active: boolean;
  onStreamReady?: (stream: MediaStream) => void;
  isAudioTriggerActive: boolean;
  onTrigger?: () => void;
}

// Extend Window interface for Safari support
interface IWindow extends Window {
  webkitAudioContext: typeof AudioContext;
}

export const AudioMonitor: React.FC<AudioMonitorProps> = ({ active, onStreamReady, isAudioTriggerActive, onTrigger }) => {
  const [permission, setPermission] = useState<PermissionState>('prompt');
  const [devices, setDevices] = useState<AudioDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const [levels, setLevels] = useState<{ left: number; right: number }>({ left: 0, right: 0 });
  const [isClipping, setIsClipping] = useState(false);
  const [historyData, setHistoryData] = useState<{time: number, level: number}[]>([]);

  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // CLAP DETECTION REFS
  const lastClapTimeRef = useRef<number>(0);
  const clapCountRef = useRef<number>(0);

  // Initialize Audio
  const initAudio = async (deviceId?: string) => {
    try {
      if (audioContextRef.current) {
        await audioContextRef.current.close();
      }
      
      // Stop previous tracks if they exist
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
          channelCount: 2
        }
      });
      
      streamRef.current = stream;
      if (onStreamReady) onStreamReady(stream);

      setPermission('granted');
      
      const AudioContextClass = window.AudioContext || (window as unknown as IWindow).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 2048; // Resolution for waveform
      const source = audioCtx.createMediaStreamSource(stream);
      
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      sourceRef.current = source;

      updateDevices();
      draw();
    } catch (err) {
      console.error("Audio Error:", err);
      setPermission('denied');
    }
  };

  const updateDevices = async () => {
    try {
      const devs = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devs
        .filter(d => d.kind === 'audioinput')
        .map(d => ({
          deviceId: d.deviceId,
          label: d.label || `Microphone ${d.deviceId.slice(0, 5)}...`,
          isExternal: d.label.toLowerCase().includes('usb') || 
                    d.label.toLowerCase().includes('hollyland') || 
                    d.label.toLowerCase().includes('synco') || 
                    d.label.toLowerCase().includes('wireless')
        }));
      setDevices(audioInputs);
    } catch(e) {
      console.error("Could not enumerate devices", e);
    }
  };

  // Main visualization loop
  const draw = () => {
    if (!analyserRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteTimeDomainData(dataArray);

    // Calculate RMS for VU Meter
    let sum = 0;
    let peak = 0;
    for (let i = 0; i < bufferLength; i++) {
        const x = (dataArray[i] - 128) / 128.0;
        const absX = Math.abs(x);
        if (absX > peak) peak = absX;
        sum += x * x;
    }
    const rms = Math.sqrt(sum / bufferLength);
    // Convert to dB-ish (0 to 1 scale roughly)
    const val = Math.min(1, rms * 5); // Gain boost for visibility
    
    // Check Clipping
    if (val > 0.95) {
        setIsClipping(true);
        setTimeout(() => setIsClipping(false), 1000);
    }

    // --- DOUBLE CLAP DETECTION ---
    // If Audio Trigger is active
    if (isAudioTriggerActive && peak > 0.6) { // Threshold for a "loud" noise (clap)
        const now = Date.now();
        // Debounce: ensure claps are distinct (at least 100ms apart)
        if (now - lastClapTimeRef.current > 100) {
            
            // Check if this is the second clap within a valid window (e.g., 800ms)
            if (now - lastClapTimeRef.current < 800) {
                 // Double clap detected!
                 console.log("DOUBLE CLAP DETECTED! TRIGGER!");
                 if (onTrigger) onTrigger();
                 lastClapTimeRef.current = 0; // Reset
            } else {
                 // First clap or too late for double
                 lastClapTimeRef.current = now;
            }
        }
    }

    setLevels({
        left: val,
        right: val * (0.9 + Math.random() * 0.2) // Simulate slight stereo variance
    });

    // Update History Graph (every 5 frames to save perf)
    if (Math.random() > 0.8) {
        setHistoryData(prev => {
            const next = [...prev, { time: Date.now(), level: val * 100 }];
            if (next.length > 50) next.shift();
            return next;
        });
    }

    // Draw Waveform on Canvas
    if (canvasRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            const width = canvas.width;
            const height = canvas.height;
            
            ctx.fillStyle = '#09090b'; // zinc-950
            ctx.fillRect(0, 0, width, height);

            ctx.lineWidth = 2;
            ctx.strokeStyle = isAudioTriggerActive ? '#ec4899' : '#f97316'; // Pink if Trigger Active, else Orange
            ctx.beginPath();

            const sliceWidth = width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * height / 2;

                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);

                x += sliceWidth;
            }
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        }
    }

    animationFrameRef.current = requestAnimationFrame(draw);
  };

  useEffect(() => {
    if (active) {
        initAudio();
    } else {
        audioContextRef.current?.close();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
        audioContextRef.current?.close();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const handleDeviceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedDeviceId(newId);
    initAudio(newId);
  };

  // UI Components helpers
  const getBarColor = (val: number, index: number, total: number) => {
      const pct = index / total;
      if (pct > 0.85) return 'bg-red-500';
      if (pct > 0.6) return 'bg-yellow-500';
      return 'bg-green-500';
  };

  return (
    <div className={`bg-zinc-900 border rounded-lg p-4 flex flex-col h-full shadow-lg overflow-hidden transition-colors duration-500 ${isAudioTriggerActive ? 'border-pink-500/30' : 'border-zinc-800'}`}>
      <div className="flex justify-between items-center mb-4 border-b border-zinc-800 pb-2">
        <h2 className="text-zinc-100 font-semibold flex items-center gap-2">
          <Mic className={`w-4 h-4 ${isAudioTriggerActive ? 'text-pink-500' : 'text-orange-500'}`} />
          Audio Monitor
        </h2>
        
        {isAudioTriggerActive && (
            <span className="text-[10px] font-bold bg-pink-900/50 text-pink-400 px-2 py-0.5 rounded animate-pulse">MAGIC SNAP ON</span>
        )}

        {permission === 'denied' && <span className="text-red-500 text-xs font-mono flex items-center gap-1"><AlertCircle size={12}/> PERMISSION DENIED</span>}
        {permission === 'granted' && !isAudioTriggerActive && <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs text-green-500 font-mono">LIVE</span>
        </div>}
      </div>

      {permission !== 'granted' ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4">
           <MicOff className="w-12 h-12 text-zinc-600 mb-2" />
           <p className="text-zinc-400 text-sm mb-4">Microphone access needed for monitoring.</p>
           <button 
             onClick={() => initAudio()}
             className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors">
             Enable Audio
           </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Input Selection */}
            <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-zinc-500" />
                <select 
                    value={selectedDeviceId} 
                    onChange={handleDeviceChange}
                    className="bg-zinc-950 text-xs text-zinc-300 border border-zinc-800 rounded px-2 py-1 flex-1 outline-none focus:border-orange-500">
                    {devices.map(d => (
                        <option key={d.deviceId} value={d.deviceId}>
                            {d.isExternal ? '📡 ' : '🎤 '}{d.label}
                        </option>
                    ))}
                </select>
                <button onClick={updateDevices} className="p-1 hover:bg-zinc-800 rounded text-zinc-400">
                    <RefreshCw size={14} />
                </button>
            </div>

            {/* Main Visualizer Area */}
            <div className="grid grid-cols-1 md:grid-cols-[1fr_80px] gap-4 flex-1 min-h-0">
                
                {/* Waveform & History */}
                <div className="flex flex-col gap-2 min-h-0 overflow-hidden">
                     {/* Oscilloscope */}
                     <div className="bg-black border border-zinc-800 rounded h-32 relative overflow-hidden flex-shrink-0">
                        <canvas ref={canvasRef} width={400} height={128} className="w-full h-full" />
                        <span className="absolute top-1 left-1 text-[10px] text-zinc-600 font-mono">OSCILLOSCOPE</span>
                     </div>
                     
                     {/* Loudness History */}
                     <div className="h-32 bg-black border border-zinc-800 rounded relative w-full overflow-hidden flex-shrink-0">
                        <span className="absolute top-1 left-1 text-[10px] text-zinc-600 font-mono z-10">LOUDNESS HISTORY (30s)</span>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <AreaChart data={historyData}>
                                <YAxis hide domain={[0, 100]} />
                                <Area type="monotone" dataKey="level" stroke="#3f3f46" fill="#18181b" strokeWidth={1} isAnimationActive={false} />
                            </AreaChart>
                        </ResponsiveContainer>
                     </div>
                </div>

                {/* VU Meters */}
                <div className="bg-black border border-zinc-800 rounded p-2 flex justify-center gap-2 relative h-full min-h-[120px]">
                    {/* Clipping Indicator */}
                    <div className={`absolute top-0 inset-x-0 h-4 ${isClipping ? 'bg-red-600' : 'bg-transparent'} transition-colors duration-100`}></div>
                    
                    {/* Left Channel */}
                    <div className="flex flex-col items-center h-full w-4 gap-[1px]">
                         {Array.from({ length: 20 }).map((_, i) => {
                             const threshold = (20 - i) / 20;
                             const active = levels.left >= threshold;
                             return (
                                 <div key={`L-${i}`} className={`w-full h-full flex-1 rounded-[1px] ${active ? getBarColor(levels.left, 20-i, 20) : 'bg-zinc-900'}`}></div>
                             );
                         })}
                         <span className="text-[10px] text-zinc-500 font-mono mt-1">L</span>
                    </div>

                    {/* Right Channel */}
                    <div className="flex flex-col items-center h-full w-4 gap-[1px]">
                         {Array.from({ length: 20 }).map((_, i) => {
                             const threshold = (20 - i) / 20;
                             const active = levels.right >= threshold;
                             return (
                                 <div key={`R-${i}`} className={`w-full h-full flex-1 rounded-[1px] ${active ? getBarColor(levels.right, 20-i, 20) : 'bg-zinc-900'}`}></div>
                             );
                         })}
                         <span className="text-[10px] text-zinc-500 font-mono mt-1">R</span>
                    </div>
                </div>

            </div>
            
            {/* Legend / Status */}
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-auto pt-2">
                <span>Sample Rate: 48kHz</span>
                <span>Latency: ~5ms</span>
            </div>
        </div>
      )}
    </div>
  );
};