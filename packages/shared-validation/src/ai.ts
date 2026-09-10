import { z } from "zod";

export const aiNodeSchema = z.object({
  id: z.string().min(1).max(128),
  label: z.string().min(1).max(256),
  type: z.enum(["service", "database", "queue", "user", "group"]),
});

export const aiEdgeSchema = z.object({
  id: z.string().min(1).max(128),
  source: z.string().min(1).max(128),
  target: z.string().min(1).max(128),
  label: z.string().max(256).optional(),
});

export const aiDiagramSchema = z.object({
  nodes: z.array(aiNodeSchema).max(200),
  edges: z.array(aiEdgeSchema).max(400),
});

export const aiGenerateRequestSchema = z.object({
  prompt: z.string().min(1).max(4000),
  kind: z.enum(["auto", "flowchart", "architecture", "sequence", "erd", "freeform"]).default("auto"),
});

export type AiDiagram = z.infer<typeof aiDiagramSchema>;
