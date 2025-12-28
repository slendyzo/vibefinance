import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import DashboardOverview from "./overview-client";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Get user's workspace
  const workspace = await prisma.workspace.findFirst({
    where: {
      members: {
        some: {
          userId: session.user.id,
        },
      },
    },
  });

  if (!workspace) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">No workspace found. Please contact support.</p>
      </div>
    );
  }

  // Get all projects for the filter
  const projects = await prisma.project.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { name: "asc" },
  });

  // Get categories for the modal
  const categories = await prisma.category.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { name: "asc" },
  });

  // Get bank accounts for the modal
  const bankAccounts = await prisma.bankAccount.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { name: "asc" },
  });

  // Get all expenses for initial load (current month)
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const expenses = await prisma.expense.findMany({
    where: {
      workspaceId: workspace.id,
      date: {
        gte: startOfMonth,
        lte: endOfMonth,
      },
    },
    orderBy: { date: "desc" },
    include: {
      category: true,
      project: true,
    },
  });

  return (
    <DashboardOverview
      workspaceId={workspace.id}
      userName={session.user.name || "User"}
      initialExpenses={expenses.map((e) => ({
        id: e.id,
        name: e.name,
        date: e.date.toISOString(),
        type: e.type,
        amountEur: Number(e.amountEur),
        categoryName: e.category?.name || "Uncategorized",
        projectName: e.project?.name || null,
        projectId: e.projectId || null,
      }))}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      bankAccounts={bankAccounts.map((b) => ({ id: b.id, name: b.name }))}
      initialMonth={now.getMonth()}
      initialYear={now.getFullYear()}
    />
  );
}
