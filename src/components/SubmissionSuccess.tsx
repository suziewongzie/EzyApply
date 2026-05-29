import React from 'react';
import { 
  Check, ExternalLink, RotateCcw, FolderOpen, FileSpreadsheet, Sparkles,
  Clock, CheckCircle2, XCircle, AlertCircle, FileSearch, HelpCircle
} from 'lucide-react';
import { SandboxSimulator } from './SandboxSimulator';
import { UserProfile, DocumentChecklistItem } from '../types';

interface SubmissionSuccessProps {
  fullName: string;
  loanAmount: string;
  folderId: string;
  spreadsheetId: string;
  onReset: () => void;
  isSandbox?: boolean;
  profile?: UserProfile | null;
  checklist?: DocumentChecklistItem[];
  submittedRow?: string[];
  status?: 'Submitted' | 'Processing' | 'Approved' | 'Declined';
  notes?: string;
  updatedAt?: string;
}

export function SubmissionSuccess({
  fullName,
  loanAmount,
  folderId,
  spreadsheetId,
  onReset,
  isSandbox = false,
  profile,
  checklist = [],
  submittedRow = [],
  status = 'Submitted',
  notes = '',
  updatedAt,
}: SubmissionSuccessProps) {
  // Construct direct Google product URLs
  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  // Tracker Steps Setup
  const trackerSteps = [
    {
      title: 'Application Submitted',
      description: 'Document profile compiled and synchronized with Sheets database ledger.',
      isCompleted: true,
      isActive: false,
    },
    {
      title: 'SSM & Document Audit',
      description: 'Compliance verification of SSM company registry and 6 Months bank scan statements.',
      isCompleted: status === 'Processing' || status === 'Approved' || status === 'Declined',
      isActive: status === 'Submitted',
    },
    {
      title: 'Credit Score Assessment',
      description: 'Reviewing personal credentials, CTOS ratings, and collateral deeds.',
      isCompleted: status === 'Approved' || status === 'Declined',
      isActive: status === 'Processing',
    },
    {
      title: 'Final Underwriter Decision',
      description: status === 'Approved' 
        ? 'Capital release approved! Underwriting board signed execution file.' 
        : status === 'Declined' 
          ? 'Application declined based on risk rating parameters.' 
          : 'Pending credit committee board execution sign-off.',
      isCompleted: status === 'Approved' || status === 'Declined',
      isActive: status === 'Processing' || status === 'Submitted' ? false : false, // handled specially
    }
  ];

  // Define header states dynamically so congratulations are NOT shown before final approval
  const getHeaderState = () => {
    switch (status) {
      case 'Approved':
        return {
          badge: (
            <div className="relative mb-4 shrink-0 transition-all duration-300">
              <div className="w-14 h-14 bg-emerald-50 rounded-full border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-md">
                <Check className="w-7 h-7" />
              </div>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-100 rounded-full border border-amber-200 flex items-center justify-center shadow-xs">
                <Sparkles className="w-3 h-3 text-amber-600" />
              </div>
            </div>
          ),
          title: "Application Approved 🎉",
          subtitle: (
            <>
              Congratulations! Your commercial loan evaluation profile for <strong className="text-emerald-700">${Number(loanAmount).toLocaleString()}</strong> was successfully approved by the underwriting committee.
            </>
          ),
          textColor: "text-emerald-950"
        };
      case 'Declined':
        return {
          badge: (
            <div className="relative mb-4 shrink-0">
              <div className="w-14 h-14 bg-red-50 rounded-full border border-red-200 flex items-center justify-center text-red-600 shadow-sm">
                <XCircle className="w-7 h-7" />
              </div>
            </div>
          ),
          title: "Application Declined & Closed",
          subtitle: (
            <>
              Your application dossier for a <strong className="text-red-700">${Number(loanAmount).toLocaleString()}</strong> facility was reviewed. Regrettably, it does not meet our minimum score criteria at this time.
            </>
          ),
          textColor: "text-red-955"
        };
      case 'Processing':
        return {
          badge: (
            <div className="relative mb-4 shrink-0">
              <div className="w-14 h-14 bg-amber-50 rounded-full border border-amber-250 flex items-center justify-center text-amber-600 shadow-sm ring-4 ring-amber-50/50 animate-pulse">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
            </div>
          ),
          title: "Application Under Review",
          subtitle: (
            <>
              Your compiled loan profile for <strong className="text-slate-900">${Number(loanAmount).toLocaleString()}</strong> is undergoing verification audit. Review progress will update below in real time.
            </>
          ),
          textColor: "text-amber-950"
        };
      default:
        return {
          badge: (
            <div className="relative mb-4 shrink-0">
              <div className="w-12 h-12 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 shadow-xs">
                <Clock className="w-5.5 h-5.5 text-slate-500" />
              </div>
            </div>
          ),
          title: "Application Submitted & Queued",
          subtitle: (
            <>
              Your compiled loan profile for <strong className="text-slate-900">${Number(loanAmount).toLocaleString()}</strong> has been locked and queued for financial risk evaluation.
            </>
          ),
          textColor: "text-slate-900"
        };
    }
  };

  const headerState = getHeaderState();

  return (
    <div id="success-step-container" className="flex-1 overflow-y-auto px-5 py-6 flex flex-col justify-between">
      <div className="flex-1 flex flex-col items-center justify-center py-2">
        
        {/* Upper Success Status Badge */}
        {headerState.badge}

        <h2 className="text-base font-extrabold text-slate-900 tracking-tight text-center leading-tight">
          {headerState.title}
        </h2>
        <p className="text-[11px] text-slate-500 mt-1.5 max-w-xs leading-relaxed text-center font-medium">
          {headerState.subtitle}
        </p>

        {/* Dynamic Process Tracker Stepper */}
        <div className="w-full mt-5 bg-white border border-slate-250/80 rounded-2xl p-4 text-left shadow-xs space-y-3.5 relative overflow-hidden">
          
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <FileSearch className="w-3.5 h-3.5 text-emerald-600" />
              Underwriting Process Tracker
            </h4>
            <span className={`text-[9px] font-mono font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
              status === 'Declined' ? 'bg-red-50 text-red-700 border border-red-100' :
              status === 'Processing' ? 'bg-amber-50 text-amber-700 border border-amber-150 animate-pulse' :
              'bg-blue-50 text-blue-700 border border-blue-100'
            }`}>
              {status === 'Processing' ? 'Reviewing' : status}
            </span>
          </div>

          {/* Stepper Pipeline List */}
          <div className="relative pl-2 text-left space-y-6">
            
            {/* Visual connecting line behind steps */}
            <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-100"></div>

            {trackerSteps.map((step, idx) => {
              // Special validation for decision endpoint color in final step
              const isLast = idx === trackerSteps.length - 1;
              const isDeclined = isLast && status === 'Declined';
              const isApproved = isLast && status === 'Approved';

              return (
                <div key={idx} className="relative pl-9 text-left">
                  
                  {/* Step status dot indicator */}
                  <div className="absolute left-0 top-[1px] z-10">
                    {isDeclined ? (
                      <div className="w-5.5 h-5.5 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center text-red-600 shadow-sm shrink-0">
                        <XCircle className="w-3 h-3" />
                      </div>
                    ) : isApproved ? (
                      <div className="w-5.5 h-5.5 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-sm shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                    ) : step.isCompleted ? (
                      <div className="w-5.5 h-5.5 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-xs shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                    ) : step.isActive ? (
                      <div className="w-5.5 h-5.5 rounded-full bg-amber-50 border-2 border-amber-500 flex items-center justify-center shadow-xs shrink-0 relative">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping absolute"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                      </div>
                    ) : (
                      <div className="w-5.5 h-5.5 rounded-full bg-slate-50 border-2 border-slate-200 flex items-center justify-center text-slate-400 font-extrabold text-[9px] shrink-0">
                        {idx + 1}
                      </div>
                    )}
                  </div>

                  {/* Step info labels */}
                  <div className="space-y-1">
                    <span className={`block text-xs font-bold leading-tight ${
                      isDeclined ? 'text-red-900 font-extrabold' :
                      isApproved ? 'text-emerald-950 font-extrabold' :
                      step.isActive ? 'text-amber-900 font-extrabold' : 
                      step.isCompleted ? 'text-slate-800' : 'text-slate-400'
                    }`}>
                      {step.title}
                    </span>
                    <span className="block text-[9.5px] text-slate-400 font-semibold leading-relaxed max-w-[280px]">
                      {step.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Real-time Reviewer Feedback notes panel if exists */}
        {notes && (
          <div className="w-full mt-3 p-3.5 bg-slate-900 text-white rounded-2xl border border-slate-800 text-left shadow-md">
            <span className="text-[8px] font-mono uppercase tracking-widest text-slate-400 block mb-1">
              📋 Underwriter Feedback Notes
            </span>
            <p className="text-xs font-bold font-mono text-emerald-400 leading-normal">
              "{notes}"
            </p>
            {updatedAt && (
              <span className="block text-[8px] text-slate-500 mt-2 font-mono text-right font-semibold">
                Updated: {new Date(updatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>
        )}

        {/* Sandbox Observer vs real workspace logs */}
        {isSandbox && profile ? (
          /* Sandbox Interactive Viewer */
          <div className="w-full mt-3">
            <SandboxSimulator
              profile={profile}
              checklist={checklist}
              submittedRow={submittedRow}
            />
          </div>
        ) : (
          /* Real Google Workspace links */
          <div className="w-full mt-3 space-y-3 text-left">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 shadow-xs">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
                Active Google Drive Workspace
              </h4>
              <div className="space-y-2">
                {/* Drive link */}
                <a
                  href={folderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/10 transition group"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                      <FolderOpen className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="block text-xs font-bold text-slate-800">Your Drive Dossier Folder</span>
                      <span className="block text-[8px] text-slate-400 truncate">Stored securely on Google Cloud Drive</span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition shrink-0 animate-pulse" />
                </a>

                {/* Sheet link */}
                <a
                  href={spreadsheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50/10 transition group"
                >
                  <div className="flex items-center space-x-2 truncate">
                    <div className="w-7 h-7 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600 shrink-0">
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="block text-xs font-bold text-slate-800">Corporate Sheets Tracker</span>
                      <span className="block text-[8px] text-slate-400 truncate">Applications ledger reference sheet</span>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition shrink-0 animate-pulse" />
                </a>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] text-slate-500 leading-normal text-center font-medium">
              Credit Committee changes will propagate directly to this live tracking page. Keep this tab open.
            </div>
          </div>
        )}
      </div>

      {/* Primary reset restart key */}
      <div className="pt-3 shrink-0">
        <button
          onClick={onReset}
          id="success-restart-btn"
          className="w-full bg-slate-900 hover:bg-slate-850 text-white font-semibold rounded-xl text-xs py-3.5 flex items-center justify-center space-x-2 cursor-pointer transition shadow-md"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Submit Another Profile</span>
        </button>
      </div>
    </div>
  );
}
