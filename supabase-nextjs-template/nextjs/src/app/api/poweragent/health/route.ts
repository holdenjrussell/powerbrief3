import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Simple health check that doesn't require agent initialization
    return NextResponse.json({
      status: "connected",
      message: "PowerAgent API is operational",
      timestamp: new Date().toISOString(),
      agents: [
        "briefGenerator",
        "ugcCoordinator", 
        "creativeAnalyst",
        "performanceOptimizer",
        "assistant"
      ]
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      { 
        status: "error",
        message: "Health check failed",
        error: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
} 