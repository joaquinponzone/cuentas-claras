export interface Group {
  id: string
  name: string
  description: string | null
  inviteCode: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface UserGroup {
  userId: string
  groupId: string
  role: 'owner' | 'member'
  joinedAt: string
}

export interface GroupMember {
  userId: string
  name: string
  email: string
  role: 'owner' | 'member'
  joinedAt: string
}

export interface GroupDetail extends Group {
  members: GroupMember[]
  memberCount: number
}

export interface GroupExpenseSummary {
  totalExpenses: number
  expenseCount: number
  byMember: { userId: string; name: string; total: number }[]
}
