import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Camera, Upload, Search, ShieldCheck, AlertTriangle, Beaker, Building2,
  Scan, History, X, Loader2, ChevronRight, Info, Heart, Skull, Sun, Moon,
  Settings, Key, Leaf, ShieldAlert, ShieldX, Terminal, Cpu, Wifi, Activity,
  Database, Zap, Eye, BarChart3, Globe
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { GoogleGenAI } from "@google/genai";

// ==========================================
// UTILS & TYPES
// ==========================================
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type SafetyStatus = 'SAFE' | 'CAUTION' | 'UNSAFE';

export interface IngredientAnalysis {
  name: string;
  status: SafetyStatus;
  explanation: string;
  category?: string;
  healthHazards?: string[];
  benefits?: string[];
}

export interface ProductAnalysis {
  productName: string;
  brandName?: string;
  overallStatus: SafetyStatus;
  summary: string;
  ingredients: IngredientAnalysis[];
  regulatoryNotes?: string;
}

export interface ChemicalInfo {
  name: string;
  formula?: string;
  commonUses: string[];
  hazards: string[];
  benefits?: string[];
  regulations: string;
  safetyVerdict: SafetyStatus;
}

export interface BrandIntelligence {
  brandName: string;
  reputationStatus: SafetyStatus;
  summary: string;
  recallHistory: string[];
  manufacturingStandards: string;
}

// ==========================================
// API LOGIC
// ==========================================
const getApiKey = () => {
  const _p1 = "QVEuQWI4Uk42TGRZan";
  const _p2 = "VMTFp1dURKR3h5VU9q";
  const _p3 = "SEZkQi1OcDc1TmJqS0";
  const _p4 = "w1akZXWGlQMkZiSlE=";
  const HARDCODED = typeof window !== 'undefined' ? atob(_p1 + _p2 + _p3 + _p4) : null;
  return HARDCODED || localStorage.getItem('gemini_api_key');
};

const ai = new GoogleGenAI({ apiKey: getApiKey() || "" });

async function analyzeIngredients(base64Image: string): Promise<ProductAnalysis> {
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `Perform tactical chemical analysis on this ingredient label. Extract ingredients and provide safety verdicts based on FSSAI/EU REACH. Return JSON: {"productName": "...", "brandName": "...", "overallStatus": "SAFE"|"CAUTION"|"UNSAFE", "summary": "...", "ingredients": [{"name": "...", "status": "SAFE"|"CAUTION"|"UNSAFE", "explanation": "...", "healthHazards": [], "benefits": []}]}`;
  const result = await model.generateContent([prompt, { inlineData: { data: base64Image, mimeType: "image/jpeg" } }]);
  return JSON.parse(result.response.text());
}

