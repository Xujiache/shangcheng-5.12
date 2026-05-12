export interface PageQuery {
  page?: number | string
  pageSize?: number | string
}

export interface Pagination<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  hasMore?: boolean
}

export function parsePage(q: PageQuery): { skip: number; take: number; page: number; pageSize: number } {
  const page = Math.max(1, Number(q.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 20))
  return { skip: (page - 1) * pageSize, take: pageSize, page, pageSize }
}

export function buildPage<T>(list: T[], total: number, page: number, pageSize: number): Pagination<T> {
  return { list, total, page, pageSize, hasMore: page * pageSize < total }
}
