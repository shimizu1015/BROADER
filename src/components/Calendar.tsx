import React, { useState } from 'react';
import { View, Modal, TextInput, TouchableOpacity, StyleSheet, Text } from 'react-native';
import { Calendar as CalendarComponent, CalendarProps, LocaleConfig } from 'react-native-calendars';
import moment from 'moment';
import 'moment/locale/ja';

moment.locale('ja');

LocaleConfig.locales['ja'] = {
  monthNames: [
    '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'
  ],
  monthNamesShort: [
    '1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'
  ],
  dayNames: [
    '日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'
  ],
  dayNamesShort: [
    '日', '月', '火', '水', '木', '金', '土'
  ],
};
LocaleConfig.defaultLocale = 'ja';

interface CustomCalendarProps extends Omit<CalendarProps, 'onDayPress'> {
  availableDates: { date: string, allDay: boolean, startTime: string | null, endTime: string | null }[];
}

interface MarkedDates {
  [key: string]: {
    selected?: boolean;
    marked?: boolean;
    selectedColor?: string;
    dotColor?: string;
    activeOpacity?: number;
    disabled?: boolean;
    disableTouchEvent?: boolean;
  };
}

const Calendar: React.FC<CustomCalendarProps> = ({ availableDates, ...props }) => {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isEditing, setIsEditing] = useState(false); // 編集モードのフラグ

  const handleDayPress = (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
    if (notes[day.dateString]) {
      setNoteText(notes[day.dateString]);
      setIsEditing(false); // 閲覧モードでモーダルを開く
    } else {
      setNoteText('');
      setIsEditing(true); // 新しいメモを作成するモード
    }
    setModalVisible(true);
  };

  const handleSaveNote = () => {
    if (selectedDate) {
      setNotes(prevNotes => ({ ...prevNotes, [selectedDate]: noteText }));
      setModalVisible(false);
    }
  };

  const handleEditNote = () => {
    setIsEditing(true);
  };

  const handleDeleteNote = () => {
    if (selectedDate) {
      const updatedNotes = { ...notes };
      delete updatedNotes[selectedDate];
      setNotes(updatedNotes);
      setModalVisible(false);
    }
  };

  const today = moment().format('YYYY-MM-DD');
  const markedDates: MarkedDates = availableDates.reduce((acc, date) => {
    const formattedDate = moment(date.date).format('YYYY-MM-DD');
    acc[formattedDate] = {
      selected: true,
      selectedColor: 'red',
      dotColor: 'red',
      marked: true,
    };
    return acc;
  }, {} as MarkedDates);

  // メモのある日をマーク
  for (const date in notes) {
    if (notes[date]) {
      markedDates[date] = {
        ...markedDates[date],
        marked: true,
        dotColor: 'blue', // メモのある日に青いドットを表示
      };
    }
  }

  // 現在の日付を強調 (黒色で大きく)
  markedDates[today] = {
    ...markedDates[today],
    selected: true,
    selectedColor: '#d3d3d3', // 現在の日付の背景色をグレーに
    selectedTextColor: '#000000', // 数字を黒色に
    textDayFontSize: 18, // 現在の日付の数字を少し大きく
  };

  return (
    <View>
      <CalendarComponent
        {...props}
        onDayPress={handleDayPress}
        markedDates={markedDates}
        theme={{
          calendarBackground: '#ffffff',
          textSectionTitleColor: '#b6c1cd',
          selectedDayBackgroundColor: '#00adf5',
          selectedDayTextColor: '#ffffff',
          todayTextColor: '#ffffff',
          dayTextColor: '#2d4150',
          textDisabledColor: '#d9e1e8',
          dotColor: '#00adf5',
          selectedDotColor: '#ffffff',
          arrowColor: 'gray',
          monthTextColor: 'black',
          indicatorColor: 'blue',
          textDayFontFamily: 'monospace',
          textMonthFontFamily: 'monospace',
          textDayHeaderFontFamily: 'monospace',
          textDayFontWeight: '300',
          textMonthFontWeight: 'bold',
          textDayHeaderFontWeight: '300',
          textDayFontSize: 16,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 16,
          'stylesheet.calendar.header': {
            dayTextAtIndex0: { color: 'red' }, // 日曜日を赤色に
            dayTextAtIndex6: { color: 'lightblue' }, // 土曜日を水色に
          },
          'stylesheet.day.basic': {
            dayText: {
              fontWeight: 'bold',
            },
            today: {
              backgroundColor: '#d3d3d3', // 現在の日付背景色をグレーに
              borderRadius: 50, // 円形にする
              color: '#000000', // 現在の日付の数字を黒に
            },
            dayTextAtIndex0: {
              color: 'red', // 日曜日の数字を赤に
            },
            dayTextAtIndex6: {
              color: 'lightblue', // 土曜日の数字を水色に
            },
          },
        }}
        monthFormat={'yyyy年 MM月'}
        firstDay={0}
        locale={'ja'}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>×</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{isEditing ? '予定を編集' : '予定の内容'}</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={noteText}
                onChangeText={setNoteText}
                placeholder="ここにメモを入力..."
              />
            ) : (
              <View style={styles.noteBox}>
                <Text style={styles.noteText}>{noteText || 'メモがありません'}</Text>
              </View>
            )}
            {isEditing ? (
              <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSaveNote}>
                <Text style={styles.saveButtonText}>保存</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.buttonRow}>
                <View style={styles.leftButtons}>
                  <TouchableOpacity style={[styles.button, styles.editButton]} onPress={handleEditNote}>
                    <Text style={styles.editButtonText}>編集</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.button, styles.deleteButton]} onPress={handleDeleteNote}>
                    <Text style={styles.deleteButtonText}>削除</Text>
                  </TouchableOpacity>
                </View>
              
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: 300,
    padding: 20,
    backgroundColor: 'white',
    borderRadius: 10,
    alignItems: 'center',
    position: 'relative', // モーダル内のコンテンツに位置を設定
  },
  modalTitle: {
    fontSize: 18,
    marginBottom: 20,
  },
  noteBox: {
    width: '100%',
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  noteText: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: 'gray',
    borderWidth: 1,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  leftButtons: {
    flexDirection: 'row',
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  saveButton: {
    backgroundColor: '#00adf5',
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  editButton: {
    backgroundColor: '#00adf5',
  },
  editButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: 'red',
  },
  deleteButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
  },
  closeButton: {
    position: 'absolute',
    top: -5,
    right: 5,
    borderRadius: 20,
    padding: 5,
  },
  closeButtonText: {
    color: '#333333',
    fontWeight: 'bold',
    fontSize: 30,
  },
});


export default Calendar;
