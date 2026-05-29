import React, { useState } from 'react';
import { Folder, FileText, Check, Database, ExternalLink, Sparkles, Code, Eye, Download } from 'lucide-react';
import { UserProfile, DocumentChecklistItem } from '../types';

interface SandboxSimulatorProps {
  profile: UserProfile;
  checklist: DocumentChecklistItem[];
  submittedRow: string[];
}

export function SandboxSimulator({ profile, checklist, submittedRow }: SandboxSimulatorProps) {
  const [activeTab, setActiveTab] = useState<'drive' | 'sheets'>('drive');
  const [selectedFolder, setSelectedFolder] = useState<'root' | 'company'>('root');
  const [previewFile, setPreviewFile] = useState<DocumentChecklistItem | null>(null);

  // Filter completed documents in sandbox
  const uploadedDocs = checklist.filter((item) => item.status === 'completed' || item.file !== null);

  return (
    <div className="mt-6 border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
      {/* Simulation Header */}
      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between text-white border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-500 animate-pulse shrink-0" />
          <span className="text-[11px] font-extrabold tracking-wider uppercase">Sandbox Workspace Observer</span>
        </div>
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-0.5 rounded-full text-[9px]">
          Simulated Environment
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50">
        <button
          onClick={() => setActiveTab('drive')}
          className={`flex-1 py-3 text-center text-xs font-bold transition flex items-center justify-center space-x-1.5 border-b-2 hover:bg-white/50 cursor-pointer ${
            activeTab === 'drive'
              ? 'border-emerald-600 text-emerald-700 bg-white shadow-[0_2px_0_0_#10b981_inset]'
              : 'border-transparent text-slate-500'
          }`}
        >
          <Folder className="w-3.5 h-3.5" />
          <span>Google Drive Folder</span>
        </button>
        <button
          onClick={() => setActiveTab('sheets')}
          className={`flex-1 py-3 text-center text-xs font-bold transition flex items-center justify-center space-x-1.5 border-b-2 hover:bg-white/50 cursor-pointer ${
            activeTab === 'sheets'
              ? 'border-emerald-600 text-emerald-700 bg-white shadow-[0_2px_0_0_#10b981_inset]'
              : 'border-transparent text-slate-500'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Google Sheet Log</span>
        </button>
      </div>

      {/* Workspace Inner Simulator Content */}
      <div className="p-4 bg-slate-50/50 min-h-[300px]">
        {activeTab === 'drive' ? (
          <div className="space-y-3">
            {/* Drive Search Header mockup */}
            <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs shrink-0 mb-2">
              <span className="text-[10px] text-slate-400 font-extrabold shrink-0 uppercase tracking-wider">Drive Path:</span>
              <div className="flex items-center space-x-1 text-[10px] font-semibold text-slate-600 truncate">
                <span 
                  onClick={() => setSelectedFolder('root')} 
                  className="hover:underline hover:text-emerald-600 cursor-pointer text-slate-500"
                >
                  My Drive
                </span>
                <span>/</span>
                <span 
                  onClick={() => setSelectedFolder('root')} 
                  className="hover:underline hover:text-emerald-600 cursor-pointer text-slate-500"
                >
                  Loan Applications Submissions
                </span>
                {selectedFolder === 'company' && (
                  <>
                    <span>/</span>
                    <span className="text-slate-800 font-bold truncate">
                      {profile.companyName} Submissions
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Folder Views */}
            {selectedFolder === 'root' ? (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100">
                <div className="px-3 py-2 bg-slate-50/40 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                  Active Directory Folders
                </div>
                {/* Simulated Parent directory entry */}
                <div 
                  onClick={() => setSelectedFolder('company')}
                  className="p-3 hover:bg-slate-50/80 transition cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-9 h-9 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 border border-amber-100 shadow-2xs">
                      <Folder className="w-5 h-5 fill-amber-400/20" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        {profile.companyName} [Ref: {new Date().toISOString().split('T')[0]}]
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Contains {uploadedDocs.length} uploaded credential checklist files
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-slate-100 font-extrabold text-slate-500 px-2 py-1 rounded-md uppercase tracking-wide group">
                    Enter Folder →
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <div className="px-3 py-2 bg-slate-50/40 flex items-center justify-between border-b border-slate-100">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Subfolder: {profile.companyName} Files ({uploadedDocs.length})
                  </span>
                  <button 
                    onClick={() => setSelectedFolder('root')}
                    className="text-[10px] text-emerald-600 font-bold hover:underline cursor-pointer"
                  >
                    ← Up to Parent Folder
                  </button>
                </div>

                {uploadedDocs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                    <p className="text-[11px] font-medium">No files uploaded yet in company sandbox folder.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {uploadedDocs.map((item) => {
                      const fileName = item.file ? item.file.name : (item.uploadedFileName || `${item.name}.pdf`);
                      const fileSize = item.file ? `${(item.file.size / 1024 / 1024).toFixed(2)} MB` : '1.45 MB (restored)';
                      return (
                        <div key={item.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                          <div className="flex items-center space-x-3 truncate">
                            <div className="w-8 h-8 bg-red-50 rounded-lg border border-red-100 flex items-center justify-center text-red-600 shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <p className="text-xs font-bold text-slate-800 truncate max-w-[180px] sm:max-w-[220px]">
                                {fileName}
                              </p>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                size: {fileSize} • status: <span className="text-emerald-600 font-extrabold font-mono">OK</span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 shrink-0">
                            {/* Actions bar for mock files */}
                            <button
                              onClick={() => setPreviewFile(item)}
                              className="p-1 px-1.5 border border-slate-200 rounded-md hover:bg-slate-50 transition hover:text-emerald-600 cursor-pointer"
                              title="Viewer Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <a
                              href={item.file ? URL.createObjectURL(item.file) : '#'}
                              download={fileName}
                              onClick={(e) => {
                                if (!item.file) {
                                  e.preventDefault();
                                  alert("This is a simulated cached sandbox file. Original source files not locally attached.");
                                }
                              }}
                              className="p-1 px-1.5 border border-slate-200 rounded-md hover:bg-slate-50 transition hover:text-emerald-600 cursor-pointer text-slate-600"
                              title="Download Asset"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Simulated file viewer dialog modal */}
            {previewFile && (
              <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]" id="doc-preview-modal">
                <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
                  {/* Title Bar */}
                  <div className="bg-slate-900 px-4 py-3 flex items-center justify-between text-white border-b border-slate-800">
                    <span className="text-xs font-bold truncate max-w-[220px]">
                      Preview: {previewFile.file ? previewFile.file.name : previewFile.uploadedFileName}
                    </span>
                    <button
                      onClick={() => setPreviewFile(null)}
                      className="text-slate-400 hover:text-white font-extrabold text-sm border-0 focus:outline-none cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Body mockup sheet */}
                  <div className="p-6 bg-slate-50 flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl border border-red-100 flex items-center justify-center shadow-xs mb-3">
                      <FileText className="w-7 h-7" />
                    </div>
                    
                    <h5 className="text-xs font-extrabold text-slate-800 truncate max-w-xs">{previewFile.name}</h5>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[260px] leading-relaxed">
                      {previewFile.description}
                    </p>

                    {/* Simulation watermark */}
                    <div className="w-full mt-5 p-3 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-left">
                      <p className="text-[11px] font-extrabold flex items-center mb-1 text-emerald-900">
                        <Check className="w-4 h-4 mr-1 text-emerald-600 shrink-0" />
                        Asset Saved in Sandbox Directory
                      </p>
                      <p className="text-[9px] text-emerald-600 leading-normal">
                        This document has been evaluated for financial underwriting parameters.
                      </p>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end space-x-2">
                    <button
                      onClick={() => setPreviewFile(null)}
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs px-4 py-2 cursor-pointer transition"
                    >
                      Close Viewer
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Sheet File Title display mockup */}
            <div className="flex items-center space-x-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs shrink-0 mb-1.5 justify-between">
              <div className="flex items-center space-x-2 truncate">
                <div className="w-4 h-4 bg-emerald-600 text-white flex items-center justify-center rounded-sm text-[8px] font-extrabold select-none">田</div>
                <span className="text-[10px] font-extrabold text-slate-800 truncate">Loan Applications Tracker</span>
              </div>
              <span className="text-[9px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-sm font-bold">Sheet1</span>
            </div>

            {/* Mini spreadsheet table layout mock */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-xs select-none">
              <table className="w-full text-left border-collapse text-[10px] font-semibold text-slate-700">
                <thead>
                  <tr className="bg-slate-50 text-slate-400 text-[8px] uppercase font-bold border-b border-slate-100">
                    <th className="px-1.5 py-1 text-center w-5 border-r border-slate-100 select-none">#</th>
                    <th className="px-3 py-1.5 shrink-0 border-r border-slate-100">Application ID (Col A)</th>
                    <th className="px-3 py-1.5 shrink-0 border-r border-slate-100">Company Name (Col B)</th>
                    <th className="px-3 py-1.5 shrink-0 border-r border-slate-100">Contact Phone (Col D)</th>
                    <th className="px-3 py-1.5 shrink-0 border-r border-slate-100">Loan Amount ($)</th>
                    <th className="px-3 py-1.5 shrink-0 border-r border-slate-100">Loan Purpose</th>
                    <th className="px-3 py-1.5 shrink-0 border-r border-slate-100">Date Submitted</th>
                    <th className="px-3 py-1.5 shrink-0">Folder Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Live Sandbox Added Application Row */}
                  <tr className="bg-emerald-50/20 hover:bg-emerald-50/30 transition text-emerald-900 border-l-2 border-l-emerald-600 font-bold">
                    <td className="px-1.5 py-2.5 text-center font-bold text-[8px] bg-slate-50/50 border-r border-slate-100 text-slate-400">2</td>
                    <td className="px-3 py-2.5 font-mono text-emerald-800 border-r border-slate-100">{submittedRow[0]}</td>
                    <td className="px-3 py-2.5 border-r border-slate-100 truncate max-w-[120px]">{submittedRow[1]}</td>
                    <td className="px-3 py-2.5 border-r border-slate-100">{submittedRow[3]}</td>
                    <td className="px-3 py-2.5 border-r border-slate-100 font-bold text-emerald-700">{submittedRow[4]}</td>
                    <td className="px-3 py-2.5 border-r border-slate-100 truncate max-w-[100px]">{submittedRow[5]}</td>
                    <td className="px-3 py-2.5 border-r border-slate-100">{submittedRow[9]}</td>
                    <td className="px-3 py-2.5 font-mono text-[9px] text-emerald-600 select-all hover:underline truncate max-w-[120px]">{submittedRow[10]}</td>
                  </tr>

                  {/* Prepopulated audit demo historical rows */}
                  <tr className="text-slate-500 bg-slate-50/10">
                    <td className="px-1.5 py-2 text-center font-bold text-[8px] bg-slate-50/50 border-r border-slate-100 text-slate-400">3</td>
                    <td className="px-3 py-2 font-mono text-slate-400 border-r border-slate-100">APP-602931</td>
                    <td className="px-3 py-2 border-r border-slate-100 truncate max-w-[120px]">Alpha Logistics Ltd</td>
                    <td className="px-3 py-2 border-r border-slate-100">+60113291881</td>
                    <td className="px-3 py-2 border-r border-slate-100">$250,500</td>
                    <td className="px-3 py-2 border-r border-slate-100 truncate max-w-[100px]">Asset Expansion</td>
                    <td className="px-3 py-2 border-r border-slate-100">October 14, 2025</td>
                    <td className="px-3 py-2 font-mono text-[8px] text-slate-400 truncate max-w-[120px]">https://drive.google.com/drive/folders/alpha-sub-00a1</td>
                  </tr>
                  <tr className="text-slate-500 bg-slate-50/10">
                    <td className="px-1.5 py-2 text-center font-bold text-[8px] bg-slate-50/50 border-r border-slate-100 text-slate-400">4</td>
                    <td className="px-3 py-2 font-mono text-slate-400 border-r border-slate-100">APP-105524</td>
                    <td className="px-3 py-2 border-r border-slate-100 truncate max-w-[120px]">Symmetry Tech Soft</td>
                    <td className="px-3 py-2 border-r border-slate-100">+60124801123</td>
                    <td className="px-3 py-2 border-r border-slate-100">$45,000</td>
                    <td className="px-3 py-2 border-r border-slate-100 truncate max-w-[100px]">Server Node Purchases</td>
                    <td className="px-3 py-2 border-r border-slate-100">November 20, 2025</td>
                    <td className="px-3 py-2 font-mono text-[8px] text-slate-400 truncate max-w-[120px]">https://drive.google.com/drive/folders/symm-sub-2b1c</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-[10px] text-slate-400 flex items-center justify-between p-1">
              <span>*Highlighted row indicates row recently written in-memory sandbox.</span>
              <span className="font-mono">Total Sheets database row count: 4</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
