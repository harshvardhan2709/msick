import FontAwesome from '@expo/vector-icons/FontAwesome';
import SongImage from '../../../shared/components/SongImage';
import * as MediaLibrary from 'expo-media-library';
import { router } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Keyboard,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useAudioPlayer } from '../../player';
import { aiSmartFilter } from '../services/aiFilterService';

const ITEM_HEIGHT = 68;

const SongItem = React.memo(({ item, isCurrent }: { item: MediaLibrary.Asset; isCurrent: boolean }) => (
    <View
        style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 12,
            paddingHorizontal: 14,
            marginBottom: 6,
            borderRadius: 16,
            backgroundColor: isCurrent
                ? 'rgba(127, 25, 230, 0.15)'
                : 'rgba(255, 255, 255, 0.03)',
            borderWidth: isCurrent ? 1 : 0,
            borderColor: isCurrent ? 'rgba(127, 25, 230, 0.4)' : 'transparent',
        }}
    >
        <View style={{ marginRight: 12 }}>
            <SongImage 
                uri={item.uri} 
                id={item.id} 
                isCurrent={isCurrent} 
                iconSize={18}
            />
        </View>
        <View style={{ flex: 1 }}>
            <Text
                numberOfLines={1}
                style={{
                    fontSize: 15,
                    fontWeight: isCurrent ? '700' : '500',
                    color: isCurrent ? '#c084fc' : '#ffffff',
                }}
            >
                {item.filename}
            </Text>
            <Text style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.4)', marginTop: 2 }}>
                {item.duration
                    ? `${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, '0')}`
                    : '0:00'}
            </Text>
        </View>
        <FontAwesome name="play" size={12} color="rgba(255, 255, 255, 0.3)" />
    </View>
));

SongItem.displayName = 'SongItem';

// Example prompts for inspiration
const EXAMPLE_PROMPTS = [
    'Songs for a late night drive',
    'Workout motivation songs',
    'Sad emotional songs',
    'Songs to play at a party',
    'Calm relaxing music',
    'Songs with strong bass',
];

