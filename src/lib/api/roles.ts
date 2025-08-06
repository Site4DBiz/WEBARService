import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/types/database'

export interface Permission {
  id: string
  resource: string
  action: string
  role: UserRole
}

export interface RoleAssignment {
  id: string
  user_id: string
  role: UserRole
  assigned_by: string | null
  reason: string | null
  created_at: string
  expires_at: string | null
}

export async function getUserRole(userId?: string): Promise<UserRole | null> {
  const supabase = createClient()

  const targetUserId = userId || (await supabase.auth.getUser()).data.user?.id

  if (!targetUserId) {
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', targetUserId)
    .single()

  if (error || !data) {
    console.error('Error fetching user role:', error)
    return null
  }

  return data.role
}

export async function checkPermission(resource: string, action: string): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('check_permission', {
    p_resource: resource,
    p_action: action,
  })

  if (error) {
    console.error('Error checking permission:', error)
    return false
  }

  return data || false
}

export async function getPermissions(role?: UserRole): Promise<Permission[]> {
  const supabase = createClient()

  let query = supabase.from('permissions').select('*')

  if (role) {
    query = query.eq('role', role)
  }

  const { data, error } = await query.order('resource', { ascending: true })

  if (error) {
    console.error('Error fetching permissions:', error)
    return []
  }

  return data || []
}

export async function assignRole(
  userId: string,
  role: UserRole,
  reason?: string,
  expiresAt?: Date
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const hasPermission = await checkPermission('user', 'update')

  if (!hasPermission) {
    return { success: false, error: 'Insufficient permissions' }
  }

  const { error: updateError } = await supabase.from('profiles').update({ role }).eq('id', userId)

  if (updateError) {
    console.error('Error updating user role:', updateError)
    return { success: false, error: updateError.message }
  }

  const { error: assignmentError } = await supabase.from('role_assignments').insert({
    user_id: userId,
    role,
    assigned_by: user.id,
    reason,
    expires_at: expiresAt?.toISOString(),
  })

  if (assignmentError) {
    console.error('Error creating role assignment:', assignmentError)
  }

  return { success: true }
}

export async function getRoleAssignments(userId: string): Promise<RoleAssignment[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('role_assignments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching role assignments:', error)
    return []
  }

  return data || []
}

export async function getUsersByRole(role: UserRole) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, full_name, role, created_at')
    .eq('role', role)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching users by role:', error)
    return []
  }

  return data || []
}

export async function canUpdateRole(): Promise<boolean> {
  const supabase = createClient()

  const { data, error } = await supabase.rpc('can_update_role')

  if (error) {
    console.error('Error checking role update permission:', error)
    return false
  }

  return data || false
}

export function hasRole(userRole: UserRole | null, allowedRoles: UserRole[]): boolean {
  if (!userRole) return false
  return allowedRoles.includes(userRole)
}

export function isAdmin(userRole: UserRole | null): boolean {
  return userRole === 'admin'
}

export function isModerator(userRole: UserRole | null): boolean {
  return userRole === 'moderator' || userRole === 'admin'
}

export function isCreator(userRole: UserRole | null): boolean {
  return userRole === 'creator' || userRole === 'moderator' || userRole === 'admin'
}

export function canCreateContent(userRole: UserRole | null): boolean {
  return isCreator(userRole)
}

export function canModerateContent(userRole: UserRole | null): boolean {
  return isModerator(userRole)
}

export function canManageUsers(userRole: UserRole | null): boolean {
  return isAdmin(userRole)
}
