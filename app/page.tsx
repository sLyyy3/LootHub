import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Gamepad2, Trophy, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center max-w-4xl">
        <h1 className="text-6xl md:text-8xl font-bold mb-6">
          <span className="text-gradient-gold">CS2 LootHub</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-300 mb-8">
          The Ultimate CS2 Mini-Games & Loot Platform
        </p>
        <p className="text-lg text-gray-400 mb-12">
          Play thrilling games, unbox legendary items, compete with friends!
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <Link href="/signup">
            <Button variant="primary" size="lg" className="min-w-[200px]">
              <Sparkles className="w-5 h-5 mr-2" />
              Start Playing Free
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg" className="min-w-[200px]">
              Sign In
            </Button>
          </Link>
        </div>

        <p className="text-sm text-gray-500">
          🎁 New players get 10,000 free coins!
        </p>
      </div>
    </div>
  )
}