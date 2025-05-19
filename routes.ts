import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertFolderSchema, insertPlaySchema } from "@shared/schema";
import { zodToJsonSchema } from "zod-to-json-schema";
import { fromZodError } from "zod-validation-error";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Folders API
  app.get("/api/folders", async (req, res) => {
    try {
      // For demo purposes, use user ID 1
      const userId = 1;
      const folders = await storage.getFolders(userId);
      
      // For each folder, count the number of plays
      const foldersWithCount = await Promise.all(
        folders.map(async (folder) => {
          const plays = await storage.getPlays(folder.id);
          return {
            ...folder,
            playCount: plays.length
          };
        })
      );
      
      res.json(foldersWithCount);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch folders" });
    }
  });

  app.post("/api/folders", async (req, res) => {
    try {
      // Validate the request body
      const parsed = insertFolderSchema.parse({
        ...req.body,
        userId: 1 // For demo purposes
      });
      const folder = await storage.createFolder(parsed);
      res.status(201).json(folder);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to create folder" });
      }
    }
  });

  app.delete("/api/folders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid folder ID" });
      }
      
      const deleted = await storage.deleteFolder(id);
      if (!deleted) {
        return res.status(404).json({ message: "Folder not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete folder" });
    }
  });

  // Plays API
  app.get("/api/plays/recent", async (req, res) => {
    try {
      // For demo purposes, use user ID 1
      const userId = 1;
      const limit = parseInt(req.query.limit as string) || 5;
      const plays = await storage.getRecentPlays(userId, limit);
      
      // Get folder names for each play
      const playsWithFolderNames = await Promise.all(
        plays.map(async (play) => {
          const folder = await storage.getFolder(play.folderId);
          return {
            ...play,
            folderName: folder?.name || "Unknown Folder"
          };
        })
      );
      
      res.json(playsWithFolderNames);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recent plays" });
    }
  });

  app.get("/api/folders/:folderId/plays", async (req, res) => {
    try {
      const folderId = parseInt(req.params.folderId);
      if (isNaN(folderId)) {
        return res.status(400).json({ message: "Invalid folder ID" });
      }
      
      const plays = await storage.getPlays(folderId);
      res.json(plays);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plays" });
    }
  });

  app.get("/api/plays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid play ID" });
      }
      
      const play = await storage.getPlay(id);
      if (!play) {
        return res.status(404).json({ message: "Play not found" });
      }
      
      res.json(play);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch play" });
    }
  });

  app.post("/api/plays", async (req, res) => {
    try {
      // Validate the request body
      const parsed = insertPlaySchema.parse({
        ...req.body,
        userId: 1 // For demo purposes
      });
      
      const play = await storage.createPlay(parsed);
      res.status(201).json(play);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to create play" });
      }
    }
  });

  app.put("/api/plays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid play ID" });
      }
      
      // We don't validate the full schema here because it's a partial update
      const updatedPlay = await storage.updatePlay(id, req.body);
      if (!updatedPlay) {
        return res.status(404).json({ message: "Play not found" });
      }
      
      res.json(updatedPlay);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = fromZodError(error);
        res.status(400).json({ message: validationError.message });
      } else {
        res.status(500).json({ message: "Failed to update play" });
      }
    }
  });

  app.delete("/api/plays/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid play ID" });
      }
      
      const deleted = await storage.deletePlay(id);
      if (!deleted) {
        return res.status(404).json({ message: "Play not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete play" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}