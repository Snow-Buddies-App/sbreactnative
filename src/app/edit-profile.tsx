import { router } from 'expo-router';

import { ProfileForm } from '@/components/ProfileForm';
import { useCurrentProfile } from '@/providers/AuthProvider';

export default function EditProfileScreen() {
  const profile = useCurrentProfile();
  return <ProfileForm profile={profile} submitLabel="Save" onSaved={() => router.back()} />;
}
