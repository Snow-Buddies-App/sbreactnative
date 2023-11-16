import { View, StyleSheet, Text, ScrollView, Dimensions } from 'react-native';

// TODO **
// ADD functionality to pagination

const CardComponent = () => {
  const CARD_SPACING = 20;
  const CARD_WIDTH = 315;
  const ITEM_WIDTH = CARD_WIDTH + CARD_SPACING;
  const data = [
    {
      title: 'This is the first card',
    },
    {
      title: 'This is the second card',
    },
    {
      title: 'This is the third card',
    },
  ];
  return (
    <ScrollView
      horizontal={true}
      snapToInterval={ITEM_WIDTH}
      decelerationRate={'fast'}
      bounces={false}
      showsHorizontalScrollIndicator={false}
    >
      {data.map((item, i) => {
        return (
          <View key={i} style={{ width: ITEM_WIDTH }}>
            <View style={styles.cardBox}>
              <View style={styles.cardFlex}>
                <Text style={styles.cardText}>{item.title}</Text>
                <View style={styles.rectangleFlex}>
                  <View style={styles.rectanglePagination}></View>
                  <View style={styles.rectanglePagination}></View>
                  <View style={styles.rectanglePagination}></View>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

export default CardComponent;

const styles = StyleSheet.create({
  cardBox: {
    height: 134,
    backgroundColor: 'rgba(144, 189, 225, .6)',
    borderRadius: 5,
    marginBottom: 15,
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  cardFlex: {
    alignItems: 'center',
    gap: 30,
  },
  cardText: {
    color: '#04448C',
    fontWeight: 'bold',
    fontSize: 14,
    paddingHorizontal: 45,
    textAlign: 'center',
    lineHeight: 20,
  },
  rectangleFlex: {
    flexDirection: 'row',
    gap: 4,
  },
  rectanglePagination: {
    width: 12,
    height: 2,
    backgroundColor: '#04448C',
    borderRadius: 5,
  },
});
