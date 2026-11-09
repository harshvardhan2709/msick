import React from "react";
import { Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import type { ServerInfo } from "../../../shared/types/transfer";

interface QRCodeDisplayProps {
    serverInfo: ServerInfo;
}

export default function QRCodeDisplay({ serverInfo }: QRCodeDisplayProps) {
    const connectionData = JSON.stringify({
        ip: serverInfo.ip,
        port: serverInfo.port,
    });

    return (
        <View className="items-center justify-center p-6 bg-primary rounded-3xl">
            <Text className="text-lg font-bold text-white mb-4">Scan to Connect</Text>

            <View className="bg-white p-4 rounded-2xl mb-4">
                <QRCode
                    value={connectionData}
                    size={200}
                    backgroundColor="white"
                    color="black"
                />
            </View>

            <View className="items-center">
                <Text className="text-sm text-white/70 mb-1">Server Address:</Text>
                <Text className="text-base font-mono font-bold text-white">
                    {serverInfo.ip}:{serverInfo.port}
                </Text>
                <Text className="text-xs text-white/60 mt-3 text-center">
                    Both devices must be on the same WiFi network
                </Text>
            </View>
        </View>
    );
}
