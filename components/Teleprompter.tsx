import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Type, Play, Pause, Settings, X, Mic, FlipHorizontal, Wand2, Activity, StopCircle, PlayCircle } from 'lucide-react';

// --- Type Definitions for Web Speech API & Safari Audio ---
interface IWindow extends Window {
  webkitSpeechRecognition: any;
  SpeechRecognition: any;
  webkitAudioContext: typeof AudioContext;
}

interface TeleprompterProps {
  audioStream: MediaStream | null;
  onClose: () => void;
  isRecording: boolean;
  onToggleRecord: () => void;
  recordingDuration: number;
}

export const Teleprompter: React.FC<TeleprompterProps> = ({ 
  audioStream, 
  onClose,
  isRecording,
  onToggleRecord,
  recordingDuration
}) => {
  const [text, setText] = useState<string>(
    "Benvenuti a questo video tutorial!\n\nOggi vedremo come utilizzare la Sony A6000 come una vera videocamera professionale.\n\nGrazie a questa web app, possiamo monitorare l'audio e controllare l'esposizione.\n\n(Fai una pausa qui...)\n\nCome potete vedere, il teleprompter si muove solo quando parlo, permettendomi di seguire il mio ritmo naturale senza dover rincorrere il testo.\n\nNon dimenticate di iscrivervi al canale!"
  );
  
  // State
  const [isEditing, setIsEditing] = useState(false);
  const [fontSize, setFontSize] = useState(64);
  const [scrollSpeed, setScrollSpeed] = useState(1);
  const [isMirrored, setIsMirrored] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  // Modes: 'manual' | 'volume' | 'smart' (STT)
  const [mode, setMode] = useState<'volume' | 'smart'>('smart');
  
  const [voiceActive, setVoiceActive] = useState(false);
  const [sensitivity, setSensitivity] = useState(20);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);

  // Refs
  const scrollerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  const silenceTimerRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  
  // Memoize words for rendering and matching
  const words = useMemo(() => {
    return text.split(/(\s+)/).filter(w => w.trim().length > 0);
  }, [text]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- 1. Audio Volume Analysis (Voice Activation Mode) ---
  useEffect(() => {
    if (!audioStream || mode !== 'volume') return;

    const initAudio = () => {
      const AudioContextClass = window.AudioContext || (window as unknown as IWindow).webkitAudioContext;
      const audioCtx = new AudioContextClass();
      const analyser = audioCtx.createAnalyser();
      
      // Clone stream to avoid interfering with recording
      const streamClone = audioStream.clone();
      const source = audioCtx.createMediaStreamSource(streamClone);
      
      analyser.fftSize = 256;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      analyze();
    };

    const analyze = () => {
      if (!analyserRef.current) return;
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteFrequencyData(dataArray);

      let sum = 0;
      for(let i = 0; i < bufferLength; i++) sum += dataArray[i];
      const average = sum / bufferLength;

      const threshold = 55 - (sensitivity * 0.4); 
      
      if (average > threshold) {
        setVoiceActive(true);
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }
      } else {
        if (!silenceTimerRef.current && voiceActive) {
          silenceTimerRef.current = window.setTimeout(() => {
            setVoiceActive(false);
          }, 600);
        }
      }
      animationFrameRef.current = requestAnimationFrame(analyze);
    };

    initAudio();

    return () => {
      if (audioContextRef.current) audioContextRef.current.close();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [audioStream, sensitivity, voiceActive, mode]);

  // --- 2. Speech Recognition (Smart Tracking Mode) ---
  useEffect(() => {
    if (mode !== 'smart' || !isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }

    const { webkitSpeechRecognition, SpeechRecognition } = window as unknown as IWindow;
    const Recognition = SpeechRecognition || webkitSpeechRecognition;

    if (!Recognition) {
      console.warn("Speech Recognition API not supported in this browser.");
      setMode('volume'); // Fallback
      return;
    }

    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'it-IT'; // Default to Italian based on example text, could be dynamic

    recognition.onresult = (event: any) => {
      setVoiceActive(true); // Visual feedback
      if(silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      
      // Auto-hide voice indicator after silence
      silenceTimerRef.current = window.setTimeout(() => setVoiceActive(false), 1000);

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal || event.results[i][0].confidence > 0.6) {
          const transcript = event.results[i][0].transcript.toLowerCase().trim();
          matchTextToScript(transcript);
        }
      }
    };

    recognition.onend = () => {
      if (isListening) {
          try {
              recognition.start(); // Auto-restart
          } catch(e) {
              console.log("Recognition restart suppressed");
          }
      }
    };

    try {
        recognition.start();
        recognitionRef.current = recognition;
    } catch(e) {
        console.error("Speech recognition start failed", e);
    }

    return () => {
      recognition.stop();
    };
  }, [mode, isListening, words]);

  // Helper: Match spoken phrase to current script position
  const matchTextToScript = (transcript: string) => {
    const spokenWords = transcript.split(' ');
    const lastSpokenWord = spokenWords[spokenWords.length - 1];
    
    // Look ahead from current position (search window of 20 words to avoid wrong jumps)
    const searchWindow = 50; 
    const startIndex = currentWordIndex;
    const endIndex = Math.min(words.length, startIndex + searchWindow);

    for (let i = startIndex; i < endIndex; i++) {
      const scriptWord = words[i].toLowerCase().replace(/[^\w\s]/g, ''); // strip punctuation
      // Fuzzy match
      if (scriptWord === lastSpokenWord || (scriptWord.length > 3 && lastSpokenWord.includes(scriptWord))) {
        setCurrentWordIndex(i);
        scrollToWord(i);
        break;
      }
    }
  };

  const scrollToWord = (index: number) => {
    const element = document.getElementById(`word-${index}`);
    if (element && scrollerRef.current) {
      // Calculate position to center the word
      const containerHeight = scrollerRef.current.clientHeight;
      const offsetTop = element.offsetTop;
      
      // Smooth scroll
      scrollerRef.current.scrollTo({
        top: offsetTop - (containerHeight / 2) + (fontSize / 2),
        behavior: 'smooth'
      });
    }
  };

  // --- 3. Scroll Loop for Volume Mode ---
  useEffect(() => {
    let scrollInterval: number;

    if (mode === 'volume' && isListening && voiceActive && scrollerRef.current && !isEditing) {
      scrollInterval = window.setInterval(() => {
        if (scrollerRef.current) {
          scrollerRef.current.scrollTop += scrollSpeed;
        }
      }, 16);
    }

    return () => clearInterval(scrollInterval);
  }, [isListening, voiceActive, scrollSpeed, isEditing, mode]);

  return (
    <div className={`absolute inset-0 bg-black/90 backdrop-blur-md z-40 flex flex-col text-white animate-in fade-in duration-200 ${isRecording ? 'border-[4px] border-red-600' : ''}`}>
      
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-zinc-950/80 border-b border-zinc-800 z-50 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-orange-500 font-bold">
            <Type />
            <span className="hidden sm:inline">AI PROMPTER</span>
          </div>
          
          <div className="h-6 w-[1px] bg-zinc-800 mx-1"></div>

          {/* RECORDING CONTROLS IN PROMPTER */}
          <button 
              onClick={onToggleRecord}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold font-mono transition-all ${
                  isRecording 
                  ? 'bg-red-600 text-white animate-pulse shadow-red-900/40' 
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
          >
              {isRecording ? <StopCircle size={16} /> : <PlayCircle size={16} />}
              {isRecording ? formatTime(recordingDuration) : 'REC'}
          </button>

          <button 
            onClick={() => setIsListening(!isListening)}
            className={`flex items-center gap-2 px-6 py-2 rounded-full text-sm font-bold font-mono transition-all shadow-lg ${
              isListening 
                ? 'bg-blue-600 text-white shadow-blue-900/40' 
                : 'bg-zinc-100 text-zinc-900 hover:bg-white'
            }`}
          >
            {isListening ? (voiceActive ? <><Mic size={16} className="animate-ping"/> LISTENING</> : <><Mic size={16}/> READY</>) : <><Play size={16}/> START PROMPTER</>}
          </button>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
             {/* Mode Switcher */}
             <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                <button 
                  onClick={() => setMode('smart')}
                  className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors ${mode === 'smart' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Smart Scrolling (Speech Recognition)"
                >
                  <Wand2 size={14} /> <span className="hidden md:inline">SMART TRACK</span>
                </button>
                <button 
                  onClick={() => setMode('volume')}
                  className={`px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors ${mode === 'volume' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}
                  title="Volume Activation"
                >
                  <Activity size={14} /> <span className="hidden md:inline">VOICE ACT</span>
                </button>
             </div>

             {/* Settings Group */}
             <div className="hidden lg:flex items-center gap-4 bg-zinc-900/50 p-2 rounded-lg border border-zinc-800/50">
                {mode === 'volume' && (
                  <>
                    <div className="flex flex-col w-20">
                        <span className="text-[9px] text-zinc-500 uppercase font-mono mb-1">Sensitivity</span>
                        <input 
                            type="range" min="1" max="100" 
                            value={sensitivity} 
                            onChange={(e) => setSensitivity(Number(e.target.value))}
                            className="h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                    </div>
                    <div className="flex flex-col w-20">
                        <span className="text-[9px] text-zinc-500 uppercase font-mono mb-1">Speed</span>
                        <input 
                            type="range" min="0.5" max="5" step="0.1"
                            value={scrollSpeed} 
                            onChange={(e) => setScrollSpeed(Number(e.target.value))}
                            className="h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                        />
                    </div>
                  </>
                )}
                
                <div className="flex flex-col w-20">
                    <span className="text-[9px] text-zinc-500 uppercase font-mono mb-1">Size</span>
                    <input 
                        type="range" min="30" max="120" 
                        value={fontSize} 
                        onChange={(e) => setFontSize(Number(e.target.value))}
                        className="h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                    />
                </div>
            </div>

            <button 
                onClick={() => setIsMirrored(!isMirrored)}
                className={`p-2 rounded hover:bg-zinc-800 transition-colors ${isMirrored ? 'text-blue-500' : 'text-zinc-400'}`}
                title="Mirror Text"
            >
                <FlipHorizontal size={20} />
            </button>

            <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`p-2 rounded hover:bg-zinc-800 transition-colors ${isEditing ? 'text-orange-500' : 'text-zinc-400'}`}
                title="Edit Text"
            >
                <Settings size={20} />
            </button>

            <div className="h-6 w-[1px] bg-zinc-800 mx-1"></div>

            <button onClick={onClose} className="p-2 hover:bg-red-900/30 hover:text-red-500 rounded text-zinc-400 transition-colors">
                <X size={20} />
            </button>
        </div>
      </div>

      {/* Script Area */}
      <div className="relative flex-1 overflow-hidden group bg-zinc-950">
        
        {/* Visual Focus Zone Overlay */}
        <div className="absolute top-1/2 left-0 right-0 h-40 -translate-y-1/2 pointer-events-none z-0">
             <div className="w-full h-full bg-gradient-to-r from-transparent via-white/5 to-transparent blur-md"></div>
             {/* Lines */}
             <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent"></div>
             <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent"></div>
        </div>

        {/* Eye Line Markers */}
        <div className="absolute top-1/2 left-4 right-4 -translate-y-1/2 flex items-center justify-between pointer-events-none z-10 opacity-80">
             <div className="flex items-center gap-2">
                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-orange-500 border-b-[6px] border-b-transparent"></div>
                <div className="h-[1px] w-12 bg-gradient-to-r from-orange-500 to-transparent"></div>
             </div>
             <div className="flex items-center gap-2">
                <div className="h-[1px] w-12 bg-gradient-to-l from-orange-500 to-transparent"></div>
                <div className="w-0 h-0 border-t-[6px] border-t-transparent border-r-[10px] border-r-orange-500 border-b-[6px] border-b-transparent"></div>
             </div>
        </div>

        {isEditing ? (
            <textarea 
                className="w-full h-full bg-zinc-950 text-zinc-300 p-8 outline-none font-mono text-lg resize-none focus:ring-1 focus:ring-orange-500"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter your script here..."
            />
        ) : (
            <div 
                ref={scrollerRef}
                className="w-full h-full overflow-y-scroll p-4 text-center outline-none scroll-smooth"
                style={{ 
                    transform: isMirrored ? 'scaleX(-1)' : 'none',
                    scrollBehavior: 'smooth',
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                }}
            >
                <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; }`}</style>

                {/* Top Padding */}
                <div style={{ height: 'calc(50vh - 1em)' }}></div>
                
                <div 
                    className="max-w-5xl mx-auto font-bold text-zinc-100 drop-shadow-xl leading-relaxed transition-all duration-300"
                    style={{ 
                      fontSize: `${fontSize}px`,
                      textShadow: '0 4px 8px rgba(0,0,0,0.8)' 
                    }}
                >
                  {/* Smart Word Rendering */}
                  {words.map((word, i) => {
                    const isSpoken = i < currentWordIndex && mode === 'smart';
                    const isCurrent = i === currentWordIndex && mode === 'smart';
                    return (
                      <span 
                        key={i} 
                        id={`word-${i}`}
                        className={`inline-block mx-2 transition-all duration-500 ${isSpoken ? 'opacity-40 blur-[1px]' : 'opacity-100'} ${isCurrent ? 'text-orange-400 scale-110' : ''}`}
                      >
                        {word}
                      </span>
                    );
                  })}
                </div>
                
                {/* Bottom Padding */}
                <div style={{ height: '50vh' }}></div>
            </div>
        )}
      </div>

      {/* Mode Indicator Toast */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none z-50">
          <div className={`transition-all duration-300 px-6 py-2.5 rounded-full bg-zinc-950/90 backdrop-blur-md border flex items-center gap-3 shadow-2xl ${voiceActive ? 'scale-105 border-green-500/50 shadow-green-900/30' : 'border-zinc-800 opacity-70'}`}>
              <div className={`w-3 h-3 rounded-full transition-colors duration-200 ${voiceActive ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,1)]' : 'bg-zinc-600'}`}></div>
              <span className={`font-mono text-xs font-bold tracking-wider ${voiceActive ? 'text-green-400' : 'text-zinc-500'}`}>
                {mode === 'smart' ? (voiceActive ? 'MATCHING SPEECH...' : 'LISTENING FOR WORDS...') : (voiceActive ? 'SCROLLING (VOLUME)' : 'WAITING FOR VOICE...')}
              </span>
          </div>
      </div>
    </div>
  );
};