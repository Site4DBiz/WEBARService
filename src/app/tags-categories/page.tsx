import { TagCategoryManager } from '@/components/admin/TagCategoryManager'
import { RoleGuard } from '@/components/auth/RoleGuard'

export default function TagsCategoriesPage() {
  return (
    <RoleGuard allowedRoles={['admin']}>
      <TagCategoryManager />
    </RoleGuard>
  )
}