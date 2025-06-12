import { VoltAgent } from "@voltagent/core";
import type { Agent, Provider } from "@voltagent/core";
import { AgentRegistry } from "./agent-registry";

// Initialize VoltAgent with configuration
const voltAgent = new VoltAgent({
  agents: {}, // Agents will be registered dynamically
  autoStart: true,
  port: process.env.VOLTAGENT_PORT ? parseInt(process.env.VOLTAGENT_PORT) : undefined,
  checkDependencies: true
});

// Function to register an agent with VoltAgent
export function registerWithVoltAgent<T extends Provider>(agent: Agent<T>, id: string, name?: string): void {
  try {
    // Register with VoltAgent
    voltAgent.registerAgent(agent);
    
    // Also register with our own registry
    const registry = AgentRegistry.getInstance();
    registry.registerAgent(id, agent, name || id);
    
    console.log(`[VoltAgent] Registered agent: ${id}${name ? ` (${name})` : ''}`);
  } catch (error) {
    console.warn(`[VoltAgent] Failed to register agent: ${id}`, error);
  }
}

// Export for use in other parts of the application
export { voltAgent }; 