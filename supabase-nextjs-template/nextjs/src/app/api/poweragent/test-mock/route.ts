import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { config, input, sessionId, mode } = body;

    if (!config || !input) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Simulate agent execution with mock data
    const simulationDelay = Math.random() * 1000 + 500; // 500-1500ms
    await new Promise(resolve => setTimeout(resolve, simulationDelay));

    // Mock response based on input
    let mockResponse = '';
    if (input.toLowerCase().includes('tools') || input.toLowerCase().includes('calculation')) {
      mockResponse = `I can help with calculations and tools! For example: 2 + 2 = 4. I have access to various tools to assist you.`;
    } else if (input.toLowerCase().includes('sub-agent') || input.toLowerCase().includes('delegate')) {
      mockResponse = `As a supervisor agent, I can delegate tasks to specialized sub-agents. Let me coordinate between my research and writing agents to help you.`;
    } else if (input.toLowerCase().includes('memory') || input.toLowerCase().includes('remember')) {
      mockResponse = `I have memory capabilities enabled. I can remember our conversation context and build upon previous interactions.`;
    } else {
      mockResponse = `Hello! I'm a ${config.name || 'PowerAgent'} running on ${config.provider} with ${config.model}. I'm here to help you with your request: "${input}"`;
    }

    // Mock metrics
    const mockMetrics = {
      tokensUsed: Math.floor(Math.random() * 100) + 50,
      executionTime: Math.floor(simulationDelay),
      toolCalls: input.toLowerCase().includes('tools') ? [
        { name: 'calculation', result: { answer: 42 } }
      ] : [],
      subAgentCalls: input.toLowerCase().includes('sub-agent') ? 1 : 0
    };

    return NextResponse.json({
      response: mockResponse,
      ...mockMetrics,
      sessionId: sessionId || `mock_${Date.now()}`,
      mode
    });

  } catch (error) {
    console.error('Mock test execution error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Mock test execution failed'
      },
      { status: 500 }
    );
  }
} 