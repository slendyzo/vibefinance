"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import AddExpenseModal from "@/components/add-expense-modal";
import EditExpenseModal from "@/components/edit-expense-modal";

type Expense = {
  id: string;
  name: string;
  amount: number;
  type: "SURVIVAL_FIXED" | "SURVIVAL_VARIABLE" | "LIFESTYLE" | "PROJECT";
  date: string;
  category: { id: string; name: string } | null;
  bankAccount: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
};

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

type GroupedExpenses = {
  monthKey: string;
  monthLabel: string;
  expenses: Expense[];
  total: number;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function ExpensesPage() {
  const router = useRouter();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  // Pagination
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState<number | "all">(50);

  useEffect(() => {
    fetchData();
  }, [page, typeFilter, limit]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (limit !== "all") {
        params.set("limit", limit.toString());
        params.set("offset", (page * limit).toString());
      } else {
        params.set("limit", "10000"); // Large number for "all"
      }
      if (typeFilter) params.set("type", typeFilter);

      const [expensesRes, categoriesRes, accountsRes, projectsRes] = await Promise.all([
        fetch(`/api/expenses?${params}`),
        fetch("/api/categories"),
        fetch("/api/bank-accounts"),
        fetch("/api/projects"),
      ]);

      if (expensesRes.ok) {
        const data = await expensesRes.json();
        setExpenses(data.expenses);
        setTotal(data.total);
      }
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }
      if (accountsRes.ok) {
        const data = await accountsRes.json();
        setBankAccounts(data.bankAccounts || []);
      }
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/expenses?id=${id}`, { method: "DELETE" });
      if (response.ok) {
        setExpenses(expenses.filter((e) => e.id !== id));
        setTotal((prev) => prev - 1);
      }
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
    setDeleteId(null);
  };

  // Sort and filter expenses
  const sortedExpenses = useMemo(() => {
    const filtered = expenses.filter((e) =>
      searchQuery ? e.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
    );

    // Sort based on current sort settings
    return [...filtered].sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
      } else {
        const amountA = Number(a.amount);
        const amountB = Number(b.amount);
        return sortOrder === "desc" ? amountB - amountA : amountA - amountB;
      }
    });
  }, [expenses, searchQuery, sortBy, sortOrder]);

  // Group expenses by month (for grouped view)
  const groupedExpenses = useMemo(() => {
    // Group by month-year
    const groups: Record<string, Expense[]> = {};
    sortedExpenses.forEach((expense) => {
      const date = new Date(expense.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(expense);
    });

    // Convert to array and sort months
    const result: GroupedExpenses[] = Object.entries(groups)
      .map(([monthKey, monthExpenses]) => {
        const [year, month] = monthKey.split("-");
        return {
          monthKey,
          monthLabel: `${MONTHS[parseInt(month)]} ${year}`,
          expenses: monthExpenses, // Already sorted from sortedExpenses
          total: monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
        };
      })
      .sort((a, b) => sortOrder === "desc"
        ? b.monthKey.localeCompare(a.monthKey)
        : a.monthKey.localeCompare(b.monthKey)
      );

    return result;
  }, [sortedExpenses, sortOrder]);

  const typeColors: Record<string, string> = {
    SURVIVAL_FIXED: "bg-blue-100 text-blue-700",
    SURVIVAL_VARIABLE: "bg-cyan-100 text-cyan-700",
    LIFESTYLE: "bg-purple-100 text-purple-700",
    PROJECT: "bg-amber-100 text-amber-700",
  };

  const typeLabels: Record<string, string> = {
    SURVIVAL_FIXED: "Living (Fixed)",
    SURVIVAL_VARIABLE: "Living (Variable)",
    LIFESTYLE: "Lifestyle",
    PROJECT: "Project",
  };

  const totalPages = limit === "all" ? 1 : Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-500 text-sm mt-1">
            {total} total expenses
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#0070f3] text-white px-4 py-2 rounded-lg hover:bg-[#0060df] transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Expense
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search expenses..."
              className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(0);
            }}
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
          >
            <option value="">All Types</option>
            <option value="SURVIVAL_FIXED">Living (Fixed)</option>
            <option value="SURVIVAL_VARIABLE">Living (Variable)</option>
            <option value="LIFESTYLE">Lifestyle</option>
            <option value="PROJECT">Project</option>
          </select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "date" | "amount")}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
            >
              <option value="date">Date</option>
              <option value="amount">Amount</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
              className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"
              title={sortOrder === "desc" ? "Newest/Highest first" : "Oldest/Lowest first"}
            >
              {sortOrder === "desc" ? (
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                </svg>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500">Show:</span>
            <select
              value={limit === "all" ? "all" : limit.toString()}
              onChange={(e) => {
                const val = e.target.value;
                setLimit(val === "all" ? "all" : parseInt(val));
                setPage(0);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="all">All</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Grouped by Month */}
      {isLoading ? (
        <div className="bg-white rounded-xl p-8 text-center text-slate-500 shadow-sm border border-slate-200">
          Loading...
        </div>
      ) : groupedExpenses.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center text-slate-500 shadow-sm border border-slate-200">
          No expenses found
        </div>
      ) : (
        <div className="space-y-6">
          {groupedExpenses.map((group) => (
            <div key={group.monthKey} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              {/* Month Header */}
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{group.monthLabel}</h3>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-500">{group.expenses.length} expenses</span>
                  <span className="font-semibold text-slate-900">€{group.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Expenses Table */}
              <table className="w-full">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="text-left px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="text-right px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {group.expenses.map((expense) => (
                    <tr key={expense.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {new Date(expense.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-900">{expense.name}</div>
                        {expense.project && (
                          <div className="text-xs text-slate-500">{expense.project.name}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full ${typeColors[expense.type]}`}>
                          {typeLabels[expense.type]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {expense.category?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 text-right">
                        €{Number(expense.amount).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => setEditingExpense(expense)}
                            className="text-slate-500 hover:text-slate-700 p-1"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteId(expense.id)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Delete"
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
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {limit !== "all" && totalPages > 1 && (
        <div className="bg-white rounded-xl px-4 py-3 shadow-sm border border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            Showing {page * (limit as number) + 1} to {Math.min((page + 1) * (limit as number), total)} of {total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1 rounded border border-slate-300 text-sm disabled:opacity-50 hover:bg-slate-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1 rounded border border-slate-300 text-sm disabled:opacity-50 hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Delete Expense?</h3>
            <p className="text-slate-600 text-sm mb-4">This action cannot be undone.</p>
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

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          fetchData();
        }}
        categories={categories}
        bankAccounts={bankAccounts}
        projects={projects}
      />

      {/* Edit Expense Modal */}
      <EditExpenseModal
        isOpen={!!editingExpense}
        onClose={() => setEditingExpense(null)}
        expense={editingExpense}
        categories={categories}
        bankAccounts={bankAccounts}
        projects={projects}
        onSave={fetchData}
      />
    </div>
  );
}
