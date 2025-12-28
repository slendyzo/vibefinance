import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET /api/import-logs/:id - Get details of an import batch
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
      include: { workspace: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    const importLog = await prisma.importLog.findFirst({
      where: {
        id,
        workspaceId: membership.workspaceId,
      },
      include: {
        expenses: {
          select: {
            id: true,
            name: true,
            amount: true,
            amountEur: true,
            currency: true,
            type: true,
            date: true,
            category: { select: { name: true } },
          },
          orderBy: { date: "desc" },
          take: 100, // Limit to first 100 for preview
        },
        _count: {
          select: { expenses: true },
        },
      },
    });

    if (!importLog) {
      return NextResponse.json({ error: "Import log not found" }, { status: 404 });
    }

    return NextResponse.json({
      importLog: {
        id: importLog.id,
        fileName: importLog.fileName,
        fileType: importLog.fileType,
        rowsTotal: importLog.rowsTotal,
        rowsSuccess: importLog.rowsSuccess,
        rowsFailed: importLog.rowsFailed,
        expenseCount: importLog._count.expenses,
        expenses: importLog.expenses,
        createdAt: importLog.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to fetch import log:", error);
    return NextResponse.json(
      { error: "Failed to fetch import log" },
      { status: 500 }
    );
  }
}

// DELETE /api/import-logs/:id - Delete an import batch and all its expenses
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the user's workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
      include: { workspace: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No workspace found" }, { status: 404 });
    }

    // Verify the import log belongs to this workspace
    const importLog = await prisma.importLog.findFirst({
      where: {
        id,
        workspaceId: membership.workspaceId,
      },
      include: {
        _count: {
          select: { expenses: true },
        },
      },
    });

    if (!importLog) {
      return NextResponse.json({ error: "Import log not found" }, { status: 404 });
    }

    const expenseCount = importLog._count.expenses;

    // Delete all expenses linked to this import batch
    await prisma.expense.deleteMany({
      where: { importLogId: id },
    });

    // Delete the import log itself
    await prisma.importLog.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Deleted import batch and ${expenseCount} expenses`,
      deletedExpenses: expenseCount,
    });
  } catch (error) {
    console.error("Failed to delete import log:", error);
    return NextResponse.json(
      { error: "Failed to delete import log" },
      { status: 500 }
    );
  }
}
