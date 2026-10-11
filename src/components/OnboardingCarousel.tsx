import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { brand } from '@/theme';

const CARD_SPACING = 15;
const CARD_WIDTH = 315;
const ITEM_WIDTH = CARD_WIDTH + CARD_SPACING;

const cards = [
  { title: 'Find riders who match your level, sport and home mountain.' },
  { title: 'Plan ride days and let buddies join your crew.' },
  { title: 'Chat with your buddies and see the trail map with your location.' },
];

const OnboardingCarousel = () => {
  const [active, setActive] = useState(0);

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / ITEM_WIDTH);
    setActive(Math.max(0, Math.min(cards.length - 1, index)));
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.scroller}
        horizontal
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={32}
      >
        {cards.map((item, i) => (
          <View key={i} style={{ width: ITEM_WIDTH }}>
            <View style={styles.cardBox}>
              <Text style={styles.cardText}>{item.title}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
      <View style={styles.rectangleFlex}>
        {cards.map((_, j) => (
          <View
            key={j}
            style={j === active ? styles.rectanglePaginationActive : styles.rectanglePagination}
          />
        ))}
      </View>
    </View>
  );
};

export default OnboardingCarousel;

const styles = StyleSheet.create({
  wrapper: { width: ITEM_WIDTH, alignItems: 'center', marginBottom: 15 },
  scroller: { width: ITEM_WIDTH, flexGrow: 0 },
  cardBox: {
    height: 120,
    backgroundColor: 'rgba(144, 189, 225, .6)',
    borderRadius: 5,
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  cardText: {
    color: brand.navy,
    fontWeight: 'bold',
    fontSize: 15,
    paddingHorizontal: 30,
    textAlign: 'center',
    lineHeight: 21,
  },
  rectangleFlex: { flexDirection: 'row', gap: 4, marginTop: 12 },
  rectanglePagination: { width: 12, height: 2, backgroundColor: brand.navy, borderRadius: 5 },
  rectanglePaginationActive: { width: 12, height: 2, backgroundColor: brand.lime, borderRadius: 5 },
});
