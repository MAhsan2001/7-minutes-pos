# 🥖 7 Minutes POS System

A modern, high-performance Point of Sale (POS) system custom-built for **7 Minutes**. Built with Next.js, React, Tailwind CSS, and powered by Supabase for real-time database management and authentication.

![POS Dashboard](https://via.placeholder.com/1200x600.png?text=The+Mount+Bakers+POS)

## 🌟 Key Features

*   **🛒 Sleek POS Interface:** Lightning-fast cart management with dynamic quantity controls (including exact decimal weights for Kg products) and exact change calculation.
*   **👥 Role-Based Access Control (RBAC):** Secure access tiers for 4 distinct staff roles:
    *   **Admin:** Full access to all settings, reports, and staff management.
    *   **Cashier:** Locked to the POS terminal.
    *   **Stock Manager:** Dedicated access to products, suppliers, and inventory.
    *   **Accountant:** Read-only access to sales, reports, and financial auditing.
*   **🖨️ Thermal Receipt Printing:** Built-in optimized 80mm/58mm thermal receipt layouts featuring monospace typography for professional printing.
*   **📊 Real-Time Analytics:** Beautiful interactive charts (powered by Recharts) showing revenue trends, category breakdowns, and top 5 best-selling products.
*   **🛡️ Shift Cashier Tracking:** Track exactly which cashier handled which transaction during a shift without requiring them to log in/out of the main terminal account.
*   **🎨 Premium UI/UX:** Stunning dark mode aesthetics with glassmorphism, responsive micro-animations, and fluid layouts.

## 💻 Tech Stack

*   **Frontend:** Next.js 14 (App Router), React, Tailwind CSS, Radix UI
*   **State Management:** Zustand
*   **Backend & Database:** Supabase (PostgreSQL), Row Level Security (RLS)
*   **Charting:** Recharts
*   **Icons:** Lucide React

## 🚀 Getting Started

### Prerequisites
Make sure you have Node.js (v18+) installed on your machine.

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YourUsername/mount-bakers-pos.git
   cd mount-bakers-pos
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 📦 Building for Production

To create an optimized production build for maximum speed:
```bash
npm run build
npm run start
```

## 🔒 Security & Database
This project relies on Supabase for backend services. User roles and permissions are enforced at the database level using strict PostgreSQL Row Level Security (RLS) policies to ensure data integrity and security across all staff roles.

---
*Built with ❤️ for 7 Minutes.*
