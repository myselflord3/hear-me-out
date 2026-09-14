export type VoteChoice = 'YES' | 'NO'

export interface VoteRecord {
  id: string
  motion_id: string
  user_id: string
  display_name: string
  choice: VoteChoice
  created_at?: string
  updated_at: string
}

export interface VoteTally {
  yes: number
  no: number
  total: number
  yesPercent: number
  noPercent: number
}

/**
 * Anonymizes user full name to "First name + Last initial"
 * Example:
 * "Tanmay Kashyap" -> "Tanmay K."
 * "Aarav Patel" -> "Aarav P."
 * "Riya" -> "Riya"
 * Raw emails are NEVER exposed.
 */
export function formatDisplayName(fullName?: string | null, email?: string | null): string {
  if (fullName && fullName.trim().length > 0) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 1) {
      return capitalize(parts[0])
    }
    const first = capitalize(parts[0])
    const lastInitial = parts[parts.length - 1][0].toUpperCase()
    return `${first} ${lastInitial}.`
  }

  if (email && email.includes('@')) {
    const prefix = email.split('@')[0]
    const clean = prefix.replace(/[^a-zA-Z]/g, ' ').trim().split(/\s+/).filter(Boolean)
    if (clean.length >= 2) {
      return `${capitalize(clean[0])} ${clean[clean.length - 1][0].toUpperCase()}.`
    }
    if (clean.length === 1 && clean[0].length > 0) {
      return `${capitalize(clean[0])}`
    }
  }

  return 'Audience Member'
}

function capitalize(word: string): string {
  if (!word) return ''
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
}

/**
 * Calculates current counts and rounded percentages.
 */
export function calculateTally(votes: Array<{ choice: VoteChoice }>): VoteTally {
  const total = votes.length
  if (total === 0) {
    return {
      yes: 0,
      no: 0,
      total: 0,
      yesPercent: 0,
      noPercent: 0,
    }
  }

  const yes = votes.filter((v) => v.choice === 'YES').length
  const no = total - yes

  const yesPercent = Math.round((yes / total) * 100)
  const noPercent = 100 - yesPercent

  return {
    yes,
    no,
    total,
    yesPercent,
    noPercent,
  }
}
