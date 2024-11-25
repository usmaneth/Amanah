import type { Express } from "express";
import { db } from "../db";
import { wallets, transactions, users } from "@db/schema";
import { eq, and, or } from "drizzle-orm";
import { ethers } from "ethers";

const FUJI_RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";
let provider: ethers.JsonRpcProvider;

try {
  provider = new ethers.JsonRpcProvider(FUJI_RPC_URL);
} catch (error) {
  console.error("Failed to initialize Avalanche Fuji provider:", error);
  provider = new ethers.JsonRpcProvider(FUJI_RPC_URL);
}

// Function to request test AVAX from faucet
async function requestTestAVAX(address: string): Promise<boolean> {
  try {
    // Note: This is a placeholder. In production, implement actual faucet API call
    console.log(`Requesting test AVAX for address: ${address}`);
    return true;
  } catch (error) {
    console.error("Failed to request test AVAX:", error);
    return false;
  }
}

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
    if (!req.user?.id) {
      return res.status(401).send("User session invalid");
    }

    try {
      const { name, type } = req.body;

      if (!name || !type || !["daily", "family", "zakat"].includes(type)) {
        return res.status(400).send("Invalid wallet configuration");
      }

      // Create new Fuji testnet wallet
      const wallet = ethers.Wallet.createRandom().connect(provider);
      
      // Log wallet creation (safely)
      console.log(`Created new wallet for user ${req.user.id}:`, {
        address: wallet.address,
        type,
        timestamp: new Date().toISOString()
      });

      // Request test AVAX from faucet
      const faucetSuccess = await requestTestAVAX(wallet.address);
      if (!faucetSuccess) {
        console.warn(`Failed to request test AVAX for wallet: ${wallet.address}`);
      }

      // Check initial balance
      const balance = await provider.getBalance(wallet.address);
      
      // Save wallet to database
      await db.insert(wallets).values({
        userId: req.user.id,
        name,
        type,
        address: wallet.address,
        privateKey: wallet.privateKey,
        balance: ethers.formatEther(balance),
      });

      res.json({ 
        success: true,
        address: wallet.address,
        balance: ethers.formatEther(balance)
      });
    } catch (error: any) {
      console.error("Error creating wallet:", error);
      res.status(500).send("Failed to create wallet");
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
    if (!req.user?.id) {
      return res.status(401).send("User session invalid");
    }

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

      if (!senderWallet) {
        return res.status(400).send("Sender wallet not found");
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

      // Create wallet instance
      const wallet = new ethers.Wallet(senderWallet.privateKey, provider);
      
      // Get current balance
      const balance = await provider.getBalance(senderWallet.address);
      if (balance < ethers.parseEther(amount.toString())) {
        return res.status(400).send("Insufficient funds");
      }

      // Estimate gas
      const gasEstimate = await provider.estimateGas({
        from: senderWallet.address,
        to: recipientWallet.address,
        value: ethers.parseEther(amount.toString())
      });

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate * BigInt(120) / BigInt(100);

      // Get current gas price
      const gasPrice = await provider.getFeeData();
      
      // Create and sign transaction
      const tx = await wallet.sendTransaction({
        to: recipientWallet.address,
        value: ethers.parseEther(amount.toString()),
        gasLimit,
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas
      });

      // Wait for confirmation with timeout
      const receipt = await Promise.race([
        tx.wait(2), // Wait for 2 confirmations
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Transaction timeout")), 30000)
        )
      ]);

      // Record transaction
      await db.insert(transactions)
        .values({
          fromUserId: req.user.id,
          toUserId: recipient.id,
          amount: amount.toString(),
          type: "transfer",
          status: "completed",
          metadata: { 
            note, 
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString()
          }
        });

      res.json({ 
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber
      });
    } catch (error: any) {
      console.error("Transaction error:", error);
      
      // Handle specific error cases
      if (error.message.includes("insufficient funds")) {
        return res.status(400).send("Insufficient funds for transaction and gas fees");
      }
      if (error.message.includes("timeout")) {
        return res.status(408).send("Transaction confirmation timeout");
      }
      
      res.status(500).send("Failed to process transaction");
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
