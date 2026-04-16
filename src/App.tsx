import React, { useState, useRef, useCallback } from 'react';
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
  Leaf,
  Sun,
  Moon
} from 'lucide-react';
import { cn } from './lib/utils';
import { ScannerOverlay } from './components/ScannerOverlay';
import { SafetyBadge } from './components/SafetyBadge';
import { 
  analyzeIngredients, 
  searchChemical, 
  getBrandIntelligence 
} from './lib/gemini';
import { 
  ProductAnalysis, 
  BrandIntelligence, 
  ChemicalInfo, 
  SafetyStatus 
} from './types';


export default function App() {
  const [isScanning, setIsScanning] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [registrySearchQuery, setRegistrySearchQuery] = useState('');
  const [result, setResult] = useState<ProductAnalysis | ChemicalInfo | BrandIntelligence | null>(null);
  const [error, setError] = useState<string | null>(null);
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

  const handleSearch = async (queryOverride?: string) => {
    const query = queryOverride || searchQuery;
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
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

  const handleRegistrySearch = async (queryOverride?: string) => {
    const query = queryOverride || registrySearchQuery;
    if (!query.trim()) return;

    setIsSearching(true);
    setError(null);
    setResult(null);

    try {
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
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold">{data.productName}</h2>
              <SafetyBadge status={data.overallStatus} />
            </div>
            {data.brandName && <p className="text-dim text-sm">by {data.brandName}</p>}
          </div>

          <div className="bg-inner border border-inner p-4 rounded-2xl">
            <p className="text-dim text-sm leading-relaxed">{data.summary}</p>
          </div>

          <div className="space-y-3">
            <h4 className="label-tiny">Ingredient Analysis</h4>
            <div className="grid gap-2">
              {data.ingredients.map((ing, idx) => (
                <div key={idx} className="bg-inner p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm truncate">{ing.name}</p>
                      <p className="text-[10px] text-dim">{ing.explanation}</p>
                    </div>
                    <SafetyBadge status={ing.status} showIcon={false} className="scale-75 origin-right" />
                  </div>
                  
                  {(ing.benefits?.length || ing.healthHazards?.length) && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-inner">
                      {ing.benefits?.map((b, i) => (
                        <span key={i} className="text-[9px] bg-brand-emerald/10 text-brand-emerald px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Leaf className="w-2 h-2" /> {b}
                        </span>
                      ))}
                      {ing.healthHazards?.map((h, i) => (
                        <span key={i} className="text-[9px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Skull className="w-2 h-2" /> {h}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (isChemical) {
      const data = result as ChemicalInfo;
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-display font-bold">{data.name}</h2>
              {data.formula && <p className="text-brand-emerald font-mono text-sm">{data.formula}</p>}
            </div>
            <SafetyBadge status={data.safetyVerdict} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-inner p-4 rounded-2xl">
              <h4 className="label-tiny flex items-center gap-2">
                <Skull className="w-3 h-3" /> Health Hazards
              </h4>
              <ul className="space-y-1">
                {data.hazards.map((h, i) => (
                  <li key={i} className="text-dim text-[11px] flex gap-2">
                    <span className="text-rose-500">•</span> {h}
                  </li>
                ))}
              </ul>
            </div>

            {data.benefits && data.benefits.length > 0 && (
              <div className="bg-brand-emerald/5 p-4 rounded-2xl border border-brand-emerald/10">
                <h4 className="label-tiny flex items-center gap-2 text-brand-emerald">
                  <Heart className="w-3 h-3" /> Benefits
                </h4>
                <ul className="space-y-1">
                  {data.benefits.map((b, i) => (
                    <li key={i} className="text-brand-emerald/80 text-[11px] flex gap-2">
                      <span>•</span> {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl border border-white/10 italic text-dim text-[11px]">
            <strong>Regulatory:</strong> {data.regulations}
          </div>
        </div>
      );
    }

    if (isBrand) {
      const data = result as BrandIntelligence;
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold">{data.brandName}</h2>
            <SafetyBadge status={data.reputationStatus} label={data.reputationStatus === 'SAFE' ? 'TRUSTED' : data.reputationStatus} />
          </div>

          <div className="p-4 rounded-2xl bg-brand-emerald/5 border border-brand-emerald/10">
            <p className="text-slate-200 text-sm">{data.summary}</p>
          </div>

          <div className="space-y-3">
            <h4 className="label-tiny flex items-center gap-2">
              <History className="w-3 h-3" /> Recalls
            </h4>
            <div className="grid gap-2">
              {data.recallHistory.length > 0 ? data.recallHistory.map((h, i) => (
                <div key={i} className="bg-white/5 py-2 px-3 rounded-lg text-[11px] border-l-2 border-rose-500">
                  {h}
                </div>
              )) : (
                <p className="text-dim text-[11px] italic">No significant recalls found.</p>
              )}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10 relative min-h-screen flex flex-col">
      {/* Header */}
      <header className="mb-8 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-emerald-dark rounded-xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(52,211,153,0.3)]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-display font-extrabold tracking-tight">
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

          <div className="bg-brand-emerald/10 border border-brand-emerald/30 px-3 md:px-4 py-1.5 rounded-full text-[10px] md:text-[12px] font-bold text-brand-emerald flex items-center gap-2">
            <div className="w-2 h-2 bg-brand-emerald rounded-full animate-pulse" />
            <span className="hidden sm:inline">GEMINI 3.1 FLASH CONNECTED</span>
            <span className="sm:hidden uppercase tracking-widest">Connected</span>
          </div>
        </div>
      </header>

      {/* Warning if API Key is missing */}
      {!process.env.GEMINI_API_KEY && (
        <div className="mb-6 p-5 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex flex-col md:flex-row items-start md:items-center gap-4 text-rose-400">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <p className="text-sm font-bold uppercase tracking-wider">AI Intelligence Offline</p>
          </div>
          <div className="flex-1">
            <p className="text-xs leading-relaxed">
              Gemini API Key is required for product analysis. Please add <code className="bg-rose-500/20 px-1.5 py-0.5 rounded text-white font-mono">GEMINI_API_KEY</code> in the <strong>Settings &gt; Secrets</strong> menu of AI Studio, then restart the preview.
            </p>
          </div>
        </div>
      )}

      {/* Main Bento Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-5 flex-1 min-h-0">
        
        {/* Scanner Section - Spans 2 rows */}
        <div className={cn(
          "bento-card scanner-view lg:row-span-2 border-2 bg-black flex flex-col justify-between p-0 overflow-hidden relative min-h-[400px] sm:min-h-[500px] lg:min-h-0 aspect-[4/5] md:aspect-auto",
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
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white/5 border border-white/10 text-white p-4 rounded-2xl hover:bg-white/10 transition-all active:scale-95"
                  title="Upload image"
                >
                  <Upload className="w-6 h-6" />
                </button>
                {isCameraActive ? (
                  <button 
                    onClick={takePhoto}
                    className="bg-brand-emerald text-black p-4 rounded-2xl hover:bg-brand-emerald-light transition-all active:scale-95 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                    title="Capture photo"
                  >
                    <Scan className="w-6 h-6" />
                  </button>
                ) : (
                  <button 
                    onClick={startCamera}
                    className="bg-brand-emerald text-black p-4 rounded-2xl hover:bg-brand-emerald-light transition-all active:scale-95 shadow-[0_0_20px_rgba(52,211,153,0.4)]"
                    title="Start camera"
                  >
                    <Camera className="w-6 h-6" />
                  </button>
                )}
                {isCameraActive && (
                  <button 
                    onClick={stopCamera}
                    className="bg-rose-500/10 border border-rose-500/20 text-rose-500 p-4 rounded-2xl hover:bg-rose-500/20 transition-all active:scale-95"
                    title="Stop camera"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

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
        <div className="bento-card search-section flex flex-col gap-5">
          <div>
            <span className="label-tiny">Intelligence Search</span>
            <div className="relative group">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Search chemicals, brands, or E-numbers..."
                className="w-full bg-inner border border-inner py-4 px-12 rounded-2xl font-medium text-sm focus:outline-none focus:ring-1 focus:ring-brand-emerald/50 transition-all placeholder:text-dim/50"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dim/50 group-focus-within:text-brand-emerald transition-colors" />
              {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-brand-emerald" />}
            </div>
          </div>

          <div>
            <span className="label-tiny">Trending Brands</span>
            <div className="grid grid-cols-2 gap-2">
              {['Nestlé', 'Unilever', 'P&G', 'Johnson & Johnson'].map(brand => (
                <button 
                  key={brand}
                  onClick={() => { setSearchQuery(brand); handleSearch(); }}
                  className={cn(
                    "bg-inner border border-inner py-3 px-4 rounded-2xl text-xs font-bold hover:bg-black/10 transition-all text-center",
                    searchQuery === brand && "bg-brand-emerald/20 border-brand-emerald/40 text-brand-emerald"
                  )}
                >
                  {brand}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto bg-amber-500/5 border-l-4 border-amber-500 p-4 rounded-r-xl">
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">API Status</p>
            <p className="text-[11px] text-amber-200/70 leading-tight">Enterprise tier active. 100k+ registry queries available.</p>
          </div>
        </div>

        {/* Registry Stats / Results Section */}
        <div className="bento-card flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="label-tiny m-0">Global Registry</span>
            {result && (
              <button 
                onClick={() => { setResult(null); setRegistrySearchQuery(''); }}
                className="text-dim hover:text-white transition-colors"
                title="Clear results"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="relative group">
            <input 
              type="text" 
              value={registrySearchQuery}
              onChange={(e) => setRegistrySearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRegistrySearch()}
              placeholder="Search 100k+ chemicals..."
              className="w-full bg-inner border border-inner py-3 px-10 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-emerald/50 transition-all placeholder:text-dim/50"
            />
            <Beaker className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim/50 group-focus-within:text-brand-emerald transition-colors" />
            <button 
              onClick={() => handleRegistrySearch()}
              disabled={isSearching}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-brand-emerald hover:text-brand-emerald-light transition-colors disabled:opacity-50"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
          
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
                className="flex-1 overflow-y-auto custom-scrollbar pr-2"
              >
                {renderResults()}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </main>

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
