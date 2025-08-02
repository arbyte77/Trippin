import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectMongo from "@/lib/mongodb";
import Journey from "@/models/Journey";
import User from "@/models/User";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// DELETE /api/journeys/:id
export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  await connectMongo();
  const user = await User.findOne({ email: session.user?.email });
  if (!user) {
    return NextResponse.json({ message: "User not found" }, { status: 404 });
  }


  const { id } = context.params;
  const deleted = await Journey.findOneAndDelete({
    _id: id,
    userId: user._id,
  });

  if (!deleted) {
    return NextResponse.json({ message: "Journey not found" }, { status: 404 });
  }

  return NextResponse.json({ message: "Journey deleted" }, { status: 200 });
}
