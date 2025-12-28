"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import AddExpenseModal from "@/components/add-expense-modal";

type Expense = {
  id: string;
  name: string;
  date: string;
  type: string;
  amountEur: number;
  categoryName: string;
  projectName: string | null;
  projectId: string | null;
};

type Project = { id: string; name: string };
type Category = { id: string; name: string };
type BankAccount = { id: string; name: string };

type Props = {
  workspaceId: string;
  userName: string;
  initialExpenses: Expense[];
  projects: Project[];
  categories: Category[];
  bankAccounts: BankAccount[];
  initialMonth: number;
  initialYear: number;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

type ViewMode = "month" | "quarter" | "year" | "all";
type TypeFilter = "all" | "living" | "lifestyle" | "project";

export default function DashboardOverview({
  workspaceId,
  userName,
  initialExpenses,
  projects,
  categories,
  bankAccounts,
  initialMonth,
  initialYear,
}: Props) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [viewMode, setViewMode] = useState<ViewMode>("month");
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [selectedQuarter, setSelectedQuarter] = useState(Math.floor(initialMonth / 3) + 1);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Fetch expenses when filters change
  useEffect(() => {
    fetchExpenses();
  }, [viewMode, selectedMonth, selectedYear, selectedQuarter, selectedProjectId]);

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      let startDate: Date;
      let endDate: Date;

      switch (viewMode) {
        case "month":
          startDate = new Date(selectedYear, selectedMonth, 1);
          endDate = new Date(selectedYear, selectedMonth + 1, 0, 23, 59, 59);
          break;
        case "quarter":
          const quarterStartMonth = (selectedQuarter - 1) * 3;
          startDate = new Date(selectedYear, quarterStartMonth, 1);
          endDate = new Date(selectedYear, quarterStartMonth + 3, 0, 23, 59, 59);
          break;
        case "year":
          startDate = new Date(selectedYear, 0, 1);
          endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
          break;
        case "all":
        default:
          startDate = new Date(2000, 0, 1);
          endDate = new Date(2100, 11, 31);
      }

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: "500",
      });

      if (selectedProjectId) {
        params.set("projectId", selectedProjectId);
      }

      const response = await fetch(`/api/expenses?${params}`);
      const data = await response.json();

      if (data.expenses) {
        setExpenses(data.expenses.map((e: {
          id: string;
          name: string;
          date: string;
          type: string;
          amountEur: number;
          category?: { name: string } | null;
          project?: { name: string; id: string } | null;
          projectId?: string | null;
        }) => ({
          id: e.id,
          name: e.name,
          date: e.date,
          type: e.type,
          amountEur: Number(e.amountEur),
          categoryName: e.category?.name || "Uncategorized",
          projectName: e.project?.name || null,
          projectId: e.projectId || null,
        })));
      }
    } catch (error) {
      console.error("Failed to fetch expenses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter expenses by type
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      if (typeFilter === "all") return true;
      if (typeFilter === "living") return e.type === "SURVIVAL_FIXED" || e.type === "SURVIVAL_VARIABLE";
      if (typeFilter === "lifestyle") return e.type === "LIFESTYLE";
      if (typeFilter === "project") return e.type === "PROJECT";
      return true;
    });
  }, [expenses, typeFilter]);

  // Calculate stats (excluding projects from living/lifestyle totals unless viewing project)
  const stats = useMemo(() => {
    const livingExpenses = expenses.filter(
      (e) => (e.type === "SURVIVAL_FIXED" || e.type === "SURVIVAL_VARIABLE") && !e.projectId
    );
    const lifestyleExpenses = expenses.filter(
      (e) => e.type === "LIFESTYLE" && !e.projectId
    );
    const projectExpenses = expenses.filter((e) => e.type === "PROJECT" || e.projectId);

    const livingTotal = livingExpenses.reduce((sum, e) => sum + e.amountEur, 0);
    const lifestyleTotal = lifestyleExpenses.reduce((sum, e) => sum + e.amountEur, 0);
    const projectTotal = projectExpenses.reduce((sum, e) => sum + e.amountEur, 0);
    const totalExcludingProjects = livingTotal + lifestyleTotal;

    return {
      total: totalExcludingProjects,
      living: livingTotal,
      livingFixed: livingExpenses.filter((e) => e.type === "SURVIVAL_FIXED").reduce((sum, e) => sum + e.amountEur, 0),
      livingVariable: livingExpenses.filter((e) => e.type === "SURVIVAL_VARIABLE").reduce((sum, e) => sum + e.amountEur, 0),
      lifestyle: lifestyleTotal,
      projects: projectTotal,
      grandTotal: livingTotal + lifestyleTotal + projectTotal,
    };
  }, [expenses]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const response = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      if (response.ok) {
        setExpenses(expenses.filter((e) => e.id !== id));
        setConfirmDeleteId(null);
      }
    } catch (error) {
      console.error("Failed to delete expense:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const getDateRangeLabel = () => {
    switch (viewMode) {
      case "month":
        return `${MONTHS[selectedMonth]} ${selectedYear}`;
      case "quarter":
        return `Q${selectedQuarter} ${selectedYear}`;
      case "year":
        return `${selectedYear}`;
      case "all":
        return "All Time";
    }
  };

  // Generate year options (last 5 years)
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-6">
      {/* Header with Welcome and Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome, {userName}!</h1>
          <p className="text-slate-500 text-sm">Here&apos;s your financial overview</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-lg bg-[#0070f3] px-4 py-2.5 text-white font-medium hover:bg-[#0060df] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* View Mode Tabs */}
          <div className="flex rounded-lg border border-slate-200 p-1">
            {(["month", "quarter", "year", "all"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  viewMode === mode
                    ? "bg-[#0070f3] text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Date Selectors */}
          {viewMode === "month" && (
            <>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
              >
                {MONTHS.map((month, i) => (
                  <option key={i} value={i}>{month}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </>
          )}

          {viewMode === "quarter" && (
            <>
              <select
                value={selectedQuarter}
                onChange={(e) => setSelectedQuarter(parseInt(e.target.value))}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
              >
                {[1, 2, 3, 4].map((q) => (
                  <option key={q} value={q}>Q{q}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </>
          )}

          {viewMode === "year" && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              {yearOptions.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          )}

          {/* Divider */}
          <div className="h-8 w-px bg-slate-200" />

          {/* Project Filter */}
          <select
            value={selectedProjectId || ""}
            onChange={(e) => setSelectedProjectId(e.target.value || null)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            <option value="">All Projects</option>
            <option value="__none__">No Project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm"
          >
            <option value="all">All Types</option>
            <option value="living">Living Only</option>
            <option value="lifestyle">Lifestyle Only</option>
            <option value="project">Projects Only</option>
          </select>

          {/* Loading indicator */}
          {isLoading && (
            <div className="ml-auto">
              <svg className="w-5 h-5 animate-spin text-[#0070f3]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Monthly Total</p>
          <p className="text-2xl font-bold text-slate-900">€{stats.total.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1">{getDateRangeLabel()} (excl. projects)</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Living Costs</p>
          <p className="text-2xl font-bold text-[#0070f3]">€{stats.living.toFixed(2)}</p>
          <div className="text-xs text-slate-400 mt-1 space-y-0.5">
            <p>Fixed: €{stats.livingFixed.toFixed(2)}</p>
            <p>Variable: €{stats.livingVariable.toFixed(2)}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Lifestyle</p>
          <p className="text-2xl font-bold text-purple-600">€{stats.lifestyle.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1">Daily spending</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-500 mb-1">Projects</p>
          <p className="text-2xl font-bold text-orange-600">€{stats.projects.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1">{projects.length} project(s)</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100">
          <p className="text-sm text-slate-500 mb-1">Grand Total</p>
          <p className="text-2xl font-bold text-slate-900">€{stats.grandTotal.toFixed(2)}</p>
          <p className="text-xs text-slate-400 mt-1">Including projects</p>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-semibold text-slate-900">
            Expenses ({filteredExpenses.length})
          </h3>
          <span className="text-sm text-slate-500">{getDateRangeLabel()}</span>
        </div>

        {filteredExpenses.length > 0 ? (
          <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
            {filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-900 truncate">{expense.name}</p>
                    {expense.projectName && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700">
                        {expense.projectName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-slate-500">
                      {new Date(expense.date).toLocaleDateString("pt-PT")}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span
                      className={`text-sm font-medium ${
                        expense.type === "SURVIVAL_FIXED" ? "text-blue-600" :
                        expense.type === "SURVIVAL_VARIABLE" ? "text-cyan-600" :
                        expense.type === "LIFESTYLE" ? "text-purple-600" :
                        "text-orange-600"
                      }`}
                    >
                      {expense.type === "SURVIVAL_FIXED" ? "Living (Fixed)" :
                       expense.type === "SURVIVAL_VARIABLE" ? "Living (Variable)" :
                       expense.type === "LIFESTYLE" ? "Lifestyle" : "Project"}
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-sm text-slate-400">{expense.categoryName}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="font-semibold text-slate-900 tabular-nums">
                    €{expense.amountEur.toFixed(2)}
                  </p>
                  {confirmDeleteId === expense.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(expense.id)}
                        disabled={deletingId === expense.id}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
                      >
                        {deletingId === expense.id ? "..." : "Delete"}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 py-1 text-sm border border-slate-300 rounded-lg hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(expense.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      aria-label="Delete expense"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-6 py-12 text-center">
            <p className="text-slate-500">No expenses found for this period.</p>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchExpenses();
        }}
        categories={categories}
        bankAccounts={bankAccounts}
      />
    </div>
  );
}
