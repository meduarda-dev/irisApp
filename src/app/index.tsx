import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { Camera, useCameraPermission } from 'react-native-vision-camera';

export default function Index() {
  const { hasPermission, requestPermission } = useCameraPermission();

  useEffect(() => {
    if (!hasPermission) requestPermission();
  }, [hasPermission]);

  if (!hasPermission) {
    return (
      <View style={styles.center}>
        <Text>Precisamos da sua permissão pra usar a câmera</Text>
        <Button title="Permitir" onPress={requestPermission} />
      </View>
    );
  }

  return <Camera style={styles.flex} isActive={true} device="back" />;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});