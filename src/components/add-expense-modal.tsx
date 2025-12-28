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

type Project = {
  id: string;
  name: string;
};

type AddExpenseModalProps = {
  isOpen: boolean;
  onClose: () => void;
  categories?: Category[];
  bankAccounts?: BankAccount[];
  projects?: Project[];
};

export default function AddExpenseModal({
  isOpen,
  onClose,
  categories = [],
  bankAccounts = [],
  projects = [],
}: AddExpenseModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");

  // Project/Tag state
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [showNewTagInput, setShowNewTagInput] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [localProjects, setLocalProjects] = useState<Project[]>(projects);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Update local projects when props change (compare by content to avoid infinite loops)
  useEffect(() => {
    const projectsJson = JSON.stringify(projects);
    const localJson = JSON.stringify(localProjects);
    if (projectsJson !== localJson) {
      setLocalProjects(projects);
    }
  }, [projects, localProjects]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setShowDatePicker(false);
      setCategoryId("");
      setBankAccountId("");
      setSelectedProjectId("");
      setShowNewTagInput(false);
      setNewTagName("");
      setError("");
    }
  }, [isOpen]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    try {
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTagName.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setLocalProjects([...localProjects, data.project]);
        setSelectedProjectId(data.project.id);
        setShowNewTagInput(false);
        setNewTagName("");
      }
    } catch (err) {
      console.error("Failed to create tag:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      // Determine type based on project selection
      const type = selectedProjectId ? "PROJECT" : "LIFESTYLE";

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          amount: parseFloat(amount),
          type,
          categoryId: categoryId || undefined,
          bankAccountId: bankAccountId || undefined,
          projectId: selectedProjectId || undefined,
          date,
        }),
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

  const isToday = date === new Date().toISOString().split("T")[0];

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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              What did you buy?
            </label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Groceries, Coffee, Netflix"
              required
              className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070f3] focus:border-transparent"
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              How much?
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">€</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0070f3] focus:border-transparent"
              />
            </div>
          </div>

          {/* Date - defaults to today, expandable */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-medium text-slate-700">Date</label>
              <button
                type="button"
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="text-sm text-[#0070f3] hover:underline"
              >
                {isToday ? "Today" : new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                {!showDatePicker && " (change)"}
              </button>
            </div>
            {showDatePicker && (
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
              />
            )}
          </div>

          {/* Project Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tag (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {/* No tag option */}
              <button
                type="button"
                onClick={() => setSelectedProjectId("")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  !selectedProjectId
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                No tag
              </button>

              {/* Existing project tags */}
              {localProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedProjectId(project.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedProjectId === project.id
                      ? "bg-amber-500 text-white"
                      : "bg-amber-100 text-amber-700 hover:bg-amber-200"
                  }`}
                >
                  {project.name}
                </button>
              ))}

              {/* Add new tag button */}
              {!showNewTagInput && (
                <button
                  type="button"
                  onClick={() => setShowNewTagInput(true)}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New
                </button>
              )}
            </div>

            {/* New tag input */}
            {showNewTagInput && (
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="Tag name (e.g., Casa, Wedding)"
                  className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTag();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="px-3 py-2 rounded-lg bg-[#0070f3] text-white text-sm font-medium hover:bg-[#0060df] disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewTagInput(false);
                    setNewTagName("");
                  }}
                  className="px-3 py-2 rounded-lg text-slate-500 hover:text-slate-700"
                >
                  Cancel
                </button>
              </div>
            )}

            {selectedProjectId && (
              <p className="mt-2 text-xs text-amber-600">
                This expense will be tagged to the project
              </p>
            )}
          </div>

          {/* Optional: Category & Bank (collapsible) */}
          <details className="group">
            <summary className="text-sm text-slate-500 cursor-pointer hover:text-slate-700">
              More options
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
                >
                  <option value="">Auto</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              {bankAccounts.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Bank Account
                  </label>
                  <select
                    value={bankAccountId}
                    onChange={(e) => setBankAccountId(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
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
          </details>

          {/* Footer */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name || !amount}
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
