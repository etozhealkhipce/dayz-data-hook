import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { webhookPayloadSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/players", async (_req, res) => {
    try {
      const players = await storage.getPlayers();
      res.json(players);
    } catch (error) {
      console.error("Error fetching players:", error);
      res.status(500).json({ error: "Failed to fetch players" });
    }
  });

  app.get("/api/players/:id/snapshots", async (req, res) => {
    try {
      const playerId = parseInt(req.params.id, 10);
      if (isNaN(playerId)) {
        return res.status(400).json({ error: "Invalid player ID" });
      }
      
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
      const days = req.query.days ? parseInt(req.query.days as string, 10) : undefined;
      const snapshots = await storage.getPlayerSnapshots(playerId, limit, days);
      res.json(snapshots);
    } catch (error) {
      console.error("Error fetching snapshots:", error);
      res.status(500).json({ error: "Failed to fetch snapshots" });
    }
  });

  app.post("/api/webhook", async (req, res) => {
    try {
      const parseResult = webhookPayloadSchema.safeParse(req.body);
      
      if (!parseResult.success) {
        console.error("Webhook validation error:", parseResult.error);
        return res.status(400).json({ 
          error: "Invalid payload format", 
          details: parseResult.error.errors 
        });
      }

      const payload = parseResult.data;
      const processedPlayers: string[] = [];

      for (const playerData of payload.Players) {
        let player = await storage.getPlayerBySteamId(playerData.ID);
        
        if (!player) {
          player = await storage.createPlayer({
            steamId: playerData.ID,
            name: playerData.Name,
          });
        } else {
          await storage.updatePlayerLastSeen(player.id);
        }

        await storage.createPlayerSnapshot({
          playerId: player.id,
          serverDate: payload.ServerDate,
          health: playerData.Health,
          blood: playerData.Blood,
          shock: playerData.Shock,
          water: playerData.Water,
          energy: playerData.Energy,
          heatComfort: playerData.HeatComfort,
          stamina: playerData.Stamina,
          wetness: playerData.Wetness,
          environmentTemp: playerData.EnvironmentTemp,
          playtime: playerData.Playtime,
          distanceWalked: playerData.DistanceWalked,
          killedZombies: playerData.KilledZombies,
          positionX: playerData.Position[0],
          positionY: playerData.Position[1],
          positionZ: playerData.Position[2],
          diseases: playerData.Diseases,
        });

        processedPlayers.push(playerData.Name);
      }

      console.log(`Webhook received: ${processedPlayers.length} players processed - ${processedPlayers.join(", ")}`);
      
      res.json({ 
        success: true, 
        message: `Processed ${processedPlayers.length} players`,
        players: processedPlayers 
      });
    } catch (error) {
      console.error("Webhook error:", error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return httpServer;
}
