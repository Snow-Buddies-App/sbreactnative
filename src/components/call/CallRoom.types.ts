export type CallRoomProps = {
  url: string;
  token: string;
  video: boolean;
  otherName: string;
  /** True until the other person has answered. */
  waiting: boolean;
  onHangUp: () => void;
};
