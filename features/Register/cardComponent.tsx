import { View, StyleSheet, Text } from 'react-native';

const CardComponent = () => {
  return (
    <View style={styles.cardBox}>
      <View style={styles.cardFlex}>
        <Text style={styles.cardText}>
          Lorem ipsum dolor sit amet consectetur, adipisicing elit.
        </Text>
        <View style={styles.rectangleFlex}>
          <View style={styles.rectanglePagination}></View>
          <View style={styles.rectanglePagination}></View>
          <View style={styles.rectanglePagination}></View>
        </View>
      </View>
    </View>
  );
};

export default CardComponent;

const styles = StyleSheet.create({
  cardBox: {
    width: 315,
    height: 134,
    backgroundColor: 'rgba(144, 189, 225, .6)',
    borderRadius: 5,
    marginBottom: 15,
    justifyContent: 'center',
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
