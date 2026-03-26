import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUserFromHeader } from "@/lib/auth";

export async function GET(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const exams = await prisma.exam.findMany({
    where: { userId: authUser.userId },
    orderBy: { examDate: "asc" },
  });

  return NextResponse.json({ exams });
}

export async function POST(request: Request) {
  const authUser = getAuthUserFromHeader(request);
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, subject, examDate, difficulty } = await request.json();
  if (!title || !subject || !examDate) {
    return NextResponse.json({ error: "Title, subject, and exam date required" }, { status: 400 });
  }

  const exam = await prisma.exam.create({
    data: {
      userId: authUser.userId,
      title,
      subject,
      examDate,
      difficulty: Math.max(1, Math.min(5, difficulty || 3)),
    },
  });

  return NextResponse.json({ exam }, { status: 201 });
}
