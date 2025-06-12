import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, agentId } = body;

    // For now, return a placeholder response
    // You can implement actual agent logic here when ready
    return NextResponse.json({
      message: `PowerAgent is being configured. You said: "${message}"`,
      agentId: agentId || "assistant",
      timestamp: new Date().toISOString(),
      status: "placeholder"
    });
  } catch (error) {
    console.error("Chat endpoint error:", error);
    return NextResponse.json(
      { 
        error: "Chat endpoint error",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 