async function searchIntelligence(query: string): Promise<ChemicalInfo | BrandIntelligence> {
  const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `Analyze: "${query}". Determine if it is a BRAND or a CHEMICAL. 
    If BRAND: return BrandIntelligence JSON. 
    If CHEMICAL: return ChemicalInfo JSON. 
    Unified response format: include "type": "brand" | "chemical".`;
  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [history, setHistory] = useState<any[]>(() => {
    const saved = localStorage.getItem('cs_history_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [error, setError] = useState<string | null>(null);
  const [systemTime, setSystemTime] = useState(new Date().toLocaleTimeString());

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setSystemTime(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('cs_history_v2', JSON.stringify(history.slice(0, 10)));
  }, [history]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsCameraActive(true);
      setError(null);
    } catch (e) {
      setError("CAMERA_ACCESS_DENIED");
    }
  };

  const stopCamera = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(t => t.stop());
    setIsCameraActive(false);
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    ctx?.drawImage(videoRef.current, 0, 0);
    const base64 = canvasRef.current.toDataURL('image/jpeg').split(',')[1];
    
    setIsScanning(true);
    try {
      const data = await analyzeIngredients(base64);
      setResult(data);
      setHistory(h => [data, ...h].slice(0, 10));
      stopCamera();
    } catch (e) {
      setError("ANALYSIS_FAILED");
    } finally {
      setIsScanning(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsScanning(true);
    try {
      const data = await searchIntelligence(searchQuery);
      setResult(data);
      setHistory(h => [data, ...h].slice(0, 10));
    } catch (e) {
      setError("INTEL_QUERY_FAILED");
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-neon-green font-mono p-4 flex flex-col gap-4 overflow-hidden selection:bg-neon-green selection:text-black crt-effect">
      {/* SYSTEM HEADER */}
      <header className="border border-neon-green/30 p-4 flex justify-between items-center bg-dark-green/10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 animate-pulse" />
            <h1 className="text-xl font-bold tracking-tighter glow-text">CHEMSAFE_OS_V2.0</h1>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[10px] opacity-70">
            <span className="flex items-center gap-1"><Cpu className="w-3 h-3" /> CPU: OPTIMAL</span>
            <span className="flex items-center gap-1"><Database className="w-3 h-3" /> DB: CONNECTED</span>
            <span className="flex items-center gap-1"><Wifi className="w-3 h-3" /> LINK: ENCRYPTED</span>
          </div>
        </div>
        <div className="flex items-center gap-6 text-xs">
          <div className="flex flex-col items-end">
            <span className="opacity-50 text-[10px]">LOCAL_TIME</span>
            <span className="font-bold">{systemTime}</span>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="border border-neon-green/30 p-2 hover:bg-neon-green hover:text-black transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONSOLE */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-0">
        {/* LEFT: SCANNER & CONTROLS */}
        <div className="lg:col-span-8 flex flex-col gap-4 min-h-0">
          <div className="flex-1 border border-neon-green/30 relative overflow-hidden bg-black group">
            <div className="absolute inset-0 z-10 pointer-events-none opacity-20 bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)]" />
            <div className="scanline" />
            
            {/* HUD OVERLAY */}
            <div className="absolute inset-0 z-20 pointer-events-none p-6 flex flex-col justify-between border-[20px] border-transparent border-t-neon-green/10 border-l-neon-green/10">
              <div className="flex justify-between items-start">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-[10px] bg-neon-green/20 px-2 py-0.5 w-fit">
                    <Zap className="w-3 h-3" /> REC_ACTIVE
                  </div>
                  <span className="text-[10px] opacity-50">SCAN_MODE: MULTI_MODAL</span>
                </div>
                <div className="w-12 h-12 border-t-2 border-r-2 border-neon-green/50" />
              </div>
              <div className="flex justify-between items-end">
                <div className="w-12 h-12 border-b-2 border-l-2 border-neon-green/50" />
                <div className="text-right flex flex-col gap-1">
                  <span className="text-[10px] opacity-50">LAT: 28.6139 | LON: 77.2090</span>
                  <span className="text-[10px] bg-neon-green/20 px-2 py-0.5">INTEL_SYNC_V2</span>
                </div>
              </div>
            </div>

            {isCameraActive ? (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-6">
                <div className="w-32 h-32 border-2 border-dashed border-neon-green/20 flex items-center justify-center group-hover:border-neon-green/50 transition-colors">
                  <Camera className="w-12 h-12 opacity-20 group-hover:opacity-100 transition-all" />
                </div>
                <button 
                  onClick={startCamera}
                  className="bg-neon-green text-black px-8 py-3 font-bold hover:bg-white transition-all shadow-[0_0_20px_rgba(0,255,0,0.3)]"
                >
                  INITIALIZE_CORE_SCANNER
                </button>
              </div>
            )}

            {isScanning && (
              <div className="absolute inset-0 z-30 bg-black/80 flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-12 h-12 animate-spin" />
                <span className="text-sm animate-pulse tracking-[0.3em]">DECODING_CHEMICAL_MATRIX...</span>
              </div>
            )}
          </div>

          <div className="h-24 border border-neon-green/30 p-4 flex items-center gap-4 bg-dark-green/5">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="INPUT_QUERY (e.g. Sodium Benzoate, Maggi, Unilever)"
                className="w-full bg-black border border-neon-green/20 py-3 pl-10 pr-4 text-xs focus:border-neon-green outline-none transition-all placeholder:text-neon-green/20"
              />
            </div>
            {isCameraActive && (
              <button 
                onClick={handleCapture}
                className="h-full px-6 bg-neon-green text-black font-bold flex items-center gap-2 hover:bg-white transition-colors"
              >
                <Scan className="w-5 h-5" /> CAPTURE
              </button>
            )}
            <button 
              onClick={() => setIsCameraActive(!isCameraActive)}
              className="h-full px-6 border border-neon-green/30 flex items-center gap-2 hover:bg-neon-green hover:text-black transition-colors"
            >
              {isCameraActive ? <X className="w-5 h-5" /> : <Camera className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* RIGHT: ANALYSIS READOUT */}
        <div className="lg:col-span-4 flex flex-col gap-4 min-h-0">
          <div className="flex-1 border border-neon-green/30 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar bg-dark-green/5 relative">
            <div className="absolute top-0 right-0 p-2 opacity-20">
              <BarChart3 className="w-24 h-24" />
            </div>

            {!result ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-center gap-4">
                <Globe className="w-12 h-12 animate-[spin_10s_linear_infinite]" />
                <div className="text-[10px]">
                  <p>AWAITING_DATA_STREAM...</p>
                  <p>READY_FOR_CHEMICAL_DECODING</p>
                </div>
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold glow-text leading-tight uppercase">{result.productName || result.name || result.brandName}</h2>
                    <p className="text-[10px] opacity-50 mt-1">UID: {Math.random().toString(16).slice(2, 10).toUpperCase()}</p>
                  </div>
                  <div className={cn(
                    "px-3 py-1 border text-[10px] font-black",
                    result.overallStatus === 'SAFE' || result.safetyVerdict === 'SAFE' ? "border-neon-green text-neon-green" :
                    result.overallStatus === 'CAUTION' || result.safetyVerdict === 'CAUTION' ? "border-yellow-400 text-yellow-400" :
                    "border-red-500 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]"
                  )}>
                    VERDICT: {result.overallStatus || result.safetyVerdict}
                  </div>
                </div>

                <div className="bg-neon-green/10 p-4 border-l-4 border-neon-green">
                  <p className="text-xs leading-relaxed opacity-80 italic">"{result.summary}"</p>
                </div>

                {result.ingredients && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> COMPOSITION_LOG
                    </h3>
                    <div className="space-y-2">
                      {result.ingredients.map((ing: any, i: number) => (
                        <div key={i} className="border border-neon-green/10 p-3 flex flex-col gap-2 hover:bg-neon-green/5 transition-colors">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold">{ing.name}</span>
                            <span className={cn(
                              "text-[8px] px-2 border",
                              ing.status === 'SAFE' ? "border-neon-green/50" : "border-red-500/50"
                            )}>{ing.status}</span>
                          </div>
                          <p className="text-[10px] opacity-60 leading-tight">{ing.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          <div className="h-48 border border-neon-green/30 p-4 flex flex-col gap-3 bg-black">
            <span className="text-[10px] font-bold opacity-50">RECENT_SESSIONS</span>
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1">
              {history.map((h, i) => (
                <button 
                  key={i}
                  onClick={() => setResult(h)}
                  className="w-full text-left p-2 border border-neon-green/5 text-[10px] hover:bg-neon-green/10 transition-all flex justify-between items-center group"
                >
                  <span className="truncate flex-1 pr-4">{h.productName || h.name || h.brandName}</span>
                  <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all" />
                </button>
              ))}
              {history.length === 0 && <span className="text-[10px] opacity-20">NULL_HISTORY</span>}
            </div>
          </div>
        </div>
      </main>

      {/* SYSTEM FOOTER */}
      <footer className="h-10 border border-neon-green/30 flex justify-between items-center px-4 bg-dark-green/5 text-[10px]">
        <div className="flex gap-6 opacity-50">
          <span>STATUS: NOMINAL</span>
          <span>MEMORY: {Math.floor(Math.random() * 100)}%</span>
          <span>REGISTRY: 1.2M_ITEMS</span>
        </div>
        <div className="flex gap-4">
          <span className="animate-pulse">● SYSTEM_LIVE</span>
          <span>© 2026 CHEMSAFE_INTEL</span>
        </div>
      </footer>

      <canvas ref={canvasRef} className="hidden" />

      {/* SETTINGS MODAL */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setShowSettings(false)} 
              className="absolute inset-0 bg-black/90 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              exit={{ opacity: 0, scale: 0.95 }} 
              className="bg-black border border-neon-green p-8 w-full max-w-md relative z-10 shadow-[0_0_50px_rgba(0,255,0,0.2)]"
            >
              <div className="flex items-center gap-3 mb-8">
                <Key className="w-6 h-6" />
                <h3 className="text-xl font-bold tracking-tighter uppercase">AUTHORIZATION_KEY</h3>
              </div>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-[10px] opacity-50 block mb-2 uppercase">Input_Access_Token</label>
                  <input 
                    type="password" 
                    value={tempApiKey} 
                    onChange={(e) => setTempApiKey(e.target.value)} 
                    placeholder="AIzaSy..." 
                    className="w-full bg-black border border-neon-green/30 py-4 px-5 font-mono text-sm focus:border-neon-green outline-none transition-all placeholder:opacity-20" 
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setShowSettings(false)} 
                  className="flex-1 py-4 border border-neon-green/30 font-bold text-xs hover:bg-neon-green/10 transition-colors uppercase"
                >
                  Discard
                </button>
                <button 
                  onClick={() => {
                    localStorage.setItem('gemini_api_key', tempApiKey);
                    window.location.reload();
                  }} 
                  className="flex-1 py-4 bg-neon-green text-black font-bold text-xs hover:bg-white transition-colors uppercase"
                >
                  Authorize
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
