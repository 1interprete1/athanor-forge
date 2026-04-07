/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface DriveFile {
  id: string;
  name: string;
}

class GoogleDriveService {
  private accessToken: string | null = null;
  private readonly FILE_NAME = 'athanor_forja_workspace.json';
  public isApiDisabled = false;

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    if (!this.accessToken) throw new Error('No Google Access Token found');
    if (this.isApiDisabled) throw new Error('Drive API Disabled: Falling back to local storage.');
    
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${this.accessToken}`);
    
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      if (response.status === 401) {
        this.accessToken = null;
        sessionStorage.removeItem('google_drive_token');
      }
      let errorMsg = response.statusText;
      try {
        const data = await response.json();
        if (data.error && data.error.message) {
          errorMsg = data.error.message;
        } else if (data.message) {
          errorMsg = data.message;
        }
      } catch (e) {
        // Ignore JSON parse error
      }
      
      if (response.status === 403 && (errorMsg.includes('has not been used in project') || errorMsg.includes('disabled'))) {
        this.isApiDisabled = true;
        throw new Error(`Drive API Disabled: ${errorMsg}`);
      }
      
      throw new Error(`Google Drive API Error (${response.status}): ${errorMsg}`);
    }
    return response;
  }

  async findAppDataFile(): Promise<DriveFile | null> {
    const query = encodeURIComponent(`name = '${this.FILE_NAME}' and trashed = false`);
    const response = await this.fetchWithAuth(
      `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id, name)`
    );
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  }

  async createAppDataFile(content: any): Promise<string> {
    const metadata = {
      name: this.FILE_NAME,
      parents: ['appDataFolder'],
      mimeType: 'application/json',
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([JSON.stringify(content)], { type: 'application/json' }));

    const response = await this.fetchWithAuth(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',
      {
        method: 'POST',
        body: form,
      }
    );
    const data = await response.json();
    return data.id;
  }

  async updateAppDataFile(fileId: string, content: any): Promise<void> {
    await this.fetchWithAuth(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: 'PATCH',
        body: JSON.stringify(content),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }

  async downloadAppDataFile(fileId: string): Promise<any> {
    const response = await this.fetchWithAuth(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`
    );
    return response.json();
  }

  async syncToDrive(content: any): Promise<void> {
    const file = await this.findAppDataFile();
    if (file) {
      await this.updateAppDataFile(file.id, content);
    } else {
      await this.createAppDataFile(content);
    }
  }

  async syncFromDrive(): Promise<any | null> {
    const file = await this.findAppDataFile();
    if (file) {
      return await this.downloadAppDataFile(file.id);
    }
    return null;
  }
}

export const googleDriveService = new GoogleDriveService();
