import React, { useState, useEffect, useRef } from 'react';
import { CameraSettings, ConnectionState, LutPreset, AspectRatioGuide } from '../types';
import { Battery, Focus, Grid3X3, CameraOff, Clapperboard, AlertTriangle, Smartphone } from 'lucide-react';

interface LiveViewProps {
  connectionState: ConnectionState;
  settings: CameraSettings;
  isRecording: boolean;
  onStreamReady?: (stream: MediaStream) => void;
  // New features props
  activeLut: LutPreset;
  ghostImage: string | null;
  isGhostVisible: boolean;
  isChromaActive: boolean;
  isSyncFlashActive: boolean; // For Digital Slate
  activeGuide: AspectRatioGuide;
  onCaptureFrame?: (dataUrl: string) => void;
}

export const LiveView: React.FC<LiveViewProps> = ({ 
  connectionState, 
  settings, 
  isRecording, 
  onStreamReady,
  activeLut,
  ghostImage,
  isGhostVisible,
  isChromaActive,
  isSyncFlashActive,
  activeGuide,
  onCaptureFrame
}) => {
  const [showGrid, setShowGrid] = useState(true);
  const [showPeaking, setShowPeaking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); // For Chroma Key
  const [isVideoAvailable, setIsVideoAvailable] = useState(false);
  const [errorType, setErrorType] = useState<'permission' | 'device' | 'generic' | null>(null);
  const requestRef = useRef<number>();

  // Simulate a live histogram
  const [histogramData, setHistogramData] = useState<number[]>([]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      const data = Array.from({ length: 20 }, () => Math.random() * 50 + 20);
      setHistogramData(data);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Initialize Camera Stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    let isActive = true;

    const startVideo = async () => {
      if (connectionState === ConnectionState.CONNECTED) {
        setErrorType(null);
        try {
          try {
            stream = await navigator.mediaDevices.getUserMedia({ 
              video: { 
                width: { ideal: 1920 },
                height: { ideal: 1080 }
              } 
            });
          } catch (hdError) {
            console.warn("HD video constraint failed, trying default resolution...", hdError);
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          }
          
          if (!isActive) {
             if (stream) stream.getTracks().forEach(t => t.stop());
             return;
          }

          if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
            try {
              await videoRef.current.play();
            } catch (playError) {
              console.error("Play error:", playError);
            }
          }
          
          if (stream) {
            setIsVideoAvailable(true);
            if (onStreamReady) onStreamReady(stream);
          }

        } catch (err: any) {
          if (isActive) {
            setIsVideoAvailable(false);
            if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                console.warn("No camera device found.");
                setErrorType('device');
            } else if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                console.warn("Camera permission denied.");
                setErrorType('permission');
            } else {
                console.error("Error accessing camera:", err);
                setErrorType('generic');
            }
          }
        }
      }
    };

    startVideo();

    return () => {
      isActive = false;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [connectionState, onStreamReady]);


  // Chroma Key Processing Loop
  useEffect(() => {
    if (!isChromaActive || !isVideoAvailable) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      if (video && canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx && video.readyState === video.HAVE_ENOUGH_DATA) {
          // Resize canvas to match video
          if (canvas.width !== video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }

          // Draw current frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Get pixel data
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const l = frame.data.length / 4;
          
          // Simple Green Screen Algorithm
          for (let i = 0; i < l; i++) {
            const r = frame.data[i * 4 + 0];
            const g = frame.data[i * 4 + 1];
            const b = frame.data[i * 4 + 2];
            
            // If green is dominant
            if (g > 100 && g > r * 1.5 && g > b * 1.5) {
              frame.data[i * 4 + 3] = 0; // Set Alpha to 0
            }
          }
          
          ctx.putImageData(frame, 0, 0);
        }
      }
      requestRef.current = requestAnimationFrame(processFrame);
    };

    requestRef.current = requestAnimationFrame(processFrame);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isChromaActive, isVideoAvailable]);


  // Helper to expose frame capture to parent
  useEffect(() => {
    if (onCaptureFrame && videoRef.current) {
        // We attach a temporary method to the DOM element or use a ref pattern
        // For simplicity in this structure, we just ensure the videoRef is accessible
    }
  }, [onCaptureFrame]);


  // LUT CSS Strings
  const getLutStyle = () => {
    switch (activeLut) {
      case 'cinematic': return { filter: 'contrast(1.1) saturate(1.2) sepia(0.2)' };
      case 'bw': return { filter: 'grayscale(1) contrast(1.2)' };
      case 'rec709': return { filter: 'saturate(1.2) contrast(1.05)' };
      case 'teal-orange': return { filter: 'contrast(1.1) saturate(1.3) hue-rotate(-10deg) sepia(0.3)' }; // approx
      default: return {};
    }
  };

  const renderNoSignal = () => {
    let message = "NO SIGNAL";
    let subMessage = "";
    let icon = <CameraOff className={`w-12 h-12 mb-4 opacity-50`} />;

    if (errorType === 'device') {
        message = "NO CAMERA FOUND";
        subMessage = "Check your capture card connection";
        icon = <AlertTriangle className="w-12 h-12 mb-4 text-yellow-600 opacity-80" />;
    } else if (errorType === 'permission') {
        message = "PERMISSION DENIED";
        subMessage = "Allow camera access in browser settings";
        icon = <CameraOff className="w-12 h-12 mb-4 text-red-600 opacity-80" />;
    }

    return (
      <div className="w-full h-full bg-black flex flex-col items-center justify-center text-zinc-500 border border-zinc-800 rounded-lg relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")` }}></div>
        {icon}
        <span className="font-mono text-lg text-center font-bold">{message}</span>
        {subMessage && <span className="font-mono text-xs text-center mt-2 opacity-60 max-w-[200px]">{subMessage}</span>}
      </div>
    );
  };

  if (connectionState !== ConnectionState.CONNECTED || !isVideoAvailable) {
    return renderNoSignal();
  }

  return (
    <div className="relative w-full h-full bg-black rounded-lg overflow-hidden border border-zinc-800 shadow-2xl group flex items-center justify-center">
      
      {/* 1. Background Layer (for Chroma Key transparency) */}
      {isChromaActive && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url("https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=2070&auto=format&fit=crop")', // Demo cyberpunk background
          }}
        ></div>
      )}

      {/* 2. Video Feed Layer */}
      <div className="absolute inset-0 z-10" style={getLutStyle()}>
        {/* If Chroma is active, we show the processed Canvas. If not, we show the Video. */}
        <video 
          ref={videoRef}
          className={`w-full h-full object-contain transition-all duration-200 ${isChromaActive ? 'hidden' : ''} ${showPeaking ? 'brightness-50 grayscale contrast-125' : ''}`}
          muted
          playsInline
          autoPlay
          id="live-video-element" // used for direct capture in App.tsx
        />
        <canvas 
          ref={canvasRef}
          className={`w-full h-full object-contain ${!isChromaActive ? 'hidden' : ''}`}
        />
      </div>

      {/* 3. Ghost Mode Overlay */}
      {isGhostVisible && ghostImage && (
        <div className="absolute inset-0 z-20 opacity-40 pointer-events-none mix-blend-difference">
          <img src={ghostImage} alt="Ghost" className="w-full h-full object-contain grayscale" />
        </div>
      )}

      {/* 4. Digital Slate Flash (Sync) */}
      {isSyncFlashActive && (
        <div className="absolute inset-0 z-[100] bg-white animate-out fade-out duration-300"></div>
      )}

      {/* 5. Focus Peaking Simulation (Green Edges) */}
      {showPeaking && !isChromaActive && (
        <div className="absolute inset-0 pointer-events-none opacity-40 mix-blend-screen z-20" 
             style={{ 
               boxShadow: 'inset 0 0 100px rgba(0,255,0,0.1)',
               backgroundImage: 'radial-gradient(circle, #00ff00 1px, transparent 1px)',
               backgroundSize: '3px 3px'
             }}>
        </div>
      )}

      {/* 6. Recording Indicator */}
      {isRecording && (
        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/60 px-3 py-1 rounded-full backdrop-blur-sm z-50 border border-red-500/30">
           <div className="w-3 h-3 rounded-full bg-red-600 animate-pulse"></div>
           <span className="text-red-500 font-bold font-mono text-sm">REC</span>
        </div>
      )}

      {/* 7. Grid Overlay */}
      {showGrid && activeGuide === 'none' && (
        <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-30 opacity-30">
          <div className="border-r border-b border-white/50"></div>
          <div className="border-r border-b border-white/50"></div>
          <div className="border-b border-white/50"></div>
          <div className="border-r border-b border-white/50"></div>
          <div className="border-r border-b border-white/50"></div>
          <div className="border-b border-white/50"></div>
          <div className="border-r border-white/50"></div>
          <div className="border-r border-white/50"></div>
          <div></div>
        </div>
      )}

      {/* 8. SOCIAL SAFE ZONES (Aspect Ratio Guides) */}
      {activeGuide !== 'none' && (
        <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center">
             {/* 
                 The video is likely 16:9. We want to dim everything OUTSIDE the target ratio.
                 Since video scales with object-contain, we use percentages relative to container.
             */}
             {activeGuide === '9:16' && (
                <div className="relative h-full aspect-[9/16] border-x-2 border-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]">
                   <div className="absolute top-4 right-4 opacity-50"><Smartphone size={24} /></div>
                </div>
             )}
             {activeGuide === '4:5' && (
                <div className="relative h-full aspect-[4/5] border-x-2 border-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"></div>
             )}
             {activeGuide === '1:1' && (
                <div className="relative h-full aspect-square border-x-2 border-white/30 shadow-[0_0_0_9999px_rgba(0,0,0,0.7)]"></div>
             )}
        </div>
      )}

      {/* Top Info Bar */}
      <div className="absolute top-0 left-0 right-0 p-3 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent z-40 pointer-events-none">
        <div className="flex space-x-4 text-sm font-mono text-white">
          <div className="flex flex-col">
            <span className="text-xs text-zinc-400">MODE</span>
            <span className="font-bold text-orange-500">M</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs text-zinc-400">LUT</span>
            <span className="uppercase">{activeLut}</span>
          </div>
          {activeGuide !== 'none' && (
             <div className="flex flex-col animate-pulse">
                <span className="text-xs text-zinc-400">GUIDE</span>
                <span className="uppercase text-yellow-500">{activeGuide}</span>
             </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
             <Battery className="w-6 h-6 text-white fill-green-500/20" />
             <span className="font-mono text-sm">82%</span>
        </div>
      </div>

      {/* Bottom Info Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent flex justify-between items-end z-40 pointer-events-auto">
        {/* Exposure Settings */}
        <div className="flex items-end space-x-6 font-mono pointer-events-none">
            <div>
                <span className="block text-xs text-orange-500 mb-1">SHUTTER</span>
                <span className="text-xl font-bold">{settings.shutterSpeed}</span>
            </div>
            <div>
                <span className="block text-xs text-zinc-400 mb-1">APERTURE</span>
                <span className="text-xl font-bold">f/{settings.aperture}</span>
            </div>
            <div>
                <span className="block text-xs text-zinc-400 mb-1">ISO</span>
                <span className="text-xl font-bold">{settings.iso}</span>
            </div>
        </div>

        {/* Mini Histogram & Toggles */}
        <div className="flex flex-col items-end space-y-2">
            <div className="flex space-x-2">
                <button 
                    onClick={() => setShowPeaking(!showPeaking)}
                    className={`p-1 rounded ${showPeaking ? 'bg-green-600 text-white' : 'bg-white/10 text-zinc-400'}`} title="Focus Peaking">
                    <Focus size={16} />
                </button>
                <button 
                    onClick={() => setShowGrid(!showGrid)}
                    className={`p-1 rounded ${showGrid ? 'bg-orange-600 text-white' : 'bg-white/10 text-zinc-400'}`} title="Grid">
                    <Grid3X3 size={16} />
                </button>
            </div>
            <div className="flex items-end space-x-[2px] h-12 opacity-80 pointer-events-none">
                {histogramData.map((h, i) => (
                    <div key={i} className="w-1 bg-white" style={{ height: `${h}%` }}></div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};