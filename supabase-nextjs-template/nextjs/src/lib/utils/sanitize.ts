/**
 * Helper function to sanitize tool parameters for proper Zod schema conversion
 * Fixes common issues like handling additionalProperties objects
 */
export function sanitizeToolParameters(parameters: Record<string, unknown>): Record<string, unknown> {
  // Create a deep copy to avoid modifying the original
  const sanitized = JSON.parse(JSON.stringify(parameters));

  // Process the parameters object recursively
  function processObject(obj: Record<string, unknown>): void {
    // Handle additionalProperties if it's an object (convert to boolean)
    if ('additionalProperties' in obj && typeof obj.additionalProperties === 'object') {
      obj.additionalProperties = true; // Default to allowing additional properties
    }

    // Process nested properties
    if (obj.type === 'object' && obj.properties && typeof obj.properties === 'object') {
      Object.values(obj.properties as Record<string, Record<string, unknown>>).forEach(prop => {
        if (typeof prop === 'object' && prop !== null) {
          processObject(prop);
        }
      });
    }

    // Process items in arrays
    if (obj.type === 'array' && obj.items && typeof obj.items === 'object') {
      processObject(obj.items as Record<string, unknown>);
    }

    // Process oneOf, anyOf, allOf schemas
    ['oneOf', 'anyOf', 'allOf'].forEach(key => {
      if (obj[key] && Array.isArray(obj[key])) {
        (obj[key] as Array<Record<string, unknown>>).forEach(schema => {
          if (typeof schema === 'object' && schema !== null) {
            processObject(schema);
          }
        });
      }
    });
  }

  // Process each top-level parameter
  Object.values(sanitized).forEach(param => {
    if (typeof param === 'object' && param !== null) {
      processObject(param as Record<string, unknown>);
    }
  });

  return sanitized;
}

/**
 * Sanitizes a complete agent configuration
 * Handles nested structures like tools and toolkits
 */
export function sanitizeAgentConfig(config: Record<string, unknown>): Record<string, unknown> {
  // Create a deep copy to avoid modifying the original
  const sanitizedConfig = JSON.parse(JSON.stringify(config));

  // Process custom tools
  if (Array.isArray(sanitizedConfig.customTools)) {
    sanitizedConfig.customTools = sanitizedConfig.customTools.map((tool: Record<string, unknown>) => {
      if (tool.parameters) {
        tool.parameters = sanitizeToolParameters(tool.parameters as Record<string, unknown>);
      }
      return tool;
    });
  }

  // Process toolkits if present
  if (Array.isArray(sanitizedConfig.toolkits)) {
    sanitizedConfig.toolkits = sanitizedConfig.toolkits.map((toolkit: Record<string, unknown>) => {
      if (toolkit.tools && Array.isArray(toolkit.tools)) {
        toolkit.tools = toolkit.tools.map((tool: Record<string, unknown>) => {
          if (tool.parameters) {
            tool.parameters = sanitizeToolParameters(tool.parameters as Record<string, unknown>);
          }
          return tool;
        });
      }
      return toolkit;
    });
  }

  return sanitizedConfig;
} 