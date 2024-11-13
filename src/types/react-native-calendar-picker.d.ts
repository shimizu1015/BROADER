declare module 'react-native-calendar-picker' {
    import { Component } from 'react';
    import { ViewStyle, TextStyle } from 'react-native';
  
    export interface CustomDatesStyles {
      date: Date;
      containerStyle?: ViewStyle;
      style?: ViewStyle;
      textStyle?: TextStyle;
    }
  
    export interface CalendarPickerProps {
      startFromMonday?: boolean;
      allowRangeSelection?: boolean;
      minDate?: Date;
      maxDate?: Date;
      weekdays?: string[];
      months?: string[];
      previousTitle?: string;
      nextTitle?: string;
      todayBackgroundColor?: string;
      selectedDayColor?: string;
      selectedDayTextColor?: string;
      scaleFactor?: number;
      textStyle?: TextStyle;
      customDatesStyles?: CustomDatesStyles[];
      onDateChange?: (date: Date, type: 'START_DATE' | 'END_DATE') => void;
    }
  
    export default class CalendarPicker extends Component<CalendarPickerProps> {}
  }
  