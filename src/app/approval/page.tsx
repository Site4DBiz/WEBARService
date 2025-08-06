import { ContentApprovalWorkflow } from '@/components/approval/ContentApprovalWorkflow'
import { RoleGuard } from '@/components/auth/RoleGuard'

export default function ApprovalPage() {
  return (
    <RoleGuard allowedRoles={['admin', 'moderator']}>
      <ContentApprovalWorkflow />
    </RoleGuard>
  )
}