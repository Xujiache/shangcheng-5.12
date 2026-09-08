import type { NestExpressApplication } from '@nestjs/platform-express'
import { json, type Request, type Response, type NextFunction } from 'express'

export function configureWorkbookBodyParser(app: NestExpressApplication): void {
  const parseWorkbook = json({ limit: '8mb' })
  // Nest detects installed parsers by function name, even on scoped routes.
  // Do not mount jsonParser directly: that suppresses the global JSON parser
  // (including rawBody capture for payment notifications).
  app.use('/api/v1/l/workbook/sync', function workbookBodyParser(
    req: Request, res: Response, next: NextFunction,
  ) {
    parseWorkbook(req, res, next)
  })
}
