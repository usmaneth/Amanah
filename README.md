# Amanah Islamic Banking Application

A modern Islamic banking platform built with React, TypeScript, and Express, focusing on Shariah-compliant financial services.

## 🎯 Project Overview

This is a full-stack application for Islamic banking services, featuring wallet management, Zakat calculations, and blockchain integration on the Avalanche Fuji Testnet.

## 🏗 Core Features

### 1. Islamic Banking Wallet
- Integration with Avalanche Fuji Testnet ([`CreateWalletForm.tsx`](rag://rag_source_5))
- Blockchain wallet creation and management
- Network specifications:
  - Network: Avalanche Fuji Testnet
  - Chain ID: 43113
  - RPC URL: https://api.avax-test.network/ext/bc/C/rpc

### 2. Zakat Management System
From [`ZakatCalculator.tsx`](rag://rag_source_6):
- Automated Zakat calculations (2.5% of eligible wealth)
- Nisab threshold checking
- Real-time wealth assessment
- Direct Zakat payment functionality

## 🏢 Architecture

### Frontend (client/)
- React with TypeScript
- Modern UI using Radix UI components
- Tailwind CSS for styling
- Theme customization ([`theme.json`](rag://rag_source_7)):
  - Professional variant
  - Light appearance
  - Green primary color scheme

### Backend (server/)
- Express.js server
- PostgreSQL database with Drizzle ORM
- Session management with Express sessions
- Passport.js for authentication

## 💻 Technical Infrastructure

### Development Setup
- Development server runs on port 5000
- Hot reloading enabled
- TypeScript checking
- Vite for frontend bundling

### Deployment
- Configured for Cloud Run deployment
- Production-ready build system
- Automatic database migrations

## 🔧 Key Components

1. **Wallet System**
   - Blockchain integration
   - Transaction management
   - Balance tracking
   - Testnet support

2. **Zakat Module**
   - Wealth calculation
   - Eligibility checking
   - Payment processing
   - Threshold monitoring

3. **UI Components**
   - Drawer system for mobile interactions
   - Responsive layouts
   - Theme-aware components
   - Accessible design patterns

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

📁 Project Structure
.
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── wallet/         # Wallet management
│   │   │   └── ui/            # Reusable UI components
│   │   └── index.css          # Global styles
├── server/
│   └── index.ts               # Express server
└── config files
    ├── .replit               # Replit configuration
    ├── package.json          # Dependencies
    └── tailwind.config.ts    # Tailwind settings

⚙️ Configuration
The project uses various configuration files:

.replit: Replit-specific configuration
package.json: Project dependencies and scripts
tailwind.config.ts: Theme and styling configuration
theme.json: Global theme settings

🔒 Security Features
Session management
Passport.js authentication
Secure blockchain transactions
HTTPS enforcement


