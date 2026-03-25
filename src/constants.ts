export const ATHANOR_VERSION = "AF-221";

export const MASTER_SCRIPT_AF182 = `# ==========================================================
# ATHANOR FORGE: PIPELINE GOLD MASTER (AF-221)
# ==========================================================
& {
    $GITHUB_USERNAME = "1interprete1"
    $REPO_NAME       = "athanor-forge"
    $GITHUB_TOKEN    = "%%%SECRET_GITHUB_TOKEN%%%"

    if ($GITHUB_TOKEN -eq "%%%SECRET_GITHUB_TOKEN%%%") { 
        Write-Host "!!! ERROR: Token no inyectado en el script." -ForegroundColor Red
        return 
    }

    $env:GIT_TERMINAL_PROMPT = "0"
    $env:GCM_INTERACTIVE = "false"

    $WorkDir = Join-Path $HOME "Athanor_Deployment_System"
    $ExtractPath = Join-Path $WorkDir "BuildFiles"
    $GitDir = Join-Path $WorkDir "PortableGit"
    $ZipPattern = "athanor-forge*.zip"

    Clear-Host
    Write-Host ">>> Iniciando Despliegue Gold Master (AF-221)..." -ForegroundColor Cyan

    if (Test-Path $WorkDir) { Remove-Item $WorkDir -Recurse -Force -ErrorAction SilentlyContinue }
    New-Item -ItemType Directory -Path $ExtractPath -Force | Out-Null
    New-Item -ItemType Directory -Path $GitDir -Force | Out-Null

    $NewestZip = Get-ChildItem -Path "$HOME\\Desktop", "$HOME\\Downloads" -Filter $ZipPattern -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    
    if (-not $NewestZip) { 
        Write-Host "!!! ERROR: ZIP no encontrado en Escritorio/Descargas." -ForegroundColor Red
        return 
    }

    $GitExe = "git"
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
        $GitExe = Join-Path $GitDir "cmd\\git.exe"
        if (-not (Test-Path $GitExe)) {
            Write-Host ">>> Instalando MinGit portátil..." -ForegroundColor Yellow
            $GitZip = Join-Path $WorkDir "mingit.zip"
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri "https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/MinGit-2.44.0-64-bit.zip" -OutFile $GitZip
            Expand-Archive -Path $GitZip -DestinationPath $GitDir -Force
        }
    }

    Write-Host ">>> Extrayendo ZIP..." -ForegroundColor Green
    Expand-Archive -Path $NewestZip.FullName -DestinationPath $ExtractPath -Force

    Set-Location -LiteralPath $ExtractPath
    & $GitExe init -b main
    & $GitExe config user.email "deploy@athanorforge.com"
    & $GitExe config user.name "Athanor Automaton"
    & $GitExe config credential.helper ""
    & $GitExe config --global --add safe.directory $ExtractPath

    & $GitExe add .
    & $GitExe commit -m "Forge Gold Master Update AF-218 [Headless Build]"

    $RemoteURL = "https://$($GITHUB_TOKEN)@github.com/$GITHUB_USERNAME/$REPO_NAME.git"
    & $GitExe remote add origin $RemoteURL 2>$null
    & $GitExe remote set-url origin $RemoteURL

    Write-Host ">>> Subiendo a GitHub..." -ForegroundColor Cyan
    $pushResult = & $GitExe push -u origin main --force 2>&1
    $success = ($LASTEXITCODE -eq 0)

    if ($success) {
        Write-Host "\`n[OK] ¡DESPLIEGUE GOLD MASTER EXITOSO!" -ForegroundColor Green
        Set-Location $HOME
        Get-ChildItem -Path "$HOME\\Desktop", "$HOME\\Downloads" -Filter $ZipPattern | Remove-Item -Force -ErrorAction SilentlyContinue
        Remove-Item $WorkDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host ">>> Limpieza de ZIPs completada." -ForegroundColor Gray
        Write-Host ">>> Cerrando consola..." -ForegroundColor Gray
        Start-Sleep -Seconds 3
    } else { 
        Write-Host "\`n[!] ERROR EN GITHUB:" -ForegroundColor Red
        Write-Host $pushResult -ForegroundColor Yellow
    }
} `;
