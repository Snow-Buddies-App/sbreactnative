import {
  AudioSession,
  isTrackReference,
  LiveKitRoom,
  registerGlobals,
  useLocalParticipant,
  useRemoteParticipants,
  useTracks,
  VideoTrack,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import type { LocalVideoTrack } from 'livekit-client';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CallRoomProps } from './CallRoom.types';

// Installs the WebRTC globals LiveKit needs. This module is only loaded in
// builds that include the native module (never in Expo Go or on web).
registerGlobals();

/** A 1:1 LiveKit call: remote video full screen, my camera picture-in-picture. */
export default function CallRoom({ url, token, video, otherName, waiting, onHangUp }: CallRoomProps) {
  useEffect(() => {
    void AudioSession.startAudioSession();
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, []);

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect
      audio
      video={video}
      options={{ adaptiveStream: { pixelDensity: 'screen' } }}
      onDisconnected={onHangUp}
    >
      <CallStage video={video} otherName={otherName} waiting={waiting} onHangUp={onHangUp} />
    </LiveKitRoom>
  );
}

function CallStage({ video, otherName, waiting, onHangUp }: Omit<CallRoomProps, 'url' | 'token'>) {
  const remote = useRemoteParticipants();
  const tracks = useTracks([Track.Source.Camera]);
  const { localParticipant, isMicrophoneEnabled, isCameraEnabled } = useLocalParticipant();
  const [facing, setFacing] = useState<'user' | 'environment'>('user');

  const remoteVideo = tracks.find((t) => isTrackReference(t) && !t.participant.isLocal);
  const localVideo = tracks.find((t) => isTrackReference(t) && t.participant.isLocal);
  const connected = remote.length > 0;

  const flipCamera = async () => {
    const next = facing === 'user' ? 'environment' : 'user';
    const track = localParticipant.getTrackPublication(Track.Source.Camera)?.videoTrack as
      | LocalVideoTrack
      | undefined;
    await track?.restartTrack({ facingMode: next });
    setFacing(next);
  };

  return (
    <View style={styles.stage}>
      {remoteVideo && isTrackReference(remoteVideo) ? (
        <VideoTrack trackRef={remoteVideo} style={StyleSheet.absoluteFill} objectFit="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text variant="headlineMedium" style={styles.light}>
            {otherName}
          </Text>
          <Text variant="bodyLarge" style={styles.dim}>
            {waiting ? 'Calling…' : connected ? (video ? 'Camera off' : 'Voice call') : 'Connecting…'}
          </Text>
        </View>
      )}

      {video && localVideo && isTrackReference(localVideo) && isCameraEnabled && (
        <VideoTrack trackRef={localVideo} style={styles.pip} objectFit="cover" mirror={facing === 'user'} zOrder={1} />
      )}

      <SafeAreaView edges={['bottom']} style={styles.controls}>
        <IconButton
          icon={isMicrophoneEnabled ? 'microphone' : 'microphone-off'}
          mode="contained"
          size={28}
          onPress={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
          accessibilityLabel={isMicrophoneEnabled ? 'Mute' : 'Unmute'}
        />
        {video && (
          <IconButton
            icon={isCameraEnabled ? 'video' : 'video-off'}
            mode="contained"
            size={28}
            onPress={() => void localParticipant.setCameraEnabled(!isCameraEnabled)}
            accessibilityLabel={isCameraEnabled ? 'Turn camera off' : 'Turn camera on'}
          />
        )}
        {video && isCameraEnabled && (
          <IconButton
            icon="camera-flip"
            mode="contained"
            size={28}
            onPress={() => void flipCamera()}
            accessibilityLabel="Flip camera"
          />
        )}
        <IconButton
          icon="phone-hangup"
          mode="contained"
          containerColor="#C62828"
          iconColor="#FFFFFF"
          size={32}
          onPress={onHangUp}
          accessibilityLabel="Hang up"
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { flex: 1, backgroundColor: '#0B1F33' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  light: { color: '#FFFFFF' },
  dim: { color: '#FFFFFF', opacity: 0.7 },
  pip: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 110,
    height: 160,
    borderRadius: 12,
    overflow: 'hidden',
  },
  controls: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
});
