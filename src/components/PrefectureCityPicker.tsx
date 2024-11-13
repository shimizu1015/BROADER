import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from 'react-native';
import ModalSelector from 'react-native-modal-selector';
import prefecturesArray from '../pref_city.json';

// City型の定義
type City = {
    citycode: string;
    city: string;
};

// Prefecture型の定義
type Prefecture = {
    id: string;
    name: string;
    short: string;
    kana: string;
    en: string;
    city: City[];
};

// JSON配列をオブジェクトに変換
const prefecturesData = prefecturesArray[0] as { [key: string]: Prefecture };

// 都道府県コードでソートする関数
const sortedPrefectureKeys = Object.keys(prefecturesData).sort((a, b) => parseInt(a) - parseInt(b));

// コンポーネントのプロパティ型の定義
type PrefectureCityPickerProps = {
    onPrefectureChange: (id: string) => void;
    onCityChange: (id: string) => void;
};

// PrefectureCityPickerコンポーネントの定義
const PrefectureCityPicker: React.FC<PrefectureCityPickerProps> = ({ onPrefectureChange, onCityChange }) => {
    // コンポーネントの状態を管理
    const [selectedPrefectureId, setSelectedPrefectureId] = useState<string | null>(null);
    const [selectedCity, setSelectedCity] = useState<string | null>(null);
    const [selectedCityName, setSelectedCityName] = useState<string | null>(null);

    // 都道府県が変更されたときの処理
    const handlePrefectureChange = (option: any) => {
        setSelectedPrefectureId(option.key);
        setSelectedCity(null);
        setSelectedCityName(null);
        onPrefectureChange(option.key); // 親コンポーネントに変更を通知
    };

    // 市区町村が変更されたときの処理
    const handleCityChange = (option: any) => {
        setSelectedCity(option.key);
        setSelectedCityName(option.label);
        onCityChange(option.key); // 親コンポーネントに変更を通知
    };

    // 都道府県の選択肢を生成
    const prefectureOptions = sortedPrefectureKeys.map((prefectureId) => ({
        key: prefectureId,
        label: prefecturesData[prefectureId].name,
    }));

    // 市区町村の選択肢を生成
    const cityOptions =
        selectedPrefectureId &&
        prefecturesData[selectedPrefectureId].city.map((city) => ({
            key: city.citycode,
            label: city.city,
        }));

    return (
        <View style={styles.container}>
            <View style={styles.pickerContainer}>
                <Text style={styles.label}>都道府県</Text>
                <ModalSelector
                    data={prefectureOptions}
                    initValue="都道府県を選択してください"
                    onChange={handlePrefectureChange}
                    style={styles.selector}
                    initValueTextStyle={styles.initValueText as TextStyle}
                    selectTextStyle={styles.selectText as TextStyle}
                    backdropPressToClose={true}
                    optionContainerStyle={styles.optionContainer as ViewStyle}
                    optionTextStyle={styles.optionText as TextStyle}
                    cancelText="キャンセル"
                    cancelStyle={styles.cancelStyle as ViewStyle}
                    cancelTextStyle={styles.cancelText as TextStyle}
                    animationType="slide"
                    overlayStyle={styles.overlayStyle as ViewStyle}
                >
                    <TouchableOpacity style={styles.customSelector as ViewStyle}>
                        <Text style={selectedPrefectureId ? styles.customSelectorText : styles.placeholderText as TextStyle}>
                            {selectedPrefectureId
                                ? prefecturesData[selectedPrefectureId].name
                                : '都道府県'}
                        </Text>
                    </TouchableOpacity>
                </ModalSelector>
            </View>

            <View style={styles.pickerContainer}>
                <Text style={styles.label}>市区町村</Text>
                <ModalSelector
                    data={cityOptions || []}
                    initValue="市区町村を選択してください"
                    onChange={handleCityChange}
                    style={styles.selector}
                    initValueTextStyle={styles.initValueText as TextStyle}
                    selectTextStyle={styles.selectText as TextStyle}
                    backdropPressToClose={true}
                    optionContainerStyle={styles.optionContainer as ViewStyle}
                    optionTextStyle={styles.optionText as TextStyle}
                    cancelText="キャンセル"
                    cancelStyle={styles.cancelStyle as ViewStyle}
                    cancelTextStyle={styles.cancelText as TextStyle}
                    animationType="slide"
                    overlayStyle={styles.overlayStyle as ViewStyle}
                    disabled={!selectedPrefectureId}
                >
                    <TouchableOpacity style={[styles.customSelector as ViewStyle, !selectedPrefectureId && styles.disabledSelector as ViewStyle]} disabled={!selectedPrefectureId}>
                        <Text style={selectedCity ? styles.customSelectorText : styles.placeholderText as TextStyle}>
                            {selectedCityName
                                ? selectedCityName
                                : '市区町村'}
                        </Text>
                    </TouchableOpacity>
                </ModalSelector>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        gap: 10,
    },
    pickerContainer: {
        flex: 1,
    },
    label: {
        fontSize: 16,
        color: '#000',
    },
    selector: {
        marginBottom: 8,
    },
    initValueText: {
        color: 'grey',
    },
    selectText: {
        color: 'black',
    },
    customSelector: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: 10,
        borderRadius: 5,
        backgroundColor: '#fff',
        marginBottom: 0
    },
    customSelectorText: {
        color: 'black',
    },
    placeholderText: {
        color: 'grey',
    },
    optionContainer: {
        borderRadius: 10,
        padding: 5,
        backgroundColor: 'white',
        maxHeight: 300,
    },
    optionText: {
        color: 'black',
    },
    cancelStyle: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 10,
        marginTop: 10,
    },
    cancelText: {
        color: 'black',
        textAlign: 'center',
        fontSize: 18,
    },
    overlayStyle: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'flex-end',
        margin: 0,
    },
    disabledSelector: {
        backgroundColor: '#f0f0f0',
    },
});

export default PrefectureCityPicker;
