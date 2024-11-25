import type { Express } from "express";
import { setupAuth } from "./auth";
import { setupWallet } from "./wallet";

export function registerRoutes(app: Express) {
  setupAuth(app);
  setupWallet(app);
}
