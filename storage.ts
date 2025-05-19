import { Folder, InsertFolder, InsertPlay, InsertUser, Play, User, canvasElementSchema } from "@shared/schema";
import { z } from "zod";

// Enhanced storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Folder operations
  getFolders(userId: number): Promise<Folder[]>;
  getFolder(id: number): Promise<Folder | undefined>;
  createFolder(folder: InsertFolder): Promise<Folder>;
  deleteFolder(id: number): Promise<boolean>;
  
  // Play operations
  getPlays(folderId: number): Promise<Play[]>;
  getRecentPlays(userId: number, limit: number): Promise<Play[]>;
  getPlay(id: number): Promise<Play | undefined>;
  createPlay(play: InsertPlay): Promise<Play>;
  updatePlay(id: number, play: Partial<InsertPlay>): Promise<Play | undefined>;
  deletePlay(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private folders: Map<number, Folder>;
  private plays: Map<number, Play>;
  currentUserId: number;
  currentFolderId: number;
  currentPlayId: number;

  constructor() {
    this.users = new Map();
    this.folders = new Map();
    this.plays = new Map();
    this.currentUserId = 1;
    this.currentFolderId = 1;
    this.currentPlayId = 1;
    
    // Add a demo user
    this.createUser({ username: "demo", password: "password" });
    
    // Add some default folders for the demo user
    this.createFolder({ name: "Offense Plays", userId: 1 });
    this.createFolder({ name: "Defense Plays", userId: 1 });
    this.createFolder({ name: "Face-off Strategies", userId: 1 });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Folder methods
  async getFolders(userId: number): Promise<Folder[]> {
    return Array.from(this.folders.values()).filter(
      folder => folder.userId === userId
    );
  }

  async getFolder(id: number): Promise<Folder | undefined> {
    return this.folders.get(id);
  }

  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const id = this.currentFolderId++;
    const now = new Date();
    const folder: Folder = { 
      ...insertFolder, 
      id,
      createdAt: now 
    };
    this.folders.set(id, folder);
    return folder;
  }

  async deleteFolder(id: number): Promise<boolean> {
    // Delete all plays in this folder first
    const playsInFolder = Array.from(this.plays.values()).filter(
      play => play.folderId === id
    );
    
    for (const play of playsInFolder) {
      this.plays.delete(play.id);
    }
    
    return this.folders.delete(id);
  }

  // Play methods
  async getPlays(folderId: number): Promise<Play[]> {
    return Array.from(this.plays.values())
      .filter(play => play.folderId === folderId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()); // Most recent first
  }

  async getRecentPlays(userId: number, limit: number): Promise<Play[]> {
    return Array.from(this.plays.values())
      .filter(play => play.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, limit);
  }

  async getPlay(id: number): Promise<Play | undefined> {
    return this.plays.get(id);
  }

  async createPlay(insertPlay: InsertPlay): Promise<Play> {
    const id = this.currentPlayId++;
    const now = new Date();
    
    // Validate canvas data
    const canvasArray = z.array(canvasElementSchema).parse(insertPlay.canvas);
    
    const play: Play = {
      ...insertPlay,
      id,
      createdAt: now,
      updatedAt: now
    };
    
    this.plays.set(id, play);
    return play;
  }

  async updatePlay(id: number, playUpdate: Partial<InsertPlay>): Promise<Play | undefined> {
    const play = this.plays.get(id);
    if (!play) return undefined;
    
    // If canvas is updated, validate it
    if (playUpdate.canvas) {
      z.array(canvasElementSchema).parse(playUpdate.canvas);
    }
    
    const updatedPlay: Play = {
      ...play,
      ...playUpdate,
      updatedAt: new Date()
    };
    
    this.plays.set(id, updatedPlay);
    return updatedPlay;
  }

  async deletePlay(id: number): Promise<boolean> {
    return this.plays.delete(id);
  }
}

import { db } from './db';
import { eq, desc, and } from 'drizzle-orm';
import { users, folders, plays } from '@shared/schema';

// Database storage implementation
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }
  
  // Folder operations
  async getFolders(userId: number): Promise<Folder[]> {
    return db.select().from(folders).where(eq(folders.userId, userId));
  }
  
  async getFolder(id: number): Promise<Folder | undefined> {
    const [folder] = await db.select().from(folders).where(eq(folders.id, id));
    return folder || undefined;
  }
  
  async createFolder(insertFolder: InsertFolder): Promise<Folder> {
    const [folder] = await db
      .insert(folders)
      .values(insertFolder)
      .returning();
    return folder;
  }
  
  async deleteFolder(id: number): Promise<boolean> {
    const [deletedFolder] = await db
      .delete(folders)
      .where(eq(folders.id, id))
      .returning();
    return !!deletedFolder;
  }
  
  // Play operations
  async getPlays(folderId: number): Promise<Play[]> {
    return db
      .select()
      .from(plays)
      .where(eq(plays.folderId, folderId))
      .orderBy(desc(plays.updatedAt));
  }
  
  async getRecentPlays(userId: number, limit: number): Promise<Play[]> {
    return db
      .select()
      .from(plays)
      .where(eq(plays.userId, userId))
      .orderBy(desc(plays.updatedAt))
      .limit(limit);
  }
  
  async getPlay(id: number): Promise<Play | undefined> {
    const [play] = await db.select().from(plays).where(eq(plays.id, id));
    return play || undefined;
  }
  
  async createPlay(insertPlay: InsertPlay): Promise<Play> {
    const [play] = await db
      .insert(plays)
      .values(insertPlay)
      .returning();
    return play;
  }
  
  async updatePlay(id: number, playUpdate: Partial<InsertPlay>): Promise<Play | undefined> {
    const [updatedPlay] = await db
      .update(plays)
      .set({ 
        ...playUpdate, 
        updatedAt: new Date() 
      })
      .where(eq(plays.id, id))
      .returning();
    return updatedPlay;
  }
  
  async deletePlay(id: number): Promise<boolean> {
    const [deletedPlay] = await db
      .delete(plays)
      .where(eq(plays.id, id))
      .returning();
    return !!deletedPlay;
  }
}

export const storage = new DatabaseStorage();
