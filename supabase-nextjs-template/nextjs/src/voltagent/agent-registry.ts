import { Agent, Provider } from '@voltagent/core';

/**
 * Registry to manage and track PowerAgent instances
 */
export class AgentRegistry {
  private static instance: AgentRegistry;
  private agents: Map<string, Agent<Provider>> = new Map(); // ID -> Agent
  private agentsByName: Map<string, string> = new Map(); // Name -> ID
  private relationships: Map<string, string[]> = new Map(); // supervisorId -> subAgentIds

  private constructor() {}

  /**
   * Get the singleton instance of AgentRegistry
   */
  static getInstance(): AgentRegistry {
    if (!AgentRegistry.instance) {
      AgentRegistry.instance = new AgentRegistry();
    }
    return AgentRegistry.instance;
  }

  /**
   * Register an agent with the registry
   */
  registerAgent<T extends Provider>(id: string, agent: Agent<T>, name?: string): void {
    this.agents.set(id, agent as Agent<Provider>);
    
    // Also register by name if provided, for VoltAgent compatibility
    if (name) {
      this.agentsByName.set(name, id);
    }
    
    console.log(`[AgentRegistry] Registered agent: ${id}${name ? ` (${name})` : ''}`);
  }

  /**
   * Get an agent by ID or name
   */
  getAgent(idOrName: string): Agent<Provider> | undefined {
    // First try by ID
    let agent = this.agents.get(idOrName);
    
    // If not found, try by name
    if (!agent) {
      const id = this.agentsByName.get(idOrName);
      if (id) {
        agent = this.agents.get(id);
      }
    }
    
    return agent;
  }

  /**
   * Register a parent-child relationship between agents
   */
  registerRelationship(supervisorId: string, subAgentId: string): void {
    const existing = this.relationships.get(supervisorId) || [];
    if (!existing.includes(subAgentId)) {
      this.relationships.set(supervisorId, [...existing, subAgentId]);
    }
  }

  /**
   * Get all sub-agents for a supervisor
   */
  getSubAgents(supervisorId: string): Agent<Provider>[] {
    const subAgentIds = this.relationships.get(supervisorId) || [];
    return subAgentIds.map(id => this.getAgent(id)).filter(Boolean) as Agent<Provider>[];
  }

  /**
   * Get all registered agents
   */
  getAllAgents(): Map<string, Agent<Provider>> {
    return this.agents;
  }

  /**
   * List all agent IDs
   */
  listAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }

  /**
   * List all agent names
   */
  listAgentNames(): string[] {
    return Array.from(this.agentsByName.keys());
  }
} 