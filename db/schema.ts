import { pgTable, text, integer, decimal, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  phone: text("phone").unique().notNull(),
  fullName: text("full_name").notNull(),
  country: text("country").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const wallets = pgTable("wallets", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'daily', 'family', 'zakat'
  address: text("address").notNull(), // blockchain address
  privateKey: text("private_key").notNull(),
  balance: decimal("balance", { precision: 18, scale: 8 }).default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  fromUserId: integer("from_user_id").notNull().references(() => users.id),
  toUserId: integer("to_user_id").notNull().references(() => users.id),
  amount: decimal("amount", { precision: 18, scale: 8 }).notNull(),
  type: text("type").notNull(), // 'transfer', 'zakat'
  status: text("status").notNull(), // 'pending', 'completed', 'failed'
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = z.infer<typeof selectUserSchema>;

export const insertWalletSchema = createInsertSchema(wallets);
export const selectWalletSchema = createSelectSchema(wallets);
export type InsertWallet = z.infer<typeof insertWalletSchema>;
export type Wallet = z.infer<typeof selectWalletSchema>;

export const insertTransactionSchema = createInsertSchema(transactions);
export const selectTransactionSchema = createSelectSchema(transactions);
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = z.infer<typeof selectTransactionSchema>;
