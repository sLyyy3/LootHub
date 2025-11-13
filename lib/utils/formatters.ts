export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  return num.toFixed(0)
}

export function formatTimeAgo(date: string): string {
  const now = new Date()
  const past = new Date(date)
  const diffMs = now.getTime() - past.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

export function getRarityColor(rarity: string): string {
  const colors: Record<string, string> = {
    common: 'text-gray-400',
    uncommon: 'text-green-400',
    rare: 'text-blue-400',
    epic: 'text-purple-400',
    legendary: 'text-orange-400',
    mythic: 'text-red-400',
  }
  return colors[rarity.toLowerCase()] || 'text-white'
}

export function getRarityGlow(rarity: string): string {
  const glows: Record<string, string> = {
    common: 'border-gray-500',
    uncommon: 'border-green-500 shadow-lg shadow-green-500/50',
    rare: 'border-blue-500 shadow-lg shadow-blue-500/50',
    epic: 'border-purple-500 shadow-lg shadow-purple-500/50',
    legendary: 'border-orange-500 shadow-lg shadow-orange-500/50',
    mythic: 'border-red-500 shadow-lg shadow-red-500/50',
  }
  return glows[rarity.toLowerCase()] || 'border-white'
}

export function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`
}