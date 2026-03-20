import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Rocket, X, Copy, Check } from 'lucide-react';

const SCRIPT_CONTENT = `# ==========================================================
# ATHANOR FORGE: SUBIDA AUTOMÁTICA FINAL (SILENT PUSH)
# ==========================================================

$GITHUB_USERNAME = "1interprete1"
$REPO_NAME       = "athanor-forge"
$GITHUB_TOKEN    = "%%%SECRET_GITHUB_TOKEN%%%"

if ($GITHUB_TOKEN -eq "%%%SECRET_GITHUB_TOKEN%%%") {
    Write-Host "ERROR FATAL: El token no fue inyectado por la UI." -ForegroundColor Red
    exit
}

$WorkDir = "$HOME\\Athanor_System_Update"
$ExtractPath = "$WorkDir\\ProjectFiles"
$GitDir = "$WorkDir\\PortableGit"
$ZipPattern = "athanor-forge*.zip"

Clear-Host
Write-Host ">>> Iniciando Despliegue Automatizado Silencioso..." -ForegroundColor Cyan

if (Test-Path $WorkDir) { Remove-Item $WorkDir -Recurse -Force -ErrorAction SilentlyContinue }
New-Item -ItemType Directory -Path $ExtractPath -Force | Out-Null

$SearchPaths = @("$HOME\\Desktop", "$HOME\\Downloads")
$AllZips = Get-ChildItem -Path $SearchPaths -Filter $ZipPattern -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending

if ($null -eq $AllZips -or $AllZips.Count -eq 0) { 
    Write-Host "!!! Error: No encontré '$ZipPattern' en Escritorio o Descargas." -ForegroundColor Red
    return 
}
$NewestZip = $AllZips[0]
Write-Host ">>> Usando archivo: $($NewestZip.FullName)" -ForegroundColor Green

$GitExe = "git"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    $GitExe = "$GitDir\\cmd\\git.exe"
    if (-not (Test-Path $GitExe)) {
        Write-Host ">>> Bajando motor Git (MinGit)..." -ForegroundColor Yellow
        $GitZip = "$WorkDir\\mingit.zip"
        Invoke-WebRequest -Uri "https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/MinGit-2.44.0-64-bit.zip" -OutFile $GitZip
        Expand-Archive -Path $GitZip -DestinationPath $GitDir -Force
    }
}

Write-Host ">>> Preparando archivos..." -ForegroundColor Cyan
Expand-Archive -Path "$($NewestZip.FullName)" -DestinationPath "$ExtractPath" -Force

Set-Location -LiteralPath "$ExtractPath"
& $GitExe init -b main
& $GitExe config user.email "auto@athanorforge.com"
& $GitExe config user.name "AI Studio Auto"
& $GitExe config --local credential.helper ""
& $GitExe add .
& $GitExe commit -m "Automated upload AF-133"

$RemoteURL = "https://$($GITHUB_USERNAME):$($GITHUB_TOKEN)@github.com/$GITHUB_USERNAME/$REPO_NAME.git"
& $GitExe remote add origin $RemoteURL 2>$null
& $GitExe remote set-url origin $RemoteURL

Write-Host ">>> Subiendo cambios a GitHub..." -ForegroundColor Cyan
$pushResult = & $GitExe push -u origin main --force 2>&1
$success = ($LASTEXITCODE -eq 0)

if ($success) {
    Write-Host "\`n[OK] ¡ACTUALIZACIÓN COMPLETADA!" -ForegroundColor Green
    Set-Location $HOME
    Write-Host ">>> Limpiando ZIPs antiguos..." -ForegroundColor Cyan
    foreach ($zip in $AllZips) {
        Remove-Item -LiteralPath "$($zip.FullName)" -Force -ErrorAction SilentlyContinue
    }
    Remove-Item $WorkDir -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Visita tu app: https://github.com/$GITHUB_USERNAME/$REPO_NAME" -ForegroundColor Blue
} else {
    Write-Host "\`n[!] ERROR EN EL DESPLIEGUE." -ForegroundColor Red
    Write-Host $pushResult
}
Write-Host "\`nPresiona cualquier tecla para salir..."
[void][System.Console]::ReadKey($true)
`;

export function DeploymentPipeline() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const rawToken = localStorage.getItem('ATHANOR_GITHUB_TOKEN') || '';
    const cleanToken = rawToken.trim().replace(/['"]/g, ''); // Quita espacios y comillas
    
    if (!cleanToken) {
      alert("Por favor, configura tu Token de GitHub en los ajustes primero.");
      return;
    }
    const hydratedContent = SCRIPT_CONTENT.replace('%%%SECRET_GITHUB_TOKEN%%%', cleanToken);
    await navigator.clipboard.writeText(hydratedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const token = localStorage.getItem('ATHANOR_GITHUB_TOKEN') || '';
  const cleanToken = token.trim().replace(/['"]/g, '');

  return (
    <>
      <div className="px-4 mt-4 shrink-0">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-zinc-800 hover:bg-white/5 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Rocket className="w-4 h-4 text-neutral-400 group-hover:text-indigo-500 transition-colors" />
            <div className="flex flex-col items-start">
              <span className="text-xs font-medium text-neutral-300">Deployment Pipeline</span>
              <span className="text-[9px] text-neutral-600 font-mono">
                Token inyectado: {cleanToken ? cleanToken.substring(0, 8) + "..." : "Ninguno"}
              </span>
            </div>
          </div>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl bg-neutral-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/20">
                <div className="flex items-center gap-3">
                  <Rocket className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-sm font-medium text-white">GitHub Pipeline Automation</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-4 flex-1 overflow-y-auto bg-neutral-950">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-neutral-400 font-mono">deploy.ps1</span>
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 transition-colors text-xs font-medium"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied!' : 'Copy Script'}
                  </button>
                </div>
                <pre className="p-4 rounded-xl bg-black/50 border border-white/5 overflow-x-auto text-xs font-mono text-neutral-300 leading-relaxed">
                  <code>{SCRIPT_CONTENT}</code>
                </pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
