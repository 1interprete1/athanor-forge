import { MASTER_SCRIPT_AF182 } from '../constants';
import { ForgeLoggerContextType } from '../contexts/ForgeLogger';
import { secretsConfig } from './secretsConfig';

export const deploymentService = {
  copyScript: async (observability?: ForgeLoggerContextType, parentId?: string, overrideToken?: string) => {
    const token = overrideToken || secretsConfig.getGithubToken() || '';
    const cleanToken = token.trim().replace(/['"]/g, '');
    const githubUser = secretsConfig.getGithubUser();
    const githubRepo = secretsConfig.getGithubRepo();

    let hydratedContent = MASTER_SCRIPT_AF182
      .replace('%%%GITHUB_USERNAME%%%', githubUser)
      .replace('%%%REPO_NAME%%%', githubRepo);

    hydratedContent = cleanToken 
      ? hydratedContent.replace('%%%SECRET_GITHUB_TOKEN%%%', cleanToken)
      : hydratedContent;
    
    try {
      await navigator.clipboard.writeText(hydratedContent);
    } catch (err) {
      // Fallback mejorado
      const textArea = document.createElement("textarea");
      textArea.value = hydratedContent;
      textArea.style.position = "fixed";
      textArea.style.top = "0";
      textArea.style.left = "0";
      textArea.style.width = "2em";
      textArea.style.height = "2em";
      textArea.style.padding = "0";
      textArea.style.border = "none";
      textArea.style.outline = "none";
      textArea.style.boxShadow = "none";
      textArea.style.background = "transparent";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      
      if (!successful) {
        if (observability) observability.addLog('System', 'error', 'Fallback clipboard copy failed', { parentId });
        throw new Error("No se pudo copiar al portapapeles. Por favor, copia el script manualmente.");
      }
    }
    
    if (observability) {
      observability.addLog('System', 'success', "Pipeline Script AF-182 inyectado con Token. Listo para PowerShell.", { tokenPrefix: cleanToken.substring(0, 4) + "...", parentId });
    }
    
    return true;
  },
  getScript: async () => {
    const cleanToken = secretsConfig.getGithubToken()?.trim().replace(/['"]/g, '') || '';
    const githubUser = secretsConfig.getGithubUser();
    const githubRepo = secretsConfig.getGithubRepo();
    
    if (!cleanToken) throw new Error("GitHub Token not configured in Data Vault.");
    
    return MASTER_SCRIPT_AF182
      .replace('%%%GITHUB_USERNAME%%%', githubUser)
      .replace('%%%REPO_NAME%%%', githubRepo)
      .replace('%%%SECRET_GITHUB_TOKEN%%%', cleanToken);
  }
};
