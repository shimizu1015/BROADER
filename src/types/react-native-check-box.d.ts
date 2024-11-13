declare module 'react-native-check-box' {
    import { Component } from 'react';
    import { ViewStyle, TextStyle } from 'react-native';
  
    interface CheckBoxProps {
      onClick: () => void;
      isChecked: boolean;
      leftText?: string;
      rightText?: string;
      leftTextView?: JSX.Element;
      rightTextView?: JSX.Element;
      checkedImage?: JSX.Element;
      unCheckedImage?: JSX.Element;
      checkBoxColor?: string;
      checkedCheckBoxColor?: string;
      unCheckedCheckBoxColor?: string;
      disabled?: boolean;
      style?: ViewStyle;
      leftTextStyle?: TextStyle;
      rightTextStyle?: TextStyle;
    }
  
    export default class CheckBox extends Component<CheckBoxProps> {}
  }
  