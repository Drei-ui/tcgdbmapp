# TCG DBM

A full-stack inventory and sales management app built for TCG (Trading Card Game) resellers. Track stock, record purchases, manage sales across multiple channels, monitor cash flow, and generate business reports — all from one dashboard.

## Features

### Dashboard
- Cash balance, inventory value, and 30-day profit at a glance
- Sales stats for today, 7 days, and 30 days
- Low stock alerts and oldest stock indicators
- Recent activity feed (sales, purchases, cash transactions)
- Quick actions for common tasks

### Inventory
- Full inventory lot management with quantity tracking
- Filter by brand, product type, language, status, and condition
- Quick sell directly from inventory list
- Quantity adjustments with audit trail
- Status tracking: On Hand, Reserved, Sold Out

### Sales
- Multi-item sale creation with automatic profit calculation
- Sales channels: FB Page, FB Profile, Meetup, Shipping, Other
- Payment methods: GCash, Maya, Bank, Cash, Mixed
- Sale statuses: Draft, Confirmed, Cancelled, Refunded
- Buyer tracking and shipping cost management

### Purchases
- Record purchases with multiple line items
- Supplier management
- Receive stock into inventory from purchase orders
- Track shipping costs and fees per purchase

### Cash Ledger
- Complete cash-in and cash-out tracking
- Categories: Sale Income, Inventory Buy, Shipping, Supplies, Platform Fees, Capital In
- Transactions linked to sales and purchases
- Running balance calculation

### Reports
- **Profit Report** — Revenue, cost, and profit grouped by day/week/month with date range and filter support
- **Inventory Aging** — Identify slow-moving stock with suggested actions
- **Best Sellers** — Top products by revenue, profit, quantity, or turnover speed
- **Channel Performance** — Revenue and profit breakdown by sales channel
- **Cash Flow** — Income vs expenses with net change and running balance
- CSV export for all report sections

### Exports
- CSV export for inventory, sales, cash transactions, and full data snapshots
- Per-section report exports with applied filters

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript |
| Database | PostgreSQL ([Neon](https://neon.tech)) |
| ORM | [Prisma 6](https://prisma.io) |
| Auth | [Supabase Auth](https://supabase.com) |
| UI | [shadcn/ui](https://ui.shadcn.com) + [Radix UI](https://radix-ui.com) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com) |
| Validation | [Zod 4](https://zod.dev) |
| Hosting | [Vercel](https://vercel.com) |

## Project Structure

```
src/
├── app/
│   ├── (app)/              # Protected routes (dashboard, inventory, sales, etc.)
│   ├── (auth)/             # Login & register pages
│   └── api/export/         # CSV export endpoints
├── components/
│   ├── cash/               # Cash transaction components
│   ├── inventory/          # Inventory list, cards, dialogs
│   ├── layout/             # TopBar, SidebarNav, BottomNav
│   ├── purchases/          # Purchase form & detail
│   ├── reports/            # Report tabs & visualizations
│   ├── sales/              # Sale form & detail
│   └── ui/                 # shadcn/ui base components
└── lib/
    ├── actions/            # Server actions (data fetching & mutations)
    ├── supabase/           # Supabase client & middleware
    ├── prisma.ts           # Prisma client with connection pooling
    ├── utils.ts            # Formatting & helpers
    └── validators.ts       # Zod schemas
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) PostgreSQL database
- A [Supabase](https://supabase.com) project (for authentication)

### Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/Drei-ui/tcgdbmapp.git
   cd tcgdbmapp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   Create `.env` and `.env.local` files:

   ```env
   # .env
   DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
   DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"
   ```

   ```env
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Run database migrations**

   ```bash
   npx prisma migrate deploy
   ```

5. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000)

## Deployment

Deploy to Vercel in one click. Make sure to add all 4 environment variables in the Vercel dashboard:

- `DATABASE_URL` — Neon pooled connection string
- `DIRECT_URL` — Neon direct connection string
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key

## Database Schema

**Core Models:** User, Supplier, ProductCatalog, Purchase, PurchaseLineItem, InventoryLot, Sale, SaleLineItem, CashTransaction, Attachment, AuditLog

**Key Enums:** InventoryStatus, SaleStatus, SalesChannel, PaymentMethod, CashType, CashCategory, ProductType, LanguageType

Full schema in [`prisma/schema.prisma`](prisma/schema.prisma).

## License

Private project. All rights reserved.
