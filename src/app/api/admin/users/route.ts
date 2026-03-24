import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader, hashPassword } from "@/lib/auth";

async function requireManager(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return null;
  const user = await prisma.user.findUnique({
    where: { id: authUser.userId },
    select: { id: true, role: true },
  });
  if (!user || (user.role !== "manager" && user.role !== "deputy_manager")) return null;
  return user;
}

// GET /api/admin/users — list all users
export async function GET(request: Request) {
  const manager = await requireManager(request);
  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      timezone: true,
      createdAt: true,
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}

// POST /api/admin/users — create a new user
export async function POST(request: Request) {
  const manager = await requireManager(request);
  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { email, password, name, role, timezone } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    // Only full managers can create managers/deputies
    if (role === "manager" && manager.role !== "manager") {
      return NextResponse.json(
        { error: "Only site managers can assign manager role" },
        { status: 403 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const validRoles = ["user", "deputy_manager", "manager"];
    const userRole = validRoles.includes(role) ? role : "user";

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: userRole,
        timezone: timezone || "UTC",
      },
    });

    return NextResponse.json(
      {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          timezone: user.timezone,
          createdAt: user.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin create user error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
