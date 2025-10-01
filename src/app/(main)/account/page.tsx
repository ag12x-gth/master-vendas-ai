
import { UserProfileForm } from '@/components/profile/user-profile-form';
import { PageHeader } from '@/components/page-header';

export default function AccountPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Minha Conta"
        description="Gerencie suas informações pessoais, de segurança e configurações globais da conta."
      />
      <UserProfileForm />
    </div>
  );
}
