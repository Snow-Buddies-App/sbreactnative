import { Avatar } from 'react-native-paper';

import { initials } from '@/lib/labels';

const PALETTE = ['#04448C', '#5F8A00', '#1E62D0', '#8E44AD', '#C0392B', '#16A085', '#D35400'];

function colorFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export function RiderAvatar({ id, name, size = 44 }: { id: string; name: string; size?: number }) {
  return (
    <Avatar.Text
      size={size}
      label={initials(name)}
      style={{ backgroundColor: colorFor(id) }}
      color="#FFFFFF"
    />
  );
}
