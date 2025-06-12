import { VoltAgent } from "@voltagent/core";
import { PowerAgentService } from "./agent-service";

// Get the agent registry instance
const agentService = new PowerAgentService();

// Initialize VoltAgent with configuration
const voltAgent = new VoltAgent({
  agents: {}, // Agents will be dynamically registered via PowerAgentService
  // Configure VoltAgent settings
  config: {
    // Enable observability for debugging
    enableObservability: true,
    // Set custom API endpoint path
    apiPath: "/api/poweragent",
    // Enable API server
    enableAPI: true,
    // Port configuration (will try these ports in order)
    port: process.env.VOLTAGENT_PORT ? parseInt(process.env.VOLTAGENT_PORT) : undefined,
    // Enable console output
    enableConsole: true
  },
});

// Export for use in other parts of the application
export { voltAgent, agentService }; 