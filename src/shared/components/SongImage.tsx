import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Image as ExpoImage } from 'expo-image';
import { getSongMetadata, getCachedMetadata } from '../../services/metadata';

interface SongImageProps {
  uri: string;
  id: string;
  isCurrent?: boolean;
  size?: number;
  iconSize?: number;
}

const SongImage = React.memo(({ uri, id, isCurrent, size = 44, iconSize = 18 }: SongImageProps) => {
  // Use synchronous check for initial state to avoid re-renders for cached items
  const [artwork, setArtwork] = useState<string | null>(() => getCachedMetadata(id)?.artwork || null);

  useEffect(() => {
    // If we already have artwork from the cache, no need to fetch
    if (artwork) return;

    let isMounted = true;
    (async () => {
      try {
        const meta = await getSongMetadata(uri, id);
        if (isMounted && meta?.artwork) {
          setArtwork(meta.artwork);
        }
      } catch (e) {
        console.log('Error fetching metadata for image', e);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [id, uri, artwork]); // Added artwork as dependency to skip if found

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: isCurrent
          ? 'rgba(127, 25, 230, 0.3)'
          : 'rgba(127, 25, 230, 0.1)',
        overflow: 'hidden',
      }}
    >
      {artwork ? (
        <ExpoImage
          source={{ uri: artwork }}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <FontAwesome
          name={isCurrent ? 'volume-up' : 'music'}
          size={isCurrent ? Math.max(12, iconSize - 2) : iconSize}
          color={isCurrent ? '#c084fc' : '#7f19e6'}
        />
      )}
    </View>
  );
});

SongImage.displayName = 'SongImage';

export default SongImage;
