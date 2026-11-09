import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Camera, CameraView } from "expo-camera";
import React, { useState } from "react";
import { Alert, Modal, Text, TouchableOpacity, View } from "react-native";

interface QRScannerProps {
    onScan: (ip: string, port: number) => void;
    onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);

    React.useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === "granted");
        })();
    }, []);

    const handleBarCodeScanned = ({ data }: { data: string }) => {
        if (scanned) return;

        setScanned(true);

        try {
            const connectionData = JSON.parse(data);

            if (!connectionData.ip || !connectionData.port) {
                throw new Error("Invalid QR code data");
            }

            onScan(connectionData.ip, connectionData.port);
        } catch (error) {
            Alert.alert(
                "Invalid QR Code",
                "Please scan a valid music sharing QR code",
            );
            setScanned(false);
        }
    };

    if (hasPermission === null) {
        return (
            <Modal
                visible={true}
                presentationStyle="fullScreen"
                onRequestClose={onClose}
            >
                <View className="flex-1 items-center justify-center bg-black">
                    <Text className="text-white">Requesting camera permission...</Text>
                </View>
            </Modal>
        );
    }

    if (hasPermission === false) {
        return (
            <Modal
                visible={true}
                presentationStyle="fullScreen"
                onRequestClose={onClose}
            >
                <View className="flex-1 items-center justify-center bg-black p-6">
                    <FontAwesome name="camera" size={48} color="#999" />
                    <Text className="text-white text-center mt-4 mb-6">
                        Camera permission is required to scan QR codes
                    </Text>
                    <TouchableOpacity
                        onPress={async () => {
                            const { status } = await Camera.requestCameraPermissionsAsync();
                            setHasPermission(status === "granted");
                        }}
                        className="bg-primary px-6 py-3 rounded-full"
                    >
                        <Text className="text-white font-semibold">Grant Permission</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={onClose} className="mt-4">
                        <Text className="text-gray-400">Cancel</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    }

    return (
        <Modal
            visible={true}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View className="flex-1 bg-black">
                <CameraView
                    style={{ flex: 1 }}
                    facing="back"
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                        barcodeTypes: ["qr"],
                    }}
                >
                    <View className="flex-1">
                        {/* Header */}
                        <View className="flex-row items-center justify-between p-4 pt-12">
                            <TouchableOpacity
                                onPress={onClose}
                                className="bg-black/50 p-3 rounded-full"
                            >
                                <FontAwesome name="close" size={24} color="white" />
                            </TouchableOpacity>
                        </View>

                        {/* Scanner Frame */}
                        <View className="flex-1 items-center justify-center">
                            <View className="w-64 h-64 relative">
                                {/* Corner markers */}
                                <View className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white" />
                                <View className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white" />
                                <View className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white" />
                                <View className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white" />
                            </View>
                        </View>

                        {/* Instructions */}
                        <View className="items-center pb-12">
                            <View className="bg-black/70 px-6 py-4 rounded-3xl">
                                <Text className="text-white text-center font-semibold">
                                    Scan QR Code
                                </Text>
                                <Text className="text-gray-300 text-center text-sm mt-1">
                                    Align the QR code within the frame
                                </Text>
                            </View>
                        </View>
                    </View>
                </CameraView>

                {scanned && (
                    <View className="absolute bottom-0 left-0 right-0 p-6">
                        <TouchableOpacity
                            onPress={() => setScanned(false)}
                            className="bg-white/20 px-6 py-3 rounded-full"
                        >
                            <Text className="text-white text-center font-semibold">
                                Tap to Scan Again
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </Modal>
    );
}
