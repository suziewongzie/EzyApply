import React, { useState, useEffect } from 'react';
import { UserProfile, DocumentChecklistItem, ApplicationRecord } from './types';
import { Header } from './components/Header';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { ProfileForm } from './components/ProfileForm';
import { DocUpload } from './components/DocUpload';
import { SubmissionSuccess } from './components/SubmissionSuccess';
import { AdminDashboard } from './components/AdminDashboard';
import { initAuth, googleSignIn, logout, db } from './lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import {
  getOrCreateMainFolder,
  createFolder,
  uploadFileToDrive,
  getOrCreateTrackerSpreadsheet,
  appendSheetRow,
  shareDriveItem
} from './lib/workspace';
import { User } from 'firebase/auth';
import { ShieldCheck, AlertCircle, Sparkles, Building2 } from 'lucide-react';

// Helper to strip out all undefined fields recursively for Firestore compatibility
function cleanForFirestore<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

// Help helper to assemble the dynamic required checklist based on Typeform selections
const generateDocRequirements = (p: UserProfile): DocumentChecklistItem[] => {
  const list: DocumentChecklistItem[] = [];

  // Core Corporate verification docs
  list.push({
    id: 'ssm-profile',
    category: 'Core SSM Structure',
    name: 'SSM Company Profile',
    description: 'Official SSM corporate profile registry file detailing active business address, equity details, and structural status.',
    required: true,
    status: 'pending',
    file: null,
  });

  list.push({
    id: 'bank-statements',
    category: 'Bank Ledger Scans',
    name: '6 Months bank statements (latest)',
    description: 'Consecutive monthly transactions representing operating trade activity and capital receipts.',
    required: true,
    status: 'pending',
    file: null,
  });

  list.push({
    id: 'sales-report',
    category: 'Sales Reports & Billings',
    name: '12 Months Sales Report Summary',
    description: 'Categorized monthly customer sales receipts and invoice reports extending over the last 1 year.',
    required: true,
    status: 'pending',
    file: null,
  });

  // Credit scan category
  list.push({
    id: 'ctos-company',
    category: 'Risk & Credit Ratings',
    name: 'CTOS Company Credit Report',
    description: 'Corporate commercial credit report listing judgment logs, trade credits, and rating metrics.',
    required: true,
    status: 'pending',
    file: null,
  });

  list.push({
    id: 'trade-debtors',
    category: 'Risk & Credit Ratings',
    name: 'Latest Trade Debtors Aging Report',
    description: 'Active outstanding receivables schedule outlining trade invoices overdue and client payment profiles.',
    required: true,
    status: 'pending',
    file: null,
  });

  list.push({
    id: 'trade-creditors',
    category: 'Risk & Credit Ratings',
    name: 'Latest Trade Creditors Aging Report',
    description: 'Corporate accounts payable ledger reflecting vendor invoices, billing lines, and schedules.',
    required: true,
    status: 'pending',
    file: null,
  });

  // Audited parameters
  list.push({
    id: 'balance-sheet-2023',
    category: 'Audited & Interim Accounts',
    name: 'Balance Sheet (FY 2023)',
    description: 'Declared assets, liability statements, and retained capital structure notes for period 2023.',
    required: true,
    status: 'pending',
    file: null,
  });

  list.push({
    id: 'pl-statement-2023',
    category: 'Audited & Interim Accounts',
    name: 'Profit & Loss Statement (FY 2023)',
    description: 'Accountant-signed statement of trading revenue, cost of sales, and Net Profit margins for period 2023.',
    required: true,
    status: 'pending',
    file: null,
  });

  list.push({
    id: 'balance-sheet-2024',
    category: 'Audited & Interim Accounts',
    name: 'Balance Sheet (FY 2024)',
    description: 'Declared assets, liability statements, and retained capital structure notes for period 2024.',
    required: true,
    status: 'pending',
    file: null,
  });

  list.push({
    id: 'pl-statement-2024',
    category: 'Audited & Interim Accounts',
    name: 'Profit & Loss Statement (FY 2024)',
    description: 'Accountant-signed statement of trading revenue, cost of sales, and Net Profit margins for period 2024.',
    required: true,
    status: 'pending',
    file: null,
  });

  if (p.is2025AuditedReady) {
    list.push({
      id: 'balance-sheet-2025',
      category: 'Audited & Interim Accounts',
      name: 'Balance Sheet (FY 2025)',
      description: 'Declared assets, liability statements, and retained capital structure notes for period 2025.',
      required: true,
      status: 'pending',
      file: null,
    });
    list.push({
      id: 'pl-statement-2025',
      category: 'Audited & Interim Accounts',
      name: 'Profit & Loss Statement (FY 2025)',
      description: 'Accountant-signed statement of trading revenue, cost of sales, and Net Profit margins for period 2025.',
      required: true,
      status: 'pending',
      file: null,
    });
  } else {
    list.push({
      id: 'management-accounts',
      category: 'Audited & Interim Accounts',
      name: 'Latest Interim Management Accounts',
      description: 'Year-to-date monthly drafts of trading accounts substituted in place of audited FY 2025.',
      required: true,
      status: 'pending',
      file: null,
    });
  }

  // Tax Verification documents
  list.push({
    id: 'tax-payment-slips',
    category: 'Revenue & Tax Filings',
    name: 'Annual Corporate Tax Payment Slips',
    description: 'Official payment slips demonstrating completed corporate income tax assessments.',
    required: true,
    status: 'pending',
    file: null,
  });

  list.push({
    id: 'lampiran-c',
    category: 'Revenue & Tax Filings',
    name: 'Lampiran C Tax Filing Form',
    description: 'Inland tax submission filing summary confirming declared gross receipts and dividends.',
    required: true,
    status: 'pending',
    file: null,
  });

  // Directors validation
  if (p.relationshipType === 'broker_agent' && p.directorsList && p.directorsList.length > 0) {
    p.directorsList.forEach((dir, i) => {
      const idx = i + 1;
      const label = dir.name ? `${dir.name} (IC: ${dir.icNo})` : `Director ${idx}`;
      list.push({
        id: `director-${idx}-ic`,
        category: 'SSM Directors Credentials',
        name: `${label} IC Copy`,
        description: `High-resolution scan of Identification Card (Both sides) for director ${dir.name || 'Director ' + idx}.`,
        required: true,
        status: 'pending',
        file: null,
      });
      list.push({
        id: `director-${idx}-ctos`,
        category: 'SSM Directors Credentials',
        name: `${label} CTOS Report`,
        description: `Personal Individual Credit Assessment scan listing credit ratings for ${dir.name || 'Director ' + idx}.`,
        required: true,
        status: 'pending',
        file: null,
      });
    });
  } else {
    for (let i = 1; i <= p.directorCount; i++) {
      const isSelf = i === 1 && p.isUserDirector && p.userName;
      const labelName = isSelf ? `${p.userName} (You)` : `Director ${i}`;
      list.push({
        id: `director-${i}-ic`,
        category: 'SSM Directors Credentials',
        name: `${labelName} IC Copy`,
        description: `High-resolution scan of National Registration Identification Card (Both sides) for ${isSelf ? p.userName : 'Director ' + i}.`,
        required: true,
        status: 'pending',
        file: null,
      });
      list.push({
        id: `director-${i}-ctos`,
        category: 'SSM Directors Credentials',
        name: `${labelName} CTOS Report`,
        description: `Personal Individual Credit Assessment scan listing individual credit rankings for ${isSelf ? p.userName : 'Director ' + i}.`,
        required: true,
        status: 'pending',
        file: null,
      });
    }
  }

  // Pledges
  if (p.collateralType === 'Property') {
    list.push({
      id: 'property-val-grant',
      category: 'Secured Asset Collaterals',
      name: 'Property Grant & Valuation Report',
      description: 'Offical land registry grant deed and recent professional appraisal report valuation.',
      required: true,
      status: 'pending',
      file: null,
    });
  } else if (p.collateralType === 'Fixed Deposit') {
    list.push({
      id: 'fd-pledge-info',
      category: 'Secured Asset Collaterals',
      name: 'Certificate of Fixed Deposit Pledge',
      description: 'Banking receipt of principal deposit reserved as physical security for corporate overdraft facility.',
      required: true,
      status: 'pending',
      file: null,
    });
  }

  return list;
};

