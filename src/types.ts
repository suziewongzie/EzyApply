export interface UserProfile {
  companyName: string;
  directorCount: number;
  phone: string;
  loanAmount: string;
  loanPurpose: string;
  collateralType: 'None' | 'Fixed Deposit' | 'Property';
  monthlyTurnover: string;
  is2025AuditedReady: boolean;
  folderId?: string;

  // Added onboarding tracking fields
  userName?: string;
  companyRegNo?: string;
  isUserDirector?: boolean;
  otherDirectorsCount?: number;
  isUserShareholder?: boolean;
  userShareholdingPercent?: string;
  totalPaidUpCapital?: string;
  relationshipType?: 'direct' | 'broker_agent';
  directorsList?: Array<{ name: string; icNo: string }>;
  shareholdersList?: Array<{ name: string; icNo: string; sharesCount: number; percent: string }>;
}

export interface DocumentChecklistItem {
  id: string; // e.g. 'bank-statements', 'director-1-ic', 'balance-sheet-2023', etc.
  category: string; // Grouping category (e.g., 'Core Documents', 'Financial Reports', 'Director Documents')
  name: string;
  description: string;
  required: boolean;
  status: 'pending' | 'uploading' | 'completed';
  file: File | null;
  uploadedFileId?: string;
  uploadedFileName?: string;
}

export interface HistoryEntry {
  status: 'Submitted' | 'Processing' | 'Approved' | 'Declined';
  notes?: string;
  updatedAt: string;
  reviewerName?: string;
}

export interface ApplicationRecord {
  id: string;
  userId?: string;
  userEmail?: string;
  profile: UserProfile;
  folderId?: string;
  folderUrl?: string;
  spreadsheetId?: string;
  sheetUrl?: string;
  submittedAt: string;
  status: 'Submitted' | 'Processing' | 'Approved' | 'Declined';
  notes?: string;
  reviewerName?: string;
  updatedAt?: string;
  statusHistory?: HistoryEntry[];
}
