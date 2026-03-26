import { apiRequest, buildQueryString } from '../api'
import type { Group, GroupDetail, GroupExpenseSummary, Expense, PaginatedResponse } from '@cuentas-claras/shared'

export interface GroupListItem extends Group {
  memberCount: number
}

export interface GroupExpenseItem extends Expense {
  userName: string
}

export interface CreateGroupData {
  name: string
  description?: string
}

export interface UpdateGroupData {
  name?: string
  description?: string
}

export interface CreateGroupExpenseData {
  categoryId: string
  amount: number
  date: string
  description?: string
}

export interface GroupExpenseFilters {
  month?: string
  page?: number
}

export const groupsApi = {
  async getAll(): Promise<GroupListItem[]> {
    return apiRequest<GroupListItem[]>('/groups')
  },

  async getDetail(id: string): Promise<GroupDetail> {
    return apiRequest<GroupDetail>(`/groups/${id}`)
  },

  async create(data: CreateGroupData): Promise<Group> {
    return apiRequest<Group>('/groups', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: string, data: UpdateGroupData): Promise<Group> {
    return apiRequest<Group>(`/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async remove(id: string): Promise<void> {
    return apiRequest<void>(`/groups/${id}`, {
      method: 'DELETE',
    })
  },

  async join(inviteCode: string): Promise<Group> {
    return apiRequest<Group>('/groups/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode }),
    })
  },

  async addMember(groupId: string, email: string): Promise<void> {
    return apiRequest<void>(`/groups/${groupId}/members`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    })
  },

  async removeMember(groupId: string, userId: string): Promise<void> {
    return apiRequest<void>(`/groups/${groupId}/members/${userId}`, {
      method: 'DELETE',
    })
  },

  async leave(groupId: string): Promise<void> {
    return apiRequest<void>(`/groups/${groupId}/leave`, {
      method: 'POST',
    })
  },

  async getExpenses(groupId: string, params?: GroupExpenseFilters): Promise<PaginatedResponse<GroupExpenseItem>> {
    const qs = params ? buildQueryString(params as Record<string, unknown>) : ''
    return apiRequest<PaginatedResponse<GroupExpenseItem>>(`/groups/${groupId}/expenses${qs}`)
  },

  async createExpense(groupId: string, data: CreateGroupExpenseData): Promise<Expense> {
    return apiRequest<Expense>(`/groups/${groupId}/expenses`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async getSummary(groupId: string, month?: string): Promise<GroupExpenseSummary> {
    const qs = month ? buildQueryString({ month }) : ''
    return apiRequest<GroupExpenseSummary>(`/groups/${groupId}/summary${qs}`)
  },
}
