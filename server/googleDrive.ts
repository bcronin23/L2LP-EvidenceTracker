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

// ============================================
// DRIVE UPLOAD & FOLDER MANAGEMENT
// ============================================

export interface DriveFolderInfo {
  id: string;
  name: string;
  webViewLink: string;
}

export interface DriveUploadedFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink: string;
}

export async function testDriveConnection(folderId: string): Promise<{ success: boolean; folderName?: string; error?: string }> {
  try {
    const drive = await getGoogleDriveClient();
    const response = await drive.files.get({
      fileId: folderId,
      supportsAllDrives: true,
      fields: 'id, name, mimeType'
    });

    if (response.data.mimeType !== 'application/vnd.google-apps.folder') {
      return { success: false, error: 'The provided ID is not a folder' };
    }

    return { success: true, folderName: response.data.name || 'Unknown' };
  } catch (error: any) {
    console.error('Drive connection test failed:', error.message);
    return { success: false, error: error.message || 'Failed to access folder' };
  }
}

export async function getFolderInfo(folderId: string): Promise<DriveFolderInfo | null> {
  try {
    const drive = await getGoogleDriveClient();
    const response = await drive.files.get({
      fileId: folderId,
      supportsAllDrives: true,
      fields: 'id, name, webViewLink'
    });

    return {
      id: response.data.id || folderId,
      name: response.data.name || 'Unknown',
      webViewLink: response.data.webViewLink || `https://drive.google.com/drive/folders/${folderId}`
    };
  } catch (error) {
    console.error('Failed to get folder info:', error);
    return null;
  }
}

export async function findOrCreateFolder(
  parentFolderId: string,
  folderName: string
): Promise<DriveFolderInfo> {
  const drive = await getGoogleDriveClient();

  const query = `name = '${folderName.replace(/'/g, "\\'")}' and '${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  
  const searchResponse = await drive.files.list({
    q: query,
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    fields: 'files(id, name, webViewLink)'
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    const existing = searchResponse.data.files[0];
    return {
      id: existing.id!,
      name: existing.name || folderName,
      webViewLink: existing.webViewLink || `https://drive.google.com/drive/folders/${existing.id}`
    };
  }

  const createResponse = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
    },
    fields: 'id, name, webViewLink'
  });

  console.log(`Created Drive folder: ${folderName} in parent ${parentFolderId}`);

  return {
    id: createResponse.data.id!,
    name: createResponse.data.name || folderName,
    webViewLink: createResponse.data.webViewLink || `https://drive.google.com/drive/folders/${createResponse.data.id}`
  };
}

export async function ensureStudentFolderPath(
  rootFolderId: string,
  classGroup: string | null,
  studentCode: string
): Promise<DriveFolderInfo> {
  let currentParentId = rootFolderId;

  if (classGroup && classGroup.trim()) {
    const classFolder = await findOrCreateFolder(currentParentId, classGroup.trim());
    currentParentId = classFolder.id;
  }

  const studentsFolder = await findOrCreateFolder(currentParentId, '01 Students');
  currentParentId = studentsFolder.id;

  const studentFolder = await findOrCreateFolder(currentParentId, studentCode);
  
  console.log(`Ensured student folder path: ${classGroup || ''}/${studentCode}, folder ID: ${studentFolder.id}`);
  
  return studentFolder;
}

export async function uploadFileToDrive(
  folderId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer
): Promise<DriveUploadedFile> {
  const drive = await getGoogleDriveClient();

  const { Readable } = await import('stream');
  const stream = Readable.from(fileBuffer);

  const response = await drive.files.create({
    supportsAllDrives: true,
    requestBody: {
      name: fileName,
      parents: [folderId]
    },
    media: {
      mimeType: mimeType,
      body: stream
    },
    fields: 'id, name, mimeType, size, webViewLink'
  });

  console.log(`Uploaded file to Drive: ${fileName}, file ID: ${response.data.id}`);

  return {
    id: response.data.id!,
    name: response.data.name || fileName,
    mimeType: response.data.mimeType || mimeType,
    size: parseInt(response.data.size || '0', 10),
    webViewLink: response.data.webViewLink || `https://drive.google.com/file/d/${response.data.id}/view`
  };
}

export async function deleteFileFromDrive(fileId: string): Promise<boolean> {
  try {
    const drive = await getGoogleDriveClient();
    await drive.files.delete({
      fileId: fileId,
      supportsAllDrives: true
    });
    console.log(`Deleted file from Drive: ${fileId}`);
    return true;
  } catch (error) {
    console.error('Failed to delete file from Drive:', error);
    return false;
  }
}
