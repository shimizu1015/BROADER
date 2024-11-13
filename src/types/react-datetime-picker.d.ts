declare module 'react-datetime-picker' {
    import { Component } from 'react';
  
    export interface DateTimePickerProps {
      amPmAriaLabel?: string;
      autoFocus?: boolean;
      calendarAriaLabel?: string;
      calendarIcon?: React.ReactNode;
      className?: string | string[];
      clearAriaLabel?: string;
      clearIcon?: React.ReactNode;
      clockClassName?: string | string[];
      closeWidgets?: boolean;
      dayAriaLabel?: string;
      disableCalendar?: boolean;
      disableClock?: boolean;
      format?: string;
      hourAriaLabel?: string;
      locale?: string;
      maxDetail?: 'hour' | 'minute' | 'second';
      minDate?: Date;
      maxDate?: Date;
      minuteAriaLabel?: string;
      monthAriaLabel?: string;
      name?: string;
      nativeInputAriaLabel?: string;
      onChange?: (value: Date | null) => void;
      required?: boolean;
      secondAriaLabel?: string;
      showLeadingZeros?: boolean;
      value?: Date | null;
      yearAriaLabel?: string;
    }
  
    class DateTimePicker extends Component<DateTimePickerProps, any> {}
  
    export default DateTimePicker;
  }
  