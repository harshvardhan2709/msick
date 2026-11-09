import { useContext } from "react";
import { GenreContext } from "../context/GenreContext";

export function useGenre() {
  return useContext(GenreContext);
}

export default useGenre;
