import { formatDayShort } from '../domain/dates'
import type { CellState } from '../domain/stats'
import type { Day } from '../domain/types'

const STATE_WORDS: Record<CellState['kind'], string> = {
  done: 'done',
  missed: 'not done',
  pending: 'not done yet',
  off: 'not planned',
  future: 'in the future',
  before: 'before this chart started',
}

/** What a day's state is called in tooltips and for screen readers. */
export function stateWords(state: CellState): string {
  return STATE_WORDS[state.kind]
}

/** "Mon 9 Nov · done" */
export function describeCell(day: Day, state: CellState): string {
  return `${formatDayShort(day)} · ${stateWords(state)}`
}
