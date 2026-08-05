import { PageHeader } from "@/components/page-header";
import { UsersTable } from "@/components/admin/users-table";
import { listUsersForAdmin } from "@/lib/admin-users";

export default async function AdminUsersPage() {
  const { users, totalCount } = await listUsersForAdmin();

  return (
    <div>
      <PageHeader
        title="Users"
        description={
          totalCount > users.length
            ? `Showing the ${users.length} most recent of ${totalCount} users.`
            : `${totalCount} user${totalCount === 1 ? "" : "s"} registered.`
        }
      />
      <UsersTable initialUsers={users} />
    </div>
  );
}
