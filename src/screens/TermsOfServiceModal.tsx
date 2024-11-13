import React from 'react';
import { Modal, View, Text, Button, StyleSheet, ScrollView } from 'react-native';

type TermsOfServiceModalProps = {
  onClose: () => void;
  visible: boolean;
};

const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({ onClose, visible }) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.modalTitle}>利用規約</Text>
            <Text style={styles.modalText}>
              いらんことしたらBANするぞ{'\n'}
              {'\n'}プロジェクト演習C32
            </Text>
            <Button title="閉じる" onPress={onClose} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    maxHeight: '80%',
  },
  scrollContent: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  modalText: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'justify',
  },
});

export default TermsOfServiceModal;
