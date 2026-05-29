import React, { useState, useEffect, useRef } from 'react';
import { UserProfile } from '../types';
import { User } from 'firebase/auth';
import {
  ChevronRight,
  ChevronLeft,
  Users,
  Building2,
  DollarSign,
  Phone,
  Briefcase,
  FileCheck,
  Percent,
  TrendingUp,
  Award,
  AlertCircle,
  Plus,
  Shield,
  HelpCircle,
  UserCheck
} from 'lucide-react';

export function formatPhone(val: string): string {
  // Keep only numbers
  let digits = val.replace(/\D/g, '');

  // Conversion of local 0 prefix to 60 standard
  if (digits.startsWith('0')) {
    digits = '60' + digits.substring(1);
  }

  if (digits.length === 0) {
    return '';
  }

  let formatted = '';
  if (digits.length <= 2) {
    formatted = `+${digits}`;
  } else if (digits.length <= 4) {
    formatted = `+${digits.substring(0, 2)} ${digits.substring(2)}`;
  } else if (digits.length <= 6) {
    formatted = `+${digits.substring(0, 2)} ${digits.substring(2, 4)}-${digits.substring(4)}`;
  } else if (digits.length <= 10) {
    formatted = `+${digits.substring(0, 2)} ${digits.substring(2, 4)}-${digits.substring(4, 7)} ${digits.substring(7)}`;
  } else {
    formatted = `+${digits.substring(0, 2)} ${digits.substring(2, 4)}-${digits.substring(4, 8)} ${digits.substring(8, 12)}`;
  }

  return formatted.trim().replace(/[- ]$/, '');
}

export function formatCompanyReg(val: string): string {
  // Keep only numbers and alphanumeric characters
  let clean = val.replace(/[^a-zA-Z0-9]/g, '');

  if (clean.length === 0) {
    return '';
  }

  let formatted = '';
  if (/^\d+$/.test(clean)) {
    // New 12-digit format: YYYY-MM-XXXXXX
    if (clean.length > 12) {
      clean = clean.substring(0, 12);
    }
    
    if (clean.length <= 4) {
      formatted = clean;
    } else if (clean.length <= 6) {
      formatted = `${clean.substring(0, 4)}-${clean.substring(4)}`;
    } else {
      formatted = `${clean.substring(0, 4)}-${clean.substring(4, 6)}-${clean.substring(6)}`;
    }
  } else {
    // Old format: XXXXXX-K
    if (clean.length > 9) {
      clean = clean.substring(0, 9);
    }
    if (clean.length > 1) {
      const lastChar = clean.slice(-1);
      const leading = clean.slice(0, -1);
      if (/[a-zA-Z]/.test(lastChar) && /^\d+$/.test(leading)) {
        formatted = `${leading}-${lastChar.toUpperCase()}`;
      } else {
        formatted = clean.toUpperCase();
      }
    } else {
      formatted = clean.toUpperCase();
    }
  }

  return formatted.trim().replace(/[- ]$/, '');
}

interface ProfileFormProps {
  user: User;
  onSubmit: (profile: UserProfile) => void;
  initialData?: UserProfile | null;
  initialIndex?: number;
  onDraftChange?: (profile: UserProfile, index: number) => void;
  savingStatus?: 'idle' | 'saving' | 'saved' | 'error';
  isDraftLoading?: boolean;
}

