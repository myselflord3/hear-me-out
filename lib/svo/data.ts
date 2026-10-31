export type OrientationType = 'prosocial' | 'individualistic' | 'competitive' | 'unclassified'
export type ChoiceKey = 'A' | 'B' | 'C'
export type PhaseType = 'pre' | 'post'

export interface SVOOption {
  you: number
  other: number
  type: 'prosocial' | 'individualistic' | 'competitive'
}

export interface SVOQuestion {
  id: number
  options: {
    A: SVOOption
    B: SVOOption
    C: SVOOption
  }
}

export interface SVOResponseRecord {
  id?: string
  motion_id: string
  user_id: string
  display_name: string
  email?: string
  phase: PhaseType
  orientation: OrientationType
  choices: Record<number, ChoiceKey>
  prosocial_count: number
  individualistic_count: number
  competitive_count: number
  updated_at: string
}

export const SVO_QUESTIONS: SVOQuestion[] = [
  {
    id: 1,
    options: {
      A: { you: 480, other: 80, type: 'competitive' },
      B: { you: 540, other: 280, type: 'individualistic' },
      C: { you: 480, other: 480, type: 'prosocial' },
    },
  },
  {
    id: 2,
    options: {
      A: { you: 560, other: 300, type: 'individualistic' },
      B: { you: 500, other: 500, type: 'prosocial' },
      C: { you: 500, other: 100, type: 'competitive' },
    },
  },
  {
    id: 3,
    options: {
      A: { you: 520, other: 520, type: 'prosocial' },
      B: { you: 520, other: 120, type: 'competitive' },
      C: { you: 580, other: 320, type: 'individualistic' },
    },
  },
  {
    id: 4,
    options: {
      A: { you: 500, other: 100, type: 'competitive' },
      B: { you: 560, other: 300, type: 'individualistic' },
      C: { you: 490, other: 490, type: 'prosocial' },
    },
  },
  {
    id: 5,
    options: {
      A: { you: 560, other: 300, type: 'individualistic' },
      B: { you: 500, other: 500, type: 'prosocial' },
      C: { you: 490, other: 90, type: 'competitive' },
    },
  },
  {
    id: 6,
    options: {
      A: { you: 500, other: 500, type: 'prosocial' },
      B: { you: 500, other: 100, type: 'competitive' },
      C: { you: 570, other: 300, type: 'individualistic' },
    },
  },
  {
    id: 7,
    options: {
      A: { you: 510, other: 510, type: 'prosocial' },
      B: { you: 560, other: 300, type: 'individualistic' },
      C: { you: 510, other: 110, type: 'competitive' },
    },
  },
  {
    id: 8,
    options: {
      A: { you: 550, other: 300, type: 'individualistic' },
      B: { you: 500, other: 100, type: 'competitive' },
      C: { you: 500, other: 500, type: 'prosocial' },
    },
  },
  {
    id: 9,
    options: {
      A: { you: 480, other: 100, type: 'competitive' },
      B: { you: 490, other: 490, type: 'prosocial' },
      C: { you: 540, other: 300, type: 'individualistic' },
    },
  },
]

export const ORIENTATION_DESCRIPTIONS: Record<
  OrientationType,
  {
    title: string
    subtitle: string
    badge: string
    emoji: string
    color: string
    description: string
  }
> = {
  prosocial: {
    title: 'PROSOCIAL',
    subtitle: 'The Altruist & Equalizer',
    badge: 'COOPERATIVE',
    emoji: '🤝',
    color: '#10b981',
    description:
      'You prioritize equality and collective wellbeing. You prefer outcomes where both you and the stranger gain equally, maximizing joint welfare.',
  },
  individualistic: {
    title: 'INDIVIDUALISTIC',
    subtitle: 'The Pragmatist',
    badge: 'SELF-MAXIMIZER',
    emoji: '👤',
    color: '#f59e0b',
    description:
      'You prioritize your own absolute gain without hostility. You want the highest possible payout for yourself, indifferent to what the other person receives.',
  },
  competitive: {
    title: 'COMPETITIVE',
    subtitle: 'The Dominator (The Dark Edge)',
    badge: 'RELATIVE ADVANTAGE',
    emoji: '⚔️',
    color: '#dc2626',
    description:
      'You are driven by relative superiority. You would willingly take fewer absolute points as long as you maintain a bigger advantage over the other person.',
  },
  unclassified: {
    title: 'UNCLASSIFIED',
    subtitle: 'Context-Dependent / Fluid',
    badge: 'MIXED',
    emoji: '🎭',
    color: '#8b5cf6',
    description:
      'Your choices reflect a balance of motives depending on the exact stakes, showing both self-interest and cooperation in different contexts.',
  },
}

/**
 * Calculates SVO orientation based on Van Lange et al. (1997) rule:
 * 6 or more consistent choices out of 9 defines the orientation.
 */
export function calculateSVO(choices: Record<number, ChoiceKey>): {
  orientation: OrientationType
  prosocialCount: number
  individualisticCount: number
  competitiveCount: number
} {
  let prosocialCount = 0
  let individualisticCount = 0
  let competitiveCount = 0

  SVO_QUESTIONS.forEach((q) => {
    const chosen = choices[q.id]
    if (chosen && q.options[chosen]) {
      const type = q.options[chosen].type
      if (type === 'prosocial') prosocialCount++
      else if (type === 'individualistic') individualisticCount++
      else if (type === 'competitive') competitiveCount++
    }
  })

  let orientation: OrientationType = 'unclassified'
  if (prosocialCount >= 6) orientation = 'prosocial'
  else if (individualisticCount >= 6) orientation = 'individualistic'
  else if (competitiveCount >= 6) orientation = 'competitive'
  else {
    // If not strictly 6, find dominant for helpful feedback
    if (prosocialCount > individualisticCount && prosocialCount > competitiveCount) {
      orientation = 'prosocial'
    } else if (individualisticCount > prosocialCount && individualisticCount > competitiveCount) {
      orientation = 'individualistic'
    } else if (competitiveCount > prosocialCount && competitiveCount > individualisticCount) {
      orientation = 'competitive'
    }
  }

  return {
    orientation,
    prosocialCount,
    individualisticCount,
    competitiveCount,
  }
}

