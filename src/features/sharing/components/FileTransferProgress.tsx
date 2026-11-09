// FileTransferProgress.tsx

import React from "react";
import { Text, View } from "react-native";
import { formatBytes } from "../services/fileUtils";
import type { TransferProgress } from "../../../shared/types/transfer";

interface FileTransferProgressProps {
    progress: TransferProgress;
    fileName?: string;
}

export default function FileTransferProgress({
    progress,
    fileName,
}: FileTransferProgressProps) {
    const percentage = Math.min(Math.round(progress.percentage), 100);

    return (
        <View
            style={{
                padding: 24,
                borderRadius: 20,
                backgroundColor: "rgba(25, 4, 25, 0.85)",
                borderWidth: 1,
                borderColor: "rgba(127, 25, 230, 0.25)",
            }}
        >
            <Text
                style={{
                    fontSize: 16,
                    fontWeight: "700",
                    color: "#c084fc",
                    marginBottom: 16,
                    textAlign: "center",
                }}
            >
                Transferring File
            </Text>

            {fileName && (
                <Text
                    style={{
                        fontSize: 13,
                        color: "rgba(255, 255, 255, 0.5)",
                        marginBottom: 16,
                        textAlign: "center",
                    }}
                >
                    {fileName}
                </Text>
            )}

            {/* Progress Bar */}
            <View
                style={{
                    width: "100%",
                    height: 6,
                    backgroundColor: "rgba(255, 255, 255, 0.08)",
                    borderRadius: 3,
                    overflow: "hidden",
                    marginBottom: 12,
                }}
            >
                <View
                    style={{
                        height: "100%",
                        borderRadius: 3,
                        backgroundColor: "#7f19e6",
                        width: `${percentage}%`,
                    }}
                />
            </View>

            {/* Progress Info */}
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <Text style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.4)" }}>
                    {formatBytes(progress.bytesTransferred)} /{" "}
                    {formatBytes(progress.totalBytes)}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#c084fc" }}>
                    {percentage}%
                </Text>
            </View>
        </View>
    );
}
