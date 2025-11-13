-- CS2 LootHub Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  coins BIGINT DEFAULT 10000 NOT NULL,
  xp BIGINT DEFAULT 0 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  avatar_url TEXT,
  last_daily_claim TIMESTAMP WITH TIME ZONE,
  clan_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Items/Inventory table
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  rarity TEXT NOT NULL CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'divine')),
  value BIGINT NOT NULL,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Game History table
CREATE TABLE IF NOT EXISTS public.game_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('coinflip', 'crash', 'cases', 'roulette', 'upgrader', 'mines', 'tower')),
  bet_amount BIGINT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('win', 'loss')),
  payout BIGINT DEFAULT 0,
  multiplier NUMERIC(10, 2),
  item_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Transactions table
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'win', 'loss', 'daily_reward', 'referral')),
  amount BIGINT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Clans table
CREATE TABLE IF NOT EXISTS public.clans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  tag TEXT UNIQUE NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  total_xp BIGINT DEFAULT 0,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Messages/Chat table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  channel TEXT DEFAULT 'global' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Achievements table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  achievement_type TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, achievement_type)
);

-- Daily Missions table
CREATE TABLE IF NOT EXISTS public.daily_missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  mission_type TEXT NOT NULL,
  progress INTEGER DEFAULT 0 NOT NULL,
  target INTEGER NOT NULL,
  reward_coins INTEGER NOT NULL,
  reward_xp INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  created_at DATE DEFAULT CURRENT_DATE NOT NULL,
  UNIQUE(user_id, mission_type, created_at)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);
CREATE INDEX IF NOT EXISTS idx_users_coins ON public.users(coins DESC);
CREATE INDEX IF NOT EXISTS idx_users_xp ON public.users(xp DESC);
CREATE INDEX IF NOT EXISTS idx_users_level ON public.users(level DESC);

CREATE INDEX IF NOT EXISTS idx_items_owner ON public.items(owner_id);
CREATE INDEX IF NOT EXISTS idx_items_rarity ON public.items(rarity);

CREATE INDEX IF NOT EXISTS idx_game_history_user ON public.game_history(user_id);
CREATE INDEX IF NOT EXISTS idx_game_history_created ON public.game_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_history_game_type ON public.game_history(game_type);

CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON public.transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_channel ON public.messages(channel);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view all profiles" ON public.users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- RLS Policies for items table
CREATE POLICY "Users can view own items" ON public.items FOR SELECT USING (auth.uid() = owner_id);
CREATE POLICY "Users can insert own items" ON public.items FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can delete own items" ON public.items FOR DELETE USING (auth.uid() = owner_id);

-- RLS Policies for game_history table
CREATE POLICY "Users can view own game history" ON public.game_history FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own game history" ON public.game_history FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for transactions table
CREATE POLICY "Users can view own transactions" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transactions" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for clans table
CREATE POLICY "Anyone can view clans" ON public.clans FOR SELECT USING (true);
CREATE POLICY "Clan owners can update" ON public.clans FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Authenticated users can create clans" ON public.clans FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for messages table
CREATE POLICY "Anyone can view messages" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Authenticated users can send messages" ON public.messages FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- RLS Policies for achievements table
CREATE POLICY "Users can view own achievements" ON public.achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own achievements" ON public.achievements FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily_missions table
CREATE POLICY "Users can view own missions" ON public.daily_missions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own missions" ON public.daily_missions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own missions" ON public.daily_missions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for users table
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate user level from XP
CREATE OR REPLACE FUNCTION calculate_level(xp_amount BIGINT)
RETURNS INTEGER AS $$
BEGIN
    RETURN FLOOR(SQRT(xp_amount / 100));
END;
$$ LANGUAGE plpgsql;

-- Insert some demo data (optional)
-- Uncomment if you want some test data

/*
INSERT INTO public.users (id, email, username, coins, xp, level, is_admin) VALUES
  ('00000000-0000-0000-0000-000000000001', 'demo1@loothub.gg', 'DemoPlayer1', 50000, 10000, 10, false),
  ('00000000-0000-0000-0000-000000000002', 'demo2@loothub.gg', 'ProGamer99', 100000, 50000, 22, false),
  ('00000000-0000-0000-0000-000000000003', 'admin@loothub.gg', 'AdminUser', 1000000, 100000, 31, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.items (owner_id, name, rarity, value) VALUES
  ('00000000-0000-0000-0000-000000000001', 'AK-47 | Redline', 'rare', 500),
  ('00000000-0000-0000-0000-000000000001', 'AWP | Dragon Lore', 'legendary', 5000),
  ('00000000-0000-0000-0000-000000000002', 'Butterfly Knife', 'mythic', 15000);
*/
