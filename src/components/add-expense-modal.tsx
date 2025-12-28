"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
};

type BankAccount = {
  id: string;
  name: string;
};

type AddExpenseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  categories?: Category[];
  bankAccounts?: BankAccount[];
};

export default function AddExpenseModal({
  isOpen,
  onClose,
  categories = [],
  bankAccounts = [],
}: AddExpenseModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Quick-add mode
  const [quickAdd, setQuickAdd] = useState("");

  // Manual mode
  const [isManualMode, setIsManualMode] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"LIFESTYLE" | "SURVIVAL_FIXED" | "SURVIVAL_VARIABLE" | "PROJECT">("LIFESTYLE");
  const [categoryId, setCategoryId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setQuickAdd("");
      setName("");
      setAmount("");
      setType("LIFESTYLE");
      setCategoryId("");
      setBankAccountId("");
      setDate(new Date().toISOString().split("T")[0]);
      setError("");
      setIsManualMode(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const body = isManualMode
        ? { name, amount: parseFloat(amount), type, categoryId, bankAccountId, date }
        : { quickAdd };

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to add expense");
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">
            Add Expense
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          {!isManualMode ? (
            /* Quick-add mode */
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Quick Add
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={quickAdd}
                  onChange={(e) => setQuickAdd(e.target.value)}
                  placeholder='e.g., "mcd 12.50" or "uber 8€ millennium"'
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070f3] focus:border-transparent text-lg"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Format: name amount [bank account]
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsManualMode(true)}
                className="text-sm text-[#0070f3] hover:underline"
              >
                Switch to manual entry →
              </button>
            </div>
          ) : (
            /* Manual mode */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Amount (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as typeof type)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
                  >
                    <option value="LIFESTYLE">Lifestyle</option>
                    <option value="SURVIVAL_FIXED">Living (Fixed)</option>
                    <option value="SURVIVAL_VARIABLE">Living (Variable)</option>
                    <option value="PROJECT">Project</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
                  >
                    <option value="">Auto-detect</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {bankAccounts.length > 0 && (
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Bank Account
                    </label>
                    <select
                      value={bankAccountId}
                      onChange={(e) => setBankAccountId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
                    >
                      <option value="">None</option>
                      {bankAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsManualMode(false)}
                className="text-sm text-[#0070f3] hover:underline"
              >
                ← Switch to quick add
              </button>
            </div>
          )}

          {/* Footer */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || (!isManualMode && !quickAdd) || (isManualMode && (!name || !amount))}
              className="flex-1 rounded-lg bg-[#0070f3] px-4 py-2.5 text-white font-medium hover:bg-[#0060df] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Adding..." : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
