import { NextRequest } from 'next/server';
import { AgentRegistry } from '@/voltagent/agent-registry';
import { z } from 'zod';

// Helper function to convert JSON Schema to Zod schema
function jsonSchemaToZod(schema: Record<string, unknown>): z.ZodType {
  // Handle different types
  if (schema.type === 'object') {
    const properties: Record<string, z.ZodType> = {};
    
    // Process each property
    if (schema.properties && typeof schema.properties === 'object') {
      Object.entries(schema.properties).forEach(([key, propSchema]) => {
        properties[key] = jsonSchemaToZod(propSchema as Record<string, unknown>);
      });
    }
    
    // Create the object schema
    let zodSchema = z.object(properties);
    
    // Handle required properties
    if (schema.required && Array.isArray(schema.required)) {
      // No need to do anything special here as Zod handles this differently
    }
    
    // Handle additionalProperties
    if (schema.additionalProperties === false) {
      zodSchema = zodSchema.strict();
    } else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
      // For additionalProperties that specify a schema
      zodSchema = zodSchema.catchall(jsonSchemaToZod(schema.additionalProperties as Record<string, unknown>));
    }
    
    return zodSchema;
  } else if (schema.type === 'array') {
    if (schema.items) {
      return z.array(jsonSchemaToZod(schema.items as Record<string, unknown>));
    }
    return z.array(z.unknown());
  } else if (schema.type === 'string') {
    let stringSchema = z.string();
    
    // Handle string formats
    if (schema.format === 'email') {
      stringSchema = z.string().email();
    } else if (schema.format === 'uri') {
      stringSchema = z.string().url();
    }
    
    // Handle pattern
    if (schema.pattern && typeof schema.pattern === 'string') {
      stringSchema = stringSchema.regex(new RegExp(schema.pattern));
    }
    
    // Handle min/max length
    if (schema.minLength !== undefined && typeof schema.minLength === 'number') {
      stringSchema = stringSchema.min(schema.minLength);
    }
    if (schema.maxLength !== undefined && typeof schema.maxLength === 'number') {
      stringSchema = stringSchema.max(schema.maxLength);
    }
    
    return stringSchema;
  } else if (schema.type === 'number' || schema.type === 'integer') {
    let numberSchema = schema.type === 'integer' ? z.number().int() : z.number();
    
    // Handle min/max
    if (schema.minimum !== undefined && typeof schema.minimum === 'number') {
      numberSchema = numberSchema.min(schema.minimum);
    }
    if (schema.maximum !== undefined && typeof schema.maximum === 'number') {
      numberSchema = numberSchema.max(schema.maximum);
    }
    
    return numberSchema;
  } else if (schema.type === 'boolean') {
    return z.boolean();
  } else if (schema.type === 'null') {
    return z.null();
  } else if (schema.enum && Array.isArray(schema.enum)) {
    return z.enum(schema.enum as [string, ...string[]]);
  } else if (schema.oneOf || schema.anyOf) {
    const schemas = ((schema.oneOf || schema.anyOf) as Array<Record<string, unknown>>).map(jsonSchemaToZod);
    return z.union(schemas as [z.ZodType, z.ZodType, ...z.ZodType[]]);
  } else if (schema.allOf && Array.isArray(schema.allOf) && schema.allOf.length > 0) {
    // This is a simplification; proper allOf handling is more complex
    return jsonSchemaToZod(schema.allOf[0] as Record<string, unknown>);
  }
  
  // Default to unknown
  return z.unknown();
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const agentId = params.id;
  const registry = AgentRegistry.getInstance();
  const agent = registry.getAgent(agentId);

  if (!agent) {
    return new Response(JSON.stringify({ error: `Agent not found: ${agentId}` }), {
      status: 404,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  try {
    const body = await request.json();
    const { input, options = {}, schema } = body;

    if (!input) {
      return new Response(JSON.stringify({ error: 'Input is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    if (!schema) {
      return new Response(JSON.stringify({ error: 'Schema is required for streamObject' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    // Convert JSON Schema to Zod schema
    const zodSchema = jsonSchemaToZod(schema as Record<string, unknown>);

    // Set up Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Start streaming in a separate async process
    (async () => {
      try {
        const startTime = Date.now();
        
        // Stream object with the converted Zod schema
        await agent.streamObject({
          messages: [{ role: 'user', content: input }],
          schema: zodSchema,
          onPartialObject: async (partialObject) => {
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({ type: 'partial', object: partialObject })}\n\n`)
            );
          },
          onComplete: async (completeObject, usage) => {
            const executionTime = Date.now() - startTime;
            await writer.write(
              encoder.encode(`data: ${JSON.stringify({
                type: 'complete',
                object: completeObject,
                usage,
                executionTime
              })}\n\n`)
            );
            await writer.close();
          },
          ...options
        });
      } catch (error: any) {
        console.error('Error streaming object:', error);
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ type: 'error', error: error.message })}\n\n`)
        );
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
} 