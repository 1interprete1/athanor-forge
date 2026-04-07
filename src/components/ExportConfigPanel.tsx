import React from 'react';
import { useStore } from '../contexts/StoreContext';
import { CheckSquare, Square, Settings2 } from 'lucide-react';
import { ExportProfile } from '../types';

export function ExportConfigPanel() {
  const { exportConfig, updateExportConfig, devMode, exportProfile, setExportProfile } = useStore();

  const toggleConfig = (key: keyof typeof exportConfig) => {
    updateExportConfig(key, !exportConfig[key]);
    if (exportProfile !== 'custom') {
      setExportProfile('custom');
    }
  };

  const Checkbox = ({ label, checked, onChange, disabled = false }: { label: string, checked: boolean, onChange: () => void, disabled?: boolean }) => (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`flex items-center gap-2 text-[10px] uppercase tracking-widest transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:text-white'
      } ${checked ? 'text-violet-400' : 'text-neutral-500'}`}
    >
      {checked ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
      {label}
    </button>
  );

  const isSimpleMode = devMode === 'simple';

  return (
    <div className={`space-y-3 p-3 rounded-xl border bg-white/5 border-white/5 transition-opacity ${isSimpleMode ? 'opacity-50' : 'opacity-100'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
          <Settings2 className="w-3 h-3" />
          Export & Copy Config
        </div>
        {isSimpleMode && (
          <span className="text-[8px] uppercase tracking-widest text-neutral-500 font-bold">
            Disabled in Simple Mode
          </span>
        )}
      </div>

      {/* Export Profiles */}
      <div className={`flex bg-white/5 p-1 rounded-xl border border-white/5 ${isSimpleMode ? 'pointer-events-none' : ''}`}>
        {(['clean', 'debug', 'audit', 'custom'] as ExportProfile[]).map(profile => (
          <button
            key={profile}
            onClick={() => setExportProfile(profile)}
            className={`flex-1 text-[9px] font-bold uppercase tracking-widest py-1.5 rounded-lg transition-colors ${
              exportProfile === profile
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {profile}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-2">
        <Checkbox 
          label="Content" 
          checked={true} 
          onChange={() => {}} 
          disabled={true} 
        />
        <Checkbox 
          label="Timestamp" 
          checked={exportConfig.includeTimestamp} 
          onChange={() => toggleConfig('includeTimestamp')} 
          disabled={isSimpleMode}
        />
        <Checkbox 
          label="Role" 
          checked={exportConfig.includeRole} 
          onChange={() => toggleConfig('includeRole')} 
          disabled={isSimpleMode}
        />
        <Checkbox 
          label="Model" 
          checked={exportConfig.includeModel} 
          onChange={() => toggleConfig('includeModel')} 
          disabled={isSimpleMode}
        />
        <Checkbox 
          label="Tokens" 
          checked={exportConfig.includeTokens} 
          onChange={() => toggleConfig('includeTokens')} 
          disabled={isSimpleMode}
        />
        <Checkbox 
          label="Cost" 
          checked={exportConfig.includeCost} 
          onChange={() => toggleConfig('includeCost')} 
          disabled={isSimpleMode}
        />
        <Checkbox 
          label="Raw Response" 
          checked={exportConfig.includeRaw} 
          onChange={() => toggleConfig('includeRaw')} 
          disabled={isSimpleMode}
        />
      </div>
    </div>
  );
}
