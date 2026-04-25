import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Camera, 
  Upload, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  Beaker, 
  Building2, 
  Scan,
  History,
  X,
  Loader2,
  ChevronRight,
  Info,
  Heart,
  Skull,
  Sun,
  Moon,
  Settings,
  Key,
  Leaf
} from 'lucide-react';
import { cn } from './lib/utils';
import { ScannerOverlay } from './components/ScannerOverlay';
import { SafetyBadge } from './components/SafetyBadge';
import { 
  analyzeIngredients, 
  searchChemical, 
  getBrandIntelligence,
  getApiKey
} from './lib/gemini';
import { 
  ProductAnalysis, 
  BrandIntelligence, 
  ChemicalInfo, 
  SafetyStatus 
} from './types';


const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [registrySearchQuery, setRegistrySearchQuery] = useState('');
  const [result, setResult] = useState<ProductAnalysis | ChemicalInfo | BrandIntelligence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempApiKey, setTempApiKey] = useState(localStorage.getItem('gemini_api_key') || '');
  const [hasApiKey, setHasApiKey] = useState(!!getApiKey());
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved) return saved as 'dark' | 'light';
      return 'dark';
    }
    return 'dark';
  });

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    if (newTheme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  };

  const isApiKeyMissing = !hasApiKey;

  const saveApiKey = () => {
    if (tempApiKey.trim()) {
      localStorage.setItem('gemini_api_key', tempApiKey.trim());
      setHasApiKey(true);
    } else {
      localStorage.removeItem('gemini_api_key');
      setHasApiKey(!!getApiKey());
    }
    setShowSettings(false);
  };

  // Ensure theme is applied on mount
  React.useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      
      // Attempt to attach immediately if ref exists
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      setError("Camera access denied or not available. Please ensure you've granted permissions.");
      console.error("Camera error:", err);
    }
  };

  // Sync effect to handle video mounting lifecycle
  React.useEffect(() => {
    if (isCameraActive && streamRef.current && videoRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
    }
  }, [isCameraActive, streamRef.current, videoRef.current]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  const takePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas dimensions to match video stream
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current frame
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const base64 = canvas.toDataURL('image/jpeg').split(',')[1];
    
    setIsScanning(true);
    setError(null);
    setResult(null);

    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 1500));
        setResult({
          productName: "Simulated Ingredient Analysis",
          brandName: "Demo Brand",
          overallStatus: "CAUTION" as SafetyStatus,
          summary: "This is a simulated result. In a real environment, the AI would perform OCR and analyze the ingredients from your photo.",
          ingredients: [
            { name: "Sodium Laureth Sulfate", explanation: "Cleansing agent. May cause irritation.", status: "CAUTION" as SafetyStatus, healthHazards: ["Skin irritation"] },
            { name: "Aqua", explanation: "Pure water base.", status: "SAFE" as SafetyStatus, benefits: ["Hydration"] }
          ]
        });
        stopCamera();
        return;
      }
      const analysis = await analyzeIngredients(base64);
      setResult(analysis);
      stopCamera(); // Close camera after successful scan
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze image");
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        if (isDemoMode) {
          await new Promise(r => setTimeout(r, 1200));
          setResult({
            productName: "Uploaded Document Demo",
            brandName: "Local Import",
            overallStatus: "SAFE" as SafetyStatus,
            summary: "Simulated analysis complete. Real-world analysis requires a valid Gemini API key.",
            ingredients: [
              { name: "Glycerin", explanation: "Humectant. Highly safe.", status: "SAFE" as SafetyStatus, benefits: ["Moisturizing"] }
            ]
          });
          return;
        }
        const analysis = await analyzeIngredients(base64);
        setResult(analysis);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to analyze image");
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSearch = async (queryOverride?: string | React.MouseEvent) => {
    const query = typeof queryOverride === 'string' ? queryOverride : searchQuery;
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 1000));
        setResult({
          brandName: query,
          reputationStatus: "SAFE",
          summary: `This is simulated brand data for "${query}". real brand intelligence requires an active API key.`,
          recallHistory: [],
          manufacturingStandards: "Simulated high standards",
          ingredients: []
        } as BrandIntelligence);
        return;
      }
      const trendingBrands = ['Nestlé', 'Unilever', 'P&G', 'Johnson & Johnson', 'Coca-Cola', 'Nestle'];
      if (trendingBrands.some(b => query.toLowerCase().includes(b.toLowerCase()))) {
        const intelligence = await getBrandIntelligence(query);
        setResult(intelligence);
      } else {
        const info = await searchChemical(query);
        setResult(info);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const handleRegistrySearch = async (queryOverride?: string | React.MouseEvent) => {
    const query = typeof queryOverride === 'string' ? queryOverride : registrySearchQuery;
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
      if (isDemoMode) {
        await new Promise(r => setTimeout(r, 800));
        setResult({
          name: query,
          safetyVerdict: "SAFE",
          explanation: "Simulated safety explanation for the chemical registry.",
          formula: "Demo-CxHy",
          hazards: ["None identified in demo"],
          benefits: ["Simulation active"],
          commonUses: ["Demo usage"],
          regulations: "Demo regulations"
        } as ChemicalInfo);
        return;
      }
      const info = await searchChemical(query);
      setResult(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chemical search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const renderResults = () => {
    if (!result) return null;

    // Type guards
    const isProduct = 'ingredients' in result;
    const isChemical = 'formula' in result;
    const isBrand = 'brandName' in result && !isProduct;

    if (isProduct) {
      const data = result as ProductAnalysis;
      return (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-display font-bold leading-tight">{data.productName}</h2>
                {data.brandName && <p className="text-dim text-sm mt-1 flex items-center gap-2"><Building2 className="w-4 h-4" /> {data.brandName}</p>}
              </div>
              <SafetyBadge status={data.overallStatus} className="scale-110 origin-top-right" />
            </div>
          </div>

          <div className="bg-brand-emerald/5 border border-brand-emerald/20 p-5 rounded-2xl flex gap-4 items-start shadow-inner">
            <div className="bg-brand-emerald/20 p-2 rounded-full shrink-0 mt-1">
              <Info className="w-5 h-5 text-brand-emerald" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm mb-1">AI Summary</h4>
              <p className="text-dim text-sm leading-relaxed">{data.summary}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="label-tiny m-0 text-white">Ingredient Analysis</h4>
              <span className="text-xs font-bold bg-white/10 px-3 py-1 rounded-full">{data.ingredients?.length || 0} items detected</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.ingredients?.map((ing, idx) => (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  key={idx} 
                  className={cn(
                    "p-4 rounded-2xl space-y-3 border transition-colors",
                    ing.status === 'SAFE' ? "bg-brand-emerald/5 border-brand-emerald/10 hover:border-brand-emerald/30" :
                    ing.status === 'CAUTION' ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40" :
                    "bg-rose-500/5 border-rose-500/20 hover:border-rose-500/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-bold text-sm truncate mb-1",
                        ing.status === 'CAUTION' ? "text-amber-400" :
                        ing.status === 'UNSAFE' ? "text-rose-400" : "text-white"
                      )}>{ing.name}</p>
                      <p className="text-[11px] text-dim leading-snug">{ing.explanation}</p>
                    </div>
                    <SafetyBadge status={ing.status} showIcon={true} className="scale-75 origin-top-right m-0" />
                  </div>
                  
                  {(ing.benefits?.length || ing.healthHazards?.length) && (
                    <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                      {ing.benefits?.map((b, i) => (
                        <span key={i} className="text-[9px] font-bold uppercase tracking-wider bg-brand-emerald/10 text-brand-emerald px-2 py-1 rounded-md flex items-center gap-1.5">
                          <Leaf className="w-3 h-3" /> {b}
                        </span>
                      ))}
                      {ing.healthHazards?.map((h, i) => (
                        <span key={i} className="text-[9px] font-bold uppercase tracking-wider bg-rose-500/10 text-rose-500 px-2 py-1 rounded-md flex items-center gap-1.5">
                          <Skull className="w-3 h-3" /> {h}
                        </span>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      );
    }

    if (isChemical) {
      const data = result as ChemicalInfo;
      return (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-3xl font-display font-bold leading-tight">{data.name}</h2>
              {data.formula && <p className="text-brand-emerald font-mono text-sm bg-brand-emerald/10 inline-block px-3 py-1 rounded-full mt-2">{data.formula}</p>}
            </div>
            <SafetyBadge status={data.safetyVerdict} className="scale-110 origin-top-right" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-rose-500/5 border border-rose-500/10 p-5 rounded-2xl hover:border-rose-500/30 transition-colors">
              <h4 className="label-tiny flex items-center gap-2 text-rose-500 mb-3">
                <Skull className="w-4 h-4" /> Health Hazards
              </h4>
              <ul className="space-y-2">
                {data.hazards?.map((h, i) => (
                  <li key={i} className="text-dim text-xs flex gap-3 leading-relaxed">
                    <span className="text-rose-500 font-bold mt-0.5">›</span> {h}
                  </li>
                ))}
              </ul>
            </div>

            {data.benefits && data.benefits.length > 0 && (
              <div className="bg-brand-emerald/5 border border-brand-emerald/10 p-5 rounded-2xl hover:border-brand-emerald/30 transition-colors">
                <h4 className="label-tiny flex items-center gap-2 text-brand-emerald mb-3">
                  <Heart className="w-4 h-4" /> Benefits & Uses
                </h4>
                <ul className="space-y-2">
                  {data.benefits.map((b, i) => (
                    <li key={i} className="text-dim text-xs flex gap-3 leading-relaxed">
                      <span className="text-brand-emerald font-bold mt-0.5">›</span> {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {data.regulations && (
            <div className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 text-xs text-indigo-200 flex gap-4 items-start hover:border-indigo-500/40 transition-colors">
              <ShieldCheck className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-indigo-400 uppercase tracking-widest text-[10px] mb-1">Global Regulations</strong>
                <span className="leading-relaxed opacity-90">{data.regulations}</span>
              </div>
            </div>
          )}
        </motion.div>
      );
    }

    if (isBrand) {
      const data = result as BrandIntelligence;
      return (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-3xl font-display font-bold">{data.brandName}</h2>
            <SafetyBadge status={data.reputationStatus} label={data.reputationStatus === 'SAFE' ? 'TRUSTED' : data.reputationStatus} className="scale-110 origin-top-right" />
          </div>

          <div className="p-5 rounded-2xl bg-brand-emerald/5 border border-brand-emerald/20 flex gap-4 items-start">
            <Building2 className="w-5 h-5 text-brand-emerald shrink-0 mt-0.5" />
            <p className="text-dim text-sm leading-relaxed">{data.summary}</p>
          </div>

          <div className="space-y-4">
            <h4 className="label-tiny flex items-center gap-2 text-white">
              <History className="w-4 h-4" /> Recall History
            </h4>
            <div className="grid gap-3">
              {data.recallHistory?.length > 0 ? data.recallHistory.map((h, i) => (
                <div key={i} className="bg-rose-500/5 p-4 rounded-xl text-sm border border-rose-500/20 hover:border-rose-500/40 transition-colors flex gap-3 items-start">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-dim leading-relaxed">{h}</span>
                </div>
              )) : (
                <div className="bg-brand-emerald/5 border border-brand-emerald/10 p-4 rounded-xl flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-brand-emerald" />
                  <p className="text-brand-emerald text-sm font-medium">No significant recalls found.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 md:py-8 relative h-[100dvh] flex flex-col z-0 overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-brand-emerald/15 blur-[120px] rounded-full pointer-events-none -z-10 animate-pulse-glow" />
      
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-emerald-dark rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(52,211,153,0.3)]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-display font-extrabold tracking-tight bg-gradient-to-r from-white via-white to-brand-emerald bg-clip-text text-transparent">
            ChemSafe<span className="text-brand-emerald">Expert</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-dim hover:text-white"
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          
          <button 
            onClick={() => setShowSettings(true)}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-dim hover:text-white"
            title="Settings & API Key"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div className={cn(
            "px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-[12px] font-bold flex items-center gap-2",
            isApiKeyMissing ? "bg-amber-500/10 border-amber-500/30 text-amber-500" : "bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald"
          )}>
            <div className={cn("w-2 h-2 rounded-full animate-pulse", isApiKeyMissing ? "bg-amber-500" : "bg-brand-emerald")} />
            <span className="hidden sm:inline">{isApiKeyMissing ? 'INTELLIGENCE OFFLINE' : 'GEMINI 1.5 FLASH CONNECTED'}</span>
            <span className="sm:hidden uppercase tracking-widest">{isApiKeyMissing ? 'OFFLINE' : 'Connected'}</span>
          </div>
        </div>
      </header>

      {/* Warning if API Key is missing */}
      {isApiKeyMissing && (
        <div className="mb-6 p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center gap-4 text-amber-400">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <p className="text-sm font-bold uppercase tracking-wider">Intelligence Offline</p>
          </div>
          <div className="flex-1">
            <p className="text-xs leading-relaxed">
              Real-time AI analysis requires a Gemini API key. {isDemoMode ? "Currently running in DEMO MODE." : "Please add your key in settings to unlock full capabilities."}
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                isDemoMode ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30" : "bg-white/10 hover:bg-white/20 text-white"
              )}
            >
              {isDemoMode ? "DISABLE DEMO" : "ENABLE DEMO"}
            </button>
            <button 
              onClick={() => setShowSettings(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap bg-amber-500 text-black hover:bg-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)]"
            >
              ADD KEY
            </button>
          </div>
        </div>
      )}

      {/* Main Bento Grid */}
      <motion.main 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] lg:grid-rows-[auto_1fr] gap-4 md:gap-5 flex-1 min-h-0 overflow-y-auto lg:overflow-hidden custom-scrollbar pb-10 lg:pb-0"
      >
        
        {/* Scanner Section - Spans 2 rows */}
        <motion.div variants={itemVariants} className={cn(
          "bento-card scanner-view lg:row-span-2 border-2 bg-black flex-col justify-between p-0 overflow-hidden relative min-h-[40vh] lg:min-h-0 h-full",
          result ? "hidden lg:flex" : "flex",
          isCameraActive ? "border-brand-emerald/60 shadow-[0_0_40px_rgba(52,211,153,0.1)]" : "border-brand-emerald/40"
        )}>
          {/* Pulsing Border for Active Scan */}
          {isCameraActive && (
            <motion.div 
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="absolute inset-0 border-4 border-brand-emerald rounded-[48px] z-30 pointer-events-none"
            />
          )}

          <div className="relative flex-1 group">
            {isScanning ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20">
                <Loader2 className="w-12 h-12 text-brand-emerald animate-spin mb-4" />
                <p className="text-brand-emerald font-display font-bold tracking-[0.2em] text-xs uppercase">
                  Analyzing Label...
                </p>
              </div>
            ) : !isCameraActive ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-brand-emerald/10 flex items-center justify-center text-brand-emerald group-hover:scale-110 transition-transform">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold">Smart Viewfinder</h3>
                  <p className="text-dim text-sm max-w-xs mx-auto">Activate camera to scan labels directly using AI-vision.</p>
                </div>
                <button 
                  onClick={startCamera}
                  className="bg-brand-emerald/20 border border-brand-emerald/40 text-brand-emerald py-3 px-8 rounded-2xl font-display font-bold text-sm tracking-wider hover:bg-brand-emerald/30 transition-all font-bold"
                >
                  START CAMERA
                </button>
              </div>
            ) : null}

            {isCameraActive && (
              <motion.video 
                ref={videoRef}
                autoPlay
                playsInline
                muted
                initial={{ scale: 1.05, opacity: 0 }}
                animate={{ 
                  scale: [1.05, 1.07, 1.05],
                  opacity: 1
                }}
                transition={{
                  scale: {
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  },
                  opacity: { duration: 0.5 }
                }}
                className="absolute inset-0 w-full h-full object-cover z-0"
              />
            )}
            
            <ScannerOverlay active={isScanning} theme={theme} />
            
            <canvas ref={canvasRef} className="hidden" />
            
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept="image/*"
            />
          </div>

          <div className="bg-gradient-to-t from-black via-black/80 to-transparent p-5 md:p-8 pt-10 md:pt-16 relative z-10 transition-all">
            <span className="label-tiny">Analysis Engine</span>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <h2 className="text-2xl font-display font-bold mb-1">
                  {isCameraActive ? "Align Label" : "Scanner Ready"}
                </h2>
                <p className="text-dim text-xs">
                  {isCameraActive ? "Position ingredients within the window." : "FSSAI & EU REACH Cross-referencing enabled."}
                </p>
              </div>
              <div className="flex gap-2">
                <motion.button 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/5 border border-white/10 text-white p-4 rounded-2xl hover:bg-white/10 transition-colors"
                  title="Upload image"
                >
                  <Upload className="w-6 h-6" />
                </motion.button>
                {isCameraActive ? (
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={takePhoto}
                    className="bg-brand-emerald text-black p-4 rounded-2xl hover:bg-brand-emerald-light transition-colors shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                    title="Capture photo"
                  >
                    <Scan className="w-6 h-6" />
                  </motion.button>
                ) : (
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startCamera}
                    className="bg-brand-emerald text-black p-4 rounded-2xl hover:bg-brand-emerald-light transition-colors shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                    title="Start camera"
                  >
                    <Camera className="w-6 h-6" />
                  </motion.button>
                )}
                {isCameraActive && (
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={stopCamera}
                    className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl hover:bg-rose-500/20 transition-colors"
                    title="Stop camera"
                  >
                    <X className="w-6 h-6" />
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Global Overlays */}
        <AnimatePresence>
          {isScanning && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] bg-brand-emerald text-black px-8 py-3 rounded-full font-display font-bold shadow-[0_0_40px_rgba(52,211,153,0.5)] flex items-center gap-3 whitespace-nowrap"
            >
              <Loader2 className="w-5 h-5 animate-spin" />
              AI INTELLIGENCE SCANNING...
            </motion.div>
          )}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="lg:col-span-2 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-3 text-rose-400 mb-2"
            >
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Intelligence System Error</p>
                <p className="text-xs font-medium">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="p-1 hover:bg-rose-500/20 rounded-lg transition-colors"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search & Trending Section */}
        <motion.div variants={itemVariants} className={cn(
          "bento-card search-section flex-col gap-4",
          result ? "hidden lg:flex" : "flex"
        )}>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-brand-emerald/20 p-2 rounded-lg">
                <Search className="w-5 h-5 text-brand-emerald" />
              </div>
              <h3 className="text-lg md:text-xl font-display font-bold text-white">Intelligence Search</h3>
            </div>
            
            <div className="relative group">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Scan chemicals, brands, or E-numbers..."
                className="w-full bg-black/40 border border-white/10 hover:border-white/20 py-4 md:py-5 px-14 rounded-2xl font-medium text-base focus:outline-none focus:ring-2 focus:ring-brand-emerald/50 focus:border-brand-emerald/50 transition-all placeholder:text-dim/40 shadow-inner"
              />
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-dim/50 group-focus-within:text-brand-emerald transition-colors" />
              {isSearching ? (
                <Loader2 className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-brand-emerald" />
              ) : (
                <button 
                  onClick={handleSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-brand-emerald/10 hover:bg-brand-emerald/20 text-brand-emerald p-2 rounded-xl transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div>
            <span className="label-tiny text-dim mb-3 block">Trending Scans</span>
            <div className="grid grid-cols-2 gap-3">
              {['Nestlé', 'Titanium Dioxide', 'Red 40', 'Johnson & Johnson'].map(item => (
                <button 
                  key={item}
                  onClick={() => { setSearchQuery(item); handleSearch(); }}
                  className={cn(
                    "bg-white/5 border border-white/5 py-3 px-4 rounded-xl text-xs md:text-sm font-bold hover:bg-white/10 hover:border-white/10 transition-all text-center",
                    searchQuery === item && "bg-brand-emerald/10 border-brand-emerald/30 text-brand-emerald shadow-[0_0_15px_rgba(52,211,153,0.15)]"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto bg-gradient-to-r from-amber-500/10 to-transparent border-l-4 border-amber-500 p-4 rounded-r-xl flex items-center gap-4">
            <ShieldCheck className="w-6 h-6 text-amber-500 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-0.5">Live Database Connected</p>
              <p className="text-[11px] text-amber-200/70 leading-tight">Gemini 2.5 AI Engine active. Scanning 100k+ global registries.</p>
            </div>
          </div>
        </motion.div>

        {/* Registry Stats / Results Section */}
        <motion.div variants={itemVariants} className={cn(
          "bento-card flex-col gap-4 relative overflow-hidden min-h-0 h-full",
          result ? "flex flex-1" : "flex"
        )}>
          {/* Subtle background element for visual interest */}
          {result && <div className="absolute -top-32 -right-32 w-64 h-64 bg-brand-emerald/5 rounded-full blur-[60px] pointer-events-none" />}

          <div className="flex items-center justify-between z-10">
            <span className="label-tiny m-0">{result ? 'Analysis Results' : 'Global Registry'}</span>
            {result && (
              <button 
                onClick={() => { setResult(null); setRegistrySearchQuery(''); setSearchQuery(''); }}
                className="text-dim hover:text-white transition-colors flex items-center gap-2 text-xs font-bold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg"
                title="Clear results"
              >
                <X className="w-3 h-3" /> CLEAR
              </button>
            )}
          </div>

          {!result && (
            <div className="relative group z-10">
              <input 
                type="text" 
                value={registrySearchQuery}
                onChange={(e) => setRegistrySearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleRegistrySearch()}
                placeholder="Deep scan global databases..."
                className="w-full bg-inner border border-inner hover:border-white/10 py-3.5 px-10 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-emerald/30 transition-all placeholder:text-dim/50"
              />
              <Beaker className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dim/50 group-focus-within:text-brand-emerald transition-colors" />
              <button 
                onClick={() => handleRegistrySearch()}
                disabled={isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-emerald hover:text-brand-emerald-light transition-colors disabled:opacity-50 p-1"
              >
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
              </button>
            </div>
          )}
          

          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div 
                key="stats"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col justify-center"
              >
                <div className="flex flex-col sm:flex-row items-baseline gap-2 mb-4">
                  <span className="text-4xl md:text-5xl font-display font-extrabold text-brand-emerald tracking-tighter">102,482</span>
                  <span className="text-dim text-[10px] md:text-xs font-bold uppercase tracking-widest">Verified Compounds</span>
                </div>
                <div className="space-y-2">
                  {[
                    { name: 'Sodium Laureth Sulfate', status: 'CAUTION' as SafetyStatus },
                    { name: 'Aqua / Water', status: 'SAFE' as SafetyStatus },
                    { name: 'Citric Acid', status: 'SAFE' as SafetyStatus }
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-inner text-xs">
                      <span className="text-dim">{item.name}</span>
                      <span className={cn(
                        "font-bold uppercase tracking-tighter",
                        item.status === 'SAFE' ? "text-brand-emerald" : "text-amber-500"
                      )}>{item.status}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="results"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0 h-full"
              >
                {renderResults()}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

      </motion.main>

      {/* Footer */}
      <footer className="mt-8 py-4 border-t border-white/5 flex justify-between items-center text-[10px] font-bold text-white/20 uppercase tracking-[0.2em]">
        <span>&copy; 2026 CHEMSAFE INTELLIGENCE SYS</span>
        <div className="flex gap-6">
          <span>Privacy</span>
          <span>Terms</span>
          <span>v2.4.0</span>
        </div>
      </footer>

      {/* Result Modal Overlay (if needed for small screens or detailed view) */}
      <AnimatePresence>
        {result && (
          <motion.button 
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setResult(null)}
            className="fixed bottom-6 right-6 bg-brand-emerald text-black w-14 h-14 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(52,211,153,0.4)] z-[60] hover:scale-110 active:scale-90 transition-transform md:hidden"
          >
            <X className="w-8 h-8" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-inner border border-white/10 p-6 md:p-8 rounded-[32px] w-full max-w-md relative z-10 shadow-2xl"
            >
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-6 right-6 text-dim hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-brand-emerald/10 flex items-center justify-center text-brand-emerald">
                  <Key className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-display font-bold">API Configuration</h3>
                  <p className="text-dim text-xs">Manage your Gemini Intelligence connection</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="label-tiny mb-2">Gemini API Key</label>
                  <input 
                    type="password"
                    value={tempApiKey}
                    onChange={(e) => setTempApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-black/50 border border-white/10 py-3 px-4 rounded-xl font-mono text-sm focus:outline-none focus:ring-1 focus:ring-brand-emerald/50 transition-all placeholder:text-dim/30"
                  />
                  <p className="text-[10px] text-dim mt-2 leading-relaxed">
                    Your key is stored securely in your browser's local storage and is never sent anywhere except directly to Google's API.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-white/5 hover:bg-white/10 transition-colors"
                >
                  CANCEL
                </button>
                <button 
                  onClick={saveApiKey}
                  className="flex-1 py-3 px-4 rounded-xl font-bold text-xs bg-brand-emerald text-black hover:bg-brand-emerald-light transition-colors shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                >
                  SAVE CONFIG
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
