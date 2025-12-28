import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

// GET - List bank accounts
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspace = await prisma.workspace.findFirst({
      where: { members: { some: { userId: session.user.id } } },
    });

    if (!workspace) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    const bankAccounts = await prisma.bankAccount.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { expenses: true } },
      },
    });

    return NextResponse.json({ bankAccounts });
  } catch (error) {
    console.error("Get bank accounts error:", error);
    return NextResponse.json({ error: "Failed to fetch bank accounts" }, { status: 500 });
  }
}

// POST - Create bank account
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, bankName, accountType, currency } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const workspace = await prisma.workspace.findFirst({
      where: { members: { some: { userId: session.user.id } } },
    });

    if (!workspace) {
      return NextResponse.json({ error: "No workspace found" }, { status: 400 });
    }

    const bankAccount = await prisma.bankAccount.create({
      data: {
        workspaceId: workspace.id,
        name,
        bankName: bankName || null,
        accountType: accountType || "CHECKING",
        currency: currency || "EUR",
      },
    });

    return NextResponse.json({ bankAccount }, { status: 201 });
  } catch (error) {
    console.error("Create bank account error:", error);
    return NextResponse.json({ error: "Failed to create bank account" }, { status: 500 });
  }
}
