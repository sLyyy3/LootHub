# 🚀 CS2 LootHub - Setup Guide

## Prerequisites

- Node.js 18.17.0 or higher
- A Supabase account (free tier works!)
- Git

## 📝 Step-by-Step Setup

### 1. Supabase Project Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for your project to be ready (takes ~2 minutes)
3. Go to **Project Settings** → **API**
4. Copy your:
   - `Project URL`
   - `anon public` key
   - `service_role` key (under Service Role, click "Reveal")

### 2. Database Setup

1. In your Supabase project, go to **SQL Editor**
2. Open the file `scripts/supabase-setup.sql` from this project
3. Copy and paste the entire SQL script into the Supabase SQL Editor
4. Click **Run** to execute
5. Verify all tables were created in **Table Editor**

You should see these tables:
- ✅ users
- ✅ items
- ✅ game_history
- ✅ transactions
- ✅ clans
- ✅ messages
- ✅ achievements
- ✅ daily_missions

### 3. Environment Variables

1. Create a `.env.local` file in the root directory (or edit the existing one)
2. Add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important:** Replace `your_project_url_here`, `your_anon_key_here`, and `your_service_role_key_here` with your actual Supabase credentials!

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## ✅ Testing the App

### Create Your First Account

1. Go to http://localhost:3000
2. Click **Start Playing Free**
3. Fill in:
   - Username (min 3 characters)
   - Email
   - Password (min 6 characters)
4. Click **Create Account**
5. You'll receive **10,000 free coins** to start!

### Try the Games

1. **Coinflip** - Simple 50/50 game, double or nothing
2. **Crash** - Cash out before it crashes!
3. **Cases** - Open lootboxes to win items

### Check Your Profile

1. Click your username in the navbar
2. View your stats, game history, and more

### Visit the Leaderboard

1. Navigate to Leaderboard
2. See top players by Coins, XP, Level, or Wins

### Manage Your Inventory

1. Go to Inventory
2. View all items you've won from cases
3. Sell items for coins

## 🎮 Current Features

- ✅ User Authentication (Signup/Login)
- ✅ Dashboard with Stats
- ✅ 3 Playable Games (Coinflip, Crash, Cases)
- ✅ Profile System
- ✅ Leaderboards (4 categories)
- ✅ Inventory System
- ✅ Daily Rewards
- ✅ Game History Tracking
- ✅ XP & Leveling System

## 🔧 Troubleshooting

### "Failed to fetch" errors

- Make sure your `.env.local` file has the correct Supabase credentials
- Check that your Supabase project is active
- Restart the dev server after changing `.env.local`

### "Cannot find module" errors

- Run `npm install` again
- Delete `node_modules` and `package-lock.json`, then run `npm install`

### Database errors

- Make sure you ran the full SQL setup script in Supabase
- Check **Table Editor** in Supabase to verify all tables exist
- Check RLS policies are enabled

### Build errors

- Run `npm run build` to see detailed error messages
- Make sure all dependencies are installed
- Check that TypeScript has no errors

## 📚 Next Steps

The core game is now functional! Here are some features you can add next:

- [ ] Chat System
- [ ] Clan System
- [ ] More Games (Roulette, Upgrader, Mines, Tower)
- [ ] Trading System
- [ ] Achievements
- [ ] Daily Missions
- [ ] AI Loot Generator
- [ ] Admin Dashboard
- [ ] Sound Effects
- [ ] More Animations

## 🚀 Deployment

When you're ready to deploy:

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add your environment variables in Vercel settings
5. Deploy!

## 💡 Tips

- Always check the browser console for errors
- Use the Supabase dashboard to view your data
- Test with multiple accounts to see the leaderboard in action
- Join the Discord if you need help (if available)

## 🎉 You're Ready!

Your CS2 LootHub is now up and running! Have fun playing and customizing it! 🎮
