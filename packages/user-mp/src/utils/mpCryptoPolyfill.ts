function getRandomValues<T extends Uint8Array>(array: T): T {
  for (let i = 0; i < array.length; i += 1) {
    array[i] = Math.floor(Math.random() * 256)
  }
  return array
}

export function installMpCryptoPolyfill() {
  const g = globalThis as any
  if (g.crypto?.getRandomValues) return

  const cryptoShim = { ...(g.crypto || {}), getRandomValues }
  try {
    Object.defineProperty(g, 'crypto', {
      value: cryptoShim,
      configurable: true,
      enumerable: false,
      writable: true,
    })
  } catch {
    g.crypto = cryptoShim
  }
}

installMpCryptoPolyfill()