export default function SmartFilterScreen() {
    const { play, currentSong } = useAudioPlayer();
    const [prompt, setPrompt] = useState('');
    const [results, setResults] = useState<MediaLibrary.Asset[]>([]);
    const [loading, setLoading] = useState(false);
    const [progressMsg, setProgressMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [hasSearched, setHasSearched] = useState(false);

    const currentSongId = currentSong?.id;

    const handleSearch = useCallback(async (searchPrompt?: string) => {
        const query = searchPrompt || prompt;
        if (!query.trim()) return;

        Keyboard.dismiss();
        setLoading(true);
        setErrorMsg('');
        setResults([]);
        setHasSearched(true);

        try {
            const matched = await aiSmartFilter(query.trim(), (msg) => {
                setProgressMsg(msg);
            });
            setResults(matched);
        } catch (error: any) {
            setErrorMsg(error.message || 'Something went wrong');
        } finally {
            setLoading(false);
            setProgressMsg('');
        }
    }, [prompt]);

    const handlePlay = useCallback((item: MediaLibrary.Asset) => {
        play(item, results);
    }, [play, results]);

    const getItemLayout = useCallback((_: any, index: number) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * index,
        index,
    }), []);

    const keyExtractor = useCallback((item: MediaLibrary.Asset) => item.id, []);

    const renderItem = useCallback(({ item }: { item: MediaLibrary.Asset }) => (
        <TouchableOpacity onPress={() => handlePlay(item)} activeOpacity={0.7}>
            <SongItem item={item} isCurrent={item.id === currentSongId} />
        </TouchableOpacity>
    ), [handlePlay, currentSongId]);

    return (
        <View style={{ flex: 1, backgroundColor: '#0a0a0a', paddingTop: 48 }}>
            {/* Header */}
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
                    <View
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 10,
                            backgroundColor: 'rgba(25, 4, 25, 0.85)',
                            borderWidth: 1,
                            borderColor: 'rgba(14, 165, 233, 0.25)',
                            borderRadius: 24,
                            padding: 14,
                        }}
                    >
                        <FontAwesome name="magic" size={16} color="#0ea5e9" />
                        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 17 }}>
                            AI Smart Filter
                        </Text>
                    </View>
                </View>
            </View>

            {/* Search Input */}
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: 'rgba(14, 165, 233, 0.06)',
                        borderWidth: 1,
                        borderColor: 'rgba(14, 165, 233, 0.2)',
                        borderRadius: 20,
                        paddingHorizontal: 16,
                        paddingVertical: 4,
                    }}
                >
                    <FontAwesome name="search" size={14} color="rgba(14, 165, 233, 0.5)" />
                    <TextInput
                        style={{
                            flex: 1,
                            marginLeft: 10,
                            color: '#ffffff',
                            fontSize: 14,
                            paddingVertical: 10,
                        }}
                        placeholder='Try "songs for a road trip"...'
                        placeholderTextColor="rgba(255, 255, 255, 0.3)"
                        value={prompt}
                        onChangeText={setPrompt}
                        onSubmitEditing={() => handleSearch()}
                        returnKeyType="search"
                        editable={!loading}
                    />
                    <TouchableOpacity
                        onPress={() => handleSearch()}
                        disabled={loading || !prompt.trim()}
                        style={{
                            width: 36,
                            height: 36,
                            borderRadius: 18,
                            backgroundColor: prompt.trim()
                                ? 'rgba(14, 165, 233, 0.25)'
                                : 'rgba(255, 255, 255, 0.05)',
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
                    >
                        {loading ? (
                            <ActivityIndicator size="small" color="#0ea5e9" />
                        ) : (
                            <FontAwesome
                                name="arrow-right"
                                size={14}
                                color={prompt.trim() ? '#0ea5e9' : 'rgba(255,255,255,0.2)'}
                            />
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {/* Loading State */}
            {loading && (
                <Animated.View
                    entering={FadeIn.duration(300)}
                    style={{ alignItems: 'center', paddingVertical: 40 }}
                >
                    <View
                        style={{
                            width: 64,
                            height: 64,
                            borderRadius: 32,
                            backgroundColor: 'rgba(14, 165, 233, 0.15)',
                            borderWidth: 1,
                            borderColor: 'rgba(14, 165, 233, 0.3)',
                            justifyContent: 'center',
                            alignItems: 'center',
                            marginBottom: 16,
                        }}
                    >
                        <ActivityIndicator size="large" color="#0ea5e9" />
                    </View>
                    <Text style={{ color: '#0ea5e9', fontWeight: '600', fontSize: 15, marginBottom: 4 }}>
                        Finding songs...
                    </Text>
                    <Text style={{ color: 'rgba(255, 255, 255, 0.4)', fontSize: 13 }}>
                        {progressMsg}
                    </Text>
                </Animated.View>
            )}

            {/* Error State */}
            {errorMsg && !loading && (
                <Animated.View
                    entering={FadeInDown.duration(300)}
                    style={{ alignItems: 'center', paddingVertical: 40, paddingHorizontal: 32 }}
                >
                    <FontAwesome name="exclamation-triangle" size={28} color="#ef4444" />
                    <Text style={{ color: '#ef4444', fontWeight: '600', marginTop: 12, textAlign: 'center' }}>
                        {errorMsg}
                    </Text>
                </Animated.View>
            )}

            {/* Results */}
            {!loading && hasSearched && results.length > 0 && (
                <View style={{ flex: 1 }}>
                    <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 8,
                                backgroundColor: 'rgba(34, 197, 94, 0.08)',
                                borderWidth: 1,
                                borderColor: 'rgba(34, 197, 94, 0.2)',
                                borderRadius: 14,
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                            }}
                        >
                            <FontAwesome name="check-circle" size={14} color="#22c55e" />
                            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, flex: 1 }}>
                                Found {results.length} songs matching &ldquo;{prompt}&rdquo;
                            </Text>
                        </View>
                    </View>
                    <FlatList
                        data={results}
                        keyExtractor={keyExtractor}
                        renderItem={renderItem}
                        getItemLayout={getItemLayout}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 180 }}
                        initialNumToRender={15}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={true}
                    />
                </View>
            )}

            {/* No Results */}
            {!loading && hasSearched && results.length === 0 && !errorMsg && (
                <Animated.View
                    entering={FadeInDown.duration(300)}
                    style={{ alignItems: 'center', paddingVertical: 40 }}
                >
                    <FontAwesome name="search" size={32} color="rgba(14, 165, 233, 0.3)" />
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, marginTop: 12 }}>
                        No songs matched your request
                    </Text>
                    <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, marginTop: 4 }}>
                        Try a different prompt
                    </Text>
                </Animated.View>
            )}

            {/* Initial State — Example Prompts */}
            {!loading && !hasSearched && (
                <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
                    <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 12, fontWeight: '600' }}>
                        TRY ASKING FOR...
                    </Text>
                    <View style={{ gap: 8 }}>
                        {EXAMPLE_PROMPTS.map((example) => (
                            <TouchableOpacity
                                key={example}
                                onPress={() => {
                                    setPrompt(example);
                                    handleSearch(example);
                                }}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    gap: 12,
                                    paddingVertical: 12,
                                    paddingHorizontal: 16,
                                    borderRadius: 14,
                                    backgroundColor: 'rgba(14, 165, 233, 0.04)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(14, 165, 233, 0.1)',
                                }}
                            >
                                <FontAwesome name="lightbulb-o" size={14} color="rgba(14, 165, 233, 0.5)" />
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, flex: 1 }}>
                                    {example}
                                </Text>
                                <FontAwesome name="arrow-right" size={10} color="rgba(255,255,255,0.15)" />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
}
