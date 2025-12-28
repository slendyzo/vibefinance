"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type UserProfile = {
  name: string;
  email: string;
};

type Stats = {
  totalExpenses: number;
  totalAmount: number;
  totalCategories: number;
  totalProjects: number;
};

export default function SettingsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Delete all expenses state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  // Currency state
  const [currency, setCurrency] = useState("EUR");
  const [currencies] = useState([
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch expenses to get stats
      const expensesRes = await fetch("/api/expenses?limit=10000");
      if (expensesRes.ok) {
        const data = await expensesRes.json();
        setStats({
          totalExpenses: data.total,
          totalAmount: data.expenses.reduce(
            (sum: number, e: { amount: number }) => sum + Number(e.amount),
            0
          ),
          totalCategories: 0,
          totalProjects: 0,
        });
      }

      // Fetch categories count
      const categoriesRes = await fetch("/api/categories");
      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setStats((prev) =>
          prev ? { ...prev, totalCategories: data.categories?.length || 0 } : prev
        );
      }

      // Fetch projects count
      const projectsRes = await fetch("/api/projects");
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setStats((prev) =>
          prev ? { ...prev, totalProjects: data.projects?.length || 0 } : prev
        );
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAllExpenses = async () => {
    if (deleteConfirmText !== "DELETE ALL") {
      setDeleteError("Please type 'DELETE ALL' exactly to confirm");
      return;
    }

    setIsDeleting(true);
    setDeleteError("");
    setDeleteSuccess("");

    try {
      const response = await fetch("/api/expenses/bulk", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: deleteConfirmText }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete expenses");
      }

      setDeleteSuccess(`Successfully deleted ${data.deleted} expenses`);
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
      fetchData(); // Refresh stats
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage your account and preferences
        </p>
      </div>

      {/* Account Stats */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Account Overview</h2>
        {isLoading ? (
          <div className="text-slate-500">Loading...</div>
        ) : stats ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-900">{stats.totalExpenses}</div>
              <div className="text-sm text-slate-500">Total Expenses</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-900">
                €{stats.totalAmount.toFixed(2)}
              </div>
              <div className="text-sm text-slate-500">Total Spent</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-900">{stats.totalCategories}</div>
              <div className="text-sm text-slate-500">Categories</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="text-2xl font-bold text-slate-900">{stats.totalProjects}</div>
              <div className="text-sm text-slate-500">Projects</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Preferences */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Preferences</h2>
        <div className="space-y-4">
          {/* Currency */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">Currency</div>
              <div className="text-sm text-slate-500">Choose your default currency</div>
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0070f3]"
            >
              {currencies.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Theme (placeholder) */}
          <div className="flex items-center justify-between opacity-50">
            <div>
              <div className="font-medium text-slate-900">Color Theme</div>
              <div className="text-sm text-slate-500">Light mode (more themes coming soon)</div>
            </div>
            <div className="flex gap-2">
              <button className="w-8 h-8 rounded-full bg-white border-2 border-[#0070f3]" />
              <button className="w-8 h-8 rounded-full bg-slate-800 opacity-30" disabled />
            </div>
          </div>
        </div>
      </div>

      {/* Coming Soon Features */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Coming Soon</h2>
        <div className="space-y-3 text-slate-500 text-sm">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Family/Group workspaces - Share expenses with family members</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>Profile picture - Customize your account appearance</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span>Change email & password - Update your credentials</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Privacy options - Control your data visibility</span>
          </div>
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export data - Download your expenses as CSV/Excel</span>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-red-200">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>

        {deleteSuccess && (
          <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
            {deleteSuccess}
          </div>
        )}

        {/* Delete All Expenses */}
        <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
          <div>
            <div className="font-medium text-slate-900">Delete All Expenses</div>
            <div className="text-sm text-slate-500">
              Permanently remove all {stats?.totalExpenses || 0} expenses from your account
            </div>
          </div>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Delete All
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowDeleteConfirm(false);
              setDeleteConfirmText("");
              setDeleteError("");
            }}
          />
          <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 bg-red-50">
              <h2 className="text-lg font-semibold text-red-600">
                Delete All Expenses?
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-slate-600">
                This action <strong>cannot be undone</strong>. This will permanently delete{" "}
                <strong>{stats?.totalExpenses || 0} expenses</strong> from your account.
              </div>

              {deleteError && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                  {deleteError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Type <span className="font-mono bg-slate-100 px-1">DELETE ALL</span> to confirm
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE ALL"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                    setDeleteError("");
                  }}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAllExpenses}
                  disabled={isDeleting || deleteConfirmText !== "DELETE ALL"}
                  className="flex-1 rounded-lg bg-red-500 px-4 py-2.5 text-white font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? "Deleting..." : "Delete All Expenses"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
