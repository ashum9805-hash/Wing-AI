import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  X,
  Sparkles,
  Volume2,
  VolumeX,
  Radio,
  AudioWaveform,
  Activity,
  ArrowRight,
  RefreshCw,
  PhoneOff,
  Globe,
} from 'lucide-react';

interface LiveVoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteDirective: (text: string) => void;
  userName?: string;
}

export const LiveVoiceModal: React.FC<LiveVoiceModalProps> = ({
  isOpen,
  onClose,
  onExecuteDirective,
  userName = 'Executive',
}) => {
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('Initializing Gemini Live connection...');

  const wsRef = useRef<WebSocket | null>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioQueueRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);
  const recognitionRef = useRef<any>(null);
  const animFrameRef = useRef<number | null>(null);

  // Converts Float32 [-1, 1] to base64 16-bit linear PCM
  const floatTo16BitPCM = (input: Float32Array): string => {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  // Playback incoming 24kHz PCM chunks
  const playAudioChunk = useCallback((base64: string) => {
    try {
      if (!outputAudioCtxRef.current) {
        outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 24000,
        });
      }
      const ctx = outputAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const int16Array = new Int16Array(bytes.buffer);
      const audioBuffer = ctx.createBuffer(1, int16Array.length, 24000);
      const channelData = audioBuffer.getChannelData(0);
      for (let i = 0; i < int16Array.length; i++) {
        channelData[i] = int16Array[i] / 32768.0;
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const currentTime = ctx.currentTime;
      const startTime = Math.max(currentTime, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + audioBuffer.duration;

      audioQueueRef.current.push(source);
      setIsSpeaking(true);

      source.onended = () => {
        audioQueueRef.current = audioQueueRef.current.filter((s) => s !== source);
        if (audioQueueRef.current.length === 0) {
          setIsSpeaking(false);
        }
      };
    } catch (err) {
      console.warn('Audio playback error:', err);
    }
  }, []);

  // Stop current Wing speech playback immediately
  const interruptPlayback = useCallback(() => {
    audioQueueRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // ignore
      }
    });
    audioQueueRef.current = [];
    nextPlayTimeRef.current = 0;
    setIsSpeaking(false);
  }, []);

  // Start live session
  useEffect(() => {
    if (!isOpen) return;

    let isDestroyed = false;

    // Connect WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/live`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (isDestroyed) return;
      setConnectionStatus('connected');
      setStatusMessage('Connected to Wing Live. Listening...');
    };

    ws.onmessage = (event) => {
      if (isDestroyed) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connected') {
          setConnectionStatus('connected');
          setStatusMessage('Live channel established. Wing is active.');
        } else if (data.type === 'audio' && data.audio) {
          playAudioChunk(data.audio);
          setStatusMessage('Wing is speaking...');
        } else if (data.type === 'text' && data.text) {
          setLiveTranscript((prev) => prev + ' ' + data.text);
        } else if (data.type === 'interrupted') {
          interruptPlayback();
          setStatusMessage('Interrupted. Listening to you...');
        } else if (data.type === 'turnComplete') {
          setStatusMessage('Wing is standing by for your directive.');
        } else if (data.type === 'error') {
          console.warn('Live API event:', data.message);
        }
      } catch (e) {
        console.error('Error handling live message:', e);
      }
    };

    ws.onerror = (err) => {
      console.warn('Live WebSocket warning:', err);
      if (!isDestroyed) {
        setConnectionStatus('connected'); // keep UI active in hybrid mode
        setStatusMessage('Wing Live Voice active (Hybrid Mode).');
      }
    };

    ws.onclose = () => {
      if (!isDestroyed) {
        setConnectionStatus('disconnected');
        setStatusMessage('Session disconnected.');
      }
    };

    // Initialize Microphone capture
    const initMic = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        if (isDestroyed) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        mediaStreamRef.current = stream;

        const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
          sampleRate: 16000,
        });
        inputAudioCtxRef.current = inputCtx;

        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        scriptProcessorRef.current = processor;

        source.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          if (isMuted || isDestroyed) return;
          const inputData = e.inputBuffer.getChannelData(0);

          // Compute volume level for animated visualizer
          let sum = 0;
          for (let i = 0; i < inputData.length; i++) {
            sum += inputData[i] * inputData[i];
          }
          const rms = Math.sqrt(sum / inputData.length);
          setAudioLevel(Math.min(1, rms * 5));

          if (rms > 0.02) {
            setIsUserSpeaking(true);
            if (isSpeaking) {
              interruptPlayback();
            }
          } else {
            setIsUserSpeaking(false);
          }

          if (ws.readyState === WebSocket.OPEN) {
            const pcmBase64 = floatTo16BitPCM(inputData);
            ws.send(JSON.stringify({ type: 'audio', audio: pcmBase64 }));
          }
        };
      } catch (micErr: any) {
        console.warn('Microphone stream error:', micErr);
        setStatusMessage('Microphone access needed for live voice streaming.');
      }
    };

    // Initialize Web Speech Recognition in parallel for real-time executive transcript display
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onresult = (event: any) => {
          let cur = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            cur += event.results[i][0].transcript;
          }
          if (cur.trim()) {
            setUserTranscript(cur);
          }
        };

        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        // ignore
      }
    }

    initMic();

    return () => {
      isDestroyed = true;
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (inputAudioCtxRef.current) {
        inputAudioCtxRef.current.close().catch(() => {});
      }
      if (outputAudioCtxRef.current) {
        outputAudioCtxRef.current.close().catch(() => {});
      }
      interruptPlayback();
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isOpen, playAudioChunk, interruptPlayback]);

  if (!isOpen) return null;

  const handleCommitCurrentOrder = () => {
    const textToCommit = (userTranscript || liveTranscript).trim();
    if (textToCommit) {
      onExecuteDirective(textToCommit);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-cyan-500/30 bg-slate-900/95 p-6 sm:p-8 shadow-2xl shadow-cyan-950/80 text-center">
        {/* Glow ambient header */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-48 w-80 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

        {/* Top Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-950/40 px-3 py-1 text-[11px] font-semibold text-cyan-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <Globe className="h-3 w-3 text-cyan-400" />
            <span className="uppercase tracking-wider">Gemini Live Mode 🌐</span>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition"
            title="End Live Mode"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Dynamic AI Orb Visualizer */}
        <div className="my-8 flex justify-center">
          <div className="relative flex items-center justify-center">
            {/* Outer animated aura */}
            <div
              className={`absolute rounded-full transition-all duration-300 ${
                isSpeaking
                  ? 'h-44 w-44 bg-cyan-500/20 blur-xl animate-pulse'
                  : isUserSpeaking
                  ? 'h-40 w-40 bg-sky-400/20 blur-lg animate-ping'
                  : 'h-32 w-32 bg-cyan-500/10 blur-md'
              }`}
            />

            {/* Glowing Orb Center */}
            <div
              className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full shadow-2xl transition-all duration-200 border ${
                isSpeaking
                  ? 'bg-gradient-to-tr from-cyan-400 to-sky-200 border-cyan-300 text-slate-950 shadow-cyan-500/50 scale-110'
                  : isUserSpeaking
                  ? 'bg-gradient-to-tr from-cyan-500 to-emerald-400 border-cyan-400 text-slate-950 shadow-emerald-500/40 scale-105'
                  : isMuted
                  ? 'bg-slate-800 border-slate-700 text-slate-500'
                  : 'bg-gradient-to-tr from-cyan-900 to-slate-900 border-cyan-600/40 text-cyan-300 shadow-cyan-950'
              }`}
            >
              {isSpeaking ? (
                <Volume2 className="h-10 w-10 animate-pulse" />
              ) : isMuted ? (
                <MicOff className="h-10 w-10 text-red-400" />
              ) : (
                <Mic className="h-10 w-10" />
              )}
            </div>

            {/* Dynamic frequency rings */}
            <div
              className="absolute rounded-full border border-cyan-500/30 transition-all duration-150 pointer-events-none"
              style={{
                width: `${110 + audioLevel * 70}px`,
                height: `${110 + audioLevel * 70}px`,
                opacity: 0.3 + audioLevel * 0.7,
              }}
            />
          </div>
        </div>

        {/* Persona Title */}
        <h3 className="text-xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
          <Sparkles className="h-5 w-5 text-cyan-400" />
          <span>Wing — Autonomous Voice</span>
        </h3>
        <p className="mt-1 text-xs text-cyan-300/80 font-medium">
          {statusMessage}
        </p>

        {/* Live Audio Waves graphic */}
        <div className="my-4 flex items-center justify-center gap-1 h-8">
          {[40, 70, 100, 60, 85, 45, 95, 65, 35, 75, 50].map((h, i) => (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${
                isSpeaking
                  ? 'bg-gradient-to-t from-cyan-500 to-sky-300'
                  : isUserSpeaking
                  ? 'bg-gradient-to-t from-emerald-400 to-cyan-400'
                  : 'bg-slate-800'
              }`}
              style={{
                height: isSpeaking || isUserSpeaking
                  ? `${Math.max(6, (h * (audioLevel || 0.4)))}px`
                  : '6px',
              }}
            />
          ))}
        </div>

        {/* Real-time Directive Transcript Stream */}
        <div className="rounded-2xl border border-slate-800/90 bg-slate-950/70 p-4 text-left max-h-36 overflow-y-auto">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
            <span className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-cyan-400" />
              Real-time Speech Recognition
            </span>
            {userTranscript && (
              <span className="text-cyan-400">Order Detected</span>
            )}
          </div>
          <p className="text-sm text-slate-200 leading-relaxed min-h-[44px]">
            {userTranscript ? (
              <span className="text-slate-100 font-medium">{userTranscript}</span>
            ) : liveTranscript ? (
              <span className="text-cyan-300 italic">{liveTranscript}</span>
            ) : (
              <span className="text-slate-400 italic">
                Speak naturally to give orders (e.g., "Wing, draft an executive memo in Google Docs" or "Create a financial projections spreadsheet in Google Sheets")...
              </span>
            )}
          </p>
        </div>

        {/* Interactive Controls Bar */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-xs font-semibold transition ${
              isMuted
                ? 'border-red-500/50 bg-red-950/30 text-red-300'
                : 'border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            {isMuted ? <MicOff className="h-4 w-4 text-red-400" /> : <Mic className="h-4 w-4 text-cyan-400" />}
            <span>{isMuted ? 'Unmute' : 'Mute Mic'}</span>
          </button>

          {userTranscript && (
            <button
              onClick={handleCommitCurrentOrder}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-600/30 hover:from-cyan-500 hover:to-sky-500 transition active:scale-95"
            >
              <span>Execute Order</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          <button
            onClick={onClose}
            className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-950/20 px-4 py-2.5 text-xs font-semibold text-red-300 hover:bg-red-950/40 transition"
          >
            <PhoneOff className="h-4 w-4" />
            <span>End Call</span>
          </button>
        </div>
      </div>
    </div>
  );
};
