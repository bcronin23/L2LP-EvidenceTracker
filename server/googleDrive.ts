// Google Drive Integration for L2LP Evidence Tracker
// Allows importing files from Google Drive as evidence

import { google } from 'googleapis';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected');
  }
  return accessToken;
}

export async function getGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: 'v3', auth: oauth2Client });
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  createdTime?: string;
  modifiedTime?: string;
}

export async function listDriveFiles(query?: string, pageToken?: string): Promise<{ files: DriveFile[]; nextPageToken?: string }> {
  const drive = await getGoogleDriveClient();
  
  let q = "trashed = false";
  if (query) {
    q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
  }
  
  const response = await drive.files.list({
    q,
    pageSize: 20,
    pageToken: pageToken || undefined,
    fields: 'nextPageToken, files(id, name, mimeType, size, thumbnailLink, webViewLink, createdTime, modifiedTime)',
    orderBy: 'modifiedTime desc',
  });

  return {
    files: (response.data.files || []) as DriveFile[],
    nextPageToken: response.data.nextPageToken || undefined,
  };
}

export async function getDriveFileContent(fileId: string): Promise<{ buffer: Buffer; mimeType: string; fileName: string }> {
  const drive = await getGoogleDriveClient();
  
  const fileMetadata = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size',
  });
  
  const mimeType = fileMetadata.data.mimeType || 'application/octet-stream';
  const fileName = fileMetadata.data.name || 'file';
  
  // Handle Google Docs/Sheets/Slides - export as PDF
  if (mimeType.startsWith('application/vnd.google-apps.')) {
    let exportMimeType = 'application/pdf';
    let exportExtension = '.pdf';
    
    if (mimeType === 'application/vnd.google-apps.spreadsheet') {
      exportMimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      exportExtension = '.xlsx';
    } else if (mimeType === 'application/vnd.google-apps.document') {
      exportMimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      exportExtension = '.docx';
    } else if (mimeType === 'application/vnd.google-apps.presentation') {
      exportMimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
      exportExtension = '.pptx';
    }
    
    const response = await drive.files.export({
      fileId,
      mimeType: exportMimeType,
    }, { responseType: 'arraybuffer' });
    
    const exportedFileName = fileName.replace(/\.[^/.]+$/, '') + exportExtension;
    
    return {
      buffer: Buffer.from(response.data as ArrayBuffer),
      mimeType: exportMimeType,
      fileName: exportedFileName,
    };
  }
  
  // Regular files - download directly
  const response = await drive.files.get({
    fileId,
    alt: 'media',
  }, { responseType: 'arraybuffer' });
  
  return {
    buffer: Buffer.from(response.data as ArrayBuffer),
    mimeType,
    fileName,
  };
}

export function isGoogleDriveConnected(): boolean {
  return !!(process.env.REPLIT_CONNECTORS_HOSTNAME);
}
