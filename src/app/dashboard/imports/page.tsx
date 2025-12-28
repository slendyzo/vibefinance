"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type ImportLog = {
  id: string;
  fileName: string;
  fileType: string;
  rowsTotal: number;
  rowsSuccess: number;
  rowsFailed: number;
  expenseCount: number;
  createdAt: string;
};

export default function ImportsPage() {
  const router = useRouter();
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchImportLogs();
  }, []);

  const fetchImportLogs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/import-logs");
      if (response.ok) {
        const data = await response.json();
        setImportLogs(data.importLogs || []);
      }
    } catch (error) {
      console.error("Failed to fetch import logs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (log: ImportLog) => {
    const confirmMsg = `Are you sure you want to delete this import batch?\n\nFile: ${log.fileName}\nExpenses: ${log.expenseCount}\n\nThis will permanently delete all ${log.expenseCount} expenses from this import.`;

    if (!confirm(confirmMsg)) return;

    setDeletingId(log.id);
    try {
      const response = await fetch(`/api/import-logs/${log.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchImportLogs();
      } else {
        alert("Failed to delete import batch");
      }
    } catch (error) {
      console.error("Failed to delete import log:", error);
      alert("Failed to delete import batch");
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Import History</h1>
          <p className="text-sm text-slate-500 mt-1">
            View and manage your imported expense batches
          </p>
        </div>
        <button
          onClick={() => router.push("/dashboard/import")}
          className="px-4 py-2 bg-[#0070f3] text-white rounded-lg hover:bg-[#0060df] transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          New Import
        </button>
      </div>

      {/* Import Logs List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : importLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p>No imports yet</p>
            <button
              onClick={() => router.push("/dashboard/import")}
              className="mt-4 text-[#0070f3] hover:text-[#0060df] font-medium"
            >
              Import your first file
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {importLogs.map((log) => (
              <div key={log.id} className="p-4 flex items-center gap-4 hover:bg-slate-50">
                {/* File Icon */}
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                  log.fileType === "xlsx" ? "bg-green-100" : "bg-blue-100"
                }`}>
                  <svg className={`w-6 h-6 ${log.fileType === "xlsx" ? "text-green-600" : "text-blue-600"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-900 truncate">{log.fileName}</span>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-600 uppercase">
                      {log.fileType}
                    </span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    {formatDate(log.createdAt)}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <div className="font-semibold text-slate-900">{log.expenseCount}</div>
                    <div className="text-slate-500">expenses</div>
                  </div>
                  {log.rowsFailed > 0 && (
                    <div className="text-center">
                      <div className="font-semibold text-amber-600">{log.rowsFailed}</div>
                      <div className="text-slate-500">failed</div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDelete(log)}
                    disabled={deletingId === log.id}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {deletingId === log.id ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete Batch
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-amber-800">
            <p className="font-medium">About Import Batches</p>
            <p className="mt-1">
              Each import creates a batch that groups all expenses from that file.
              Deleting a batch will permanently remove all expenses that were imported together.
              This is useful if you accidentally imported the wrong file or duplicate data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