export function ProfileForm({ 
  user, 
  onSubmit, 
  initialData, 
  initialIndex = 0, 
  onDraftChange, 
  savingStatus,
  isDraftLoading = false 
}: ProfileFormProps) {
  // Navigation Steps Index (0 is Username entry)
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // Form Fields
  const [userName, setUserName] = useState(initialData?.userName || user?.displayName || '');
  const [loanAmount, setLoanAmount] = useState(initialData?.loanAmount || '');
  const [companyName, setCompanyName] = useState(initialData?.companyName || '');
  
  // Corporate Registration ID
  const [companyRegNo, setCompanyRegNo] = useState(() => formatCompanyReg(initialData?.companyRegNo || ''));

  // Director details
  const [isUserDirector, setIsUserDirector] = useState<boolean | undefined>(
    initialData?.isUserDirector !== undefined ? initialData.isUserDirector : undefined
  );
  const [otherDirectorsCount, setOtherDirectorsCount] = useState<number>(initialData?.otherDirectorsCount || 1);
  const [isBrokerAgent, setIsBrokerAgent] = useState<boolean>(
    initialData?.relationshipType === 'broker_agent' || false
  );
  
  // Dynamic list builders (Directors and Shareholders lists for Brokers)
  const [brokerDirectorCount, setBrokerDirectorCount] = useState<number>(
    initialData?.directorsList?.length || 1
  );
  const [directorsList, setDirectorsList] = useState<Array<{ name: string; icNo: string }>>(
    initialData?.directorsList || [{ name: '', icNo: '' }]
  );

  // Shareholder details
  const [isUserShareholder, setIsUserShareholder] = useState<boolean | undefined>(
    initialData?.isUserShareholder !== undefined ? initialData.isUserShareholder : undefined
  );
  const [userShareholdingPercent, setUserShareholdingPercent] = useState(
    initialData?.userShareholdingPercent || ''
  );
  const [totalPaidUpCapital, setTotalPaidUpCapital] = useState(
    initialData?.totalPaidUpCapital || ''
  );

  // Broker shareholders builder
  const [brokerShareholderCount, setBrokerShareholderCount] = useState<number>(
    initialData?.shareholdersList?.length || 1
  );
  const [shareholdersList, setShareholdersList] = useState<Array<{ name: string; icNo: string; sharesCount: number; percent: string }>>(
    initialData?.shareholdersList || [{ name: '', icNo: '', sharesCount: 10000, percent: '' }]
  );

  // Business Parameters
  const [loanPurpose, setLoanPurpose] = useState(initialData?.loanPurpose || 'Working Capital & Payroll');
  const [collateralType, setCollateralType] = useState<'None' | 'Fixed Deposit' | 'Property'>(
    initialData?.collateralType || 'None'
  );
  const [monthlyTurnover, setMonthlyTurnover] = useState(initialData?.monthlyTurnover || '');
  const [is2025AuditedReady, setIs2025AuditedReady] = useState<boolean>(
    initialData?.is2025AuditedReady !== undefined ? initialData.is2025AuditedReady : true
  );
  const [phone, setPhone] = useState(() => formatPhone(initialData?.phone || ''));

  // Validation Error state
  const [validationError, setValidationError] = useState('');

  // Hydration ref to prevent looping during dynamic load
  const hasHydratedRef = useRef(false);

  // Sync loaded draft / initialData if it becomes available post-mount
  useEffect(() => {
    if (!isDraftLoading && !hasHydratedRef.current) {
      if (initialData) {
        if (initialData.userName !== undefined) setUserName(initialData.userName);
        if (initialData.loanAmount !== undefined) setLoanAmount(initialData.loanAmount);
        if (initialData.companyName !== undefined) setCompanyName(initialData.companyName);
        if (initialData.companyRegNo !== undefined) setCompanyRegNo(formatCompanyReg(initialData.companyRegNo));
        if (initialData.isUserDirector !== undefined) setIsUserDirector(initialData.isUserDirector);
        if (initialData.otherDirectorsCount !== undefined) setOtherDirectorsCount(initialData.otherDirectorsCount);
        setIsBrokerAgent(initialData.relationshipType === 'broker_agent');
        if (initialData.directorsList) {
          setBrokerDirectorCount(initialData.directorsList.length);
          setDirectorsList(initialData.directorsList);
        }
        if (initialData.isUserShareholder !== undefined) setIsUserShareholder(initialData.isUserShareholder);
        if (initialData.userShareholdingPercent !== undefined) setUserShareholdingPercent(initialData.userShareholdingPercent);
        if (initialData.totalPaidUpCapital !== undefined) setTotalPaidUpCapital(initialData.totalPaidUpCapital);
        if (initialData.shareholdersList) {
          setBrokerShareholderCount(initialData.shareholdersList.length);
          setShareholdersList(initialData.shareholdersList);
        }
        if (initialData.loanPurpose !== undefined) setLoanPurpose(initialData.loanPurpose);
        if (initialData.collateralType !== undefined) setCollateralType(initialData.collateralType);
        if (initialData.monthlyTurnover !== undefined) setMonthlyTurnover(initialData.monthlyTurnover);
        if (initialData.is2025AuditedReady !== undefined) setIs2025AuditedReady(initialData.is2025AuditedReady);
        if (initialData.phone !== undefined) setPhone(formatPhone(initialData.phone));
      }
      if (initialIndex !== undefined) {
        setCurrentIndex(initialIndex);
      }
      hasHydratedRef.current = true;
    }
  }, [initialData, initialIndex, isDraftLoading]);

  // Transmit draft change to App periodically
  useEffect(() => {
    if (onDraftChange && hasHydratedRef.current) {
      const draftProfile: UserProfile = {
        companyName: companyName.trim(),
        directorCount: isUserDirector ? (otherDirectorsCount + 1) : (isBrokerAgent ? directorsList.length : 1),
        phone: phone.trim(),
        loanAmount,
        loanPurpose,
        collateralType,
        monthlyTurnover,
        is2025AuditedReady,
        userName: userName.trim(),
        companyRegNo: companyRegNo.trim(),
        isUserDirector,
        otherDirectorsCount,
        isUserShareholder,
        userShareholdingPercent: isUserShareholder ? userShareholdingPercent : '0',
        totalPaidUpCapital,
        relationshipType: isBrokerAgent ? 'broker_agent' : 'direct',
        directorsList: isBrokerAgent ? directorsList : undefined,
        shareholdersList: isBrokerAgent ? shareholdersList : undefined,
      };
      onDraftChange(draftProfile, currentIndex);
    }
  }, [
    userName,
    loanAmount,
    companyName,
    companyRegNo,
    isUserDirector,
    otherDirectorsCount,
    isBrokerAgent,
    JSON.stringify(directorsList),
    isUserShareholder,
    userShareholdingPercent,
    totalPaidUpCapital,
    JSON.stringify(shareholdersList),
    loanPurpose,
    collateralType,
    monthlyTurnover,
    is2025AuditedReady,
    phone,
    currentIndex,
  ]);

  // Auto handle director lists sizes adjustments
  const handleDirectorCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(20, count));
    setBrokerDirectorCount(validCount);
    setDirectorsList((prev) => {
      const arr = [...prev];
      if (validCount > arr.length) {
        while (arr.length < validCount) {
          arr.push({ name: '', icNo: '' });
        }
      } else {
        arr.splice(validCount);
      }
      return arr;
    });
  };

  // Auto handle broker shareholder lists adjustments
  const handleShareholderCountChange = (count: number) => {
    const validCount = Math.max(1, Math.min(20, count));
    setBrokerShareholderCount(validCount);
    setShareholdersList((prev) => {
      const arr = [...prev];
      if (validCount > arr.length) {
        while (arr.length < validCount) {
          arr.push({ name: '', icNo: '', sharesCount: 10000, percent: '' });
        }
      } else {
        arr.splice(validCount);
      }
      return arr;
    });
  };

  // Auto-calculate broker holding percentages based on Shares of each shareholder and Total Paid-up capital shares
  useEffect(() => {
    const paidUpNum = Number(totalPaidUpCapital);
    if (!paidUpNum || paidUpNum <= 0) return;

    setShareholdersList((prev) =>
      prev.map((sh) => {
        const percentVal = ((sh.sharesCount / paidUpNum) * 100).toFixed(1);
        return {
          ...sh,
          percent: percentVal,
        };
      })
    );
  }, [totalPaidUpCapital]);

  // Construct active dynamic routing path based on choices
  const getStepsList = (): string[] => {
    const list = ['name', 'welcome', 'amount', 'company', 'is_director'];
    if (isUserDirector === true) {
      list.push('directors_other_count');
      list.push('shareholder_user');
    } else if (isBrokerAgent === true) {
      list.push('directors_list_broker');
    }
    list.push('paid_up');
    if (isBrokerAgent === true) {
      list.push('shareholders_list_broker');
    }
    list.push('purpose');
    list.push('collateral');
    list.push('turnover');
    list.push('audit');
    list.push('phone');
    return list;
  };

  const stepsList = getStepsList();
  const currentStepKey = stepsList[currentIndex];
  const totalStepsCount = stepsList.length - 1; // Exclude transit welcome from indexing counts
  const progressPercent = Math.round(
    (currentIndex / stepsList.length) * 100
  );

  // User enters Company Name and Registration Number manually on the same step

  const handleNext = () => {
    setValidationError('');

    // Field step-by-step validations
    if (currentStepKey === 'name' && !userName.trim()) {
      setValidationError('Please provide your legal name to initialize your credit app.');
      return;
    }
    if (currentStepKey === 'amount' && (!loanAmount || Number(loanAmount) <= 0)) {
      setValidationError('Please specify a valid requested business loan amount.');
      return;
    }
    if (currentStepKey === 'company') {
      if (!companyName.trim()) {
        setValidationError('SSM registered company name is required.');
        return;
      }
      if (!companyRegNo.trim()) {
        setValidationError('Company Registration / SSM Number is required.');
        return;
      }
    }
    if (currentStepKey === 'is_director' && isUserDirector === undefined) {
      setValidationError('Please select whether you are a director of the company.');
      return;
    }
    if (currentStepKey === 'directors_other_count' && (otherDirectorsCount === undefined || otherDirectorsCount < 0)) {
      setValidationError('Please enter other active directors count.');
      return;
    }
    if (currentStepKey === 'directors_list_broker') {
      const incomplete = directorsList.some((dir) => !dir.name.trim() || !dir.icNo.trim());
      if (incomplete) {
        setValidationError('Please complete Name and IC numbers for all listed directors.');
        return;
      }
    }
    if (currentStepKey === 'shareholder_user') {
      if (isUserShareholder === undefined) {
        setValidationError('Please specify if you are a shareholder.');
        return;
      }
      if (isUserShareholder && (!userShareholdingPercent || Number(userShareholdingPercent) <= 0 || Number(userShareholdingPercent) > 100)) {
        setValidationError('Please specify a valid shareholding percentage (1% to 100%).');
        return;
      }
    }
    if (currentStepKey === 'paid_up' && (!totalPaidUpCapital || Number(totalPaidUpCapital) <= 0)) {
      setValidationError('Please enter your total company paid up capital (MYR / SGD / USD value).');
      return;
    }
    if (currentStepKey === 'shareholders_list_broker') {
      const incomplete = shareholdersList.some((sh) => !sh.name.trim() || !sh.icNo.trim() || !sh.sharesCount || sh.sharesCount <= 0);
      if (incomplete) {
        setValidationError('Please complete the Name, IC/Passport and positive share counts for all shareholders.');
        return;
      }
    }
    if (currentStepKey === 'turnover' && (!monthlyTurnover || Number(monthlyTurnover) <= 0)) {
      setValidationError('What is your positive average monthly Turnover trades?');
      return;
    }
    if (currentStepKey === 'phone' && !phone.trim()) {
      setValidationError('A working telephone directory is required for physically authorized validation.');
      return;
    }

    if (currentIndex < stepsList.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Build final compiled structured profile object
      const directorCountVal = isUserDirector
        ? (otherDirectorsCount + 1)
        : (isBrokerAgent ? directorsList.length : 1);

      onSubmit({
        companyName: companyName.trim(),
        directorCount: directorCountVal,
        phone: phone.trim(),
        loanAmount,
        loanPurpose,
        collateralType,
        monthlyTurnover,
        is2025AuditedReady,

        userName: userName.trim(),
        companyRegNo: companyRegNo.trim(),
        isUserDirector,
        otherDirectorsCount,
        isUserShareholder,
        userShareholdingPercent: isUserShareholder ? userShareholdingPercent : '0',
        totalPaidUpCapital,
        relationshipType: isBrokerAgent ? 'broker_agent' : 'direct',
        directorsList: isBrokerAgent ? directorsList : undefined,
        shareholdersList: isBrokerAgent ? shareholdersList : undefined,
      });
    }
  };

  const handleBack = () => {
    setValidationError('');
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <div id="typeform-profile-container" className="flex-1 overflow-y-auto px-5 py-6 flex flex-col justify-between max-w-lg mx-auto w-full">
      {/* Subtle Auto-Save Badge across all steps */}
      {savingStatus && (
        <div className="flex justify-end mb-2 h-4 select-none mr-2">
          {savingStatus === 'saving' && (
            <span className="flex items-center text-emerald-600 font-mono text-[9px] uppercase tracking-wider gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Draft Autosaving...
            </span>
          )}
          {savingStatus === 'saved' && (
            <span className="flex items-center text-emerald-600/80 font-mono text-[9px] uppercase tracking-wider gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Draft Saved
            </span>
          )}
          {savingStatus === 'error' && (
            <span className="flex items-center text-red-500 font-mono text-[9px] uppercase tracking-wider gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping"></span>
              Save Failed
            </span>
          )}
          {savingStatus === 'idle' && (
            <span className="flex items-center text-slate-400 font-mono text-[9px] uppercase tracking-wider gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
              Draft Autosave Idle
            </span>
          )}
        </div>
      )}

      {/* Dynamic Slide Steps Progress */}
      {currentIndex > 0 && currentStepKey !== 'welcome' && (
        <div className="mb-5 shrink-0 select-none">
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-extrabold mb-1.5 uppercase tracking-wider">
            <span>Progress Indicator</span>
            <span>Step {currentIndex} of {stepsList.length - 1} ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden border border-slate-200/20">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Main question box */}
      <div className="flex-1 flex flex-col justify-center my-auto py-3">
        {validationError && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-xs font-semibold mb-4 leading-normal flex items-start space-x-2 animate-fade-in" id="onboarding-validation-error">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <span>{validationError}</span>
          </div>
        )}

        {/* STEP A: Get full name */}
        {currentStepKey === 'name' && (
          <div id="step-userName" className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] bg-slate-100 text-slate-500 font-extrabold px-2.5 py-1 rounded-md uppercase tracking-widest inline-block mb-1">
                Security Checklist Initializing
              </span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">What is your full name?</h3>
              <p className="text-xs text-slate-400">Please provide your legal full name for verified checklist matching.</p>
            </div>
            <div className="pt-2">
              <input
                type="text"
                required
                autoFocus
                placeholder="e.g. Darren Low"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-900 rounded-xl px-4 py-3.5 text-sm font-semibold transition outline-none shadow-xs"
              />
            </div>
          </div>
        )}

        {/* STEP B: Transit greeting Welcome Screen */}
        {currentStepKey === 'welcome' && (
          <div id="step-welcome-transit" className="space-y-6 text-center py-4">
            <div className="mx-auto w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm animate-pulse">
              <UserCheck className="w-7 h-7 animate-bounce" />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Hi, {userName}.
              </h2>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                Before we go through the onboarding process, help us get to know you. We require a few structural values to dynamically optimize your underwriting checklist.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-150 rounded-2xl p-4 text-left space-y-3 shadow-xs">
              <div className="flex items-start space-x-3">
                <FileCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-normal">
                  <strong>Corporate Registration ID</strong> — Enter company details directly to associate corresponding evaluation parameters.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <Users className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-normal">
                  <strong>Broker / Agent Compliant</strong> — Customized flow maps shareholding profiles dynamically for third-party submissions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* STEP C: Loan amount requested */}
        {currentStepKey === 'amount' && (
          <div id="step-loan-amount" className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest font-mono">Question 1</span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">How much loan capital do you want?</h3>
              <p className="text-xs text-slate-400 font-medium">Specify your requested commercial financing principal limit.</p>
            </div>
            <div className="pt-2">
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="number"
                  required
                  min="1"
                  autoFocus
                  placeholder="e.g. 150000"
                  value={loanAmount}
                  onChange={(e) => setLoanAmount(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-900 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold transition outline-none shadow-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP D: Company registration details manually entered */}
        {currentStepKey === 'company' && (
          <div id="step-company-details" className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest font-mono">Question 2</span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">What are your company details?</h3>
              <p className="text-xs text-slate-400">Provide the commercial legal name of your entity and your official company registration details directly below.</p>
            </div>
            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Registered Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Acme Technologies Sdn Bhd"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-900 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold transition outline-none shadow-xs"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest block">Company Registration / SSM Number</label>
                <div className="relative">
                  <FileCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. 2019-01-045239 or 1352450-H"
                    value={companyRegNo}
                    onChange={(e) => setCompanyRegNo(formatCompanyReg(e.target.value))}
                    onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-900 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold transition outline-none shadow-xs"
                  />
                </div>
                
                {/* Real-time Formatting Preview Example */}
                {companyRegNo ? (
                  <div className="flex items-center space-x-1.5 text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100 font-bold select-none">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Formatted Registry SSM ID: {companyRegNo}</span>
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 font-medium px-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                    💡 <strong className="text-slate-500">Live Preview:</strong> Formats to standard Malaysian SSM automatically (e.g. <strong>2019-01-045239</strong> or <strong>1352450-H</strong>).
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP E: "Are you a director of the company?" */}
        {currentStepKey === 'is_director' && (
          <div id="step-relationship-director" className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest font-mono">Question 3</span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Are you a director of the company?</h3>
              <p className="text-xs text-slate-400 font-medium">In Singapore & Malaysia, underwriting signatures differ for direct executives versus intermediaries.</p>
            </div>
            <div className="pt-2 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setIsUserDirector(true);
                  setIsBrokerAgent(false);
                  setValidationError('');
                }}
                className={`w-full p-4 rounded-xl border text-left flex items-start space-x-3 cursor-pointer transition-all ${
                  isUserDirector === true
                    ? 'border-emerald-600 bg-emerald-50/10 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  {isUserDirector === true && <div className="w-3 h-3 bg-emerald-600 rounded-full" />}
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-800">Yes, I am a company Director</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5">I am listed as a managing director inside the registered SSM file.</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsUserDirector(false);
                  setIsBrokerAgent(true);
                  setValidationError('');
                }}
                className={`w-full p-4 rounded-xl border text-left flex items-start space-x-3 cursor-pointer transition-all ${
                  isUserDirector === false
                    ? 'border-emerald-600 bg-emerald-50/10 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="w-5 h-5 rounded-full border border-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  {isUserDirector === false && <div className="w-3 h-3 bg-emerald-600 rounded-full" />}
                </div>
                <div>
                  <span className="block text-xs font-bold text-slate-800">No, I am not a Director</span>
                  <span className="block text-[10px] text-slate-400 mt-0.5 font-medium">I am acting as an authorized Broker / Agent submitting on behalf.</span>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* STEP F: "how many other directors" or "Listed directors Name & IC" */}
        {currentStepKey === 'directors_other_count' && (
          <div id="step-directors-other" className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest font-mono">Question 3.1</span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">How many other directors are there?</h3>
              <p className="text-xs text-slate-400">Tell us how many directors *other than you* are listed in SSM.</p>
            </div>
            <div className="pt-2 space-y-3">
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="number"
                  required
                  min="0"
                  max="19"
                  autoFocus
                  placeholder="e.g. 1"
                  value={otherDirectorsCount}
                  onChange={(e) => setOtherDirectorsCount(Math.max(0, Number(e.target.value)))}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-900 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold transition outline-none shadow-xs"
                />
              </div>
              <div className="p-3.5 bg-indigo-50 border border-indigo-150 rounded-xl text-[10px] text-indigo-800 font-medium leading-relaxed">
                ℹ️ Summary: Total of <strong>{otherDirectorsCount + 1}</strong> SSM listed directors (including you). You will need to upload IC Copies and CTOS profiles for all {otherDirectorsCount + 1} directors.
              </div>
            </div>
          </div>
        )}

        {/* STEP G: Directors list for Brokers (Name & IC list builder) */}
        {currentStepKey === 'directors_list_broker' && (
          <div id="step-broker-directors-list" className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest font-mono">Question 3.1</span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight"> SSM listed Directors</h3>
              <p className="text-xs text-slate-400">Since you are acting as an agent, please tell us how many directors represent this company & list their full names & IC IDs.</p>
            </div>
            <div className="space-y-3">
              {/* Select count */}
              <div className="flex items-center space-x-3 bg-slate-50 border border-slate-150 p-2.5 rounded-xl justify-between">
                <span className="text-xs font-bold text-slate-600 select-none">Number of Directors:</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={brokerDirectorCount}
                  onChange={(e) => handleDirectorCountChange(Number(e.target.value))}
                  className="w-20 bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-xs font-extrabold transition text-center select-all"
                />
              </div>

              {/* Grid lists of Director Inputs */}
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 pb-1">
                {directorsList.map((dir, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wide">
                      Director #{idx + 1}
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Full Director Name"
                        value={dir.name}
                        onChange={(e) => {
                          const updated = [...directorsList];
                          updated[idx].name = e.target.value;
                          setDirectorsList(updated);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold p-2 focus:bg-white focus:border-emerald-500 transition outline-none"
                      />
                      <input
                        type="text"
                        placeholder="IC / ID Card Number"
                        value={dir.icNo}
                        onChange={(e) => {
                          const updated = [...directorsList];
                          updated[idx].icNo = e.target.value;
                          setDirectorsList(updated);
                        }}
                        className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold p-2 focus:bg-white focus:border-emerald-500 transition outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP H: Are user shareholder of company? (Only if User is Director) */}
        {currentStepKey === 'shareholder_user' && (
          <div id="step-user-shareholding" className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest font-mono">Question 4</span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Are you a shareholder of the company?</h3>
              <p className="text-xs text-slate-400">Identify if you hold a registered equity ownership share block.</p>
            </div>
            <div className="pt-2 space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsUserShareholder(true);
                    setValidationError('');
                  }}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition ${
                    isUserShareholder === true
                      ? 'border-emerald-600 bg-emerald-50/10 font-bold text-emerald-950'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className="text-xs font-bold">Yes</span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">I hold equity shares</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsUserShareholder(false);
                    setUserShareholdingPercent('');
                    setValidationError('');
                  }}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center cursor-pointer transition ${
                    isUserShareholder === false
                      ? 'border-emerald-600 bg-emerald-50/10 font-bold text-emerald-950'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                  }`}
                >
                  <span className="text-xs font-bold">No</span>
                  <span className="text-[10px] text-slate-400 font-medium mt-0.5">Non-shareholder director</span>
                </button>
              </div>

              {isUserShareholder === true && (
                <div className="pt-2 space-y-1 animate-fade-in">
                  <label className="text-[11px] font-bold text-slate-500">Your Shareholding Percentage (%)</label>
                  <div className="relative">
                    <Percent className="absolute left-3 py-1 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      autoFocus
                      placeholder="e.g. 35"
                      value={userShareholdingPercent}
                      onChange={(e) => setUserShareholdingPercent(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-900 rounded-xl pl-9 pr-4 py-2.5 text-xs font-bold transition outline-none"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP I: Total Paid-up share capital */}
        {currentStepKey === 'paid_up' && (
          <div id="step-paidup-shares" className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest font-mono">Question 5</span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">What is the total paid-up share capital?</h3>
              <p className="text-xs text-slate-400">Provide the total subscribed paid up equity capital of the company.</p>
            </div>
            <div className="pt-2">
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="number"
                  required
                  min="1"
                  autoFocus
                  placeholder="e.g. 500000"
                  value={totalPaidUpCapital}
                  onChange={(e) => setTotalPaidUpCapital(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-900 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold transition outline-none shadow-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP J: Broker Shareholders list (Name, IC, Shares count, Auto % holding) */}
        {currentStepKey === 'shareholders_list_broker' && (
          <div id="step-broker-shareholders-list" className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest font-mono">Question 6</span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">SSM listed Shareholders</h3>
              <p className="text-xs text-slate-400">List all corporate shareholders, their IC/Passport IDs, share blocks, and ownership percent will compute automatically.</p>
            </div>
            <div className="space-y-3">
              {/* Select count */}
              <div className="flex items-center space-x-3 bg-slate-50 border border-slate-150 p-2.5 rounded-xl justify-between">
                <span className="text-xs font-bold text-slate-600 select-none">Number of Shareholders:</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={brokerShareholderCount}
                  onChange={(e) => handleShareholderCountChange(Number(e.target.value))}
                  className="w-20 bg-white border border-slate-200 focus:border-emerald-500 rounded-lg px-2.5 py-1 text-xs font-extrabold transition text-center select-all"
                />
              </div>

              {/* Dynamic list */}
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1 pb-1">
                {shareholdersList.map((sh, idx) => {
                  const calculatedPercent = totalPaidUpCapital && Number(totalPaidUpCapital) > 0
                    ? ((sh.sharesCount / Number(totalPaidUpCapital)) * 100).toFixed(1)
                    : 'N/A';

                  return (
                    <div key={idx} className="p-3 bg-white border border-slate-200 rounded-xl space-y-2.5 shadow-2xs">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] bg-slate-100 text-slate-500 font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wide">
                          Shareholder #{idx + 1}
                        </span>
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-extrabold">
                          Holding: {calculatedPercent}% (Auto)
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-1.5Col">
                        <input
                          type="text"
                          required
                          placeholder="Full Name"
                          value={sh.name}
                          onChange={(e) => {
                            const updated = [...shareholdersList];
                            updated[idx].name = e.target.value;
                            setShareholdersList(updated);
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold p-1.5 focus:bg-white focus:border-emerald-500 outline-none transition"
                        />
                        <input
                          type="text"
                          required
                          placeholder="IC/Passport"
                          value={sh.icNo}
                          onChange={(e) => {
                            const updated = [...shareholdersList];
                            updated[idx].icNo = e.target.value;
                            setShareholdersList(updated);
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold p-1.5 focus:bg-white focus:border-emerald-500 outline-none transition"
                        />
                        <input
                          type="number"
                          required
                          placeholder="No. of Shares"
                          value={sh.sharesCount}
                          onChange={(e) => {
                            const updated = [...shareholdersList];
                            updated[idx].sharesCount = Math.max(1, Number(e.target.value));
                            setShareholdersList(updated);
                          }}
                          className="bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-semibold p-1.5 focus:bg-white focus:border-emerald-500 outline-none transition"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* STEP K: What is purpose of loan */}
        {currentStepKey === 'purpose' && (
          <div id="step-loan-purpose" className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest font-mono">Question 7</span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Main purpose of loan?</h3>
              <p className="text-xs text-slate-400">Classify the underlying corporate liquidity execution criteria.</p>
            </div>
            <div className="pt-2 grid grid-cols-1 gap-2">
              {[
                'Working Capital & Payroll',
                'Asset & Machinery Procurement',
                'Office & Facility Expansion',
                'Debt Consolidation & Restructuring',
                'Inventory Stock Acquisition',
              ].map((purpose) => (
                <button
                  key={purpose}
                  type="button"
                  onClick={() => {
                    setLoanPurpose(purpose);
                    setValidationError('');
                    handleNext();
                  }}
                  className={`p-3 rounded-xl border flex items-center justify-between text-left cursor-pointer transition-all ${
                    loanPurpose === purpose
                      ? 'border-emerald-600 bg-emerald-50/10 text-emerald-950 font-bold'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                  }`}
                >
                  <span className="text-xs">{purpose}</span>
                  {loanPurpose === purpose && <Award className="w-4 h-4 text-emerald-600 shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP L: Collateral details option */}
        {currentStepKey === 'collateral' && (
          <div id="step-collateral-pledges" className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest font-mono">Question 8</span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Primary collateral options</h3>
              <p className="text-xs text-slate-400">Choose your guaranteed asset block to lower corporate risk margins.</p>
            </div>
            <div className="pt-2 space-y-2.5">
              {[
                { id: 'None', title: 'Unsecured Corporate Capital', desc: 'Shorter reviews based purely on Trade Bank Ledger Cash Flows.' },
                { id: 'Property', title: 'Real Estate / Property Grant', desc: 'Secure leveraging via residential titles or commercial lands.' },
                { id: 'Fixed Deposit', title: 'Bank Fixed Deposit Pledges', desc: 'Lend secured values backing locked liquid interests.' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCollateralType(opt.id as any)}
                  className={`p-3.5 rounded-xl border text-left flex flex-col w-full cursor-pointer transition-all ${
                    collateralType === opt.id
                      ? 'border-emerald-600 bg-emerald-50/10 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-extrabold text-slate-855 select-none">{opt.title}</span>
                    <input
                      type="radio"
                      name="collateral"
                      checked={collateralType === opt.id}
                      onChange={() => setCollateralType(opt.id as any)}
                      className="accent-emerald-600 pointer-events-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 leading-normal font-medium">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP M: Monthly Turnover */}
        {currentStepKey === 'turnover' && (
          <div id="step-monthly-turnover" className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest font-mono">Question 9</span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Average monthly turnover</h3>
              <p className="text-xs text-slate-400">State your total monthly trades billing or receipt revenue.</p>
            </div>
            <div className="pt-2">
              <div className="relative">
                <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="number"
                  required
                  min="1"
                  autoFocus
                  placeholder="e.g. 100000"
                  value={monthlyTurnover}
                  onChange={(e) => setMonthlyTurnover(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-900 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold transition outline-none shadow-xs"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP N: Is Audited completed */}
        {currentStepKey === 'audit' && (
          <div id="step-audit-level" className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest font-mono">Question 10</span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Are your FY2025 audited reports prepared?</h3>
              <p className="text-xs text-slate-400 font-medium">Verify if your accountants have signed final financial audit reports.</p>
            </div>
            <div className="pt-2 space-y-2.5">
              {[
                { val: true, title: 'Yes, fully ready & signed', desc: 'Perfect. We will request Balance Sheets and P&L for FY 2025.' },
                { val: false, title: 'Not ready yet (interim management accounts)', desc: 'No problem. Upload draft monthly management accounts in their place.' },
              ].map((opt) => (
                <button
                  key={opt.title}
                  type="button"
                  onClick={() => setIs2025AuditedReady(opt.val)}
                  className={`p-3.5 rounded-xl border text-left flex flex-col w-full cursor-pointer transition-all ${
                    is2025AuditedReady === opt.val
                      ? 'border-emerald-600 bg-emerald-50/10 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-slate-800">{opt.title}</span>
                    <input
                      type="radio"
                      name="audit-option"
                      checked={is2025AuditedReady === opt.val}
                      onChange={() => setIs2025AuditedReady(opt.val)}
                      className="accent-emerald-600 pointer-events-none"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 leading-normal font-medium">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP O: Contact phone number */}
        {currentStepKey === 'phone' && (
          <div id="step-contact-phone" className="space-y-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest font-mono">Question 11</span>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Secure telephone credentials</h3>
              <p className="text-xs text-slate-400 font-medium">Underwriters call this number for manual registry verification.</p>
            </div>
            <div className="pt-2 space-y-2">
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="tel"
                  required
                  autoFocus
                  placeholder="e.g. +60 12-345 6789"
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  onKeyDown={(e) => e.key === 'Enter' && handleNext()}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white text-slate-900 rounded-xl pl-10 pr-4 py-3.5 text-sm font-semibold transition outline-none shadow-xs"
                />
              </div>

              {/* Real-time Formatting Preview Example */}
              {phone ? (
                <div className="flex items-center space-x-1.5 text-[10px] text-emerald-800 bg-emerald-50 px-2.5 py-1.5 rounded-xl border border-emerald-100 font-bold select-none">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Standardized Phone ID: {phone}</span>
                </div>
              ) : (
                <div className="text-[10px] text-slate-400 font-medium px-1 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                  💡 <strong className="text-slate-500">Live Preview:</strong> Formats to Malaysian tel standard automatically (e.g. <strong>+60 12-345 6789</strong> or <strong>+60 11-1234 5678</strong>).
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Primary Action bar control */}
      <div className="flex items-center space-x-3 mt-6 shrink-0 select-none">
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={handleBack}
            className="flex-1 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold rounded-xl text-xs py-3.5 flex items-center justify-center space-x-1 cursor-pointer transition shadow-2xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleNext}
          className={`${currentIndex === 0 ? 'w-full' : 'flex-[2]'} bg-slate-900 hover:bg-slate-850 text-white font-extrabold rounded-xl text-xs py-3.5 flex items-center justify-center space-x-1 cursor-pointer transition shadow-md`}
        >
          <span>
            {currentStepKey === 'welcome'
              ? "Let's Begin"
              : currentIndex === stepsList.length - 1
              ? 'Compile Checklist Requirements'
              : 'Next Question'}
          </span>
          <ChevronRight className="w-4 h-4 text-emerald-400 animate-pulse shrink-0" />
        </button>
      </div>
    </div>
  );
}
