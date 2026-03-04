'use client';

import { useAppNavigate } from '../../../src/hooks/useAppNavigate';
import ProfilePage from '../../../src/components/pages/ProfilePage';

export default function ProfileRoute() {
  const onNavigate = useAppNavigate();
  return <ProfilePage onNavigate={onNavigate} />;
}
