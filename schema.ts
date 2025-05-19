import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema remains untouched for authentication purposes
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Folders to organize plays
export const folders = pgTable("folders", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFolderSchema = createInsertSchema(folders).pick({
  name: true,
  userId: true,
});

// The actual plays
export const plays = pgTable("plays", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  folderId: integer("folder_id").notNull(),
  userId: integer("user_id").notNull(),
  // Store canvas elements as JSON
  canvas: jsonb("canvas").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPlaySchema = createInsertSchema(plays).pick({
  name: true,
  folderId: true,
  userId: true,
  canvas: true,
});

// Define the canvas element types for proper type checking
export const canvasElementSchema = z.object({
  id: z.string(),
  type: z.enum(['player', 'ball', 'moveArrow', 'passArrow', 'shootArrow', 'text']),
  x: z.number(),
  y: z.number(),
  // For arrows
  points: z.array(z.number()).optional(),
  // For player
  position: z.string().optional(),
  team: z.enum(['blue', 'red']).optional(),
  // For text
  text: z.string().optional(),
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertFolder = z.infer<typeof insertFolderSchema>;
export type Folder = typeof folders.$inferSelect;

export type InsertPlay = z.infer<typeof insertPlaySchema>;
export type Play = typeof plays.$inferSelect;

export type CanvasElement = z.infer<typeof canvasElementSchema>;
