import type { Express } from "express";
import { db } from "../db";
import { wallets, transactions, users } from "@db/schema";
import { eq, and, or } from "drizzle-orm";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider("https://api.avax.network/ext/bc/C/rpc");

export function setupWallet(app: Express) {
  // Middleware to ensure user is authenticated
  const requireAuth = (
    req: Express.Request & { user?: Express.User },
    res: Express.Response,
    next: Function
  ) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    // Type guard to ensure user is defined
    if (!req.user || typeof req.user.id === 'undefined') {
      return res.status(401).send("User session invalid");
    }

    next();
  };

  // Create new wallet
  app.post("/api/wallets", requireAuth, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).send("User session invalid");
      }

      const { name, type } = req.body;

      if (!name || !type || !["daily", "family", "zakat"].includes(type)) {
        return res.status(400).send("Invalid wallet configuration");
      }

      // Create new EVM wallet
      const wallet = ethers.Wallet.createRandom();

      // Save wallet to database
      await db.insert(wallets).values({
        userId: req.user.id,
        name,
        type,
        address: wallet.address,
        privateKey: wallet.privateKey,
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error("Error creating wallet:", error);
      res.status(500).send(error.message);
    }
  });

  // Get user's wallets
  app.get("/api/wallets", requireAuth, async (req, res) => {
    try {
      const userWallets = await db.select()
        .from(wallets)
        .where(eq(wallets.userId, req.user.id));
      
      // Update balances from blockchain
      for (const wallet of userWallets) {
        const balance = await provider.getBalance(wallet.address);
        await db.update(wallets)
          .set({ balance: ethers.formatEther(balance) })
          .where(eq(wallets.id, wallet.id));
      }

      res.json(userWallets);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Get user's transactions
  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      const userTransactions = await db.select()
        .from(transactions)
        .where(
          or(
            eq(transactions.fromUserId, req.user.id),
            eq(transactions.toUserId, req.user.id)
          )
        );
      res.json(userTransactions);
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Send money
  app.post("/api/transactions/send", requireAuth, async (req, res) => {
    const { recipientUsername, amount, note } = req.body;

    try {
      // Find recipient
      const [recipient] = await db.select()
        .from(users)
        .where(eq(users.username, recipientUsername))
        .limit(1);

      if (!recipient) {
        return res.status(400).send("Recipient not found");
      }

      // Get sender's wallet
      const [senderWallet] = await db.select()
        .from(wallets)
        .where(and(
          eq(wallets.userId, req.user.id),
          eq(wallets.type, "daily")
        ))
        .limit(1);

      if (!senderWallet || Number(senderWallet.balance) < amount) {
        return res.status(400).send("Insufficient funds");
      }

      // Get recipient's wallet
      const [recipientWallet] = await db.select()
        .from(wallets)
        .where(and(
          eq(wallets.userId, recipient.id),
          eq(wallets.type, "daily")
        ))
        .limit(1);

      if (!recipientWallet) {
        return res.status(400).send("Recipient wallet not found");
      }

      // Create and sign transaction
      const wallet = new ethers.Wallet(senderWallet.privateKey, provider);
      const tx = await wallet.sendTransaction({
        to: recipientWallet.address,
        value: ethers.parseEther(amount.toString())
      });

      // Wait for confirmation
      await tx.wait();

      // Record transaction
      await db.insert(transactions)
        .values({
          fromUserId: req.user.id,
          toUserId: recipient.id,
          amount: amount.toString(),
          type: "transfer",
          status: "completed",
          metadata: { note, txHash: tx.hash }
        });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });

  // Pay Zakat
  app.post("/api/transactions/zakat", requireAuth, async (req, res) => {
    const { amount } = req.body;

    try {
      const [userWallet] = await db.select()
        .from(wallets)
        .where(and(
          eq(wallets.userId, req.user.id),
          eq(wallets.type, "daily")
        ))
        .limit(1);

      if (!userWallet || Number(userWallet.balance) < amount) {
        return res.status(400).send("Insufficient funds");
      }

      // Hard-coded Zakat collection address
      const ZAKAT_ADDRESS = "0x1234567890123456789012345678901234567890";

      // Create and sign transaction
      const wallet = new ethers.Wallet(userWallet.privateKey, provider);
      const tx = await wallet.sendTransaction({
        to: ZAKAT_ADDRESS,
        value: ethers.parseEther(amount.toString())
      });

      // Wait for confirmation
      await tx.wait();

      // Record transaction
      await db.insert(transactions)
        .values({
          fromUserId: req.user.id,
          toUserId: req.user.id, // Self-reference for Zakat
          amount: amount.toString(),
          type: "zakat",
          status: "completed",
          metadata: { txHash: tx.hash }
        });

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).send(error.message);
    }
  });
}
