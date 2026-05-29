import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DocumentChecklistItem } from '../types';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  FileCheck2,
  AlertCircle,
  HelpCircle,
  ArrowLeft,
  Send,
  Sparkles,
  Layers,
  FileSpreadsheet,
  Trash2
} from 'lucide-react';

interface DocUploadProps {
  documents: DocumentChecklistItem[];
  onFileSelect: (id: string, file: File | null) => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  submissionProgress: string;
}

export function DocUpload({
  documents,
  onFileSelect,
  onBack,
  onSubmit,
  isSubmitting,
  submissionProgress,
}: DocUploadProps) {
  // Selected category in dropdown
  const [selectedDocId, setSelectedDocId] = useState<string>(documents[0]?.id || '');
  const [dragOver, setDragOver] = useState(false);
  const [wasUploading, setWasUploading] = useState(false);

  // Active document item configuration details
  const activeDoc = documents.find((doc) => doc.id === selectedDocId) || documents[0];

  // Monitor when the current document transitions to uploading
  const isCurrentlyUploading = activeDoc?.status === 'uploading';
  React.useEffect(() => {
    if (isCurrentlyUploading) {
      setWasUploading(true);
    }
  }, [isCurrentlyUploading]);

  // When upload completes successfully, switch to the next missing document
  React.useEffect(() => {
    if (wasUploading && activeDoc && activeDoc.status !== 'uploading') {
      const isUploaded = activeDoc.file !== null || activeDoc.uploadedFileId !== undefined;
      if (isUploaded) {
        setWasUploading(false);
        const nextMissingDoc = documents.find(d => !(d.file !== null || d.uploadedFileId !== undefined));
        if (nextMissingDoc) {
          setSelectedDocId(nextMissingDoc.id);
        }
      }
    }
  }, [activeDoc, wasUploading, documents]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && activeDoc) {
      onFileSelect(activeDoc.id, files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && activeDoc) {
      onFileSelect(activeDoc.id, files[0]);
    }
  };

  // Group checklist categories to render beautiful, ordered sections below
  const categoriesMap: { [key: string]: DocumentChecklistItem[] } = {};
  documents.forEach((doc) => {
    if (!categoriesMap[doc.category]) {
      categoriesMap[doc.category] = [];
    }
    categoriesMap[doc.category].push(doc);
  });

  const totalRequired = documents.filter((d) => d.required).length;
  const totalCompleted = documents.filter((d) => d.required && (d.file !== null || d.uploadedFileId !== undefined)).length;
  const progressPercent = Math.round((totalCompleted / totalRequired) * 100);
  const checklistComplete = totalCompleted === totalRequired;

  return (
    <div id="document-hub-container" className="flex-1 overflow-y-auto px-5 py-6">
      <div className="mb-5">
        <h2 className="text-sm font-extrabold text-[#065F46] uppercase tracking-widest flex items-center">
          <Layers className="w-5 h-5 text-emerald-600 mr-2 shrink-0 animate-bounce" />
          Document Upload Hub
        </h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Select each required section below, drag/drop files, and monitor checklist progress in real-time.
        </p>
      </div>

      {isSubmitting ? (
        <div id="submitting-loader-panel" className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="relative mb-6">
            <div className="w-16 h-16 border-4 border-slate-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <Sparkles className="w-6 h-6 text-emerald-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">Uploading Workspace Data...</h3>
          <p className="text-xs text-slate-500 max-w-xs mt-2.5 leading-relaxed font-semibold">
            {submissionProgress || 'Connecting to Google APIs to append records...'}
          </p>
          <p className="text-[10px] text-amber-600 bg-amber-50 px-3 py-1 border border-amber-100/50 rounded-lg mt-4 font-bold max-w-[280px]">
            Please leave this tab open while raw PDF files and tables serialize.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Uploader main control interface card */}
          {activeDoc && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm space-y-4">
              {/* Dropdown document selection */}
              <div>
                <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">
                  Select Target Document Type
                </label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full bg-white border border-slate-200 focus:border-emerald-500 text-slate-800 rounded-xl px-3 py-3 text-xs font-bold transition outline-none cursor-pointer shadow-xs"
                >
                  {documents
                    .filter((doc) => {
                      const isUploaded = doc.file !== null || doc.uploadedFileId !== undefined;
                      // Keep in dropdown if not uploaded yet, OR if it's the currently selected, active file
                      return !isUploaded || doc.id === selectedDocId;
                    })
                    .map((doc) => {
                      const isUploaded = doc.file !== null || doc.uploadedFileId !== undefined;
                      const isUploading = doc.status === 'uploading';
                      return (
                        <option key={doc.id} value={doc.id}>
                          {isUploading ? '🟡 [Uploading...] ' : (isUploaded ? '🟢 [Saved to Drive] ' : '🔴 [Missing] ')}
                          {doc.name}
                        </option>
                      );
                    })}
                </select>
              </div>

              {/* Dynamic target descriptor */}
              <div className="bg-white border border-slate-100 rounded-xl p-3">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-bold text-slate-800">{activeDoc.name}</span>
                  {activeDoc.required && (
                    <span className="text-[8px] font-extrabold px-1.5 py-0.2 bg-red-50 text-red-500 rounded border border-red-100 uppercase tracking-wider">
                      Required
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                  {activeDoc.description}
                </p>
              </div>

              {/* Upload Drop Zone / Active attachment status */}
              {activeDoc.status === 'uploading' ? (
                <div className="p-5 bg-amber-50/20 border border-dashed border-amber-300 rounded-xl flex flex-col items-center justify-center text-center">
                  <div className="w-6 h-6 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-2"></div>
                  <span className="text-xs font-bold text-amber-900">Uploading Asset...</span>
                  <span className="text-[10px] text-amber-600 mt-0.5 max-w-[250px] leading-relaxed">Pushing this document straight to your designated Google Drive folder.</span>
                </div>
              ) : (activeDoc.file || activeDoc.uploadedFileId) ? (
                <div className="p-3 bg-emerald-50 border border-emerald-110 rounded-xl flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate max-w-[150px] sm:max-w-[180px]">
                        {activeDoc.file ? activeDoc.file.name : activeDoc.uploadedFileName}
                      </p>
                      <p className="text-[9px] text-emerald-700 font-extrabold flex items-center">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 mr-1 shrink-0" />
                        Saved in Google Drive
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => onFileSelect(activeDoc.id, null)}
                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition cursor-pointer shrink-0"
                    title="Remove Attachment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex flex-col items-center justify-center py-6 px-4 border-2 border-dashed rounded-xl cursor-pointer text-center transition-all ${
                    dragOver
                      ? 'border-emerald-600 bg-emerald-50/10'
                      : 'border-slate-300 bg-white hover:border-slate-400'
                  }`}
                >
                  <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-xs font-bold text-slate-800">Choose File or Drop PDF</span>
                  <span className="text-[10px] text-slate-400 mt-0.5 leading-normal">
                    Drag-and-Drop or Browse Device
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          )}

          {/* Real-time Checklist Status Board */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                Checklist Audit Progress ({progressPercent}%)
              </h3>
              <span className="text-[10px] text-slate-500 font-bold">
                {totalCompleted}/{totalRequired} Loaded
              </span>
            </div>

            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-4 border border-slate-200/50">
              <motion.div
                className="bg-emerald-600 h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
            
            <div className="space-y-4">
              {Object.keys(categoriesMap).map((categoryName) => (
                <div key={categoryName} className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
                  {/* Category header strip */}
                  <div className="bg-slate-50/80 border-b border-slate-100 px-3 py-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700 tracking-wide uppercase">
                      {categoryName}
                    </span>
                  </div>

                  {/* Checklist Items in Category */}
                  <div className="bg-white divide-y divide-slate-100">
                    {categoriesMap[categoryName].map((doc) => {
                      const isLoaded = doc.file !== null || doc.uploadedFileId !== undefined;
                      const isUploading = doc.status === 'uploading';
                      const displayName = doc.file ? doc.file.name : doc.uploadedFileName;

                      return (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDocId(doc.id)}
                          className={`p-3 text-left transition relative cursor-pointer flex items-start space-x-3 hover:bg-slate-50/50 ${
                            selectedDocId === doc.id ? 'bg-emerald-50/10 border-l-2 border-l-emerald-600' : ''
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {isUploading ? (
                              <div className="w-4 h-4 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin"></div>
                            ) : isLoaded ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                            ) : (
                              <div className="w-4 h-4 border-2 border-slate-200 rounded-full"></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={`text-xs font-bold block ${isLoaded ? 'text-slate-800 font-bold' : 'text-slate-700 font-medium'}`}>
                              {doc.name}
                            </span>
                            {isUploading ? (
                              <p className="text-[9px] text-amber-600 font-bold truncate mt-0.5 animate-pulse">
                                ⚡ Uploading straight to Google Drive...
                              </p>
                            ) : isLoaded ? (
                              <p className="text-[9px] text-emerald-700 font-bold truncate max-w-[200px] mt-0.5">
                                🟢 Saved: {displayName}
                              </p>
                            ) : (
                              <p className="text-[9px] text-slate-400 truncate mt-0.5 leading-none">
                                Required document missing
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submission Banner with Alert Warning Info */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 flex items-start space-x-3 font-medium">
            <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <div className="text-[10px] text-slate-500 leading-normal">
              <strong>Split Submissions Notice</strong>: All attachments are saved in your local progress cache. When you are ready and have uploaded all required files, proceed to commit them.
            </div>
          </div>

          {/* Primary Operations Actions */}
          <div className="space-y-3 pt-1">
            <button
              onClick={onSubmit}
              disabled={!checklistComplete}
              id="finalize-sub-btn"
              className={`w-full font-bold rounded-xl text-sm py-4 flex items-center justify-center space-x-2 transition cursor-pointer shadow-md ${
                checklistComplete
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700 focus:ring-4 focus:ring-emerald-100'
                  : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
              }`}
            >
              <Send className="w-4 h-4" />
              <span>Submit Commercial Business Profile</span>
            </button>

            <button
              onClick={onBack}
              id="back-to-typeform"
              className="w-full bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 font-semibold rounded-xl text-xs py-3 flex items-center justify-center space-x-1 cursor-pointer transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Onboarding Questions</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
