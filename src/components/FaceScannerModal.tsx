import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, Check, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

interface FaceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (selfieBase64: string) => void;
  playSoundEffect: (effect: 'tap' | 'complete' | 'warn' | 'offer') => void;
}

export const FaceScannerModal: React.FC<FaceScannerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  playSoundEffect,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanState, setScanState] = useState<'idle' | 'starting' | 'scanning' | 'matched' | 'failed'>('idle');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isOpen) return;
    
    setScanState('starting');
    setCameraError(null);
    setProgress(0);

    // Initialise real camera device stream
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: 480, 
        height: 480, 
        facingMode: 'user' 
      } 
    })
    .then((mediaStream) => {
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(err => console.error("Video play error:", err));
      }
      setScanState('scanning');
    })
    .catch((err) => {
      console.warn("Camera hardware access denied/unavailable. Using realistic simulated biometric scan.", err);
      setCameraError("Camera hardware blocked or frame is isolated. Using simulated biometric face scanning template...");
      setScanState('scanning');
    });

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen]);

  // Handle Scanning Progression Bar
  useEffect(() => {
    if (scanState !== 'scanning') return;

    const interval = setInterval(() => {
      setProgress((v) => {
        if (v >= 100) {
          clearInterval(interval);
          handleMockMatch();
          return 100;
        }
        return v + 4;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [scanState]);

  const handleMockMatch = () => {
    playSoundEffect('complete');
    setScanState('matched');
  };

  const handleConfirm = () => {
    let base64Selfie = '';
    try {
      if (canvasRef.current && videoRef.current && stream) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = 240;
        canvas.height = 240;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, 240, 240);
          base64Selfie = canvas.toDataURL('image/jpeg', 0.85);
        }
      }
    } catch (e) {
      console.error("Failed capturing snap:", e);
    }
    
    // Default fallback placeholder matching Lagos/London driver mock profile
    if (!base64Selfie) {
      base64Selfie = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200';
    }

    onSuccess(base64Selfie);
    handleClose();
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-md z-9999 flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
      
      {/* Outer Card Body */}
      <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-5 shadow-2xl flex flex-col gap-5 select-none text-white relative">
        
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-[#13AA52] animate-pulse" />
            <h3 className="text-xs font-black tracking-wider uppercase text-zinc-100 font-mono">Swift SecuPass ID</h3>
          </div>
          <button 
            onClick={handleClose} 
            className="w-7 h-7 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informative Title */}
        <div className="text-center">
          <h2 className="text-base font-extrabold text-white">Biometric Face Audit</h2>
          <p className="text-[10px] text-zinc-400 mt-1 max-w-xs mx-auto">
            Swift requires authentication check to verify driver credentials matches registry details prior to online matches.
          </p>
        </div>

        {/* Video Viewfinder stage */}
        <div className="relative w-48 h-48 mx-auto rounded-full overflow-hidden border-4 border-[#13AA52] bg-zinc-950 shadow-inner flex items-center justify-center group">
          {cameraError ? (
            // Realistic simulated placeholder vector if frame-permissions or hardware blocked
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3.5 bg-zinc-950">
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-[#13AA52]/40 bg-[#13AA52]/5 flex items-center justify-center text-[#13AA52] animate-ping duration-[4000ms] mb-2 absolute" />
              <div className="z-10 bg-zinc-900/40 p-2 rounded-xl flex flex-col items-center">
                <ShieldCheck className="w-8 h-8 text-[#13AA52] mb-1.5 animate-bounce" />
                <span className="text-[9px] font-black text-white font-mono uppercase tracking-widest text-[#13AA52]">SECURE MOCK CAM</span>
                <span className="text-[7.5px] text-zinc-400 leading-tight block mt-1">Live canvas scanning...</span>
              </div>
            </div>
          ) : (
            // Real Web camera display
            <video
              ref={videoRef}
              className="w-full h-full object-cover scale-x-[-1]"
              playsInline
              muted
            />
          )}

          {/* Glowing Green Scanning Reticle overlay */}
          {scanState === 'scanning' && (
            <>
              {/* Scanline laser */}
              <div 
                className="absolute left-0 right-0 h-0.5 bg-[#13AA52] shadow-[0_0_12px_#13AA52] z-20 animate-bounce duration-[2000ms]" 
                style={{ top: `${progress}%` }}
              />
              {/* Face silhouette wireframe */}
              <div className="absolute inset-6 border-2 border-dashed border-[#13AA52]/40 rounded-full animate-pulse z-10 pointers-events-none" />
            </>
          )}

          {/* Success Match Overlay */}
          {scanState === 'matched' && (
            <div className="absolute inset-0 bg-[#13AA52]/90 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center z-30 animate-in fade-in duration-200">
              <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-[#13AA52] shadow-lg mb-2">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <span className="text-xs font-black tracking-wide text-white uppercase">FACIAL PROFILE MATCHED</span>
              <span className="text-[8.5px] text-zinc-100 font-mono mt-0.5">Confidence Metric: 99.82%</span>
            </div>
          )}
        </div>

        {/* Hidden internal canvas for taking base64 snaps */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Scanning progress display */}
        <div className="flex flex-col gap-1.5 px-4">
          <div className="flex justify-between items-center text-[9px] font-mono">
            <span className="text-zinc-400 uppercase">Verification Status</span>
            <span className="font-extrabold text-[#13AA52]">
              {scanState === 'starting' && 'INITIALISING...'}
              {scanState === 'scanning' && `ALIGNED • SCANNING ${progress}%`}
              {scanState === 'matched' && 'SUCCESSFULLY VERIFIED ✓'}
            </span>
          </div>
          
          {/* Progress bar line */}
          <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#13AA52] transition-all duration-100 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Controls footer */}
        <div className="border-t border-zinc-800 pt-3.5 flex flex-col gap-2">
          {scanState === 'scanning' ? (
            <div className="text-center py-2.5 text-[10px] text-zinc-500 font-mono animate-pulse">
              Please face forward and keep device still.
            </div>
          ) : scanState === 'matched' ? (
            <button
              onClick={handleConfirm}
              className="w-full py-2.5 bg-[#13AA52] hover:bg-[#119949] text-white text-[10.5px] font-black tracking-wider rounded-xl shadow-lg hover:shadow-xl transition transform active:scale-98 text-center cursor-pointer"
            >
              COMPLETE & CONFIRMED ➔
            </button>
          ) : (
            <div className="flex justify-center gap-2">
              <button 
                onClick={() => setScanState('scanning')}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 font-bold text-[10px] rounded-lg cursor-pointer"
              >
                Retry Scanner
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
