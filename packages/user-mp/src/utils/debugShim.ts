type DebugLogger = {
  (...args: unknown[]): void
  namespace: string
  enabled: boolean
  extend: (suffix: string) => DebugLogger
}

type DebugFactory = {
  (namespace: string): DebugLogger
  enable: (namespaces: string) => void
  disable: () => string
  enabled: (namespace: string) => boolean
}

function createLogger(namespace: string): DebugLogger {
  const logger = (() => {}) as DebugLogger
  logger.namespace = namespace
  logger.enabled = false
  logger.extend = (suffix: string) => createLogger(namespace ? `${namespace}:${suffix}` : suffix)
  return logger
}

const debug = ((namespace: string) => createLogger(namespace)) as DebugFactory

debug.enable = () => {}
debug.disable = () => ''
debug.enabled = () => false

export default debug