export default function App() {
  const [authInit, setAuthInit] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSandbox, setIsSandbox] = useState(false);
  const [sandboxRowData, setSandboxRowData] = useState<string[]>([]);

  // Flow coordinates: onboarding -> document hub -> success -> admin
  const [step, setStep] = useState<'login' | 'profile' | 'upload' | 'success' | 'admin'>('login');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checklist, setChecklist] = useState<DocumentChecklistItem[]>([]);
  const [activeApplication, setActiveApplication] = useState<ApplicationRecord | null>(null);

  // Onboarding progress draft states
  const [draftProfile, setDraftProfile] = useState<UserProfile | null>(null);
  const [draftIndex, setDraftIndex] = useState<number>(0);
  const [pendingDraft, setPendingDraft] = useState<{ profile: UserProfile; currentIndex: number } | null>(null);
  const [savingStatus, setSavingStatus] = useState<'idle' | 'saving' | 'saved' | 'error' | undefined>(undefined);
  const [isDraftLoading, setIsDraftLoading] = useState<boolean>(false);

  // Actions logging
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionProgress, setSubmissionProgress] = useState('');
  const [successFolderId, setSuccessFolderId] = useState('');
  const [successSpreadsheetId, setSuccessSpreadsheetId] = useState('');

  // Automated Google Drive Sharing configs
  const [corporateEmail, setCorporateEmail] = useState<string>(
    localStorage.getItem('credifile_corporate_share_email') || 'webzite.my@gmail.com'
  );
  const [corporateRole, setCorporateRole] = useState<'reader' | 'writer'>(
    (localStorage.getItem('credifile_corporate_share_role') as 'reader' | 'writer') || 'writer'
  );

  // Live fetch of Corporate Auto-Sharing Settings from settings_general
  useEffect(() => {
    if (isSandbox) return;
    
    // Non-blocking fetch of settings_general document
    const fetchGeneralSettings = async () => {
      try {
        const docRef = doc(db, 'applications', 'settings_general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.shareEmail) {
            setCorporateEmail(data.shareEmail);
            localStorage.setItem('credifile_corporate_share_email', data.shareEmail);
          }
          if (data.shareRole) {
            setCorporateRole(data.shareRole);
            localStorage.setItem('credifile_corporate_share_role', data.shareRole);
          }
        }
      } catch (err) {
        console.warn("Could not retrieve online general settings document, using cached/defaults:", err);
      }
    };

    fetchGeneralSettings();
  }, [user, isSandbox]);

  // Save checklist helper
  const saveChecklistToLocalStorage = (activeUser: { uid: string }, docId: string, info: { fileId: string; name: string } | null) => {
    try {
      const stored = localStorage.getItem(`credifile_checklist_${activeUser.uid}`);
      let currentMap: { [key: string]: { fileId: string; name: string } } = {};
      if (stored) {
        currentMap = JSON.parse(stored);
      }
      if (info === null) {
        delete currentMap[docId];
      } else {
        currentMap[docId] = info;
      }
      localStorage.setItem(`credifile_checklist_${activeUser.uid}`, JSON.stringify(currentMap));
    } catch (e) {
      console.error("Failed saving document cache to LocalStorage:", e);
    }
  };

  useEffect(() => {
    // 1. Check if previously in sandbox mode
    const sandboxStored = localStorage.getItem('credifile_sandbox_active') === 'true';
    if (sandboxStored) {
      setIsSandbox(true);
      const mockUser = { uid: 'sandbox_user', displayName: 'Sandbox Appraiser', email: 'sandbox@credifile.com' } as any;
      setUser(mockUser);
      setToken('sandbox-token-123');
      setAuthInit(false);

      // Restore sandbox profile, checklist and row logs
      try {
        const storedProfile = localStorage.getItem('credifile_profile_sandbox_user');
        const storedChecklistMetadata = localStorage.getItem('credifile_checklist_sandbox_user');
        const storedSandboxRow = localStorage.getItem('credifile_row_sandbox_user');

        if (storedProfile) {
          const parsedProfile = JSON.parse(storedProfile) as UserProfile;
          setProfile(parsedProfile);

          if (storedSandboxRow) {
            setSandboxRowData(JSON.parse(storedSandboxRow));
          }

          const freshDocs = generateDocRequirements(parsedProfile);
          if (storedChecklistMetadata) {
            const parsedMetadata = JSON.parse(storedChecklistMetadata) as { [key: string]: { fileId: string; name: string } };
            const restoredDocs = freshDocs.map(doc => {
              const meta = parsedMetadata[doc.id];
              if (meta) {
                return {
                  ...doc,
                  status: 'completed' as const,
                  uploadedFileId: meta.fileId,
                  uploadedFileName: meta.name
                };
              }
              return doc;
            });
            setChecklist(restoredDocs);
          } else {
            setChecklist(freshDocs);
          }

          const finishedSubmitting = localStorage.getItem('credifile_submitted_sandbox_user') === 'true';
          if (finishedSubmitting) {
            setStep('success');
          } else {
            setStep('upload');
          }
        } else {
          setStep('profile');
        }
      } catch (e) {
        console.error("Failed restoring sandbox state:", e);
        setStep('profile');
      }
      return;
    }

    // 2. Otherwise load standard Firebase Auth listener
    const unsubscribe = initAuth(
      (authUser, accessToken) => {
        setIsSandbox(false);
        setUser(authUser);
        setToken(accessToken);
        setAuthInit(false);

        // Dynamic restoration from LocalStorage
        try {
          const storedProfile = localStorage.getItem(`credifile_profile_${authUser.uid}`);
          const storedChecklistMetadata = localStorage.getItem(`credifile_checklist_${authUser.uid}`);
          if (storedProfile) {
            const parsedProfile = JSON.parse(storedProfile) as UserProfile;
            setProfile(parsedProfile);

            const freshDocs = generateDocRequirements(parsedProfile);
            if (storedChecklistMetadata) {
              const parsedMetadata = JSON.parse(storedChecklistMetadata) as { [key: string]: { fileId: string; name: string } };
              const restoredDocs = freshDocs.map(doc => {
                const meta = parsedMetadata[doc.id];
                if (meta) {
                  return {
                    ...doc,
                    status: 'completed' as const,
                    uploadedFileId: meta.fileId,
                    uploadedFileName: meta.name
                  };
                }
                return doc;
              });
              setChecklist(restoredDocs);
            } else {
              setChecklist(freshDocs);
            }
            setStep('upload');
          } else {
            setStep('profile');
          }
        } catch (e) {
          console.error("Failed restoring state from local metadata cache:", e);
          setStep('profile');
        }
      },
      () => {
        setUser(null);
        setToken(null);
        setIsSandbox(false);
        setAuthInit(false);
        setStep('login');
      }
    );

    return () => unsubscribe();
  }, []);

  // 1. Live Firestore updates on active application
  useEffect(() => {
    if (!user || isSandbox) {
      if (!user) {
        setActiveApplication(null);
      }
      return;
    }

    const docRef = doc(db, 'applications', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const app = docSnap.data() as ApplicationRecord;
        setActiveApplication(app);
        
        // Materialize profile & checklist context so visual files show correctly
        setProfile(app.profile);
        const freshDocs = generateDocRequirements(app.profile);
        
        // Restore document checklist uploaded state metadata if stored
        const storedChecklistMetadata = localStorage.getItem(`credifile_checklist_${user.uid}`);
        if (storedChecklistMetadata) {
          try {
            const parsedMetadata = JSON.parse(storedChecklistMetadata) as { [key: string]: { fileId: string; name: string } };
            const restoredDocs = freshDocs.map(doc => {
              const meta = parsedMetadata[doc.id];
              if (meta) {
                return {
                  ...doc,
                  status: 'completed' as const,
                  uploadedFileId: meta.fileId,
                  uploadedFileName: meta.name
                };
              }
              return doc;
            });
            setChecklist(restoredDocs);
          } catch (me) {
            setChecklist(freshDocs);
          }
        } else {
          setChecklist(freshDocs);
        }

        // Direct claimant to success tracker
        setStep('success');
      } else {
        setActiveApplication(null);
      }
    }, (err) => {
      console.warn("Firestore live tracker observer failed:", err);
    });

    return () => unsubscribe();
  }, [user, isSandbox]);

  // 2. Sandbox updates on active application from LocalStorage
  useEffect(() => {
    if (!isSandbox || !user) return;

    const syncSandboxApp = () => {
      const stored = localStorage.getItem('credifile_active_app_sandbox_user');
      if (stored) {
        try {
          const app = JSON.parse(stored) as ApplicationRecord;
          setActiveApplication(app);
          setProfile(app.profile);

          const freshDocs = generateDocRequirements(app.profile);
          const storedChecklistMetadata = localStorage.getItem('credifile_checklist_sandbox_user');
          if (storedChecklistMetadata) {
            const parsedMetadata = JSON.parse(storedChecklistMetadata) as { [key: string]: { fileId: string; name: string } };
            const restoredDocs = freshDocs.map(doc => {
              const meta = parsedMetadata[doc.id];
              if (meta) {
                return {
                  ...doc,
                  status: 'completed' as const,
                  uploadedFileId: meta.fileId,
                  uploadedFileName: meta.name
                };
              }
              return doc;
            });
            setChecklist(restoredDocs);
          } else {
            setChecklist(freshDocs);
          }
          setStep(prev => prev === 'admin' ? prev : 'success');
        } catch (e) {
          console.error("Failed restoring sandbox app load:", e);
        }
      } else {
        setActiveApplication(null);
      }
    };

    syncSandboxApp();

    window.addEventListener('storage', syncSandboxApp);
    const interval = setInterval(syncSandboxApp, 1000);

    return () => {
      window.removeEventListener('storage', syncSandboxApp);
      clearInterval(interval);
    };
  }, [isSandbox, user]);

  // Load onboarding draft from Firestore (with LocalStorage cache fallback)
  useEffect(() => {
    let active = true;
    if (!user) {
      setDraftProfile(null);
      setDraftIndex(0);
      return;
    }

    const loadDraft = async () => {
      setIsDraftLoading(true);
      setSavingStatus(undefined);
      let loadedProfile: UserProfile | null = null;
      let loadedIndex = 0;

      if (isSandbox) {
        try {
          const sandboxDraft = localStorage.getItem('credifile_draft_sandbox_user');
          if (sandboxDraft) {
            const parsed = JSON.parse(sandboxDraft);
            loadedProfile = parsed.profile;
            loadedIndex = parsed.currentIndex || 0;
          }
        } catch (e) {
          console.error("Failed loading sandbox draft:", e);
        }
      } else {
        // Try Firestore
        try {
          const docRef = doc(db, 'onboarding_drafts', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && active) {
            const data = docSnap.data();
            loadedProfile = data.profile;
            loadedIndex = data.currentIndex || 0;
            setSavingStatus('idle');
          }
        } catch (err) {
          console.warn("Firestore draft loading failed, attempting local cache fallback:", err);
        }

        // Fallback to LocalStorage draft if Firestore failed or was empty
        if (!loadedProfile && active) {
          try {
            const localDraft = localStorage.getItem(`credifile_draft_${user.uid}`);
            if (localDraft) {
              const parsed = JSON.parse(localDraft);
              loadedProfile = parsed.profile;
              loadedIndex = parsed.currentIndex || 0;
              setSavingStatus('idle');
            }
          } catch (le) {
            console.error("Failed loading cached draft from localStorage:", le);
          }
        }
      }

      if (active) {
        if (loadedProfile) {
          setDraftProfile(loadedProfile);
          setDraftIndex(loadedIndex);
          setSavingStatus('idle');
        } else {
          setDraftProfile(null);
          setDraftIndex(0);
          setSavingStatus('idle');
        }
        setIsDraftLoading(false);
      }
    };

    loadDraft();

    return () => {
      active = false;
    };
  }, [user, isSandbox]);

  // Periodically/Debounced save the onboarding draft to Firestore and LocalStorage
  useEffect(() => {
    if (!pendingDraft || !user) return;

    setSavingStatus('saving');

    const delayDebounce = setTimeout(async () => {
      const draftPayload = {
        profile: pendingDraft.profile,
        currentIndex: pendingDraft.currentIndex,
        updatedAt: new Date().toISOString(),
        userId: user.uid,
      };

      if (isSandbox) {
        try {
          localStorage.setItem('credifile_draft_sandbox_user', JSON.stringify(draftPayload));
          setSavingStatus('saved');
        } catch (e) {
          console.error("Local sandbox draft save failed:", e);
          setSavingStatus('error');
        }
      } else {
        // Save to LocalStorage immediately as local cache
        try {
          localStorage.setItem(`credifile_draft_${user.uid}`, JSON.stringify(draftPayload));
        } catch (e) {
          console.warn("Local storage cache save failed:", e);
        }

        // Save to Firestore
        try {
          const docRef = doc(db, 'onboarding_drafts', user.uid);
          await setDoc(docRef, cleanForFirestore(draftPayload));
          setSavingStatus('saved');
        } catch (err) {
          console.error("Firestore draft save failed:", err);
          setSavingStatus('error');
        }
      }
    }, 1500); // 1.5 seconds debounce period

    return () => clearTimeout(delayDebounce);
  }, [pendingDraft, user, isSandbox]);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    setIsSandbox(false);
    localStorage.removeItem('credifile_sandbox_active');
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setToken(res.accessToken);
        setStep('profile');
      }
    } catch (err: any) {
      console.error('Login Failure:', err);
      let errMsg = err?.message || 'Access authorization to your active Google profile workspace failed.';
      const isPopupClosed = err?.code === 'auth/popup-closed-by-user' || 
                            String(err).includes('popup-closed-by-user') || 
                            String(err?.message || '').includes('popup-closed-by-user');
      
      if (isPopupClosed) {
        errMsg = "The Google login popup was either closed or blocked by your browser.\n\n" +
                 "💡 WHY THIS HAPPENS: Browsers often block popups inside preview iFrames of development hubs (like AI Studio).\n\n" +
                 "👉 HOW TO FIX IT INSTANTLY: Please look at the top-right corner of this live app preview window, click the 'Open in New Tab' button to launch the app in its own standalone tab. Sign-in will work beautifully there without any browser restrictions!";
      }
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartSandbox = () => {
    setIsLoading(true);
    setIsSandbox(true);
    localStorage.setItem('credifile_sandbox_active', 'true');
    setError(null);

    setTimeout(() => {
      const mockUser = {
        uid: 'sandbox_user',
        displayName: 'Sandbox Developer',
        email: 'sandbox@credifile.com',
      } as any;
      setUser(mockUser);
      setToken('sandbox-token-123');
      setStep('profile');
      setIsLoading(false);
    }, 450);
  };

  const handleSkipToProgressTracker = () => {
    setIsLoading(true);
    setError(null);

    const mockProfile: UserProfile = {
      companyName: 'Acme Commercial Builders Ltd',
      companyRegNo: '201901088741 (1348741-W)',
      directorCount: 3,
      phone: '+60388274191',
      loanAmount: '350000',
      loanPurpose: 'Commercial Project Machinery Acquisition',
      collateralType: 'Property',
      monthlyTurnover: '85000',
      is2025AuditedReady: true,
      userName: 'Alice Wong (Director)',
      isUserDirector: true,
      otherDirectorsCount: 2,
      isUserShareholder: true,
      userShareholdingPercent: '60',
      totalPaidUpCapital: '150000',
      relationshipType: 'direct',
      directorsList: [
        { name: 'Alice Wong', icNo: '880512-14-5544' },
        { name: 'Marcus Tan', icNo: '821015-14-6113' },
        { name: 'Dato\' Subramaniam', icNo: '750409-10-5023' }
      ],
      shareholdersList: [
        { name: 'Alice Wong', icNo: '880512-14-5544', sharesCount: 90000, percent: '60' },
        { name: 'Marcus Tan', icNo: '821015-14-6113', sharesCount: 60000, percent: '40' }
      ]
    };

    const mockChecklistMetadata = {
      'ssm-profile': { fileId: 'mock-ssm-123', name: 'SSM_Company_Profile.pdf' },
      'bank-statements': { fileId: 'mock-bank-123', name: 'Malayan_Bank_6M_Statements.pdf' },
      'sales-report': { fileId: 'mock-sales-123', name: 'Sales_Verification_Reporting.xlsx' },
      'ctos-company': { fileId: 'mock-ctos-123', name: 'CTOS_Commercial_Risk_Ratings.pdf' },
      'trade-debtors': { fileId: 'mock-debtors-123', name: 'Aging_Accounts_Receivables.pdf' },
      'trade-creditors': { fileId: 'mock-creditors-123', name: 'Aging_Accounts_Payables.pdf' },
      'balance-sheet-2023': { fileId: 'mock-bal-23', name: 'Audited_Balance_Sheet_2023.pdf' },
      'pl-statement-2023': { fileId: 'mock-pl-23', name: 'Audited_P&L_Statement_2023.pdf' },
      'balance-sheet-2024': { fileId: 'mock-bal-24', name: 'Audited_Balance_Sheet_2024.pdf' },
      'pl-statement-2024': { fileId: 'mock-pl-24', name: 'Audited_P&L_Statement_2024.pdf' },
      'balance-sheet-2025': { fileId: 'mock-bal-25', name: 'Management_Balance_Sheet_2025.pdf' },
      'pl-statement-2025': { fileId: 'mock-pl-25', name: 'Management_P&L_Statement_2025.pdf' }
    };

    const appId = 'APP-' + Math.floor(100000 + Math.random() * 900000);
    const rowData = [
      appId,
      mockProfile.companyName,
      String(mockProfile.directorCount),
      mockProfile.phone,
      `$${Number(mockProfile.loanAmount).toLocaleString()}`,
      mockProfile.loanPurpose,
      mockProfile.collateralType,
      `$${Number(mockProfile.monthlyTurnover).toLocaleString()}`,
      'Yes',
      new Date().toLocaleDateString(undefined, { dateStyle: 'long' }),
      'https://drive.mock/folders/sandbox-subfolder-abc123xyz',
      mockProfile.companyRegNo || 'N/A',
      mockProfile.userName || 'N/A',
      'Director',
      `$${Number(mockProfile.totalPaidUpCapital).toLocaleString()}`
    ];

    setTimeout(() => {
      const activeAppRecord: ApplicationRecord = {
        id: appId,
        userId: 'sandbox_user',
        userEmail: 'sandbox@credifile.com',
        profile: mockProfile,
        folderId: 'sandbox-subfolder-abc123xyz',
        folderUrl: 'https://drive.mock/folders/sandbox-subfolder-abc123xyz',
        submittedAt: new Date().toISOString(),
        status: 'Submitted'
      };

      localStorage.setItem('credifile_profile_sandbox_user', JSON.stringify(mockProfile));
      localStorage.setItem('credifile_checklist_sandbox_user', JSON.stringify(mockChecklistMetadata));
      localStorage.setItem('credifile_row_sandbox_user', JSON.stringify(rowData));
      localStorage.setItem('credifile_active_app_sandbox_user', JSON.stringify(activeAppRecord));
      localStorage.setItem('credifile_submitted_sandbox_user', 'true');
      localStorage.removeItem('credifile_draft_sandbox_user');

      setProfile(mockProfile);
      setSandboxRowData(rowData);
      setActiveApplication(activeAppRecord);

      const freshDocs = generateDocRequirements(mockProfile);
      const restoredDocs = freshDocs.map(doc => {
        const meta = (mockChecklistMetadata as any)[doc.id];
        if (meta) {
          return {
            ...doc,
            status: 'completed' as const,
            uploadedFileId: meta.fileId,
            uploadedFileName: meta.name
          };
        }
        return doc;
      });
      setChecklist(restoredDocs);

      setStep('success');
      setIsLoading(false);
    }, 400);
  };

  const handleLogout = async () => {
    try {
      localStorage.removeItem('credifile_sandbox_active');
      localStorage.removeItem('credifile_profile_sandbox_user');
      localStorage.removeItem('credifile_checklist_sandbox_user');
      localStorage.removeItem('credifile_row_sandbox_user');
      localStorage.removeItem('credifile_submitted_sandbox_user');
      await logout();
      setUser(null);
      setToken(null);
      setProfile(null);
      setChecklist([]);
      setIsSandbox(false);
      setStep('login');
      setError(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleDraftChange = (changedProfile: UserProfile, index: number) => {
    setPendingDraft({ profile: changedProfile, currentIndex: index });
  };

  const handleProfileSubmit = async (submittedProfile: UserProfile) => {
    if (!token || !user) {
      setError('Active workspace session expired. Please sign back in.');
      setStep('login');
      return;
    }

    setIsLoading(true);
    setError(null);

    // If Sandbox mode, skip Google Drive API calls entirely and generate local identifiers
    if (isSandbox) {
      setTimeout(() => {
        const enrichedProfile = {
          ...submittedProfile,
          folderId: 'sandbox-subfolder-abc123xyz',
        };

        setProfile(enrichedProfile);
        localStorage.setItem('credifile_profile_sandbox_user', JSON.stringify(enrichedProfile));
        localStorage.removeItem('credifile_draft_sandbox_user'); // Clear draft cache

        const docs = generateDocRequirements(enrichedProfile);
        setChecklist(docs);
        setStep('upload');
        setIsLoading(false);
      }, 500);
      return;
    }

    try {
      // 1. Instantly setup general root and unique application folder in Drive
      const rootFolderId = await getOrCreateMainFolder(token);
      const dateStr = new Date().toISOString().split('T')[0];
      const folderTitle = `${submittedProfile.companyName} ($${Number(submittedProfile.loanAmount).toLocaleString()}) [Ref: ${dateStr}]`;
      const folderId = await createFolder(token, folderTitle, rootFolderId);

      // 1b. Automatically apply Corporate Share Drive permissions to the folder
      if (corporateEmail) {
        console.log(`Auto-sharing created folder ${folderId} with corporate email: ${corporateEmail} (Role: ${corporateRole})`);
        try {
          await shareDriveItem(token, folderId, corporateEmail, corporateRole);
        } catch (shareErr) {
          console.error("Non-blocking failure: failed sharing newly created folder with corporate underwriter email:", shareErr);
        }
      }

      const enrichedProfile = {
        ...submittedProfile,
        folderId,
      };

      setProfile(enrichedProfile);
      localStorage.setItem(`credifile_profile_${user.uid}`, JSON.stringify(enrichedProfile));
      localStorage.removeItem(`credifile_draft_${user.uid}`); // Clear local cache draft

      // Non-blocking Firestore draft deletion on final submit
      try {
        const docRef = doc(db, 'onboarding_drafts', user.uid);
        deleteDoc(docRef).catch(e => console.warn("Silent failure deleting cloud draft:", e));
      } catch (de) {
        console.warn("Failed targeting cloud draft delete:", de);
      }

      const docs = generateDocRequirements(enrichedProfile);
      setChecklist(docs);
      setStep('upload');
    } catch (err: any) {
      console.error('Failed configuring workspace container:', err);
      // Offer switching to Sandbox mode if authentication scope failure occurs
      setError(
        'Insufficient authorization scopes to create Google folders. To test instantly without credentials, please log out and choose "Sandbox Mode".'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetApplication = () => {
    if (user) {
      if (isSandbox) {
        localStorage.removeItem('credifile_profile_sandbox_user');
        localStorage.removeItem('credifile_checklist_sandbox_user');
        localStorage.removeItem('credifile_row_sandbox_user');
        localStorage.removeItem('credifile_submitted_sandbox_user');
        localStorage.removeItem('credifile_draft_sandbox_user');
        localStorage.removeItem('credifile_active_app_sandbox_user');
      } else {
        localStorage.removeItem(`credifile_profile_${user.uid}`);
        localStorage.removeItem(`credifile_checklist_${user.uid}`);
        localStorage.removeItem(`credifile_draft_${user.uid}`);
        localStorage.removeItem(`credifile_active_app_${user.uid}`);

        try {
          const docRef = doc(db, 'onboarding_drafts', user.uid);
          deleteDoc(docRef).catch(e => console.warn("Failed deleting cloud draft on reset:", e));

          const appDocRef = doc(db, 'applications', user.uid);
          deleteDoc(appDocRef).catch(e => console.warn("Failed deleting cloud application on reset:", e));
        } catch (de) {
          console.warn("Error targeting cloud draft node delete on reset:", de);
        }
      }
    }
    setProfile(null);
    setChecklist([]);
    setDraftProfile(null);
    setDraftIndex(0);
    setPendingDraft(null);
    setSavingStatus(undefined);
    setActiveApplication(null);
    setError(null);
    setStep('profile');
  };

  const handleFileSelect = async (id: string, file: File | null) => {
    if (!token || !user || !profile || !profile.folderId) {
      setError('Active workspace session expired or container not created.');
      return;
    }

    if (file === null) {
      // Delete/remove action
      setChecklist((prev) =>
        prev.map((doc) => {
          if (doc.id === id) {
            return {
              ...doc,
              file: null,
              status: 'pending',
              uploadedFileId: undefined,
              uploadedFileName: undefined,
            };
          }
          return doc;
        })
      );
      if (isSandbox) {
        saveChecklistToLocalStorage({ uid: 'sandbox_user' }, id, null);
      } else {
        saveChecklistToLocalStorage(user, id, null);
      }
      return;
    }

    // Set uploading indicator for selected item
    setChecklist((prev) =>
      prev.map((doc) => {
        if (doc.id === id) {
          return {
            ...doc,
            status: 'uploading',
          };
        }
        return doc;
      })
    );

    // If Sandbox mode, simulate secure file upload visually with visual latency
    if (isSandbox) {
      setTimeout(() => {
        setChecklist((prev) =>
          prev.map((doc) => {
            if (doc.id === id) {
              return {
                ...doc,
                file: file,
                status: 'completed',
                uploadedFileId: `mock-file-${id}`,
                uploadedFileName: file.name,
              };
            }
            return doc;
          })
        );

        saveChecklistToLocalStorage({ uid: 'sandbox_user' }, id, {
          fileId: `mock-file-${id}`,
          name: file.name,
        });

        // Persist sandbox checklist as standard
        const updatedRawDocs = checklist.map((doc) => {
          if (doc.id === id) {
            return {
              ...doc,
              status: 'completed' as const,
              uploadedFileId: `mock-file-${id}`,
              uploadedFileName: file.name
            };
          }
          return doc;
        });
        localStorage.setItem('credifile_checklist_sandbox_user', JSON.stringify(
          updatedRawDocs.reduce((acc, current) => {
            if (current.status === 'completed') {
              acc[current.id] = { fileId: current.uploadedFileId!, name: current.uploadedFileName! };
            }
            return acc;
          }, {} as { [key: string]: { fileId: string; name: string } })
        ));
      }, 700);
      return;
    }

    try {
      // Direct, in-flight upload straight to the Drive Folder
      const result = await uploadFileToDrive(token, file, profile.folderId);

      setChecklist((prev) =>
        prev.map((doc) => {
          if (doc.id === id) {
            return {
              ...doc,
              file: file,
              status: 'completed',
              uploadedFileId: result.id,
              uploadedFileName: file.name,
            };
          }
          return doc;
        })
      );

      // Cache directly to LocalStorage
      saveChecklistToLocalStorage(user, id, {
        fileId: result.id,
        name: file.name,
      });

    } catch (err: any) {
      console.error('Immediate file upload transaction failed:', err);
      setChecklist((prev) =>
        prev.map((doc) => {
          if (doc.id === id) {
            return {
              ...doc,
              status: 'pending',
            };
          }
          return doc;
        })
      );
      alert(`Asset submission failed for ${file.name}: ${err?.message || err}`);
    }
  };

  const handleCommitSubmission = async () => {
    if (!token || !profile || !profile.folderId) {
      setError('Active workspace session expired. Please sign back in.');
      setStep('login');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSubmissionProgress('Synchronizing with Google Sheets database tracker...');

    // Generate sheet values
    const appId = 'APP-' + Math.floor(100000 + Math.random() * 900000);
    const rowData = [
      appId,
      profile.companyName,
      String(profile.directorCount),
      profile.phone,
      `$${Number(profile.loanAmount).toLocaleString()}`,
      profile.loanPurpose,
      profile.collateralType === 'None' ? 'Unsecured' : profile.collateralType,
      `$${Number(profile.monthlyTurnover).toLocaleString()}`,
      profile.is2025AuditedReady ? 'Yes' : 'No (Interim Management)',
      new Date().toLocaleDateString(undefined, { dateStyle: 'long' }),
      isSandbox ? `https://drive.mock/folders/${profile.folderId}` : `https://drive.google.com/drive/folders/${profile.folderId}`,
      profile.companyRegNo || 'N/A',
      profile.userName || 'N/A',
      profile.relationshipType === 'broker_agent' ? 'Broker / Agent' : 'Director',
      profile.totalPaidUpCapital ? `$${Number(profile.totalPaidUpCapital).toLocaleString()}` : 'N/A',
    ];

    if (isSandbox) {
      setTimeout(() => {
        const activeAppRecord: ApplicationRecord = {
          id: appId,
          userId: 'sandbox_user',
          userEmail: 'sandbox@credifile.com',
          profile,
          folderId: profile.folderId,
          folderUrl: `https://drive.mock/folders/${profile.folderId}`,
          submittedAt: new Date().toISOString(),
          status: 'Submitted'
        };
        localStorage.setItem('credifile_active_app_sandbox_user', JSON.stringify(activeAppRecord));
        setActiveApplication(activeAppRecord);

        setSandboxRowData(rowData);
        localStorage.setItem('credifile_row_sandbox_user', JSON.stringify(rowData));
        localStorage.setItem('credifile_submitted_sandbox_user', 'true');
        setStep('success');
        setIsSubmitting(false);
      }, 1000);
      return;
    }

    try {
      // Records append immediately inside Sheets
      const spreadsheetId = await getOrCreateTrackerSpreadsheet(token);

      setSubmissionProgress('Appending new corporate evaluation row inside tracking Sheet...');
      await appendSheetRow(token, spreadsheetId, 'Sheet1!A:O', rowData);

      setSuccessFolderId(profile.folderId);
      setSuccessSpreadsheetId(spreadsheetId);

      const activeAppRecord: ApplicationRecord = {
        id: appId,
        userId: user?.uid,
        userEmail: user?.email || undefined,
        profile,
        folderId: profile.folderId,
        folderUrl: `https://drive.google.com/drive/folders/${profile.folderId}`,
        spreadsheetId,
        sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
        submittedAt: new Date().toISOString(),
        status: 'Submitted'
      };

      const docRef = doc(db, 'applications', user!.uid);
      await setDoc(docRef, cleanForFirestore(activeAppRecord));
      setActiveApplication(activeAppRecord);

      // Submission completed! Free up cached records for any future applications
      if (user) {
        localStorage.removeItem(`credifile_profile_${user.uid}`);
        localStorage.removeItem(`credifile_checklist_${user.uid}`);
      }

      setStep('success');
    } catch (err: any) {
      console.error('Final sheet write failed:', err);
      setError(
        err?.message ||
          'Failed storing directories or appending tracking records. Please verify OAuth scope permissions.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authInit) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center max-w-sm text-center">
          <div className="w-10 h-10 border-3 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-3"></div>
          <p className="text-xs font-bold text-slate-800 uppercase tracking-widest">Checking Authentication</p>
          <p className="text-[11px] text-slate-400 mt-1">Acquiring direct client OAuth2 workspace coordinates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col justify-center items-center sm:p-6 md:p-8">
      {/* Visual Desktop Badge */}
      <div className="hidden lg:flex items-center space-x-2 text-slate-400 text-[10px] font-extrabold mb-3 tracking-widest uppercase select-none">
        <Building2 className="w-4 h-4 text-emerald-600 animate-pulse" />
        <span>CrediFile Business Underwriting Engine</span>
      </div>

      {/* Portal Navigation Toggle (only visible once authenticated) */}
      {user && (
        <div className="mb-4 flex bg-white/80 backdrop-blur-md p-1 rounded-2xl border border-slate-200 shadow-xs space-x-1 select-none text-[11px] font-extrabold tracking-tight items-center">
          <button
            onClick={() => setStep(activeApplication ? 'success' : 'profile')}
            className={`cursor-pointer px-4.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
              step !== 'admin'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <span>👤 Applicant Tracker</span>
          </button>
          <button
            onClick={() => setStep('admin')}
            id="admin-board-toggle-btn"
            className={`cursor-pointer px-4.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
              step === 'admin'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <span>🔑 Underwriter Desk</span>
            <span className="bg-emerald-100 text-emerald-800 text-[7px] font-bold px-1.5 py-0.5 rounded-full select-none shrink-0 border border-emerald-200">ADMIN</span>
          </button>
        </div>
      )}

      {/* Main smartphone frame context wrapper */}
      <div
        id="phone-frame"
        className="w-full sm:max-w-[440px] bg-white sm:min-h-[820px] sm:max-h-[880px] sm:rounded-[36px] sm:shadow-[0_24px_50px_-12px_rgba(0,0,0,0.15)] flex flex-col overflow-hidden sm:ring-1 sm:ring-slate-200 relative mb-4"
      >
        {/* Notch screen detail mock on desktop devices */}
        <div className="hidden sm:flex items-center justify-center shrink-0 h-6 bg-slate-50/50 border-b border-slate-100/50">
          <div className="w-24 h-4 bg-slate-940 rounded-b-xl absolute top-0 z-50 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-800 mr-2"></div>
            <div className="w-10 h-1 bg-slate-800 rounded-full"></div>
          </div>
        </div>

        {/* Sandbox Simulation Mode indicator banner */}
        {isSandbox && (
          <div className="bg-amber-500 text-white px-5 py-1.5 flex items-center justify-between font-extrabold select-none shrink-0 text-[10px] tracking-wider relative z-20">
            <span className="uppercase flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1.5 animate-pulse text-amber-100" />
              Sandbox Simulator Mode Active
            </span>
            <button
              onClick={handleLogout}
              id="exit-sandbox-banner-btn"
              className="px-2 py-0.5 bg-slate-950 font-bold uppercase cursor-pointer transition hover:bg-slate-900 text-[9px] text-white rounded-md border border-white/20 hover:scale-105 active:scale-95"
            >
              Exit Sandbox
            </button>
          </div>
        )}

        {isSandbox && (step === 'profile' || step === 'upload') && (
          <div className="bg-slate-900 text-white px-5 py-2 flex items-center justify-between border-b border-slate-800 animate-fade-in relative z-20 shadow-xs select-none">
            <div className="flex flex-col text-left">
              <span className="text-[8px] font-extrabold text-emerald-400 uppercase tracking-widest leading-none">
                SIMULATOR CONTROLS
              </span>
              <span className="text-[10px] text-slate-300 font-semibold mt-0.5">
                Skip form-filling manually
              </span>
            </div>
            <button
              type="button"
              onClick={handleSkipToProgressTracker}
              id="sandbox-skip-bypass-btn"
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 font-extrabold uppercase cursor-pointer transition text-[9px] text-white rounded-lg border border-emerald-500/20 shadow-xs hover:scale-[1.02] active:scale-95 flex items-center gap-1 shrink-0"
            >
              <Sparkles className="w-2.5 h-2.5 text-emerald-100 animate-bounce" />
              Skip to Tracker ⚡
            </button>
          </div>
        )}

        {/* Direct Admin view header suppression or rendering */}
        {step !== 'admin' && <Header user={user} onLogout={handleLogout} />}

        {/* Local warning panel banner */}
        {error && step !== 'upload' && step !== 'admin' && (
          <div className="mx-5 mt-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-semibold flex items-start space-x-2 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span className="leading-tight">{error}</span>
          </div>
        )}

        {/* Step screen routing */}
        {step === 'login' && (
          <div id="login-step" className="flex-1 flex flex-col justify-between px-6 py-10 text-center">
            <div className="my-auto space-y-6 animate-fade-in">
              <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm animate-pulse">
                <ShieldCheck className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Access Secure Processing</h2>
                <p className="text-xs text-slate-400 mt-1 px-4 leading-relaxed font-semibold">
                  Authorizes direct client-side storage upload flows into your designated Google Drive and records evaluation rows inside Google Sheets.
                </p>
              </div>

              {/* Secure sandbox descriptors */}
              <div className="bg-slate-50 text-left p-4 rounded-2xl border border-slate-100 space-y-2.5 max-w-xs mx-auto shadow-xs">
                <div className="flex items-start space-x-2.5 text-[11px] text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></div>
                  <span><strong>Workspace Isolation</strong>: CrediFile never routes documents through external database servers. They remain entirely inside your Google Cloud environment.</span>
                </div>
                <div className="flex items-start space-x-2.5 text-[11px] text-slate-600">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></div>
                  <span><strong>Continuous Cache</strong>: If you split your document uploads at different times, records remain safe in active local progress state.</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <GoogleSignInButton onClick={handleSignIn} isLoading={isLoading && !isSandbox} />
              
              <div className="relative my-3 flex items-center justify-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
                <span className="relative bg-white px-2 text-[9px] font-extrabold text-slate-300 uppercase tracking-widest">or</span>
              </div>

              <button
                type="button"
                onClick={handleStartSandbox}
                disabled={isLoading}
                id="sandbox-explore-btn"
                className="w-full border border-dashed border-slate-300 hover:border-emerald-500 hover:text-emerald-700 hover:bg-emerald-50/10 text-slate-500 text-xs font-bold py-3 px-4 rounded-xl transition cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 shadow-xs"
              >
                <span>🛠️ Explore Sandbox Simulator</span>
              </button>

              <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">
                Authenticated directly via Secure Client APIs
              </p>
            </div>
          </div>
        )}

        {step === 'profile' && user && (
          <ProfileForm
            user={user}
            onSubmit={handleProfileSubmit}
            initialData={draftProfile}
            initialIndex={draftIndex}
            onDraftChange={handleDraftChange}
            savingStatus={savingStatus}
            isDraftLoading={isDraftLoading}
          />
        )}

        {step === 'upload' && (
          <DocUpload
            documents={checklist}
            onFileSelect={handleFileSelect}
            onBack={() => setStep('profile')}
            onSubmit={handleCommitSubmission}
            isSubmitting={isSubmitting}
            submissionProgress={submissionProgress}
          />
        )}

        {step === 'success' && profile && (
          <SubmissionSuccess
            fullName={profile.companyName}
            loanAmount={profile.loanAmount}
            folderId={successFolderId || activeApplication?.folderId || ''}
            spreadsheetId={successSpreadsheetId || activeApplication?.spreadsheetId || ''}
            onReset={handleResetApplication}
            isSandbox={isSandbox}
            profile={profile}
            checklist={checklist}
            submittedRow={sandboxRowData}
            status={activeApplication?.status}
            notes={activeApplication?.notes}
            updatedAt={activeApplication?.updatedAt}
          />
        )}

        {step === 'admin' && (
          <AdminDashboard
            user={user}
            onBack={() => setStep(activeApplication ? 'success' : 'profile')}
            isSandbox={isSandbox}
            corporateEmail={corporateEmail}
            setCorporateEmail={setCorporateEmail}
            corporateRole={corporateRole}
            setCorporateRole={setCorporateRole}
          />
        )}

        {/* Dynamic device indicator at the bottom */}
        <div className="hidden sm:flex items-center justify-center shrink-0 h-4 bg-slate-50/20 border-t border-slate-100/30">
          <div className="w-24 h-1 bg-slate-300 rounded-full"></div>
        </div>
      </div>

      {step === 'success' && (
        <div className="hidden lg:flex items-center justify-center space-x-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Real-time records synced safely to Google Sheet tracker.</span>
        </div>
      )}
    </div>
  );
}
