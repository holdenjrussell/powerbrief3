import { VoltAgent } from "@voltagent/core";

// Initialize VoltAgent with empty agents for now
// You can add your agents here when ready
new VoltAgent({
  agents: {},
  // Optional: Configure VoltAgent settings
  config: {
    // Enable observability
    enableObservability: true,
    // Set API endpoint
    apiPath: "/api/poweragent",
  },
}); 