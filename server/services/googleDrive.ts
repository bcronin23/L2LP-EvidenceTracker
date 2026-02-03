import { google, drive_v3 } from 'googleapis';

let connectionSettings: any;

async function getAccessToken(): Promise<string> {
  if (connectionSettings && connectionSettings.settings?.expires_at && 
      new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
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

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-drive',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  
  const data = await response.json();
  connectionSettings = data.items?.[0];

  const accessToken = connectionSettings?.settings?.access_token || 
                      connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Drive not connected. Please connect Google Drive in Replit settings.');
  }
  return accessToken;
}

async function getDriveClient(): Promise<drive_v3.Drive> {
  const accessToken = await getAccessToken();
  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: accessToken });
  return google.drive({ version: 'v3', auth: oauth2Client });
}

export interface DriveFolder {
  id: string;
  name: string;
  webViewLink: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  webViewLink: string;
}

export async function isDriveConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export async function testDriveConnection(folderId: string): Promise<{ success: boolean; folderName?: string; error?: string }> {
  try {
    const drive = await getDriveClient();
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

export async function getFolderInfo(folderId: string): Promise<DriveFolder | null> {
  try {
    const drive = await getDriveClient();
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
): Promise<DriveFolder> {
  const drive = await getDriveClient();

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
): Promise<DriveFolder> {
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
): Promise<DriveFile> {
  const drive = await getDriveClient();

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
    const drive = await getDriveClient();
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

export async function getFileDownloadUrl(fileId: string): Promise<string | null> {
  try {
    const drive = await getDriveClient();
    const response = await drive.files.get({
      fileId: fileId,
      supportsAllDrives: true,
      fields: 'webViewLink, webContentLink'
    });
    return response.data.webViewLink || response.data.webContentLink || null;
  } catch (error) {
    console.error('Failed to get file URL:', error);
    return null;
  }
}
