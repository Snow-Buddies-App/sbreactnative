import type { CallRoomProps } from './CallRoom.types';

// Calls aren't available on web; the call screen never renders this.
export default function CallRoom(_props: CallRoomProps) {
  return null;
}
