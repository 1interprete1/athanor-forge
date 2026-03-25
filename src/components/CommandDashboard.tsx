import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, LayoutDashboard, Activity, Zap, CreditCard, Play, Users, BookOpen, Brain, Code, Globe, Eye, Mic, Shield, Clock, Database, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ModelDefinition, Message } from '../types';
import { useStore } from '../contexts/StoreContext';
import { useContextTracker } from '../hooks/useContextTracker';

interface CommandDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  models: ModelDefinition[];
  selectedModelId: string | null;
  onSelectModel: (id: string) => void;
  messages: Message[];
}

const RadialGauge = ({ value, limit, label, icon }: { value: number, limit: number, label: string, icon: React.ReactNode }) => {
  const percentage = limit > 0 ? (value / limit) * 100 : 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (p: number) => {
    if (p > 40) return 'text-emerald-500';
    if (p > 15) return 'text-amber-500';
    return 'text-rose-500';
  };

  const getStrokeColor = (p: number) => {
    if (p > 40) return 'stroke-emerald-500';
    if (p > 15) return 'stroke-amber-500';
    return 'stroke-rose-500';
  };

  // Generate 10 tick marks every 36 degrees
  const ticks = Array.from({ length: 10 }).map((_, i) => {
    const angle = i * 36;
    return (
      <line
        key={i}
        x1="64"
        y1="24"
        x2="64"
        y2="28"
        className="stroke-zinc-700"
        strokeWidth="1"
        transform={`rotate(${angle}, 64, 64)`}
      />
    );
  });

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-none p-6 flex flex-col items-center justify-center space-y-4 relative overflow-hidden group">
      {/* Inner Glow Effect */}
      <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[inset_0_0_40px_rgba(249,115,22,0.1)]" />
      
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          {/* Ticks */}
          {ticks}
          
          <circle
            cx="64"
            cy="64"
            r={radius}
            className="stroke-zinc-900 fill-none"
            strokeWidth="8"
          />
          <motion.circle
            cx="64"
            cy="64"
            r={radius}
            className={`fill-none transition-all duration-1000 ${getStrokeColor(percentage)}`}
            strokeWidth="8"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            strokeLinecap="square"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xl font-mono font-bold tracking-tight ${getColor(percentage)}`}>{Math.round(percentage)}%</span>
          <span className="text-[7px] text-neutral-600 uppercase font-bold tracking-[0.2em] mt-1">[LOAD_INDEX]</span>
        </div>
      </div>
      <div className="text-center space-y-1 relative z-10">
        <div className="flex items-center justify-center gap-2">
          <span className={getColor(percentage)}>{icon}</span>
          <p className="text-[10px] font-bold text-white uppercase tracking-widest">{label}</p>
        </div>
        <p className="text-[9px] text-neutral-500 font-mono">
          {value.toLocaleString()} / {limit.toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export const CommandDashboard: React.FC<CommandDashboardProps> = ({ 
  isOpen, 
  onClose, 
  models, 
  selectedModelId, 
  onSelectModel,
  messages
}) => {
  const { quota, usdToMxnRate, fxTimestamp, performanceHistory, activeSessionId } = useStore();
  const { totalCost } = useContextTracker();
  const [timeLeft, setTimeLeft] = useState(0);
  const [totalSpend, setTotalSpend] = useState(0);
  const [showCert, setShowCert] = useState(false);

  const activePerformance = performanceHistory[activeSessionId] || [];
  const tpsData = activePerformance.map(p => p.tps);
  const latencyData = activePerformance.map(p => p.ttft);
  const efficiencyData = activePerformance.map(p => p.contextUsage);

  const Sparkline = ({ data, color = 'stroke-orange-500', fillGradient = 'url(#orangeGradient)' }: { data: number[], color?: string, fillGradient?: string }) => {
    if (data.length === 0) return <div className="h-12 w-full bg-zinc-950 border border-zinc-900 animate-pulse" />;
    const max = Math.max(...data, 1);
    const min = Math.min(...data);
    const range = max - min || 1;
    const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ');
    const fillPoints = `0,100 ${points} 100,100`;

    return (
      <div className="relative w-full h-12 bg-black/40 border border-zinc-900 overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(249, 115, 22)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="rgb(249, 115, 22)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(16, 185, 129)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="rgb(16, 185, 129)" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(59, 130, 246)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="rgb(59, 130, 246)" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline fill={fillGradient} points={fillPoints} />
          <polyline fill="none" strokeWidth="2" className={color} points={points} />
        </svg>
        
        {/* Radar Scan Line */}
        <motion.div
          className="absolute top-0 bottom-0 w-[1px] bg-white/20 z-10"
          animate={{ left: ['0%', '100%'] }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  };

  useEffect(() => {
    const savedSpend = localStorage.getItem('athanor_total_spend');
    if (savedSpend) {
      setTotalSpend(parseFloat(savedSpend));
    }
  }, [isOpen]);

  useEffect(() => {
    if (!quota?.resetTokens) return;
    
    // Parse "1.2s" or "0s"
    const seconds = parseFloat(quota.resetTokens.replace('s', ''));
    setTimeLeft(seconds);

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 0.1));
    }, 100);

    return () => clearInterval(timer);
  }, [quota?.resetTokens]);

  if (!isOpen) return null;

  // Mock data for charts
  const usageData = [40, 65, 45, 90, 55, 80, 70, 85, 60, 95, 75, 100];
  const spendData = [20, 35, 25, 50, 30, 45, 40, 55, 35, 60, 50, 70];

  // Taxonomy categorization
  const categories = [
    { 
      id: 'reasoning', 
      name: 'Reasoning', 
      icon: <Brain className="w-3 h-3" />, 
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
      keywords: ['deepseek-r1', 'qwen-32b'] 
    },
    { 
      id: 'tools', 
      name: 'Tool Use / Function Calling', 
      icon: <Code className="w-3 h-3" />, 
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
      keywords: ['llama-3.3', 'llama-3.1', 'gpt-oss'] 
    },
    { 
      id: 'vision', 
      name: 'Vision', 
      icon: <Eye className="w-3 h-3" />, 
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      keywords: ['vision'] 
    },
    { 
      id: 'multilingual', 
      name: 'Multilingual', 
      icon: <Globe className="w-3 h-3" />, 
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      keywords: ['llama3-70b', 'llama3-8b'] 
    },
    { 
      id: 'audio', 
      name: 'Audio / STT', 
      icon: <Mic className="w-3 h-3" />, 
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      keywords: ['whisper'] 
    }
  ];

  const categorizedModels = categories.map(cat => ({
    ...cat,
    items: models.filter(m => cat.keywords.some(k => m.id.toLowerCase().includes(k)))
  })).filter(cat => cat.items.length > 0);

  const handleModelClick = (id: string) => {
    onSelectModel(id);
    onClose();
  };

  const dashboardContent = (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="fixed inset-0 z-[100] bg-neutral-950 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-900 backdrop-blur-xl bg-neutral-950/80 relative z-[110]">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 border border-orange-500/20">
            <LayoutDashboard className="w-5 h-5 text-orange-500" />
          </div>
          <h2 className="text-lg font-bold text-white uppercase tracking-widest">
            Athanor Forge: <span className="text-orange-500">Infrastructure Dashboard</span>
          </h2>
        </div>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={onClose}
          className="p-2 hover:bg-zinc-900 transition-colors text-neutral-400 hover:text-white border border-transparent hover:border-zinc-800 relative z-[120]"
        >
          <X className="w-6 h-6" />
        </motion.button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide">
        {/* Infrastructure Health & Quotas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Infrastructure Health & Quotas</h3>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Shield className="w-3 h-3 text-emerald-500" />
              <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">Tier: {quota?.tier || 'UNKNOWN'}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <RadialGauge 
              value={quota?.remainingTokens || 0} 
              limit={quota?.limitTokens || 1} 
              label="Token Quota (TPM)" 
              icon={<Zap className="w-3 h-3" />}
            />
            <RadialGauge 
              value={quota?.remainingRequests || 0} 
              limit={quota?.limitRequests || 1} 
              label="Request Quota (RPM)" 
              icon={<Activity className="w-3 h-3" />}
            />
            <div className="bg-zinc-950 border border-zinc-900 rounded-none p-6 flex flex-col items-center justify-center space-y-4 relative overflow-hidden group">
              <div className="p-4 bg-orange-500/10 border border-orange-500/20">
                <Clock className="w-8 h-8 text-orange-500" />
              </div>
              <div className="text-center space-y-1">
                <p className="text-[10px] font-bold text-white uppercase tracking-widest">Reset Clock</p>
                <h4 className="text-3xl font-bold text-white font-mono">{timeLeft.toFixed(1)}s</h4>
                <p className="text-[9px] text-neutral-500 uppercase tracking-widest">Próximo refresco de cuota</p>
              </div>
              <div className="w-full h-1 bg-zinc-900 overflow-hidden">
                <motion.div 
                  className="h-full bg-orange-500"
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / 60) * 100}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Overview Section */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Token Usage Card */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-none p-6 space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Zap className="w-24 h-24 text-white" />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Token Usage (Last 30 Days)</p>
                  <h4 className="text-4xl font-bold text-white tracking-tight">275.9K</h4>
                </div>
                <Activity className="w-5 h-5 text-orange-500" />
              </div>
              
              {/* Simulated Bar Chart */}
              <div className="h-24 flex items-end gap-1.5 relative z-10">
                {usageData.map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-orange-500/20 hover:bg-orange-500/40 transition-all"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Total Spend Card */}
            <div className="bg-zinc-950 border border-zinc-900 rounded-none p-6 space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <CreditCard className="w-24 h-24 text-white" />
              </div>
              <div className="flex items-center justify-between relative z-10">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Total Spend (Accumulated)</p>
                  <div className="flex items-baseline gap-3">
                    <h4 className="text-4xl font-bold text-white tracking-tight">${totalSpend.toFixed(4)} <span className="text-xs text-neutral-500 font-normal">USD</span></h4>
                    <div className="h-6 w-[1px] bg-white/10" />
                    <h4 className="text-2xl font-bold text-emerald-500 tracking-tight">${(totalSpend * usdToMxnRate).toFixed(2)} <span className="text-[10px] text-emerald-500/50 font-normal">MXN</span></h4>
                  </div>
                </div>
                <div className="p-1.5 bg-emerald-500/10">
                  <CreditCard className="w-4 h-4 text-emerald-500" />
                </div>
              </div>

              {/* Simulated Bar Chart */}
              <div className="h-24 flex items-end gap-1.5 relative z-10">
                {spendData.map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-emerald-500/20 hover:bg-emerald-500/40 transition-all"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Inference Performance Profile */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Inference Performance Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-950 border border-zinc-900 rounded-none p-6 space-y-2">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">TPS Trend</p>
              <Sparkline data={tpsData} color="stroke-orange-500" fillGradient="url(#orangeGradient)" />
            </div>
            <div className="bg-zinc-950 border border-zinc-900 rounded-none p-6 space-y-2">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Latency (TTFT)</p>
              <Sparkline data={latencyData} color="stroke-emerald-500" fillGradient="url(#emeraldGradient)" />
            </div>
            <div className="bg-zinc-950 border border-zinc-900 rounded-none p-6 space-y-2">
              <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Context Efficiency</p>
              <Sparkline data={efficiencyData} color="stroke-blue-500" fillGradient="url(#blueGradient)" />
            </div>
          </div>
        </div>

        {/* Financial Engine: Inference Billing Ledger */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Inference Billing Ledger</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-mono text-emerald-500 uppercase tracking-widest">
                [FX_VERIFIED_AT: {fxTimestamp ? new Date(fxTimestamp).toLocaleTimeString([], { hour12: false }) : '00:00:00'}]
              </span>
            </div>
          </div>

          <div className="bg-zinc-950 border border-zinc-900 rounded-none p-8 font-mono">
            <div className="space-y-4">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-500 uppercase tracking-widest">Active Branch Cost</span>
                <div className="flex-1 mx-4 border-b border-dotted border-zinc-800" />
                <div className="text-right">
                  <span className="text-white font-bold">${totalCost.toFixed(6)} USD</span>
                  <span className="text-neutral-600 mx-2">|</span>
                  <span className="text-emerald-500 font-bold">${(totalCost * usdToMxnRate).toFixed(4)} MXN</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-500 uppercase tracking-widest">Session Max Peak</span>
                <div className="flex-1 mx-4 border-b border-dotted border-zinc-800" />
                <div className="text-right">
                  <span className="text-white font-bold">
                    ${Math.max(...messages.filter(m => m.role === 'assistant').map(m => m.cost || 0), 0).toFixed(6)} USD
                  </span>
                  <span className="text-neutral-600 mx-2">|</span>
                  <span className="text-amber-500 font-bold">
                    ${(Math.max(...messages.filter(m => m.role === 'assistant').map(m => m.cost || 0), 0) * usdToMxnRate).toFixed(4)} MXN
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px]">
                <span className="text-neutral-500 uppercase tracking-widest">Efficiency Index</span>
                <div className="flex-1 mx-4 border-b border-dotted border-zinc-800" />
                <div className="text-right">
                  <span className="text-cyan-500 font-bold">
                    {messages.length > 0 ? (messages.reduce((acc, m) => acc + (m.content.length / 4), 0) / (messages.reduce((acc, m) => acc + (m.cost || 0), 0) || 1)).toFixed(0) : '0'} TKN/$
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-[12px]">
                <span className="text-white font-bold uppercase tracking-widest">Total Spend (Accumulated)</span>
                <div className="flex-1 mx-4 border-b border-dotted border-zinc-800" />
                <div className="text-right">
                  <span className="text-orange-500 font-bold">${totalSpend.toFixed(4)} USD</span>
                  <span className="text-neutral-600 mx-2">|</span>
                  <span className="text-orange-500 font-bold">${(totalSpend * usdToMxnRate).toFixed(2)} MXN</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* The Models: Capability Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">The Models: Capability Grid</h3>
            <span className="text-[9px] text-neutral-600 font-mono">Select a model to activate</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categorizedModels.map(cat => (
              <div key={cat.id} className="space-y-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${cat.bg} ${cat.border} w-fit`}>
                  <span className={cat.color}>{cat.icon}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${cat.color}`}>{cat.name}</span>
                </div>
                
                <div className="grid grid-cols-1 gap-2">
                  {cat.items.map(model => (
                    <button
                      key={model.id}
                      onClick={() => handleModelClick(model.id)}
                      className={`group flex items-center justify-between p-3 rounded-none border transition-all ${
                        selectedModelId === model.id 
                          ? 'bg-orange-500/10 border-orange-500/30' 
                          : 'bg-zinc-950 border-zinc-900 hover:border-zinc-800 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex flex-col items-start min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[11px] font-bold truncate ${selectedModelId === model.id ? 'text-orange-400' : 'text-neutral-300'}`}>
                            {model.id}
                          </span>
                          {model.status && model.status !== 'PRODUCTION' && (
                            <span className={`text-[7px] px-1 font-black ${
                              model.status === 'PREVIEW' ? 'bg-amber-500/20 text-amber-500' : 'bg-rose-500/20 text-rose-500'
                            }`}>
                              {model.status}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-neutral-600 font-mono uppercase">
                            {model.contextWindow.toLocaleString()} tokens
                          </span>
                          <div className="flex items-center gap-1.5">
                            {model.capabilities?.vision && <span className="text-[8px] font-bold text-amber-500/40">[VISN]</span>}
                            {model.id.includes('whisper') && <span className="text-[8px] font-bold text-rose-500/40">[AUDI]</span>}
                            {model.capabilities?.jsonMode && <span className="text-[8px] font-bold text-blue-500/40">[JSON]</span>}
                          </div>
                        </div>
                      </div>
                      <div className={`p-1 transition-colors ${selectedModelId === model.id ? 'bg-orange-500/20' : 'bg-black/20 group-hover:bg-black/40'}`}>
                        <Zap className={`w-3 h-3 ${selectedModelId === model.id ? 'text-orange-500' : 'text-neutral-700'}`} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.2em]">Quick Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={onClose}
              className="flex items-center gap-3 p-4 bg-zinc-950 border border-zinc-900 rounded-none hover:bg-zinc-900 transition-all group"
            >
              <div className="p-2 bg-orange-500/10 group-hover:bg-orange-500/20 transition-colors">
                <Play className="w-4 h-4 text-orange-500" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-white uppercase tracking-wider">Playground</p>
                <p className="text-[9px] text-neutral-500">Return to active chat</p>
              </div>
            </button>

            <button
              disabled
              className="flex items-center gap-3 p-4 bg-zinc-950 border border-zinc-900 rounded-none opacity-50 cursor-not-allowed"
            >
              <div className="p-2 bg-neutral-900">
                <Users className="w-4 h-4 text-neutral-600" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Manage Team/Keys</p>
                <p className="text-[9px] text-neutral-700">Coming Soon</p>
              </div>
            </button>

            <button
              disabled
              className="flex items-center gap-3 p-4 bg-zinc-950 border border-zinc-900 rounded-none opacity-50 cursor-not-allowed"
            >
              <div className="p-2 bg-neutral-900">
                <BookOpen className="w-4 h-4 text-neutral-600" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-bold text-neutral-600 uppercase tracking-wider">Docs / Guides</p>
                <p className="text-[9px] text-neutral-700">Coming Soon</p>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-4 border-t border-zinc-900 flex justify-between items-center bg-black/40">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-neutral-600 uppercase tracking-widest">
            Athanor Forge Infrastructure v1.0.0 | Build AF-217
          </span>
          <span className="text-[8px] text-neutral-700 font-mono uppercase mt-1">
            FX Sync: {fxTimestamp ? new Date(fxTimestamp).toLocaleTimeString([], { hour12: false }) : 'N/A'} CST | 1 USD = {usdToMxnRate.toFixed(4)} MXN
          </span>
        </div>
        <div className="flex items-center gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCert(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-none bg-emerald-500/5 border border-emerald-500/20 hover:bg-emerald-500/10 transition-all"
          >
            <Shield className="w-3 h-3 text-emerald-500" />
            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">
              [SYSTEM_STATUS: CERTIFIED // BUILD_AF-217 // LPU_ENCRYPTED_LINK: ACTIVE]
            </span>
          </motion.button>
        </div>
      </div>

      {/* Certificate Modal */}
      <AnimatePresence>
        {showCert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setShowCert(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-neutral-950 border-2 border-zinc-800 p-8 rounded-none max-w-md w-full space-y-6 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Metallic Texture Overlay */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, #fff 2px, #fff 4px)' }} />
              
              <div className="text-center space-y-2 relative z-10">
                <Shield className="w-12 h-12 text-emerald-500 mx-auto drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <h3 className="text-lg font-bold text-white uppercase tracking-widest">Athanor Forge Placa de Características</h3>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Build AF-217 | Gold Master</p>
              </div>
              
              <div className="space-y-3 relative z-10">
                {[
                  { label: 'Inference Core', value: 'Groq LPU / 128k Window', icon: <Zap className="w-4 h-4" /> },
                  { label: 'Memory Grid', value: 'Non-Linear Branching / UWP Portability', icon: <Database className="w-4 h-4" /> },
                  { label: 'Pedagogy', value: '6-Dimension Feynman Engine', icon: <Brain className="w-4 h-4" /> },
                  { label: 'Auth', value: 'Zero-Trust Protocol', icon: <ShieldCheck className="w-4 h-4" /> },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 bg-black/50 rounded-none border border-zinc-900/50">
                    <div className="text-emerald-500/80">{item.icon}</div>
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-neutral-500 uppercase tracking-widest">{item.label}</span>
                      <span className="text-[10px] font-mono text-neutral-300">{item.value}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <button
                onClick={() => setShowCert(false)}
                className="w-full py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-none transition-all border border-zinc-700 relative z-10"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );

  return createPortal(dashboardContent, document.body);
};
