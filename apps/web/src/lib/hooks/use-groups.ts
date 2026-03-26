import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  groupsApi,
  type CreateGroupData,
  type UpdateGroupData,
  type CreateGroupExpenseData,
  type GroupExpenseFilters,
} from '../api/groups-api'

export const GROUP_KEYS = {
  all: ['groups'] as const,
  list: () => ['groups', 'list'] as const,
  detail: (id: string) => ['groups', 'detail', id] as const,
  expenses: (id: string, params?: GroupExpenseFilters) => ['groups', 'expenses', id, params] as const,
  summary: (id: string, month?: string) => ['groups', 'summary', id, month] as const,
}

export function useGroups() {
  return useQuery({
    queryKey: GROUP_KEYS.list(),
    queryFn: () => groupsApi.getAll(),
  })
}

export function useGroupDetail(id: string) {
  return useQuery({
    queryKey: GROUP_KEYS.detail(id),
    queryFn: () => groupsApi.getDetail(id),
    enabled: !!id,
  })
}

export function useGroupExpenses(id: string, params?: GroupExpenseFilters) {
  return useQuery({
    queryKey: GROUP_KEYS.expenses(id, params),
    queryFn: () => groupsApi.getExpenses(id, params),
    enabled: !!id,
    placeholderData: (prev) => prev,
  })
}

export function useGroupSummary(id: string, month?: string) {
  return useQuery({
    queryKey: GROUP_KEYS.summary(id, month),
    queryFn: () => groupsApi.getSummary(id, month),
    enabled: !!id,
  })
}

export function useCreateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGroupData) => groupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.list() })
    },
  })
}

export function useUpdateGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateGroupData }) =>
      groupsApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.list() })
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.detail(id) })
    },
  })
}

export function useDeleteGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => groupsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.list() })
    },
  })
}

export function useJoinGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (inviteCode: string) => groupsApi.join(inviteCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.list() })
    },
  })
}

export function useAddMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, email }: { groupId: string; email: string }) =>
      groupsApi.addMember(groupId, email),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.detail(groupId) })
    },
  })
}

export function useRemoveMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, userId }: { groupId: string; userId: string }) =>
      groupsApi.removeMember(groupId, userId),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.detail(groupId) })
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.list() })
    },
  })
}

export function useLeaveGroup() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (groupId: string) => groupsApi.leave(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.all })
    },
  })
}

export function useCreateGroupExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ groupId, data }: { groupId: string; data: CreateGroupExpenseData }) =>
      groupsApi.createExpense(groupId, data),
    onSuccess: (_, { groupId }) => {
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.expenses(groupId) })
      queryClient.invalidateQueries({ queryKey: GROUP_KEYS.summary(groupId) })
    },
  })
}
