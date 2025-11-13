# CS2 LootHub - Ultimate Gaming Platform

A Next.js-based gaming platform inspired by CS2, featuring mini-games, case opening, and competitive gameplay.

## 🚀 Quick Start

### Prerequisites
- Node.js 18.17.0 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/sLyyy3/LootHub.git
cd LootHub
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
The `.env.local` file is already configured with Supabase credentials.

4. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

## 📁 Project Structure

```
LootHub/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # Root layout with fonts and toast
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles and custom CSS
│
├── components/            # React components
│   ├── ui/               # UI components
│   │   ├── Button.tsx    # Reusable button component
│   │   └── Card.tsx      # Card components
│   └── layout/           # Layout components
│       └── Navbar.tsx    # Navigation bar
│
├── lib/                  # Core libraries and utilities
│   ├── supabase/        # Supabase client configuration
│   │   └── client.ts    # Supabase client & admin
│   ├── stores/          # Zustand state management
│   │   └── userStore.ts # User state store
│   ├── hooks/           # Custom React hooks
│   │   └── useUser.ts   # User authentication hook
│   ├── utils/           # Utility functions
│   │   ├── cn.ts        # Class name utility
│   │   ├── formatters.ts # Number formatters
│   │   ├── rng.ts       # Random number generation
│   │   └── validator.ts # Input validation
│   ├── game-logic/      # Game logic
│   │   ├── coinflip.ts  # Coinflip game logic
│   │   ├── crash.ts     # Crash game logic
│   │   ├── claimDaily.ts # Daily rewards
│   │   └── generateLoot.ts # Loot generation
│   └── types/           # TypeScript definitions
│       ├── database.types.ts # Supabase types
│       ├── routes.d.ts  # Route types
│       └── cache-life.d.ts # Cache types
│
├── public/              # Static assets
│   ├── *.svg           # SVG icons and images
│   ├── *.woff2         # Font files
│   └── favicon.ico     # Favicon
│
├── scripts/             # Utility scripts
│   ├── setup-project.js # Project setup script
│   └── setup-games-battles.js # Game setup script
│
└── Configuration files
    ├── package.json
    ├── tsconfig.json
    ├── tailwind.config.js
    ├── next.config.ts
    ├── postcss.config.mjs
    └── eslint.config.mjs
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **State Management**: Zustand
- **UI Components**: Custom components with Lucide icons
- **Animations**: Framer Motion
- **Notifications**: React Hot Toast

## 🎮 Features

- 🎰 Mini-games (Coinflip, Crash, and more)
- 📦 Case opening system
- 🏆 Competitive gameplay
- 👤 User authentication
- 💰 In-game economy
- 📊 User profiles and statistics
- 🎁 Daily rewards

## 📝 Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run setup` - Run project setup script
- `npm run setup:battles` - Run battles setup script

## 🔧 Environment Variables

The following environment variables are configured in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🎨 Customization

### Colors
Edit `tailwind.config.js` to customize the theme colors:
- `game-bg`: Background color
- `game-card`: Card background
- `gold`: Primary accent color
- `red-win`, `green-win`: Game result colors

### Global Styles
Edit `app/globals.css` for custom CSS classes and animations.

## 📦 Building for Production

```bash
npm run build
npm start
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

## 🔗 Links

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com)
