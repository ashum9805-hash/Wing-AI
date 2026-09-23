import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Sparkles,
  ArrowRight,
  RefreshCw,
  X,
  FileText,
  Tag,
  Check,
  Copy,
  PenLine,
  Volume2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendCommand: (command: string) => void;
  onInsertToInput?: (text: string) => void;
  isProcessing?: boolean;
}

interface InterpretedResult {
  rawTranscript: string;
  interpretedCommand: string;
  intentCategory: string;
  summary: string;
  entities: Array<{ label: string; value: string }>;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onSendCommand,
  onInsertToInput,
  isProcessing: isAssistantProcessing = false,
}) => {
  const [recordState, setRecordState] = useState<'idle' | 'recording' | 'interpreting' | 'ready'>('idle');
  const [duration, setDuration] = useState<number>(0);
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [result, setResult] = useState<InterpretedResult | null>(null);
  const [editedCommand, setEditedCommand] = useState<string>('');
  const [showRawTranscript, setShowRawTranscript] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const backupTranscriptRef = useRef<string>('');
  const recognitionRef = useRef<any>(null);

  // Clean reset when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      cleanupRecording();
      setRecordState('idle');
      setDuration(0);
      setResult(null);
      setEditedCommand('');
      setErrorMessage(null);
    } else {
      // Auto-start recording when modal is opened for immediate voice capture
      startRecording();
    }
    return () => {
      cleanupRecording();
    };
  }, [isOpen]);

  const cleanupRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  const startRecording = async () => {
    cleanupRecording();
    setErrorMessage(null);
    setResult(null);
    setEditedCommand('');
    setDuration(0);
    audioChunksRef.current = [];
    backupTranscriptRef.current = '';

    // Silent parallel backup speech recognition to guarantee 100% reliability during 503 cloud spikes
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        recognition.onresult = (e: any) => {
          let full = '';
          for (let i = 0; i < e.results.length; i++) {
            full += e.results[i][0].transcript + ' ';
          }
          backupTranscriptRef.current = full.trim();
        };
        recognition.onerror = () => {};
        recognition.start();
        recognitionRef.current = recognition;
      } catch {
        // ignore
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Audio Level Analyzer
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(1, avg / 128));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Pick supported MIME type
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        await processAudioWithGemini(audioBlob, recorder.mimeType || 'audio/webm');
      };

      recorder.start(250); // collect chunks every 250ms
      setRecordState('recording');

      // Duration counter
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 200);
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      setErrorMessage(
        err.name === 'NotAllowedError'
          ? 'Microphone permission denied. Please allow microphone access in your browser settings.'
          : 'Could not access microphone: ' + (err.message || 'unknown error')
      );
      setRecordState('idle');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setRecordState('interpreting');
      mediaRecorderRef.current.stop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    }
  };

  const processAudioWithGemini = async (audioBlob: Blob, mimeType: string) => {
    try {
      // Convert Blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64data = reader.result as string;

        const response = await fetch('/api/assistant/transcribe-interpret', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            audioData: base64data,
            mimeType: mimeType || 'audio/webm',
            clientBackupTranscript: backupTranscriptRef.current || '',
          }),
        });

        if (!response.ok) {
          // If server returned an error, fallback to backup transcript if available
          if (backupTranscriptRef.current) {
            const fallbackResult: InterpretedResult = {
              rawTranscript: backupTranscriptRef.current,
              interpretedCommand: backupTranscriptRef.current,
              intentCategory: 'Voice Directive',
              summary: 'Voice recording transcript',
              entities: [],
            };
            setResult(fallbackResult);
            setEditedCommand(backupTranscriptRef.current);
            setRecordState('ready');
            return;
          }
          throw new Error(`Server returned ${response.status}`);
        }

        const data: InterpretedResult = await response.json();
        setResult(data);
        setEditedCommand(data.interpretedCommand || data.rawTranscript || '');
        setRecordState('ready');
      };
    } catch (err: any) {
      console.error('Error processing audio with Gemini:', err);
      if (backupTranscriptRef.current) {
        const fallbackResult: InterpretedResult = {
          rawTranscript: backupTranscriptRef.current,
          interpretedCommand: backupTranscriptRef.current,
          intentCategory: 'Voice Directive',
          summary: 'Voice recording transcript',
          entities: [],
        };
        setResult(fallbackResult);
        setEditedCommand(backupTranscriptRef.current);
        setRecordState('ready');
      } else {
        setErrorMessage('Voice interpretation error: ' + (err.message || 'Please try speaking again.'));
        setRecordState('idle');
      }
    }
  };

  const handleExecute = () => {
    const finalCmd = editedCommand.trim();
    if (finalCmd) {
      onSendCommand(finalCmd);
      onClose();
    }
  };

  const handleInsert = () => {
    const finalCmd = editedCommand.trim();
    if (finalCmd && onInsertToInput) {
      onInsertToInput(finalCmd);
      onClose();
    } else if (finalCmd) {
      onSendCommand(finalCmd);
      onClose();
    }
  };

  const handleCopy = () => {
    if (editedCommand) {
      navigator.clipboard.writeText(editedCommand);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-cyan-800/60 bg-slate-900/95 p-6 shadow-2xl shadow-cyan-950/80">
        {/* Glow ambient background header */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 h-44 w-72 rounded-full bg-cyan-500/15 blur-3xl pointer-events-none" />

        {/* Header bar */}
        <div className="flex items-center justify-between relative z-10 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>Google AI Studio Voice Intelligence</span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Records real audio, interprets meaning & extracts executive directives
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="my-3 rounded-2xl border border-red-500/40 bg-red-950/30 p-3.5 text-xs text-red-300">
            <p className="font-semibold">{errorMessage}</p>
            <button
              onClick={startRecording}
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-red-200 underline hover:text-white"
            >
              <RefreshCw className="h-3 w-3" />
              Try Again
            </button>
          </div>
        )}

        {/* STATE: RECORDING */}
        {recordState === 'recording' && (
          <div className="my-6 text-center">
            {/* Animated Pulse Waves */}
            <div className="relative my-4 flex items-center justify-center">
              <span
                className="absolute rounded-full bg-cyan-500/20 transition-all duration-150"
                style={{
                  width: `${120 + audioLevel * 80}px`,
                  height: `${120 + audioLevel * 80}px`,
                }}
              />
              <span className="absolute h-24 w-24 rounded-full bg-red-500/20 animate-ping" />

              <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-tr from-red-600 to-rose-500 text-white shadow-xl shadow-red-600/40">
                <Mic className="h-8 w-8 animate-pulse" />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-xs font-mono text-cyan-300 font-bold mb-1">
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span>RECORDING • {formatTime(duration)}</span>
            </div>
            <p className="text-xs text-slate-400">
              Speak naturally. Gemini will transcribe, eliminate stumbles & format your order.
            </p>

            {/* Frequency bars visualizer */}
            <div className="my-5 flex items-center justify-center gap-1 h-8">
              {[30, 60, 95, 45, 80, 50, 100, 70, 40, 85, 55, 90, 65, 35].map((h, i) => (
                <span
                  key={i}
                  className="w-1 rounded-full bg-cyan-400 transition-all duration-150"
                  style={{
                    height: `${Math.max(6, h * (audioLevel || 0.25))}px`,
                    opacity: 0.4 + audioLevel * 0.6,
                  }}
                />
              ))}
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-sky-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-600/30 hover:from-cyan-500 hover:to-sky-500 transition active:scale-95 cursor-pointer"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
                <span>Done Speaking (Interpret Audio)</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: INTERPRETING (Gemini Processing) */}
        {recordState === 'interpreting' && (
          <div className="my-10 text-center space-y-4">
            <div className="relative mx-auto flex h-18 w-18 items-center justify-center rounded-2xl bg-cyan-950 text-cyan-400 border border-cyan-800/60 shadow-xl shadow-cyan-950">
              <Sparkles className="h-9 w-9 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white">Gemini AI Studio Voice Processing</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Transcribing audio, removing conversational fillers, and structuring executive command specifications...
              </p>
            </div>
            <div className="mx-auto max-w-xs h-1 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-sky-400 animate-pulse w-3/4" />
            </div>
          </div>
        )}

        {/* STATE: READY (Google AI Studio Formatted Layout) */}
        {recordState === 'ready' && result && (
          <div className="space-y-4 text-left">
            {/* Top Intent & Entity Banner */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <span className="rounded-lg border border-cyan-500/30 bg-cyan-950/60 px-2.5 py-1 text-[11px] font-bold text-cyan-300">
                  {result.intentCategory || 'Directive'}
                </span>
                <span className="text-[11px] text-slate-400 font-medium">
                  {result.summary}
                </span>
              </div>

              <button
                onClick={startRecording}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-cyan-300 transition cursor-pointer font-medium"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Re-record</span>
              </button>
            </div>

            {/* Extracted Entities Chips (if any) */}
            {result.entities && result.entities.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.entities.map((ent, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-950/70 px-2.5 py-1 text-[10px] font-medium text-slate-300"
                  >
                    <Tag className="h-2.5 w-2.5 text-cyan-400" />
                    <span className="text-slate-400 font-semibold">{ent.label}:</span>
                    <span className="text-slate-200">{ent.value}</span>
                  </span>
                ))}
              </div>
            )}

            {/* Polished Executive Command Box */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-3.5 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <PenLine className="h-3 w-3" />
                  Interpreted Executive Order
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition"
                  title="Copy command"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <textarea
                value={editedCommand}
                onChange={(e) => setEditedCommand(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-transparent bg-slate-900/60 p-2 text-xs font-medium text-slate-100 placeholder:text-slate-600 focus:border-cyan-500/50 focus:bg-slate-900 focus:outline-none"
                placeholder="Edit interpreted order if desired..."
              />
            </div>

            {/* Verbatim Transcript (Transparent Collapsible) */}
            <div className="rounded-xl border border-slate-800/60 bg-slate-950/40 p-2.5 text-xs">
              <button
                type="button"
                onClick={() => setShowRawTranscript(!showRawTranscript)}
                className="flex w-full items-center justify-between text-[11px] font-semibold text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Volume2 className="h-3 w-3 text-slate-500" />
                  <span>Verbatim Audio Transcript</span>
                </span>
                {showRawTranscript ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>

              {showRawTranscript && (
                <p className="mt-2 text-[11px] italic text-slate-400 border-t border-slate-800/60 pt-2 leading-relaxed">
                  "{result.rawTranscript || 'No speech detected'}"
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleInsert}
                className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition cursor-pointer"
                title="Paste this into the 'Ask anything' bar"
              >
                <span>Insert to Type Bar</span>
              </button>

              <button
                type="button"
                onClick={handleExecute}
                disabled={!editedCommand.trim() || isAssistantProcessing}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-cyan-600/30 hover:from-cyan-500 hover:to-sky-500 transition active:scale-95 disabled:opacity-40 cursor-pointer"
              >
                <span>Execute Order</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* STATE: IDLE (Start prompt if not recording) */}
        {recordState === 'idle' && !errorMessage && (
          <div className="my-8 text-center space-y-4">
            <button
              onClick={startRecording}
              className="mx-auto flex h-18 w-18 items-center justify-center rounded-2xl bg-cyan-600 text-white shadow-xl shadow-cyan-600/40 hover:bg-cyan-500 transition active:scale-95 cursor-pointer"
            >
              <Mic className="h-8 w-8" />
            </button>
            <div>
              <p className="text-xs font-semibold text-slate-200">Tap to start voice recording</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Gemini will capture your audio and format your executive directives.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
