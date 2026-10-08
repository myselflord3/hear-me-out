export type VoteChoice = string

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
  // Generic labels
  option1Count: number
  option2Count: number
  option1Percent: number
  option2Percent: number
  total: number

  // Backward compatibility for M4
  yes: number
  no: number
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
 * Calculates current counts and rounded percentages for any two options.
 * Defaults to 'YES' and 'NO' for M4 backward compatibility.
 */
export function calculateTally(
  votes: Array<{ choice: string }>,
  option1Key: string = 'YES',
  option2Key: string = 'NO'
): VoteTally {
  const total = votes.length
  if (total === 0) {
    return {
      option1Count: 0,
      option2Count: 0,
      option1Percent: 0,
      option2Percent: 0,
      total: 0,
      yes: 0,
      no: 0,
      yesPercent: 0,
      noPercent: 0,
    }
  }

  const opt1Count = votes.filter((v) => v.choice === option1Key).length
  const opt2Count = total - opt1Count

  const opt1Percent = Math.round((opt1Count / total) * 100)
  const opt2Percent = 100 - opt1Percent

  return {
    option1Count: opt1Count,
    option2Count: opt2Count,
    option1Percent: opt1Percent,
    option2Percent: opt2Percent,
    total,
    yes: opt1Count,
    no: opt2Count,
    yesPercent: opt1Percent,
    noPercent: opt2Percent,
  }
}
