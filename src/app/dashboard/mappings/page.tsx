"use client";

import { useState, useEffect } from "react";

type Category = {
  id: string;
  name: string;
};

type KeywordMapping = {
  id: string;
  keyword: string;
  categoryId: string | null;
  expenseType: string | null;
  category: Category | null;
};

export default function KeywordMappingsPage() {
  const [mappings, setMappings] = useState<KeywordMapping[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMapping, setEditingMapping] = useState<KeywordMapping | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form state
  const [keyword, setKeyword] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [expenseType, setExpenseType] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mappingsRes, categoriesRes] = await Promise.all([
        fetch("/api/keyword-mappings"),
        fetch("/api/categories"),
      ]);

      if (mappingsRes.ok) {
        const data = await mappingsRes.json();
        setMappings(data.mappings || []);
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setKeyword("");
    setCategoryId("");
    setExpenseType("");
    setEditingMapping(null);
    setError("");
  };

  const openModal = (mapping?: KeywordMapping) => {
    if (mapping) {
      setEditingMapping(mapping);
      setKeyword(mapping.keyword);
      setCategoryId(mapping.categoryId || "");
      setExpenseType(mapping.expenseType || "");
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    if (!categoryId && !expenseType) {
      setError("Please select a category or expense type");
      setIsSubmitting(false);
      return;
    }

    try {
      const body = {
        keyword,
        categoryId: categoryId || null,
        expenseType: expenseType || null,
      };

      const url = editingMapping ? `/api/keyword-mappings/${editingMapping.id}` : "/api/keyword-mappings";
      const method = editingMapping ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save mapping");
      }

      setIsModalOpen(false);
      resetForm();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/keyword-mappings/${id}`, { method: "DELETE" });
      if (response.ok) {
        setMappings(mappings.filter((m) => m.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete mapping:", error);
    }
    setDeleteId(null);
  };

  const typeLabels: Record<string, string> = {
    SURVIVAL_FIXED: "Living (Fixed)",
    SURVIVAL_VARIABLE: "Living (Variable)",
    LIFESTYLE: "Lifestyle",
    PROJECT: "Project",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Keyword Mappings</h1>
          <p className="text-slate-500 text-sm mt-1">
            Auto-categorize expenses based on keywords (e.g., "gas" → Utilities)
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-[#0070f3] text-white px-4 py-2 rounded-lg hover:bg-[#0060df] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Mapping
        </button>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">How keyword mappings work:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-700">
              <li>When you add an expense with quick-add, the system checks if the name contains any keywords</li>
              <li>If a match is found, it automatically assigns the category and/or expense type</li>
              <li>Example: Create a mapping for "gás" → Category: "Utilities", Type: "Survival (Fixed)"</li>
              <li>Then "Gás Natural" or "gas bill" will auto-categorize</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Mappings Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : mappings.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-slate-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-1">No keyword mappings yet</h3>
            <p className="text-slate-500 text-sm mb-4">Create mappings to auto-categorize your expenses</p>
            <button
              onClick={() => openModal()}
              className="text-[#0070f3] hover:underline text-sm font-medium"
            >
              Create your first mapping
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Keyword</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Category</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-slate-600">Expense Type</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mappings.map((mapping) => (
                <tr key={mapping.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <code className="text-sm bg-slate-100 px-2 py-1 rounded text-slate-800">
                      {mapping.keyword}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {mapping.category?.name || "-"}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {mapping.expenseType ? typeLabels[mapping.expenseType] : "-"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openModal(mapping)}
                        className="text-slate-500 hover:text-slate-700 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteId(mapping.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">
              {editingMapping ? "Edit Mapping" : "New Keyword Mapping"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Keyword</label>
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  required
                  placeholder="e.g., gás, uber, netflix"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Will match case-insensitively (e.g., "gás" matches "Gás", "GAS", "gas")
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
                >
                  <option value="">No category mapping</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expense Type</label>
                <select
                  value={expenseType}
                  onChange={(e) => setExpenseType(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
                >
                  <option value="">No type mapping</option>
                  <option value="SURVIVAL_FIXED">Living (Fixed)</option>
                  <option value="SURVIVAL_VARIABLE">Living (Variable)</option>
                  <option value="LIFESTYLE">Lifestyle</option>
                  <option value="PROJECT">Project</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !keyword}
                  className="flex-1 px-4 py-2 rounded-lg bg-[#0070f3] text-white hover:bg-[#0060df] disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Mapping?</h3>
            <p className="text-slate-600 text-sm mb-4">
              This will not affect existing expenses.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
