import { createHash } from 'crypto'

export class ProvablyFairRNG {
  private serverSeed: string
  private clientSeed: string
  private nonce: number
  private currentIndex: number

  constructor(clientSeed: string) {
    this.serverSeed = this.generateServerSeed()
    this.clientSeed = clientSeed
    this.nonce = 0
    this.currentIndex = 0
  }

  private generateServerSeed(): string {
    return createHash('sha256')
      .update(Math.random().toString() + Date.now().toString())
      .digest('hex')
  }

  public generateNumber(min: number, max: number): number {
    const combined = `${this.serverSeed}:${this.clientSeed}:${this.nonce}:${this.currentIndex}`
    const hash = createHash('sha256').update(combined).digest('hex')
    
    const value = parseInt(hash.substring(0, 8), 16) / 0xffffffff
    this.currentIndex++
    
    return Math.floor(value * (max - min + 1)) + min
  }

  public generateFloat(): number {
    const combined = `${this.serverSeed}:${this.clientSeed}:${this.nonce}:${this.currentIndex}`
    const hash = createHash('sha256').update(combined).digest('hex')
    
    const value = parseInt(hash.substring(0, 8), 16) / 0xffffffff
    this.currentIndex++
    
    return value
  }

  public incrementNonce(): void {
    this.nonce++
    this.currentIndex = 0
  }

  public getSeeds() {
    return {
      serverSeed: this.serverSeed,
      serverSeedHash: createHash('sha256').update(this.serverSeed).digest('hex'),
      clientSeed: this.clientSeed,
      nonce: this.nonce,
    }
  }
}

export function selectItemByRarity(lootPool: any[], rng: ProvablyFairRNG): any {
  const roll = rng.generateFloat() * 100
  let cumulative = 0

  for (const item of lootPool) {
    cumulative += item.drop_chance
    if (roll <= cumulative) {
      return item
    }
  }

  return lootPool[lootPool.length - 1]
}