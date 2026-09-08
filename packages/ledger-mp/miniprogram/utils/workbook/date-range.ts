import { validDate } from './domain'

// Count civil days, independent of local daylight-saving changes.
export function inclusiveDays(from: string, to: string): number {
  if (!validDate(from) || !validDate(to) || from > to) return 0
  const stamp = (value: string) => {
    const [y, m, d] = value.split('-').map(Number)
    return Date.UTC(y, m - 1, d)
  }
  return (stamp(to) - stamp(from)) / 86400000 + 1
}

export function rangeMonthCells(month: string, from: string, to: string, today: string) {
  if (!validDate(month + '-01')) return []
  const [year, m] = month.split('-').map(Number)
  const cells: {
    id: string
    date: string
    day: number | string
    start: boolean
    end: boolean
    between: boolean
    today: boolean
  }[] = []
  const offset = new Date(year, m - 1, 1).getDay()
  for (let i = 0; i < offset; i++)
    cells.push({
      id: 'blank-' + i,
      date: '',
      day: '',
      start: false,
      end: false,
      between: false,
      today: false,
    })
  const ordered = inclusiveDays(from, to) > 0
  for (let day = 1; day <= new Date(year, m, 0).getDate(); day++) {
    const date = month + '-' + String(day).padStart(2, '0')
    cells.push({
      id: date,
      date,
      day,
      start: date === from,
      end: date === to,
      between: ordered && date >= from && date <= to,
      today: date === today,
    })
  }
  return cells
}
