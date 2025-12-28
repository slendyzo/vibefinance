"use client";

import { useState, useEffect } from "react";

type Category = {
  id: string;
  name: string;
};

type Template = {
  id: string;
  name: string;
  type: string;
  amount: number | null;
  currency: string;
  interval: string;
  dayOfMonth: number | null;
  isActive: boolean;
  lastGenerated: string | null;
  nextDue: string | null;
  category: Category | null;
  _count: { expenses: number };
};

const EXPENSE_TYPES = [
  { value: "SURVIVAL_FIXED", label: "Survival (Fixed)", color: "bg-blue-100 text-blue-800" },
  { value: "SURVIVAL_VARIABLE", label: "Survival (Variable)", color: "bg-cyan-100 text-cyan-800" },
  { value: "LIFESTYLE", label: "Lifestyle", color: "bg-purple-100 text-purple-800" },
  { value: "PROJECT", label: "Project", color: "bg-amber-100 text-amber-800" },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function RecurringTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Generate modal state
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateMonth, setGenerateMonth] = useState(new Date().getMonth());
  const [generateYear, setGenerateYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "SURVIVAL_FIXED",
    amount: "",
    currency: "EUR",
    dayOfMonth: "1",
    categoryId: "",
  });

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch("/api/recurring-templates");
      const data = await response.json();
      if (data.templates) {
        setTemplates(data.templates);
      }
    } catch (error) {
      console.error("Failed to fetch templates:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      if (data.categories) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) return;

    try {
      const response = await fetch("/api/recurring-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setFormData({
          name: "",
          type: "SURVIVAL_FIXED",
          amount: "",
          currency: "EUR",
          dayOfMonth: "1",
          categoryId: "",
        });
        setIsCreating(false);
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to create template:", error);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!formData.name.trim()) return;

    try {
      const response = await fetch(`/api/recurring-templates/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        setEditingId(null);
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to update template:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/recurring-templates/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setConfirmDeleteId(null);
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const handleToggleActive = async (template: Template) => {
    try {
      const response = await fetch(`/api/recurring-templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: template.name,
          isActive: !template.isActive,
        }),
      });

      if (response.ok) {
        fetchTemplates();
      }
    } catch (error) {
      console.error("Failed to toggle template:", error);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerateResult(null);

    try {
      const response = await fetch("/api/recurring-templates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: generateMonth,
          year: generateYear,
        }),
      });

      const data = await response.json();
      setGenerateResult(data.message || "Done!");
      fetchTemplates();
    } catch (error) {
      console.error("Failed to generate expenses:", error);
      setGenerateResult("Failed to generate expenses");
    } finally {
      setIsGenerating(false);
    }
  };

  const startEditing = (template: Template) => {
    setFormData({
      name: template.name,
      type: template.type,
      amount: template.amount?.toString() || "",
      currency: template.currency,
      dayOfMonth: template.dayOfMonth?.toString() || "1",
      categoryId: template.category?.id || "",
    });
    setEditingId(template.id);
    setIsCreating(false);
  };

  const startCreating = () => {
    setFormData({
      name: "",
      type: "SURVIVAL_FIXED",
      amount: "",
      currency: "EUR",
      dayOfMonth: "1",
      categoryId: "",
    });
    setIsCreating(true);
    setEditingId(null);
  };

  const getTypeStyle = (type: string) => {
    return EXPENSE_TYPES.find((t) => t.value === type)?.color || "bg-gray-100 text-gray-800";
  };

  const getTypeLabel = (type: string) => {
    return EXPENSE_TYPES.find((t) => t.value === type)?.label || type;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate totals
  const activeTemplates = templates.filter((t) => t.isActive);
  const monthlyTotal = activeTemplates
    .filter((t) => t.amount)
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-64 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Recurring Templates</h1>
          <p className="text-sm text-slate-500 mt-1">
            Set up monthly recurring expenses that can be auto-generated
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowGenerateModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Generate for Month
          </button>
          <button
            onClick={startCreating}
            className="px-4 py-2 bg-[#0070f3] text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Template
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Active Templates</p>
          <p className="text-2xl font-bold text-slate-900">{activeTemplates.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Monthly Total (Fixed)</p>
          <p className="text-2xl font-bold text-slate-900">€{monthlyTotal.toFixed(2)}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Total Templates</p>
          <p className="text-2xl font-bold text-slate-900">{templates.length}</p>
        </div>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">New Template</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Netflix, Rent, Spotify"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {EXPENSE_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount (€)</label>
              <input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Day of Month</label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.dayOfMonth}
                onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleCreate}
              disabled={!formData.name.trim()}
              className="px-4 py-2 bg-[#0070f3] text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Template
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="px-4 py-2 text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Templates List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="font-semibold text-slate-900">Templates ({templates.length})</h2>
        </div>

        {templates.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p>No recurring templates yet</p>
            <p className="text-sm mt-1">Create templates for expenses that happen every month</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {templates.map((template) => (
              <div key={template.id} className={`p-4 ${!template.isActive ? 'opacity-50' : ''}`}>
                {editingId === template.id ? (
                  // Edit Form
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
                      <div className="lg:col-span-2">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <select
                        value={formData.type}
                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        {EXPENSE_TYPES.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="Amount"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={formData.dayOfMonth}
                        onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                      <select
                        value={formData.categoryId}
                        onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">No Category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(template.id)}
                        className="px-3 py-1.5 bg-[#0070f3] text-white text-sm rounded-lg hover:bg-blue-600"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-slate-600 text-sm hover:text-slate-900"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // Display Row
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => handleToggleActive(template)}
                        className={`w-10 h-6 rounded-full transition-colors ${
                          template.isActive ? 'bg-green-500' : 'bg-slate-300'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform mx-1 ${
                          template.isActive ? 'translate-x-4' : ''
                        }`} />
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{template.name}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${getTypeStyle(template.type)}`}>
                            {getTypeLabel(template.type)}
                          </span>
                          {template.category && (
                            <span className="text-xs text-slate-500">
                              {template.category.name}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-500 mt-0.5">
                          Day {template.dayOfMonth || 1} •
                          {template.amount ? ` €${Number(template.amount).toFixed(2)}` : ' Variable amount'} •
                          {template._count.expenses} expenses generated
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm text-slate-500">
                        <div>Last: {formatDate(template.lastGenerated)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startEditing(template)}
                          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {confirmDeleteId === template.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(template.id)}
                              className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(template.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Generate Expenses</h2>
            <p className="text-sm text-slate-500 mb-4">
              Create expense entries from all active templates for a specific month.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Month</label>
                <select
                  value={generateMonth}
                  onChange={(e) => setGenerateMonth(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {MONTHS.map((month, index) => (
                    <option key={index} value={index}>{month}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year</label>
                <input
                  type="number"
                  value={generateYear}
                  onChange={(e) => setGenerateYear(parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {generateResult && (
              <div className={`p-3 rounded-lg mb-4 ${
                generateResult.includes('Failed') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
              }`}>
                {generateResult}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  'Generate Expenses'
                )}
              </button>
              <button
                onClick={() => {
                  setShowGenerateModal(false);
                  setGenerateResult(null);
                }}
                className="px-4 py-2 text-slate-600 hover:text-slate-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
