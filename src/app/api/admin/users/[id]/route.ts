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

// PUT /api/admin/users/[id] — edit user
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const manager = await requireManager(request);
  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Prevent deputies from editing managers
  if (manager.role === "deputy_manager" && existing.role === "manager") {
    return NextResponse.json(
      { error: "Deputies cannot edit site managers" },
      { status: 403 }
    );
  }

  // Only full managers can set manager/deputy roles
  if (body.role && body.role !== "user" && manager.role !== "manager") {
    return NextResponse.json(
      { error: "Only site managers can assign elevated roles" },
      { status: 403 }
    );
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name;
  if (body.email !== undefined) updateData.email = body.email;
  if (body.timezone !== undefined) updateData.timezone = body.timezone;
  if (body.role !== undefined) {
    const validRoles = ["user", "deputy_manager", "manager"];
    if (validRoles.includes(body.role)) updateData.role = body.role;
  }
  if (body.password) {
    updateData.passwordHash = await hashPassword(body.password);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      timezone: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ user });
}

// DELETE /api/admin/users/[id] — remove user
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const manager = await requireManager(request);
  if (!manager) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Can't delete yourself
  if (id === manager.id) {
    return NextResponse.json(
      { error: "Cannot delete your own account" },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Deputies cannot delete managers
  if (manager.role === "deputy_manager" && existing.role === "manager") {
    return NextResponse.json(
      { error: "Deputies cannot remove site managers" },
      { status: 403 }
    );
  }

  await prisma.user.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
