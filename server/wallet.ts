import type { Express } from "express";
import { db } from "../db";
import { wallets, transactions, users } from "@db/schema";
import axios from 'axios';
import { eq, and, or } from "drizzle-orm";
import { ethers } from "ethers";
import { WebSocket, WebSocketServer } from 'ws';

// Price feed
let avaxUsdPrice = 0;
async function updateAvaxPrice() {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=avalanche-2&vs_currencies=usd');
    avaxUsdPrice = response.data['avalanche-2'].usd;
  } catch (error) {
    console.error('Failed to fetch AVAX price:', error);
  }
}

// Update price every 5 minutes
setInterval(updateAvaxPrice, 5 * 60 * 1000);
// Initial price fetch
updateAvaxPrice();
const FUJI_RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";
let provider: ethers.JsonRpcProvider;

// Type definitions
interface ExtendedRequest extends Express.Request {
  session: {
    passport?: {
      user?: number;
    };
  } & Express.Request['session'];
}

interface TransactionReceipt {
  blockNumber: number;
  gasUsed: bigint;
  status: number;
}

interface CustomTransactionReceipt {
  blockNumber: number;
  gasUsed: bigint;
  status: number;
  hash: string;
}

// WebSocket setup
const wss = new WebSocketServer({ noServer: true });
const clients = new Map<number, WebSocket>();

// WebSocket upgrade handling
export function handleUpgrade(server: any) {
  server.on('upgrade', (request: any, socket: any, head: any) => {
    const extendedRequest = request as ExtendedRequest;
    if (!extendedRequest.session?.passport?.user) {
      socket.destroy();
      return;
    }
    
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, extendedRequest);
    });
  });
}

// WebSocket connection handling
wss.on('connection', (ws, request: ExtendedRequest) => {
  const userId = request.session?.passport?.user;
  if (userId) {
    clients.set(userId, ws);
    
    ws.on('close', () => {
      clients.delete(userId);
    });
  }
});

// Type guard for user authentication
function isAuthenticated(req: Express.Request): req is Express.Request & { user: Express.User } {
  return req.isAuthenticated() && req.user !== undefined && typeof req.user.id === 'number';
}

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
    req: Express.Request,
    res: Express.Response,
    next: Express.NextFunction
  ) => {
    if (!isAuthenticated(req)) {
      return res.status(401).send("Not authenticated");
    }
    next();
  };

  // Balance polling service
  const pollBalances = async () => {
    try {
      const allWallets = await db.select().from(wallets);
      
      for (const wallet of allWallets) {
        const balance = await provider.getBalance(wallet.address);
        const formattedBalance = ethers.formatEther(balance);
        
        // Update database if balance changed
        if (formattedBalance !== wallet.balance) {
          await db
            .update(wallets)
            .set({ balance: formattedBalance })
            .where(eq(wallets.id, wallet.id));

          // Notify connected client if exists
          const client = clients.get(wallet.userId);
          if (client && client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'BALANCE_UPDATE',
              walletId: wallet.id,
              balance: formattedBalance
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error polling balances:', error);
    }
  };

  // Start polling every 30 seconds
  setInterval(pollBalances, 30000);

  // Create new wallet
  app.post("/api/wallets", requireAuth, async (req, res) => {

    try {
      const { name, type } = req.body;

      if (!name || !type || !["personal", "emergency", "investments"].includes(type)) {
        return res.status(400).send("Invalid wallet type. Must be one of: personal, emergency, investments");
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
    if (!req.user?.id) {
      return res.status(401).send("User session invalid");
    }

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

      const walletsWithUsd = userWallets.map(wallet => ({
        ...wallet,
        usdBalance: (Number(wallet.balance) * avaxUsdPrice).toString()
      }));
      res.json(walletsWithUsd);
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

    const { recipient, amount, note, useAddress } = req.body;

    try {
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

      let recipientAddress: string;
      let recipientUserId: number | null = null;

      if (useAddress) {
        // Validate the recipient address format
        if (!ethers.isAddress(recipient)) {
          return res.status(400).send("Invalid recipient address format");
        }
        recipientAddress = recipient;
      } else {
        // Find recipient by username
        const [recipientUser] = await db.select()
          .from(users)
          .where(eq(users.username, recipient))
          .limit(1);

        if (!recipientUser) {
          return res.status(400).send("Recipient not found");
        }

        // Get recipient's wallet
        const [recipientWallet] = await db.select()
          .from(wallets)
          .where(and(
            eq(wallets.userId, recipientUser.id),
            eq(wallets.type, "daily")
          ))
          .limit(1);

        if (!recipientWallet) {
          return res.status(400).send("Recipient wallet not found");
        }

        recipientAddress = recipientWallet.address;
        recipientUserId = recipientUser.id;
      }

      // Create wallet instance
      const wallet = new ethers.Wallet(senderWallet.privateKey, provider);
      
      // Get current balance
      const balance = await provider.getBalance(senderWallet.address);
      
      // Get current gas price and estimate gas
      const feeData = await provider.getFeeData();
      if (!feeData.maxFeePerGas) {
        return res.status(500).send("Failed to fetch gas prices");
      }

      // Estimate gas
      const gasEstimate = await provider.estimateGas({
        from: senderWallet.address,
        to: recipientAddress,
        value: ethers.parseEther(amount.toString())
      });

      // Calculate total required amount including gas fees
      const totalRequired = ethers.parseEther(amount.toString()) + (gasEstimate * feeData.maxFeePerGas);
      if (balance < totalRequired) {
        const gasFeesInEther = ethers.formatEther(gasEstimate * feeData.maxFeePerGas);
        return res.status(400).send(`Insufficient funds. Transaction requires ${amount} AVAX plus approximately ${gasFeesInEther} AVAX for gas fees`);
      }

      // Add 20% buffer to gas estimate
      const gasLimit = gasEstimate * BigInt(120) / BigInt(100);

      // Create and sign transaction with existing feeData
      const tx = await wallet.sendTransaction({
        to: recipientAddress,
        value: ethers.parseEther(amount.toString()),
        gasLimit,
        maxFeePerGas: feeData.maxFeePerGas,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
      });

      // Wait for confirmation with timeout
      const receipt = await Promise.race([
        tx.wait(2), // Wait for 2 confirmations
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("Transaction timeout")), 30000)
        )
      ]) as TransactionReceipt;

      if (!receipt || receipt.status === 0) {
        throw new Error("Transaction failed to be confirmed");
      }

      const customReceipt: CustomTransactionReceipt = {
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        status: receipt.status,
        hash: tx.hash
      };

      // Record transaction in database
      await db.insert(transactions)
        .values({
          fromUserId: req.user.id,
          toUserId: recipientUserId || req.user.id, // If sending to address, use sender's ID
          amount: amount.toString(),
          type: "transfer",
          status: "completed",
          metadata: { 
            note,
            txHash: tx.hash,
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed.toString(),
            recipientAddress: useAddress ? recipientAddress : undefined
          }
        });

      res.json({ 
        success: true,
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
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
    if (!isAuthenticated(req)) {
      return res.status(401).send("Not authenticated");
    }

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
