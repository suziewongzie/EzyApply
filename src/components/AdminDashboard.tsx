import React, { useState, useEffect } from 'react';
import { ApplicationRecord, HistoryEntry } from '../types';
import { db, getAccessToken } from '../lib/firebase';
import { collection, getDocs, updateDoc, doc, setDoc } from 'firebase/firestore';
import { 
  ArrowLeft, Search, Filter, ShieldCheck, FileText, CheckCircle2, 
  XCircle, Clock, RefreshCw, FolderOpen, Phone, ExternalLink, 
  ChevronRight, Building2, Layers, DollarSign, RefreshCw as RotateIcon,
  Sparkles, Check, Send, MessageCircle, Mail, X
} from 'lucide-react';

export function getDisplayHistory(app: ApplicationRecord): HistoryEntry[] {
  const history: HistoryEntry[] = [];
  
  // Baseline initial submission
  history.push({
    status: 'Submitted',
    notes: 'Application profile compiled and synchronized with Sheets database ledger.',
    updatedAt: app.submittedAt,
    reviewerName: 'System Core'
  });

  if (app.statusHistory && app.statusHistory.length > 0) {
    app.statusHistory.forEach((entry) => {
      // Avoid adding duplicate initial Submission at the exact same millisecond
      if (
        entry.status === 'Submitted' &&
        new Date(entry.updatedAt).getTime() === new Date(app.submittedAt).getTime()
      ) {
        return;
      }
      history.push(entry);
    });
  } else {
    // Dynamically synthesize a beautiful timeline from status updates (backwards compatibility with existing demo records)
    if (app.status !== 'Submitted' && app.updatedAt) {
      if (app.status === 'Processing') {
        history.push({
          status: 'Processing',
          notes: app.notes || 'Underwriter initiated document evaluation and compliance verification.',
          updatedAt: app.updatedAt,
          reviewerName: app.reviewerName || 'Administrator'
        });
      } else if (app.status === 'Approved' || app.status === 'Declined') {
        const processingTime = new Date(new Date(app.submittedAt).getTime() + 600000).toISOString(); // 10 mins later
        history.push({
          status: 'Processing',
          notes: 'Dossier put under comprehensive financial risk and corporate compliance audit.',
          updatedAt: processingTime,
          reviewerName: 'System Core'
        });
        history.push({
          status: app.status,
          notes: app.notes || (app.status === 'Approved' ? 'Credit profile parameters and cashflow approved. Facility committed.' : 'Dossier risk threshold exceeded on CTOS or monthly turnover evaluation.'),
          updatedAt: app.updatedAt,
          reviewerName: app.reviewerName || 'Administrator'
        });
      }
    } else if (app.notes) {
      history.push({
        status: 'Submitted',
        notes: app.notes,
        updatedAt: app.updatedAt || app.submittedAt,
        reviewerName: app.reviewerName || 'Administrator'
      });
    }
  }

  // Sort history entries chronologically (newest first)
  return history.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

interface AdminDashboardProps {
  user: { email: string | null; uid: string } | null;
  onBack: () => void;
  isSandbox: boolean;
  corporateEmail: string;
  setCorporateEmail: (email: string) => void;
  corporateRole: 'reader' | 'writer';
  setCorporateRole: (role: 'reader' | 'writer') => void;
}

export function AdminDashboard({ 
  user, 
  onBack, 
  isSandbox,
  corporateEmail,
  setCorporateEmail,
  corporateRole,
  setCorporateRole
}: AdminDashboardProps) {
  const [applications, setApplications] = useState<ApplicationRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<ApplicationRecord | null>(null);
  const [searchText, setSearchText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce search text updates to prevent constant re-renders during active typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchText);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchText]);

  const [statusFilter, setStatusFilter] = useState<'All' | 'Submitted' | 'Processing' | 'Approved' | 'Declined'>('All');
  const [adminNotes, setAdminNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // WhatsApp Easy follow-up state
  const [whatsappMessage, setWhatsappMessage] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<'intro' | 'documents' | 'processing' | 'approved' | 'declined'>('intro');
  const [activeFollowUpTab, setActiveFollowUpTab] = useState<'whatsapp' | 'email'>('whatsapp');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');

  // Automated notification system controls
  const [autoEmailNotify, setAutoEmailNotify] = useState(true);
  const [autoWhatsappNotify, setAutoWhatsappNotify] = useState(true);
  const [pendingWhatsappUri, setPendingWhatsappUri] = useState<string | null>(null);

  const getWhatsAppTemplate = (
    type: 'intro' | 'documents' | 'processing' | 'approved' | 'declined',
    app: ApplicationRecord
  ): string => {
    const contactName = app.profile.userName || 'Representative';
    const compName = app.profile.companyName || 'your company';
    const appId = app.id;
    const loanAmt = Number(app.profile.loanAmount || 0).toLocaleString();

    switch (type) {
      case 'intro':
        return `Hello ${contactName},\n\nThis is the commercial underwriting desk regarding your application ${appId} for ${compName}.\n\nI have successfully initiated review of your $${loanAmt} credit facility. Do you have 5 minutes for a quick introductory call?`;
      case 'documents':
        return `Hello ${contactName},\n\nWe are auditing application ${appId} ($${loanAmt}) for ${compName}.\n\nCould you please upload the supplementary outstanding documents (e.g., latest board resolution, recent bank statements) on your corporate dashboard portal, so we can proceed with fast-tracking your evaluation?`;
      case 'processing':
        return `Hello ${contactName},\n\nGood day! Just an update that your $${loanAmt} commercial evaluation profile (${appId}) for ${compName} has been put under final liquidity audit queue.\n\nYou may view progress real-time on your dashboard portal. Let me know if you have any questions!`;
      case 'approved':
        return `Congratulations ${contactName}! 🎉\n\nI am delighted to inform you that your $${loanAmt} loan evaluation for ${compName} has been successfully APPROVED by our Underwriting Committee!\n\nPlease visit your dashboard portal to review your approved offer and complete the offer-letter lock-in steps.`;
      case 'declined':
        return `Hello ${contactName},\n\nThis is the commercial underwriting desk. We have finalized evaluation for application ${appId} ($${loanAmt}) regarding ${compName}. Unfortunately we are unable to commit to this facility at this time. Highlights are detailed on your dashboard portal.`;
      default:
        return '';
    }
  };

  const getEmailTemplate = (
    type: 'intro' | 'documents' | 'processing' | 'approved' | 'declined',
    app: ApplicationRecord
  ): { subject: string; body: string } => {
    const contactName = app.profile.userName || 'Representative';
    const compName = app.profile.companyName || 'your company';
    const appId = app.id;
    const loanAmt = Number(app.profile.loanAmount || 0).toLocaleString();

    switch (type) {
      case 'intro':
        return {
          subject: `Underwriting Review Initialized - App ${appId} - ${compName}`,
          body: `Hi ${contactName},\n\nHope this email finds you well.\n\nI am the underwriter assigned to your credit application (${appId}) of $${loanAmt} for ${compName}.\n\nYour application dossier has been received and put into active review on our commercial underwriter desk. Our typical turnaround is 2-3 business days.\n\nAre you available for a brief 5-minute introductory alignment call? Let me know your best contact slot.\n\nBest regards,\nCommercial Underwriting Desk`
        };
      case 'documents':
        return {
          subject: `Document Request: Supplementary Audit for App ${appId} - ${compName}`,
          body: `Hi ${contactName},\n\nWe are currently conducting the risk and compliance audit for App ${appId} ($${loanAmt}) regarding ${compName}.\n\nTo expedite your underwriting evaluation, we kindly request the following outstanding documentation:\n- Latest Board Resolution authorizing borrow action\n- Most recent 3-months of corporate bank statements\n\nYou can upload these documents directly via your customer portal, or reply back to this email with attachments.\n\nThank you for your active collaboration.\n\nBest regards,\nCommercial Underwriting Desk`
        };
      case 'processing':
        return {
          subject: `Underwriting Advisory Update: App ${appId} - ${compName}`,
          body: `Hi ${contactName},\n\nThis is a periodic update regarding evaluation app ${appId} ($${loanAmt}) for ${compName}.\n\nYour credit dossier is currently undergoing comprehensive financial risk evaluation. We have completed SSM registration checks and CTOS baseline credit assessments.\n\nYou can track updates live via your dashboard portal. No immediate actions are needed from your end right now.\n\nBest regards,\nCommercial Underwriting Desk`
        };
      case 'approved':
        return {
          subject: `CONGRATULATIONS: Credit Facility Offered! - App ${appId} - ${compName}`,
          body: `Dear ${contactName},\n\nWe are delighted to share that your commercial loan application ${appId} for ${compName} has been APPROVED by our Credit Committee!\n\nApproved Loan Quantum: $${loanAmt}\n\nTo lock-in this pre-agreed rate package and generate your formal offer letter document, please log in to your secure portal and complete the dashboard offer sequence.\n\nCongratulations from all of us on this exciting milestone!\n\nWarm regards,\nCommercial Underwriting Desk`
        };
      case 'declined':
        return {
          subject: `Credit Evaluation Notice: App ${appId} - ${compName}`,
          body: `Hi ${contactName},\n\nWe have completed our commercial credit assessment for App ${appId} ($${loanAmt}) regarding ${compName}.\n\nAfter comprehensive risk indexing, we regret to inform you that we are unable to approve your application at this time due to certain criteria thresholds (such as credit history or business turnover) not being met.\n\nYou can review evaluation highlights in your customer dashboard portal.\n\nThank you for considering us for your commercial capital.\n\nBest regards,\nCommercial Underwriting Desk`
        };
      default:
        return { subject: '', body: '' };
    }
  };

  const handleSelectTemplate = (tempType: 'intro' | 'documents' | 'processing' | 'approved' | 'declined') => {
    if (!selectedApp) return;
    setSelectedTemplate(tempType);
    setWhatsappMessage(getWhatsAppTemplate(tempType, selectedApp));
    const mailInfo = getEmailTemplate(tempType, selectedApp);
    setEmailSubject(mailInfo.subject);
    setEmailBody(mailInfo.body);
  };

  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSendStatus, setEmailSendStatus] = useState<{ success: boolean; message: string } | null>(null);

  const buildRawEmail = (to: string, subject: string, messageText: string, fromName = "Commercial Underwriting Desk"): string => {
    const emailLines = [
      `From: "${fromName}" <me>`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: 7bit',
      '',
      messageText
    ];
    const emailContent = emailLines.join('\r\n');
    
    // Base64Url-safe encoding
    const base64 = btoa(unescape(encodeURIComponent(emailContent)));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  };

  const handleSendGmailEmail = async () => {
    if (!selectedApp) return;
    if (!selectedApp.userEmail) {
      setEmailSendStatus({ success: false, message: 'Applicant does not have a registered email address.' });
      return;
    }

    setIsSendingEmail(true);
    setEmailSendStatus(null);

    try {
      if (isSandbox) {
        // Simple mock response for sandbox environment
        await new Promise(resolve => setTimeout(resolve, 1200));
        
        // Push status history
        const currentHist = selectedApp.statusHistory || [];
        const newEntry: HistoryEntry = {
          status: selectedApp.status,
          notes: `[Simulated] Auto-Email sent: "${emailSubject}" via Gmail API.`,
          updatedAt: new Date().toISOString(),
          reviewerName: 'Sandbox Gmail Agent'
        };
        const updatedHistory = [...currentHist, newEntry];
        const updatedApp: ApplicationRecord = {
          ...selectedApp,
          updatedAt: new Date().toISOString(),
          statusHistory: updatedHistory
        };

        const demoAppsKey = 'credifile_sandbox_demo_apps';
        const storedDemos = localStorage.getItem(demoAppsKey);
        if (storedDemos) {
          const listObj = JSON.parse(storedDemos) as ApplicationRecord[];
          const updatedList = listObj.map(a => a.id === selectedApp.id ? updatedApp : a);
          localStorage.setItem(demoAppsKey, JSON.stringify(updatedList));
        }

        setSelectedApp(updatedApp);
        setApplications(prev => prev.map(a => a.id === selectedApp.id ? updatedApp : a));
        setEmailSendStatus({ success: true, message: `Simulated follow-up dispatched to ${selectedApp.userEmail}!` });
        setTimeout(() => setEmailSendStatus(null), 5000);
      } else {
        const token = await getAccessToken();
        if (!token) {
          throw new Error('No Google OAuth session found. Please reload or sign in to your Gmail console to run automated actions.');
        }

        const rawEmail = buildRawEmail(selectedApp.userEmail, emailSubject, emailBody);

        const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ raw: rawEmail })
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(errData.error?.message || `Gmail API dispatch error (Status: ${response.status})`);
        }

        // Real successful Gmail API send. Log event to Application history database!
        const currentHist = selectedApp.statusHistory || [];
        const newEntry: HistoryEntry = {
          status: selectedApp.status,
          notes: `Auto-Email dispatched successfully: "${emailSubject}" via Gmail API integration.`,
          updatedAt: new Date().toISOString(),
          reviewerName: user?.email || 'Gmail API Core'
        };
        const updatedHistory = [...currentHist, newEntry];

        const updatedApp: ApplicationRecord = {
          ...selectedApp,
          updatedAt: new Date().toISOString(),
          statusHistory: updatedHistory
        };

        const userId = selectedApp.userId;
        if (userId) {
          const docRef = doc(db, 'applications', userId);
          await updateDoc(docRef, {
            updatedAt: new Date().toISOString(),
            statusHistory: updatedHistory
          });
        }

        setSelectedApp(updatedApp);
        setApplications(prev => prev.map(a => a.id === selectedApp.id ? updatedApp : a));
        setEmailSendStatus({ success: true, message: `Email dispatched successfully through your Gmail to ${selectedApp.userEmail}!` });
        setTimeout(() => setEmailSendStatus(null), 5000);
      }
    } catch (err: any) {
      console.error("Gmail Send Error:", err);
      setEmailSendStatus({ success: false, message: err?.message || 'Unexpected failure while sending via Gmail API.' });
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Auto-Sharing controls state
  const [internalEmail, setInternalEmail] = useState(corporateEmail || 'webzite.my@gmail.com');
  const [internalRole, setInternalRole] = useState<'reader' | 'writer'>(corporateRole || 'writer');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsStatusMsg, setSettingsStatusMsg] = useState('');
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Sync internal settings details with global props updates
  useEffect(() => {
    if (corporateEmail) setInternalEmail(corporateEmail);
  }, [corporateEmail]);

  useEffect(() => {
    if (corporateRole) setInternalRole(corporateRole);
  }, [corporateRole]);

  const handleSaveSharingSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsStatusMsg('');

    try {
      if (isSandbox) {
        localStorage.setItem('credifile_corporate_share_email', internalEmail);
        localStorage.setItem('credifile_corporate_share_role', internalRole);
        setCorporateEmail(internalEmail);
        setCorporateRole(internalRole);
        setSettingsStatusMsg('Simulated configuration updated locally.');
        setTimeout(() => setSettingsStatusMsg(''), 3000);
      } else {
        const docRef = doc(db, 'applications', 'settings_general');
        await setDoc(docRef, {
          shareEmail: internalEmail,
          shareRole: internalRole,
          updatedAt: new Date().toISOString()
        });
        localStorage.setItem('credifile_corporate_share_email', internalEmail);
        localStorage.setItem('credifile_corporate_share_role', internalRole);
        setCorporateEmail(internalEmail);
        setCorporateRole(internalRole);
        setSettingsStatusMsg('Auto-share settings live in Firestore!');
        setTimeout(() => setSettingsStatusMsg(''), 3000);
      }
    } catch (err: any) {
      console.error("Failed saving sharing settings:", err);
      alert(`Failed saving sharing settings: ${err.message || err}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Fetch applications
  const fetchApps = async () => {
    setLoading(true);
    let appList: ApplicationRecord[] = [];

    if (isSandbox) {
      // Load sandbox mock lists from LocalStorage keys of submitted users
      try {
        const storedSandboxApp = localStorage.getItem('credifile_active_app_sandbox_user');
        if (storedSandboxApp) {
          const app = JSON.parse(storedSandboxApp) as ApplicationRecord;
          appList.push(app);
        }
        
        // Also seed a couple of extra realistic pending demo applications to make the admin side beautiful
        const demoAppsKey = 'credifile_sandbox_demo_apps';
        let demoApps = localStorage.getItem(demoAppsKey);
        if (!demoApps) {
          const defaultDemos: ApplicationRecord[] = [
            {
              id: 'APP-839211',
              userId: 'demo_user_1',
              userEmail: 'cto@nexus-energy.io',
              profile: {
                companyName: 'Nexus Green Tech Sdn Bhd',
                companyRegNo: '202101039482',
                directorCount: 2,
                phone: '+60 12-442 9381',
                loanAmount: '250000',
                loanPurpose: 'Green Boiler Retrofitting and Carbon Audit compliance tools.',
                collateralType: 'Fixed Deposit',
                monthlyTurnover: '68000',
                is2025AuditedReady: true,
                folderId: 'demo-folder-1',
                relationshipType: 'direct',
                isUserDirector: true,
                otherDirectorsCount: 1,
                userName: 'Tan Ah Seng'
              },
              submittedAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
              status: 'Processing',
              notes: 'SSM checked. High equity and 2025 audited ready. Good CTOS rating.'
            },
            {
              id: 'APP-104921',
              userId: 'demo_user_2',
              userEmail: 'contact@bunga-catering.my',
              profile: {
                companyName: 'Bunga Raya Catering Services',
                companyRegNo: '201903491223',
                directorCount: 3,
                phone: '+60 19-335 1204',
                loanAmount: '80000',
                loanPurpose: 'Kitchen Expansion and raw purchase buffer storage setup.',
                collateralType: 'None',
                monthlyTurnover: '35000',
                is2025AuditedReady: false,
                folderId: 'demo-folder-2',
                relationshipType: 'broker_agent',
                userName: 'Ahmad Rafiq bin Latif'
              },
              submittedAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
              status: 'Submitted',
              notes: 'Waiting for Director 2 IC upload.'
            },
            {
              id: 'APP-993841',
              userId: 'demo_user_3',
              userEmail: 'finance@vortex-logistics.com.my',
              profile: {
                companyName: 'Vortex Logistics Malaysia',
                companyRegNo: '201601072381',
                directorCount: 4,
                phone: '+60 17-293 8812',
                loanAmount: '500000',
                loanPurpose: 'Purchase of 3 active prime mover units to secure port route.',
                collateralType: 'Property',
                monthlyTurnover: '190000',
                is2025AuditedReady: true,
                folderId: 'demo-folder-3',
                relationshipType: 'direct',
                userName: 'Lim Wei Han'
              },
              submittedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
              status: 'Approved',
              notes: 'Audit passed. Loan approved by senior panel on Collateral valuation.'
            }
          ];
          localStorage.setItem(demoAppsKey, JSON.stringify(defaultDemos));
          appList = [...appList, ...defaultDemos];
        } else {
          appList = [...appList, ...JSON.parse(demoApps)];
        }
      } catch (e) {
        console.error("Sandbox load err:", e);
      }
    } else {
      // Real firebase mode
      try {
        const querySnapshot = await getDocs(collection(db, 'applications'));
        querySnapshot.forEach((doc) => {
          appList.push(doc.data() as ApplicationRecord);
        });
      } catch (e) {
        console.error("Firestore apps load err:", e);
      }
    }

    // Sort by submission date (newest first)
    appList.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    setApplications(appList);
    setLoading(false);
  };

  useEffect(() => {
    fetchApps();
  }, [isSandbox]);

  // Update selectedApp internal notes text area when selected application changes
  useEffect(() => {
    if (selectedApp) {
      setAdminNotes(selectedApp.notes || '');
      setWhatsappMessage(getWhatsAppTemplate('intro', selectedApp));
      const mailInfo = getEmailTemplate('intro', selectedApp);
      setEmailSubject(mailInfo.subject);
      setEmailBody(mailInfo.body);
      setSelectedTemplate('intro');
      setPendingWhatsappUri(null);
    } else {
      setAdminNotes('');
      setWhatsappMessage('');
      setEmailSubject('');
      setEmailBody('');
      setPendingWhatsappUri(null);
    }
  }, [selectedApp]);

  // Handle status update
  const handleUpdateStatus = async (newStatus: 'Submitted' | 'Processing' | 'Approved' | 'Declined') => {
    if (!selectedApp) return;
    setUpdatingId(selectedApp.id);
    setSuccessMsg('');
    setPendingWhatsappUri(null);

    // 1. Determine corresponding template key
    let templateKey: 'intro' | 'documents' | 'processing' | 'approved' | 'declined' = 'intro';
    if (newStatus === 'Submitted') templateKey = 'intro';
    else if (newStatus === 'Processing') templateKey = 'processing';
    else if (newStatus === 'Approved') templateKey = 'approved';
    else if (newStatus === 'Declined') templateKey = 'declined';

    let emailStatusNote = '';
    const mailInfo = getEmailTemplate(templateKey, selectedApp);

    // Build automated email trigger if toggled
    if (autoEmailNotify && selectedApp.userEmail) {
      try {
        if (isSandbox) {
          emailStatusNote = ` (Simulated Instant Status Email sent to ${selectedApp.userEmail})`;
        } else {
          const token = await getAccessToken();
          if (token) {
            const rawEmail = buildRawEmail(selectedApp.userEmail, mailInfo.subject, mailInfo.body);
            const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ raw: rawEmail })
            });
            if (response.ok) {
              emailStatusNote = ` (Auto Status Gmail dispatched successfully to ${selectedApp.userEmail})`;
            } else {
              const errText = await response.text();
              console.error("Gmail error response:", errText);
              emailStatusNote = ' (Auto-Gmail API failed - check credentials)';
            }
          } else {
            emailStatusNote = ' (Auto-Gmail skipped - no active Google session)';
          }
        }
      } catch (e: any) {
        console.error("Auto Gmail dispatch error:", e);
        emailStatusNote = ` (Auto-Gmail Error: ${e.message || e})`;
      }
    }

    // Determine WhatsApp notification trigger if toggled
    let whatsappUrl = '';
    if (autoWhatsappNotify && selectedApp.profile.phone) {
      const waMsg = getWhatsAppTemplate(templateKey, selectedApp);
      const phoneDigits = selectedApp.profile.phone.replace(/\D/g, '');
      const cleanedPhone = phoneDigits.startsWith('0') ? '60' + phoneDigits.substring(1) : phoneDigits;
      whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(waMsg)}`;
    }

    const currentHist = selectedApp.statusHistory || [];
    const newEntry: HistoryEntry = {
      status: newStatus,
      notes: (adminNotes || `Status updated to ${newStatus}.`) + emailStatusNote,
      updatedAt: new Date().toISOString(),
      reviewerName: user?.email || 'Administrator'
    };
    const updatedHistory = [...currentHist, newEntry];

    const updatedApp: ApplicationRecord = {
      ...selectedApp,
      status: newStatus,
      notes: adminNotes,
      updatedAt: new Date().toISOString(),
      reviewerName: user?.email || 'Administrator',
      statusHistory: updatedHistory
    };

    if (isSandbox) {
      setTimeout(() => {
        // Find if this is the active user's draft or a demo app
        const storedSandboxApp = localStorage.getItem('credifile_active_app_sandbox_user');
        let matchedActiveUser = false;
        if (storedSandboxApp) {
          const app = JSON.parse(storedSandboxApp) as ApplicationRecord;
          if (app.id === selectedApp.id) {
            localStorage.setItem('credifile_active_app_sandbox_user', JSON.stringify(updatedApp));
            matchedActiveUser = true;
          }
        }

        if (!matchedActiveUser) {
          // It's a demo app
          const demoAppsKey = 'credifile_sandbox_demo_apps';
          const storedDemos = localStorage.getItem(demoAppsKey);
          if (storedDemos) {
            const listObj = JSON.parse(storedDemos) as ApplicationRecord[];
            const updatedList = listObj.map(a => a.id === selectedApp.id ? updatedApp : a);
            localStorage.setItem(demoAppsKey, JSON.stringify(updatedList));
          }
        }

        setSelectedApp(updatedApp);
        setApplications(prev => prev.map(a => a.id === selectedApp.id ? updatedApp : a));
        setUpdatingId(null);
        
        let confirmText = `Status updated to ${newStatus} successfully.`;
        if (emailStatusNote) confirmText += ` ${emailStatusNote}`;
        setSuccessMsg(confirmText);
        
        if (whatsappUrl) {
          setPendingWhatsappUri(whatsappUrl);
        }

        // Hide message after 8 sec to allow reading
        setTimeout(() => setSuccessMsg(''), 8000);
      }, 600);
    } else {
      try {
        // Find the user UID associated with this application document
        // In our firestore mapping, /applications/{userId} stores the file
        const userId = selectedApp.userId;
        if (!userId) {
          throw new Error('Claimant target UID details not found in application record.');
        }

        const docRef = doc(db, 'applications', userId);
        await updateDoc(docRef, {
          status: newStatus,
          notes: adminNotes,
          updatedAt: new Date().toISOString(),
          reviewerName: user?.email || 'Administrator',
          statusHistory: updatedHistory
        });

        setSelectedApp(updatedApp);
        setApplications(prev => prev.map(a => a.id === selectedApp.id ? updatedApp : a));
        setUpdatingId(null);

        let confirmText = `Status updated to ${newStatus} in Firestore.`;
        if (emailStatusNote) confirmText += ` ${emailStatusNote}`;
        setSuccessMsg(confirmText);

        if (whatsappUrl) {
          setPendingWhatsappUri(whatsappUrl);
        }

        setTimeout(() => setSuccessMsg(''), 8000);
      } catch (err: any) {
        console.error("Firestore status modify error:", err);
        alert(`Status update failed: ${err.message || err}`);
        setUpdatingId(null);
      }
    }
  };

  // Save notes only
  const handleSaveNotes = async () => {
    if (!selectedApp) return;
    setUpdatingId(selectedApp.id);
    setSuccessMsg('');

    const currentHist = selectedApp.statusHistory || [];
    const newEntry: HistoryEntry = {
      status: selectedApp.status,
      notes: adminNotes || 'Administrative review note updated.',
      updatedAt: new Date().toISOString(),
      reviewerName: user?.email || 'Administrator'
    };
    const updatedHistory = [...currentHist, newEntry];

    const updatedApp: ApplicationRecord = {
      ...selectedApp,
      notes: adminNotes,
      updatedAt: new Date().toISOString(),
      statusHistory: updatedHistory
    };

    if (isSandbox) {
      setTimeout(() => {
        const storedSandboxApp = localStorage.getItem('credifile_active_app_sandbox_user');
        let matchedActiveUser = false;
        if (storedSandboxApp) {
          const app = JSON.parse(storedSandboxApp) as ApplicationRecord;
          if (app.id === selectedApp.id) {
            localStorage.setItem('credifile_active_app_sandbox_user', JSON.stringify(updatedApp));
            matchedActiveUser = true;
          }
        }

        if (!matchedActiveUser) {
          const demoAppsKey = 'credifile_sandbox_demo_apps';
          const storedDemos = localStorage.getItem(demoAppsKey);
          if (storedDemos) {
            const listObj = JSON.parse(storedDemos) as ApplicationRecord[];
            const updatedList = listObj.map(a => a.id === selectedApp.id ? updatedApp : a);
            localStorage.setItem(demoAppsKey, JSON.stringify(updatedList));
          }
        }

        setSelectedApp(updatedApp);
        setApplications(prev => prev.map(a => a.id === selectedApp.id ? updatedApp : a));
        setUpdatingId(null);
        setSuccessMsg('Reviewer notes saved.');
        setTimeout(() => setSuccessMsg(''), 2500);
      }, 400);
    } else {
      try {
        const userId = selectedApp.userId;
        if (!userId) throw new Error('Applicant ID is missing');
        const docRef = doc(db, 'applications', userId);
        await updateDoc(docRef, {
          notes: adminNotes,
          updatedAt: new Date().toISOString(),
          statusHistory: updatedHistory
        });

        setSelectedApp(updatedApp);
        setApplications(prev => prev.map(a => a.id === selectedApp.id ? updatedApp : a));
        setUpdatingId(null);
        setSuccessMsg('Reviewer notes updated in Firestore.');
        setTimeout(() => setSuccessMsg(''), 2500);
      } catch (err: any) {
        console.error(err);
        alert(`Notes update failed: ${err.message || err}`);
        setUpdatingId(null);
      }
    }
  };

  // Filter and search computation
  const filteredApps = applications.filter(app => {
    const query = searchQuery.trim().toLowerCase();
    const matchesStatus = statusFilter === 'All' || app.status === statusFilter;
    
    if (!query) {
      return matchesStatus;
    }

    const companyName = app.profile?.companyName || '';
    const appId = app.id || '';
    const companyRegNo = app.profile?.companyRegNo || '';
    const userName = app.profile?.userName || '';
    const userEmail = app.userEmail || '';
    const phone = app.profile?.phone || '';

    const matchesSearch = 
      companyName.toLowerCase().includes(query) ||
      appId.toLowerCase().includes(query) ||
      companyRegNo.toLowerCase().includes(query) ||
      userName.toLowerCase().includes(query) ||
      userEmail.toLowerCase().includes(query) ||
      phone.toLowerCase().includes(query);
    
    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const totalPool = applications.reduce((sum, app) => sum + Number(app.profile.loanAmount || 0), 0);
  const approvedPool = applications
    .filter(a => a.status === 'Approved')
    .reduce((sum, app) => sum + Number(app.profile.loanAmount || 0), 0);
  const pendingCount = applications.filter(a => a.status === 'Submitted' || a.status === 'Processing').length;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 text-slate-900 font-sans">
      
      {/* Search / Filters Controls */}
      <div className="p-4 bg-white border-b border-slate-100 shrink-0 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition cursor-pointer"
              title="Return to Applicant Portal"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h2 className="text-sm font-extrabold text-slate-950 tracking-tight flex items-center gap-1">
                Underwriter Portal
                {isSandbox && <span className="bg-amber-100 text-amber-800 text-[8px] font-bold px-1.5 py-0.5 rounded-full">SIMULATED</span>}
              </h2>
              <p className="text-[10px] text-slate-400 font-medium">B2B Underwriting Evaluation & Document Audit Desk</p>
            </div>
          </div>

          <button
            onClick={fetchApps}
            disabled={loading}
            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition disabled:opacity-50"
            title="Refresh submissions list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>

        {/* Dashboard KPIs row */}
        <div className="grid grid-cols-3 gap-2.5 mb-4 text-left">
          <div className="p-2.5 bg-slate-50/50 rounded-xl border border-slate-100">
            <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total Requests</span>
            <span className="block text-xs font-extrabold text-slate-800 mt-1.5 truncate">
              ${totalPool.toLocaleString()}
            </span>
            <span className="block text-[8px] text-slate-400 mt-0.5 font-medium">Over {applications.length} claims</span>
          </div>
          <div className="p-2.5 bg-emerald-50/20 rounded-xl border border-emerald-100/50">
            <span className="block text-[8px] font-bold text-emerald-600/85 uppercase tracking-widest leading-none">Total Approved</span>
            <span className="block text-xs font-extrabold text-emerald-700 mt-1.5 truncate">
              ${approvedPool.toLocaleString()}
            </span>
            <span className="block text-[8px] text-emerald-500 mt-0.5 font-medium">Funds committed</span>
          </div>
          <div className="p-2.5 bg-blue-50/20 rounded-xl border border-blue-100/50">
            <span className="block text-[8px] font-bold text-blue-600/85 uppercase tracking-widest leading-none">Active Load</span>
            <span className="block text-xs font-extrabold text-blue-700 mt-1.5">
              {pendingCount}
            </span>
            <span className="block text-[8px] text-blue-400 mt-0.5 font-medium">Needs Audit decision</span>
          </div>
        </div>

        {/* Search controls */}
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search company or ID..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full text-xs font-semibold pl-8.5 pr-8.5 py-2 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl text-slate-800"
            />
            {searchText && (
              <button
                type="button"
                onClick={() => setSearchText('')}
                className="absolute right-2.5 top-2.5 p-0.5 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
                aria-label="Clear search"
              >
                <X className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>
          <select
            value={statusFilter}
            onChange={(e: any) => setStatusFilter(e.target.value)}
            className="text-xs font-bold px-2.5 py-2 bg-slate-50 border border-slate-200 focus:outline-none rounded-xl text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="Submitted">Submitted</option>
            <option value="Processing">Processing</option>
            <option value="Approved">Approved</option>
            <option value="Declined">Declined</option>
          </select>
        </div>
      </div>

      {/* Main split dashboard view */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
        {!selectedApp ? (
          /* List View */
          <div className="flex-1 bg-white p-4">
            {/* Google Drive Sharing Settings Section */}
            <div className="mb-4.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 shadow-2xs select-none">
              <button
                type="button"
                onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                className="w-full flex items-center justify-between text-left cursor-pointer focus:outline-none"
                id="share-settings-toggle-btn"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <FolderOpen className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-[10px] font-extrabold text-slate-800 tracking-tight block uppercase leading-none">
                      Workspace Auto-Sharing Config
                    </h4>
                    <span className="text-[9px] text-slate-400 mt-0.5 block font-medium">
                      Instantly share new application folders on submit
                    </span>
                  </div>
                </div>
                <span className="text-[9px] font-bold text-slate-400 hover:text-slate-800 transition">
                  {showSettingsPanel ? 'COLLAPSE ✕' : 'CONFIGURE ⚙'}
                </span>
              </button>

              {showSettingsPanel && (
                <form onSubmit={handleSaveSharingSettings} className="mt-3.5 border-t border-slate-200/50 pt-3.5 space-y-3.5 text-left">
                  <div className="space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                      Corporate Underwriter Email
                    </label>
                    <input
                      type="email"
                      value={internalEmail}
                      onChange={(e) => setInternalEmail(e.target.value)}
                      required
                      placeholder="e.g. underwriter@yourcompany.com"
                      className="w-full text-xs font-bold px-3 py-2 bg-white border border-slate-200 focus:outline-none focus:border-emerald-600 rounded-xl text-slate-850"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                      Drive Permission Role Control
                    </label>
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setInternalRole('writer')}
                        className={`flex-1 text-[10px] font-extrabold uppercase py-1.5 px-3 rounded-lg border cursor-pointer transition ${
                          internalRole === 'writer'
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Editor (Writer)
                      </button>
                      <button
                        type="button"
                        onClick={() => setInternalRole('reader')}
                        className={`flex-1 text-[10px] font-extrabold uppercase py-1.5 px-3 rounded-lg border cursor-pointer transition ${
                          internalRole === 'reader'
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Viewer (Reader)
                      </button>
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <div>
                      {settingsStatusMsg && (
                        <span className="text-[10px] text-emerald-600 font-extrabold animate-pulse">
                          {settingsStatusMsg}
                        </span>
                      )}
                    </div>
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      id="save-sharing-settings-btn"
                      className="cursor-pointer bg-slate-900 hover:bg-slate-950 text-[9px] font-extrabold text-white uppercase tracking-wider px-3.5 py-1.5 rounded-lg transition disabled:opacity-50 flex items-center space-x-1.5"
                    >
                      <span>{isSavingSettings ? 'Saving...' : 'Save Settings'}</span>
                    </button>
                  </div>
                  
                  <p className="text-[9px] text-slate-400 font-medium leading-relaxed bg-slate-100/50 p-2.5 rounded-lg">
                    🛡️ <strong>Drive Access Delegation:</strong> When an applicant submits, our <strong>Drive Permissions SDK</strong> instantly runs in the background. It delegates reader/writer access to the above address immediately. Subsequent files uploaded inherit these permissions automatically.
                  </p>
                </form>
              )}
            </div>

            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3 block">
              Application Submissions ({filteredApps.length})
            </h3>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <RefreshCw className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Loading Applications...</span>
              </div>
            ) : filteredApps.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-slate-100 rounded-2xl">
                <FileText className="w-8 h-8 text-slate-300 mb-2" />
                <span className="text-xs font-bold text-slate-400">No applications matched criteria</span>
                <p className="text-[10px] text-slate-400 mt-1 px-8">Submit a profile in Sandbox or Live mode to see them load here instantly.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredApps.map((app) => {
                  const submittedDate = new Date(app.submittedAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit'
                  });

                  return (
                    <button
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className="w-full text-left p-3.5 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/5 flex items-center justify-between transition cursor-pointer bg-white shadow-xs"
                    >
                      <div className="space-y-1.5 max-w-[80%]">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded-md">
                            {app.id}
                          </span>
                          <span className="text-xs font-extrabold text-slate-900 truncate">
                            {app.profile.companyName}
                          </span>
                        </div>
                        <div className="flex items-center flex-wrap gap-x-2 text-[10px] text-slate-400 font-medium">
                          <span>${Number(app.profile.loanAmount).toLocaleString()}</span>
                          <span className="text-slate-300">•</span>
                          <span>{app.profile.collateralType === 'None' ? 'Unsecured' : app.profile.collateralType}</span>
                          <span className="text-slate-300">•</span>
                          <span className="truncate max-w-[120px]">{app.userEmail || 'N/A'}</span>
                        </div>
                        <span className="block text-[9px] text-slate-400 font-mono">
                          Submitted on {submittedDate}
                        </span>
                      </div>

                      <div className="flex flex-col items-end space-y-2 shrink-0">
                        {/* Status badges */}
                        {app.status === 'Approved' && (
                          <span className="bg-emerald-50 text-emerald-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 border border-emerald-100">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Approved</span>
                          </span>
                        )}
                        {app.status === 'Declined' && (
                          <span className="bg-red-50 text-red-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 border border-red-100">
                            <XCircle className="w-2.5 h-2.5" />
                            <span>Declined</span>
                          </span>
                        )}
                        {app.status === 'Processing' && (
                          <span className="bg-amber-50 text-amber-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 border border-amber-100">
                            <Clock className="w-2.5 h-2.5 animate-spin" />
                            <span>Reviewing</span>
                          </span>
                        )}
                        {app.status === 'Submitted' && (
                          <span className="bg-blue-50 text-blue-700 text-[9px] font-extrabold px-2 py-0.5 rounded-full flex items-center space-x-1 border border-blue-100">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Submitted</span>
                          </span>
                        )}
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Details Evaluation View */
          <div className="flex-1 bg-white p-4 space-y-4">
            
            {/* Nav Back Header inside Details */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <button
                onClick={() => setSelectedApp(null)}
                className="text-xs font-extrabold text-slate-500 hover:text-slate-800 flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Apps List</span>
              </button>
              <div className="flex items-center space-x-1.5">
                <span className="text-[10px] text-slate-400 font-mono leading-none">Application ID:</span>
                <span className="text-xs font-mono font-extrabold bg-slate-50 border border-slate-200 text-slate-800 px-2 py-0.5 rounded-lg">
                  {selectedApp.id}
                </span>
              </div>
            </div>

            {/* Quick status banner */}
            <div className="rounded-2xl p-4 bg-slate-50 border border-slate-100 flex items-start justify-between">
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                  {selectedApp.profile.companyName}
                </h4>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium mt-1">
                  <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>{selectedApp.profile.phone}</span>
                  <span>•</span>
                  <span>Reg: {selectedApp.profile.companyRegNo || 'N/A'}</span>
                </div>
              </div>

              {/* Status display */}
              <div className="shrink-0">
                {selectedApp.status === 'Approved' && (
                  <span className="bg-emerald-500 text-white text-[10px] font-bold px-3 py-1 rounded-lg flex items-center space-x-1 shadow-sm">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Approved</span>
                  </span>
                )}
                {selectedApp.status === 'Declined' && (
                  <span className="bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-lg flex items-center space-x-1 shadow-sm">
                    <XCircle className="w-3 h-3" />
                    <span>Declined</span>
                  </span>
                )}
                {selectedApp.status === 'Processing' && (
                  <span className="bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-lg flex items-center space-x-1 shadow-sm">
                    <Clock className="w-3 h-3" />
                    <span>Processing</span>
                  </span>
                )}
                {selectedApp.status === 'Submitted' && (
                  <span className="bg-blue-500 text-white text-[10px] font-bold px-3 py-1 rounded-lg flex items-center space-x-1 shadow-sm">
                    <Clock className="w-3 h-3" />
                    <span>Submitted</span>
                  </span>
                )}
              </div>
            </div>

            {/* Direct Communications & Follow-up Desk (WhatsApp & Email Free Client Sync) */}
            <div className="rounded-2xl p-4 bg-slate-50 border border-slate-200/60 space-y-3.5 shrink-0">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-extrabold tracking-wider text-slate-700 uppercase flex items-center gap-1.5 leading-none">
                  <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
                  <span>Applicant Follow-up Desk</span>
                </h4>
                <div className="flex border border-slate-200 rounded-lg overflow-hidden p-0.5 bg-slate-100/50">
                  <button
                    type="button"
                    onClick={() => setActiveFollowUpTab('whatsapp')}
                    className={`px-2 py-1 text-[9px] font-extrabold rounded-md transition select-none cursor-pointer ${
                      activeFollowUpTab === 'whatsapp'
                        ? 'bg-white text-slate-800 shadow-xs border border-slate-200/55'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveFollowUpTab('email')}
                    className={`px-2 py-1 text-[9px] font-extrabold rounded-md transition select-none cursor-pointer ${
                      activeFollowUpTab === 'email'
                        ? 'bg-white text-slate-800 shadow-xs border border-slate-200/55'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Email (Free)
                  </button>
                </div>
              </div>

              {/* Template selection list */}
              <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-100">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Draft Template Trigger:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleSelectTemplate('intro')}
                    className={`text-[9.5px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer select-none ${
                      selectedTemplate === 'intro'
                        ? 'bg-slate-800 border-slate-800 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    📞 Intro Align
                  </button>
                  <button
                    onClick={() => handleSelectTemplate('documents')}
                    className={`text-[9.5px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer select-none ${
                      selectedTemplate === 'documents'
                        ? 'bg-slate-800 border-slate-800 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    📄 Missing Docs
                  </button>
                  <button
                    onClick={() => handleSelectTemplate('processing')}
                    className={`text-[9.5px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer select-none ${
                      selectedTemplate === 'processing'
                        ? 'bg-slate-800 border-slate-800 text-white shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    ⏳ Progress Update
                  </button>
                  <button
                    onClick={() => handleSelectTemplate('approved')}
                    className={`text-[9.5px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer select-none ${
                      selectedTemplate === 'approved'
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs animate-pulse'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300 hover:bg-emerald-50/20'
                    }`}
                  >
                    🎉 Approved Offer
                  </button>
                  <button
                    onClick={() => handleSelectTemplate('declined')}
                    className={`text-[9.5px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer select-none ${
                      selectedTemplate === 'declined'
                        ? 'bg-rose-600 border-rose-600 text-white shadow-xs animate-pulse'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-red-300 hover:bg-red-50/20'
                    }`}
                  >
                    ❌ Declined Notice
                  </button>
                </div>
              </div>

              {/* Active Tab: whatsapp */}
              {activeFollowUpTab === 'whatsapp' && (
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <span className="text-[8px] font-extrabold text-emerald-700 uppercase tracking-widest block">WhatsApp Message Draft:</span>
                    <textarea
                      id="whatsapp-message-draft-box"
                      rows={4}
                      value={whatsappMessage}
                      onChange={(e) => setWhatsappMessage(e.target.value)}
                      placeholder="Draft your WhatsApp follow-up..."
                      className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl text-slate-800 placeholder-slate-400 leading-normal shadow-2xs"
                    />
                  </div>

                  {selectedApp.profile.phone ? (
                    (() => {
                      const phoneDigits = selectedApp.profile.phone.replace(/\D/g, '');
                      const cleanedPhone = phoneDigits.startsWith('0') ? '60' + phoneDigits.substring(1) : phoneDigits;
                      return (
                        <a
                          href={`https://wa.me/${cleanedPhone}?text=${encodeURIComponent(whatsappMessage)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition text-center flex items-center justify-center space-x-1.5 shadow-md active:scale-[0.98] cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 shrink-0 fill-current" />
                          <span>Launch WhatsApp Connect</span>
                          <ExternalLink className="w-3 h-3 opacity-85 shrink-0" />
                        </a>
                      );
                    })()
                  ) : (
                    <div className="text-[10px] text-center font-bold text-red-700 bg-red-50 p-2.5 border border-red-200 rounded-xl">
                      No contact phone number provided for this applicant.
                    </div>
                  )}
                </div>
              )}

              {/* Active Tab: email */}
              {activeFollowUpTab === 'email' && (
                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <span className="text-[8px] font-extrabold text-blue-700 uppercase tracking-widest block">Email Subject line:</span>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Enter email subject line..."
                      className="w-full text-xs font-bold px-2.5 py-2 bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-xl text-slate-800 placeholder-slate-400 shadow-2xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] font-extrabold text-blue-700 uppercase tracking-widest block">Email Body Message:</span>
                    <textarea
                      rows={5}
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      placeholder="Draft your email message..."
                      className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-xl text-slate-800 placeholder-slate-400 leading-normal shadow-2xs"
                    />
                  </div>

                  {emailSendStatus && (
                    <div className={`p-2.5 text-[10px] font-bold rounded-xl border leading-relaxed ${
                      emailSendStatus.success 
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                        : 'bg-red-50 border-red-200 text-red-800'
                    }`}>
                      {emailSendStatus.success ? '✅ ' : '❌ '}
                      {emailSendStatus.message}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleSendGmailEmail}
                    disabled={isSendingEmail}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition text-center flex items-center justify-center space-x-1.5 shadow-md active:scale-[0.98] cursor-pointer disabled:bg-indigo-400 disabled:opacity-75 disabled:cursor-wait"
                  >
                    {isSendingEmail ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                        <span>Sending Instant Auto-Email...</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-3.5 h-3.5 shrink-0 fill-current" />
                        <span>Send Instantly (Free Gmail API)</span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center gap-2 my-1">
                    <div className="h-[1px] bg-slate-200 flex-1" />
                    <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-widest">or manual fallback</span>
                    <div className="h-[1px] bg-slate-200 flex-1" />
                  </div>

                  {selectedApp.userEmail ? (
                    <a
                      href={`mailto:${selectedApp.userEmail}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition text-center flex items-center justify-center space-x-1.5 border border-slate-200/60 active:scale-[0.98] cursor-pointer"
                    >
                      <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>Draft in Local Mail Client</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70 shrink-0" />
                    </a>
                  ) : (
                    <a
                      href={`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`}
                      className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-bold transition text-center flex items-center justify-center space-x-1.5 border border-slate-200/60 active:scale-[0.98] cursor-pointer"
                    >
                      <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                      <span>Draft in Local Mail Client (Recipient Blank)</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70 shrink-0" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Application review fields */}
            <div>
              <h3 className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase mb-2">Loan Specifications</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-left">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Loan Claimed</span>
                  <span className="text-sm font-extrabold text-slate-800 font-mono mt-0.5 block">
                    ${Number(selectedApp.profile.loanAmount).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-left">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Monthly Revenue</span>
                  <span className="text-sm font-extrabold text-slate-800 font-mono mt-0.5 block">
                    ${Number(selectedApp.profile.monthlyTurnover).toLocaleString()}
                  </span>
                </div>
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-left">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Pledge Security</span>
                  <span className="text-xs font-bold text-slate-800 truncate mt-0.5 block">
                    {selectedApp.profile.collateralType === 'None' ? 'Unsecured credit' : selectedApp.profile.collateralType}
                  </span>
                </div>
                <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-left">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">2025 Audit Certified</span>
                  <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                    {selectedApp.profile.is2025AuditedReady ? 'Yes (Audited)' : 'No (Management Accounts)'}
                  </span>
                </div>
              </div>
              
              <div className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 text-left mt-3">
                <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Purpose of Capital Usage</span>
                <p className="text-xs font-medium text-slate-700 mt-1 leading-normal">
                  {selectedApp.profile.loanPurpose}
                </p>
              </div>
            </div>

            {/* Structural details */}
            <div className="space-y-3">
              <h3 className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase leading-none mt-2">Board & structural registry</h3>
              <div className="text-left space-y-2 p-3 bg-slate-50/20 border border-slate-100 rounded-xl text-xs">
                <div className="flex justify-between border-b border-slate-100 pb-1.5 font-medium">
                  <span className="text-slate-400">Total Directors:</span>
                  <span className="font-bold text-slate-800">{selectedApp.profile.directorCount}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5 font-medium">
                  <span className="text-slate-400">Representative:</span>
                  <span className="font-bold text-slate-800">{selectedApp.profile.userName || 'N/A'}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5 font-medium">
                  <span className="text-slate-400">Registry Relationship:</span>
                  <span className="font-bold text-slate-800 capitalize">
                    {selectedApp.profile.relationshipType === 'broker_agent' ? 'Broker / Intermediary agent' : 'Direct director application'}
                  </span>
                </div>
                {selectedApp.profile.totalPaidUpCapital && (
                  <div className="flex justify-between font-medium">
                    <span className="text-slate-400">Corporate Paid-up Capital:</span>
                    <span className="font-bold text-slate-800 font-mono">${Number(selectedApp.profile.totalPaidUpCapital).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Document Workspace links */}
            <div>
              <h3 className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase block mb-2">Audit workspace repository</h3>
              {selectedApp.folderId ? (
                <div className="space-y-2">
                  <a
                    href={isSandbox ? '#' : `https://drive.google.com/drive/folders/${selectedApp.folderId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-3 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/10 rounded-xl transition group text-left"
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <span className="text-xs font-bold text-slate-800 block">Workspace Drive Folder</span>
                        <span className="text-[9px] text-slate-400 block truncate">Inspect uploaded credentials & reports</span>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition shrink-0" />
                  </a>

                  {selectedApp.spreadsheetId && (
                    <a
                      href={isSandbox ? '#' : `https://docs.google.com/spreadsheets/d/${selectedApp.spreadsheetId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between p-3 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/10 rounded-xl transition group text-left"
                    >
                      <div className="flex items-center space-x-2.5 truncate">
                        <div className="w-8 h-8 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600 shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <span className="text-xs font-bold text-slate-800 block">Spreadsheets Log Tracker</span>
                          <span className="text-[9px] text-slate-400 block truncate">Master application ledger link</span>
                        </div>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition shrink-0" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 text-[10px] text-amber-800 leading-normal">
                  No online Drive repository configured for this sandbox demo profile file.
                </div>
              )}
            </div>

            {/* Accountability History / Audit Trail Section */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3.2">
                <h3 className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase flex items-center gap-1.5 leading-none">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Audit Trail & History</span>
                </h3>
                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md uppercase tracking-wider select-none border border-emerald-100">
                  Read-Only Log
                </span>
              </div>

              {(() => {
                const historyList = getDisplayHistory(selectedApp);
                return (
                  <div className="relative border-l-2 border-slate-100 pl-4.5 ml-1.5 space-y-4 py-1 text-left">
                    {historyList.map((item, index) => {
                      const dateStr = new Date(item.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                        second: '2-digit'
                      });

                      // Icons for different states
                      const getStatusIcon = (statusVal: string) => {
                        switch (statusVal) {
                          case 'Approved':
                            return <CheckCircle2 className="w-3 h-3 text-emerald-600 font-bold" />;
                          case 'Declined':
                            return <XCircle className="w-3 h-3 text-red-600" />;
                          case 'Processing':
                            return <Clock className="w-3 h-3 text-amber-600" />;
                          default:
                            return <FileText className="w-3 h-3 text-blue-600" />;
                        }
                      };

                      // Color themes for history log rows
                      const getStatusBadgeClass = (statusVal: string) => {
                        switch (statusVal) {
                          case 'Approved':
                            return 'bg-emerald-50 border-emerald-100/70 text-emerald-700';
                          case 'Declined':
                            return 'bg-red-50 border-red-100/70 text-red-700';
                          case 'Processing':
                            return 'bg-amber-50 border-amber-100/70 text-amber-800';
                          default:
                            return 'bg-blue-50 border-blue-100 text-blue-700';
                        }
                      };

                      return (
                        <div key={index} className="relative group">
                          {/* Dot item indicator on the timeline */}
                          <div className={`absolute -left-[24.5px] top-1.5 w-3.5 h-3.5 rounded-full border bg-white flex items-center justify-center shadow-xs transition duration-200 group-hover:scale-110 ${
                            item.status === 'Approved' ? 'border-emerald-300' :
                            item.status === 'Declined' ? 'border-red-300' :
                            item.status === 'Processing' ? 'border-amber-300' :
                            'border-blue-300'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              item.status === 'Approved' ? 'bg-emerald-500' :
                              item.status === 'Declined' ? 'bg-red-500' :
                              item.status === 'Processing' ? 'bg-amber-500' :
                              'bg-blue-500'
                            }`} />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center flex-wrap gap-x-2">
                              <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border tracking-wider flex items-center gap-1 ${getStatusBadgeClass(item.status)}`}>
                                {getStatusIcon(item.status)}
                                <span>{item.status === 'Processing' ? 'Under Review' : item.status}</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold font-mono">
                                {dateStr}
                              </span>
                            </div>

                            <p className="text-xs font-semibold text-slate-700 leading-normal pl-0.5">
                              {item.notes || <span className="italic text-slate-405">Review notes saved.</span>}
                            </p>

                            <div className="flex items-center space-x-1 pl-0.5 text-[9px] text-slate-400 font-bold leading-none">
                              <span>Actioned by:</span>
                              <span className="text-slate-500 underline decoration-slate-200">{item.reviewerName || 'Administrator'}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            {/* Notes and Underwriter decision action box */}
            <div className="pt-4 border-t border-slate-100 space-y-3 text-left">
              <label htmlFor="admin-underwriter-notes" className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase block mb-1">
                Underwriter Notes
              </label>
              <div className="relative">
                <textarea
                  id="admin-underwriter-notes"
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Insert SSM, CTOS audit review notes or conditions here..."
                  className="w-full text-xs font-semibold p-3 bg-slate-50 border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded-xl text-slate-800 placeholder-slate-400"
                />
                <button
                  onClick={handleSaveNotes}
                  className="absolute right-2.5 bottom-3.5 bg-slate-900 hover:bg-slate-850 text-white rounded-lg p-1.5 transition text-[10px] font-bold shadow-sm"
                  title="Save notes only"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>

              {successMsg && (
                <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-xl text-[10px] font-bold text-center">
                  {successMsg}
                </div>
              )}

              {/* Automated Notifications Control Panel */}
              <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl space-y-2.5 my-1 text-left">
                <span className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase block">
                  📢 Automated Notifications Trigger Options
                </span>
                
                <div className="space-y-2">
                  <label className="flex items-start space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoEmailNotify}
                      onChange={(e) => setAutoEmailNotify(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                    />
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-slate-700 block leading-tight">Instant Gmail API summary dispatch</span>
                      <span className="text-[8.5px] text-slate-400 font-semibold block leading-tight mt-0.5">
                        Sends a formatted commercial evaluation summary direct to the applicant ({selectedApp.userEmail || 'No Email'})
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoWhatsappNotify}
                      onChange={(e) => setAutoWhatsappNotify(e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                    />
                    <div className="text-left">
                      <span className="text-[10px] font-bold text-slate-700 block leading-tight">Assemble instant WhatsApp summary URL</span>
                      <span className="text-[8.5px] text-slate-400 font-semibold block leading-tight mt-0.5">
                        Pre-populates a click-to-dispatch URL utilizing applicant secure phone contact ({selectedApp.profile.phone || 'No Phone'})
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {pendingWhatsappUri && (
                <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-md border border-indigo-500 animate-pulse text-left flex flex-col space-y-1.5 my-2.5 select-none">
                  <div className="flex items-center space-x-1.5">
                    <MessageCircle className="w-4 h-4 shrink-0 fill-current text-white" />
                    <span className="text-xs font-black tracking-tight uppercase">Ready to dispatch WhatsApp</span>
                  </div>
                  <p className="text-[10px] font-semibold text-indigo-50 leading-tight">
                    Underwriting status changed. Send the automated decision summary to the applicant via WhatsApp instantly.
                  </p>
                  <a
                    href={pendingWhatsappUri}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setPendingWhatsappUri(null)}
                    className="w-full inline-flex items-center justify-center space-x-1.5 py-1.5 bg-white text-indigo-700 hover:bg-slate-50 font-black text-xs rounded-lg transition active:scale-[0.98] shadow-sm cursor-pointer"
                  >
                    <span>Launch WhatsApp Notification</span>
                    <ExternalLink className="w-3 h-3 text-indigo-600" />
                  </a>
                </div>
              )}

              {/* Status Update Controllers */}
              <div className="space-y-1.5">
                <span className="text-[9px] font-extrabold tracking-widest text-slate-400 uppercase block">
                  Modify Underwriting Decision
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleUpdateStatus('Processing')}
                    disabled={updatingId !== null}
                    id="underwriter-set-processing-btn"
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5 animate-pulse" />
                    <span>Set Reviewing</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('Approved')}
                    disabled={updatingId !== null}
                    id="underwriter-set-approved-btn"
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Set Approved</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('Declined')}
                    disabled={updatingId !== null}
                    id="underwriter-set-declined-btn"
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-red-50 border border-red-200 hover:bg-red-100 text-red-800 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Set Declined</span>
                  </button>

                  <button
                    onClick={() => handleUpdateStatus('Submitted')}
                    disabled={updatingId !== null}
                    id="underwriter-set-submitted-btn"
                    className="flex items-center justify-center space-x-1.5 py-2.5 px-3 bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-800 rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-50"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Set Submitted</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
