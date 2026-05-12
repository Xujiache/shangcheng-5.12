const DEFAULT_ALPHABET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz-'

function randomIndex(max: number) {
  return Math.floor(Math.random() * max)
}

export function customAlphabet(alphabet: string, defaultSize = 21) {
  return (size = defaultSize) =>
    Array.from({ length: size }, () => alphabet[randomIndex(alphabet.length)]).join('')
}

export const nanoid = customAlphabet(DEFAULT_ALPHABET)

export default nanoid
