import FontAwesome from '@expo/vector-icons/FontAwesome';
import SongImage from '../../../shared/components/SongImage';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    FadeInUp,
    SlideInRight,
} from 'react-native-reanimated';
import { useAudioPlayer } from '../../player';
import { useGenre } from '../hooks/useGenre';
import {
    type GenreType,
    getGenreStyle,
} from '../services/genreService';

type SongAsset = MediaLibrary.Asset & { realDuration?: number };

export default function GenreScreen() {
    const {
        genreMap,
        status,
        progress,
        progressMessage,
        errorMessage,
        genreCounts,
        hasClassified,
    } = useGenre();

    const { play } = useAudioPlayer();
    const [selectedGenre, setSelectedGenre] = useState<GenreType | null>(null);
    const [genreSongs, setGenreSongs] = useState<SongAsset[]>([]);
    const [loadingSongs, setLoadingSongs] = useState(false);

    // Load songs for a selected genre
    useEffect(() => {
        if (!selectedGenre) {
            setGenreSongs([]);
            return;
        }

        (async () => {
            setLoadingSongs(true);
            const songIds = Object.entries(genreMap)
                .filter(([_, genres]) => genres.includes(selectedGenre))
                .map(([id]) => id);

            const { status: permStatus } = await MediaLibrary.requestPermissionsAsync();
            if (permStatus !== 'granted') {
                setLoadingSongs(false);
                return;
            }

            const media = await MediaLibrary.getAssetsAsync({
                mediaType: MediaLibrary.MediaType.audio,
                first: 500,
            });

            const matched = media.assets.filter(a => songIds.includes(a.id) && a.duration >= 35);
            setGenreSongs(matched as SongAsset[]);
            setLoadingSongs(false);
        })();
    }, [selectedGenre, genreMap]);

    const formatDuration = (millis?: number) => {
        if (!millis) return '0:00';
        const totalSeconds = Math.floor(millis / 1000);
        return `${Math.floor(totalSeconds / 60)}:${String(totalSeconds % 60).padStart(2, '0')}`;
    };

    // If classification is in progress, show the loading screen
    if (status === 'loading_songs' || status === 'classifying') {
        return (
            <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center', width: '100%' }}>
                    {/* Pulsing AI icon */}
                    <Animated.View
                        entering={FadeInDown.springify()}
                        style={{
                            width: 80,
                            height: 80,
                            borderRadius: 40,
                            backgroundColor: 'rgba(127, 25, 230, 0.2)',
                            borderWidth: 2,
                            borderColor: 'rgba(127, 25, 230, 0.4)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 24,
                        }}
                    >
                        <FontAwesome name="magic" size={32} color="#c084fc" />
                    </Animated.View>

                    {/* Status text */}
                    <Text style={{
                        color: '#c084fc',
                        fontSize: 18,
                        fontWeight: '700',
                        marginBottom: 8,
                        textAlign: 'center',
                    }}>
                        {status === 'loading_songs' && '🔍 Scanning Device...'}
                        {status === 'classifying' && '🤖 AI Analyzing Songs...'}

                    </Text>

                    {/* Progress message */}
                    <Text style={{
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontSize: 13,
                        textAlign: 'center',
                        marginBottom: 24,
                        lineHeight: 20,
                    }}>
                        {progressMessage}
                    </Text>

                    {/* Progress bar */}
                    <View style={{
                        width: '100%',
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: 'rgba(127, 25, 230, 0.15)',
                        overflow: 'hidden',
                        marginBottom: 12,
                    }}>
                        <Animated.View
                            style={{
                                width: `${progress}%`,
                                height: '100%',
                                borderRadius: 4,
                                backgroundColor: '#7f19e6',
                            }}
                        />
                    </View>

                    <Text style={{
                        color: 'rgba(255, 255, 255, 0.3)',
                        fontSize: 12,
                    }}>
                        {progress}% complete
                    </Text>

                    <ActivityIndicator
                        size="small"
                        color="#7f19e6"
                        style={{ marginTop: 20 }}
                    />
                </Animated.View>
            </View>
        );
    }

    // Error state
    if (status === 'error') {
        return (
            <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
                <View style={{
                    width: 72,
                    height: 72,
                    borderRadius: 36,
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 20,
                }}>
                    <FontAwesome name="exclamation-triangle" size={28} color="#ef4444" />
                </View>
                <Text style={{ color: '#ef4444', fontSize: 18, fontWeight: '700', marginBottom: 8 }}>
                    Classification Failed
                </Text>
                <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
                    {errorMessage}
                </Text>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={{
                        paddingHorizontal: 24,
                        paddingVertical: 12,
                        borderRadius: 20,
                        backgroundColor: 'rgba(127, 25, 230, 0.2)',
                        borderWidth: 1,
                        borderColor: 'rgba(127, 25, 230, 0.4)',
                    }}
                >
                    <Text style={{ color: '#c084fc', fontWeight: '600' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // Done state with results — or previously classified data
    if (hasClassified && (status === 'done' || status === 'idle')) {
        // If a genre is selected, show its songs
        if (selectedGenre) {
            const colors = getGenreStyle(selectedGenre);
            const iconName = "tag";

            return (
                <View style={{ flex: 1, backgroundColor: '#0a0a0a', paddingTop: 48 }}>
                    {/* Header */}
                    <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                        }}>
                            <TouchableOpacity
                                onPress={() => setSelectedGenre(null)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: 'rgba(25, 4, 25, 0.85)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(127, 25, 230, 0.25)',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <FontAwesome name="arrow-left" size={16} color="#c084fc" />
                            </TouchableOpacity>

                            <View style={{
                                flex: 1,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 12,
                                backgroundColor: 'rgba(25, 4, 25, 0.85)',
                                borderWidth: 1,
                                borderColor: colors.border,
                                borderRadius: 24,
                                padding: 14,
                            }}>
                                <View style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: colors.bg,
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}>
                                    <FontAwesome name={iconName} size={16} color={colors.iconColor} />
                                </View>
                                <Text style={{ color: colors.iconColor, fontWeight: '700', fontSize: 17 }}>
                                    {selectedGenre}
                                </Text>
                                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13 }}>
                                    {genreSongs.length} songs
                                </Text>
                            </View>
                        </View>
                    </View>

                    {loadingSongs ? (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#7f19e6" />
                        </View>
                    ) : (
                        <FlatList
                            data={genreSongs}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 180 }}
                            initialNumToRender={15}
                            maxToRenderPerBatch={10}
                            updateCellsBatchingPeriod={50}
                            windowSize={5}
                            removeClippedSubviews={true}
                            renderItem={({ item }) => (
                                    <TouchableOpacity
                                        onPress={() => play(item, genreSongs)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            paddingVertical: 12,
                                            paddingHorizontal: 14,
                                            marginBottom: 6,
                                            borderRadius: 16,
                                            backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        }}>
                                            <View style={{ marginRight: 12 }}>
                                                <SongImage 
                                                    uri={item.uri} 
                                                    id={item.id} 
                                                    iconSize={18}
                                                />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text
                                                    numberOfLines={1}
                                                    style={{
                                                        fontSize: 15,
                                                        fontWeight: '500',
                                                        color: '#ffffff',
                                                    }}
                                                >
                                                    {item.filename}
                                                </Text>
                                                <Text style={{
                                                    fontSize: 12,
                                                    color: 'rgba(255, 255, 255, 0.4)',
                                                    marginTop: 2,
                                                }}>
                                                    {formatDuration(item.duration ? item.duration * 1000 : undefined)}
                                                </Text>
                                            </View>
                                            <FontAwesome name="play" size={12} color="rgba(255,255,255,0.3)" />
                                        </View>
                                    </TouchableOpacity>
                            )}
                        />
                    )}
                </View>
            );
        }

        // Genre grid view
        const activeGenres = Object.keys(genreCounts).sort((a, b) => genreCounts[b] - genreCounts[a]);
        const totalSongs = Object.keys(genreMap).length;

        return (
            <View style={{ flex: 1, backgroundColor: '#0a0a0a', paddingTop: 48 }}>
                {/* Header */}
                <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 12,
                    }}>
                        <TouchableOpacity
                            onPress={() => router.back()}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: 'rgba(25, 4, 25, 0.85)',
                                borderWidth: 1,
                                borderColor: 'rgba(127, 25, 230, 0.25)',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <FontAwesome name="arrow-left" size={16} color="#c084fc" />
                        </TouchableOpacity>
                        <View style={{
                            flex: 1,
                            backgroundColor: 'rgba(25, 4, 25, 0.85)',
                            borderWidth: 1,
                            borderColor: 'rgba(127, 25, 230, 0.25)',
                            borderRadius: 24,
                            padding: 14,
                        }}>
                            <Text style={{ color: '#c084fc', fontWeight: '700', fontSize: 17, textAlign: 'center' }}>
                                AI Genre Results
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Summary */}
                {status === 'done' && (
                    <Animated.View entering={FadeInUp.duration(500)} style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                        <View style={{
                            backgroundColor: 'rgba(34, 197, 94, 0.08)',
                            borderWidth: 1,
                            borderColor: 'rgba(34, 197, 94, 0.25)',
                            borderRadius: 16,
                            padding: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 12,
                        }}>
                            <FontAwesome name="check-circle" size={20} color="#22c55e" />
                            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, flex: 1 }}>
                                {totalSongs} songs classified into {activeGenres.length} genres ✨
                            </Text>
                        </View>
                    </Animated.View>
                )}

                {/* Genre Grid */}
                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 180 }}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                    }}>
                        {activeGenres.map((genre, index) => {
                            const colors = getGenreStyle(genre);
                            const iconName = "tag";
                            const count = genreCounts[genre];

                            return (
                                <Animated.View
                                    key={genre}
                                    entering={SlideInRight.delay(index * 80).duration(400)}
                                    style={{ width: '48%', marginBottom: 12 }}
                                >
                                    <TouchableOpacity
                                        onPress={() => setSelectedGenre(genre)}
                                        activeOpacity={0.7}
                                        style={{
                                            aspectRatio: 1,
                                            borderRadius: 20,
                                            padding: 16,
                                            justifyContent: 'space-between',
                                            backgroundColor: colors.bg,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                        }}
                                    >
                                        <View style={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: 24,
                                            backgroundColor: colors.bg,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}>
                                            <FontAwesome name={iconName} size={20} color={colors.iconColor} />
                                        </View>
                                        <View>
                                            <Text style={{
                                                fontWeight: '700',
                                                fontSize: 16,
                                                color: '#ffffff',
                                            }}>
                                                {genre}
                                            </Text>
                                            <Text style={{
                                                color: 'rgba(255, 255, 255, 0.5)',
                                                fontSize: 12,
                                                marginTop: 2,
                                            }}>
                                                {count} {count === 1 ? 'song' : 'songs'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            );
                        })}
                    </View>
                </ScrollView>
            </View>
        );
    }

    // Default: shouldn't reach here, but show empty state
    return (
        <View style={{ flex: 1, backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }}>
            <FontAwesome name="magic" size={40} color="rgba(127, 25, 230, 0.3)" />
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 16, marginTop: 16, textAlign: 'center' }}>
                Tap the AI Genre button on the Features page to get started
            </Text>
            <TouchableOpacity
                onPress={() => router.back()}
                style={{
                    marginTop: 20,
                    paddingHorizontal: 24,
                    paddingVertical: 12,
                    borderRadius: 20,
                    backgroundColor: 'rgba(127, 25, 230, 0.2)',
                    borderWidth: 1,
                    borderColor: 'rgba(127, 25, 230, 0.4)',
                }}
            >
                <Text style={{ color: '#c084fc', fontWeight: '600' }}>Go Back</Text>
            </TouchableOpacity>
        </View>
    );
}
