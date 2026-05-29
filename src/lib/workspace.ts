import { UserProfile } from '../types';

/**
 * Searches for a file or folder by name in Google Drive
 */
export async function searchDriveItem(
  accessToken: string,
  name: string,
  mimeType: string,
  parentId?: string
): Promise<string | null> {
  try {
    let q = `name = '${name.replace(/'/g, "\\'")}' and mimeType = '${mimeType}' and trashed = false`;
    if (parentId) {
      q += ` and '${parentId}' in parents`;
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const err = await response.json();
      console.error('Search Drive error:', err);
      return null;
    }

    const data = await response.json();
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    return null;
  } catch (error) {
    console.error('Error searching drive item:', error);
    return null;
  }
}

/**
 * Creates a folder inside Google Drive
 */
export async function createFolder(
  accessToken: string,
  folderName: string,
  parentId?: string
): Promise<string> {
  try {
    const url = 'https://www.googleapis.com/drive/v3/files';
    const body: any = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      body.parents = [parentId];
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to create Google Drive folder');
    }

    const file = await response.json();
    return file.id;
  } catch (error: any) {
    console.error('Error creating folder:', error);
    throw error;
  }
}

/**
 * Finds or creates the main application root folder
 */
export async function getOrCreateMainFolder(accessToken: string): Promise<string> {
  const FOLDER_NAME = 'Loan Applications Submissions';
  let folderId = await searchDriveItem(accessToken, FOLDER_NAME, 'application/vnd.google-apps.folder');
  if (!folderId) {
    folderId = await createFolder(accessToken, FOLDER_NAME);
  }
  return folderId;
}

/**
 * Uploads a local File object to a target Google Drive folder
 */
export async function uploadFileToDrive(
  accessToken: string,
  file: File,
  folderId: string
): Promise<{ id: string; webViewLink?: string }> {
  try {
    const metadata = {
      name: file.name,
      parents: [folderId],
    };

    const formData = new FormData();
    formData.append(
      'metadata',
      new Blob([JSON.stringify(metadata)], { type: 'application/json' })
    );
    formData.append('file', file);

    const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink';
    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `Failed to upload file ${file.name}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error(`Error uploading file ${file.name}:`, error);
    throw error;
  }
}

/**
 * Finds or creates the default spreadsheet "Loan Applications Tracker"
 */
export async function getOrCreateTrackerSpreadsheet(accessToken: string): Promise<string> {
  const SHEET_NAME = 'Loan Applications Tracker';
  
  // Search for an existing sheet in Drive
  let spreadsheetId = await searchDriveItem(
    accessToken,
    SHEET_NAME,
    'application/vnd.google-apps.spreadsheet'
  );

  if (!spreadsheetId) {
    // Create new spreadsheet using the Sheet v4 API
    const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          title: SHEET_NAME,
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to create Google Spreadsheet');
    }

    const sheetData = await response.json();
    spreadsheetId = sheetData.spreadsheetId;

    if (!spreadsheetId) {
      throw new Error('Spreadsheet ID missing from creation response');
    }

    // Initialize headers in the new sheet
    const headers = [
      'Application ID',
      'Company Name',
      'Directors Count',
      'Contact Phone',
      'Loan Amount ($)',
      'Loan Purpose',
      'Collateral Type',
      'Monthly Turnover ($)',
      '2025 Audited Ready',
      'Date Submitted',
      'Drive Folder Link'
    ];

    await appendSheetRow(accessToken, spreadsheetId, 'Sheet1!A1', headers);
  }

  return spreadsheetId;
}

/**
 * Appends a row of values to a Google Sheet coordinates
 */
export async function appendSheetRow(
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: string[]
): Promise<any> {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: range,
        majorDimension: 'ROWS',
        values: [values],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || 'Failed to append row to spreadsheet');
    }

    return await response.json();
  } catch (error: any) {
    console.error('Error appending sheet row:', error);
    throw error;
  }
}

/**
 * Shares a Google Drive folder or file with a designated corporate email address
 */
export async function shareDriveItem(
  accessToken: string,
  fileId: string,
  emailAddress: string,
  role: 'reader' | 'writer' = 'writer'
): Promise<any> {
  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?sendNotificationEmail=false`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: role,
        type: "user",
        emailAddress: emailAddress,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Error sharing Google Drive item:", err);
      // Don't crash the entire flow if sharing fails (e.g., if user has entered an invalid corporate email), just log it
      return { success: false, error: err.error?.message };
    }

    return { success: true, data: await response.json() };
  } catch (error: any) {
    console.error("Error in shareDriveItem helper:", error);
    return { success: false, error: error.message };
  }
}
