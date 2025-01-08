import React, { useState, useRef } from "react";
import { View, Text, StyleSheet, PanResponder } from "react-native";
import Svg, { Circle, Line } from "react-native-svg";

const AnalogClockInput = () => {
  const [angle, setAngle] = useState(0);
  const clockRadius = 100;
  const hourHandLength = 50;
  const minuteHandLength = 70;

  // 初期のパンダウンイベント（時計の針のドラッグ）
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (e, gestureState) => {
        const x = gestureState.moveX - clockRadius;
        const y = gestureState.moveY - clockRadius;
        const newAngle = Math.atan2(y, x) * (180 / Math.PI);
        setAngle(newAngle);
      },
    })
  ).current;

  // 時計の針の位置を計算
  const hourX =
    clockRadius + hourHandLength * Math.cos((angle - 90) * (Math.PI / 180));
  const hourY =
    clockRadius + hourHandLength * Math.sin((angle - 90) * (Math.PI / 180));

  const minuteX =
    clockRadius + minuteHandLength * Math.cos((angle - 90) * (Math.PI / 180));
  const minuteY =
    clockRadius + minuteHandLength * Math.sin((angle - 90) * (Math.PI / 180));

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analog Clock Input</Text>
      <View {...panResponder.panHandlers} style={styles.clockContainer}>
        <Svg height="200" width="200">
          <Circle
            cx="100"
            cy="100"
            r={clockRadius}
            stroke="black"
            strokeWidth="2"
            fill="white"
          />
          <Line
            x1="100"
            y1="100"
            x2={hourX}
            y2={hourY}
            stroke="black"
            strokeWidth="6"
          />
          <Line
            x1="100"
            y1="100"
            x2={minuteX}
            y2={minuteY}
            stroke="gray"
            strokeWidth="4"
          />
        </Svg>
      </View>
      <Text style={styles.timeDisplay}>Angle: {angle.toFixed(2)}°</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  clockContainer: {
    marginBottom: 20,
  },
  timeDisplay: {
    fontSize: 18,
  },
});

export default AnalogClockInput;
