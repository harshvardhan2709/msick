// hooks/useLikes.ts

import { useContext } from 'react';
import { FavoritesContext } from '../context/FavoritesContext';

export function useFavorites() {
  return useContext(FavoritesContext);
}

export const useLikes = useFavorites;
export default useFavorites;
