import { NextResponse } from "next/server";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/db";

// DELETE /api/account - Delete user account and all associated data
export async function DELETE(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { confirmText } = await request.json();

    if (confirmText !== "DELETE MY ACCOUNT") {
      return NextResponse.json(
        { error: "Invalid confirmation text" },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Get user's workspaces (they might be a member of multiple)
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: { workspace: true },
    });

    // Delete all data from workspaces where user is the only member
    for (const membership of memberships) {
      const workspaceId = membership.workspaceId;

      // Check if user is the only member
      const memberCount = await prisma.workspaceMember.count({
        where: { workspaceId },
      });

      if (memberCount === 1) {
        // User is the only member - delete all workspace data
        // Order matters due to foreign key constraints

        // Delete expenses first (they reference categories, projects, bank accounts)
        await prisma.expense.deleteMany({ where: { workspaceId } });

        // Delete incomes
        await prisma.income.deleteMany({ where: { workspaceId } });

        // Delete recurring templates
        await prisma.recurringTemplate.deleteMany({ where: { workspaceId } });

        // Delete import logs
        await prisma.importLog.deleteMany({ where: { workspaceId } });

        // Delete keyword mappings
        await prisma.keywordMapping.deleteMany({ where: { workspaceId } });

        // Delete categories
        await prisma.category.deleteMany({ where: { workspaceId } });

        // Delete projects
        await prisma.project.deleteMany({ where: { workspaceId } });

        // Delete bank accounts
        await prisma.bankAccount.deleteMany({ where: { workspaceId } });

        // Delete workspace membership
        await prisma.workspaceMember.deleteMany({ where: { workspaceId } });

        // Delete the workspace itself
        await prisma.workspace.delete({ where: { id: workspaceId } });
      } else {
        // Other members exist - just remove this user's membership
        await prisma.workspaceMember.delete({
          where: {
            workspaceId_userId: {
              workspaceId,
              userId,
            },
          },
        });
      }
    }

    // Delete user's sessions
    await prisma.session.deleteMany({ where: { userId } });

    // Delete user's accounts (OAuth connections)
    await prisma.account.deleteMany({ where: { userId } });

    // Finally, delete the user
    await prisma.user.delete({ where: { id: userId } });

    // Sign out the user (this will happen client-side after response)
    return NextResponse.json({
      success: true,
      message: "Account deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
