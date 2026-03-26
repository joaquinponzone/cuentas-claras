export const GROUP_ROLES = ['owner', 'member'] as const
export type GroupRole = (typeof GROUP_ROLES)[number]
