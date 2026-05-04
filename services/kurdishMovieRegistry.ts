/**
 * Kurdish CC Registry
 * Curated list of movies/shows confirmed to have Kurdish subtitles on OpenSubtitles.org
 * Source: https://www.opensubtitles.org/en/search/sublanguageid-kur
 */

export interface KurdishEntry {
  tmdb_id: number;
  type: 'movie' | 'tv';
}

export const KURDISH_CC_REGISTRY: KurdishEntry[] = [
  // Top Movies
  { tmdb_id: 872585, type: 'movie' },   // Oppenheimer
  { tmdb_id: 346698, type: 'movie' },   // Barbie
  { tmdb_id: 569094, type: 'movie' },   // Spider-Man: Across the Spider-Verse
  { tmdb_id: 385687, type: 'movie' },   // Fast X
  { tmdb_id: 298618, type: 'movie' },   // The Flash
  { tmdb_id: 447365, type: 'movie' },   // Guardians of the Galaxy Vol. 3
  { tmdb_id: 726209, type: 'movie' },   // No Way Up
  { tmdb_id: 693134, type: 'movie' },   // Dune: Part Two
  { tmdb_id: 823464, type: 'movie' },   // Godzilla x Kong: The New Empire
  { tmdb_id: 653346, type: 'movie' },   // Kingdom of the Planet of the Apes
  { tmdb_id: 1011985, type: 'movie' },  // Kung Fu Panda 4
  { tmdb_id: 748783, type: 'movie' },   // The Garfield Movie
  { tmdb_id: 519182, type: 'movie' },   // Despicable Me 4
  { tmdb_id: 940721, type: 'movie' },   // Godzilla Minus One
  { tmdb_id: 640146, type: 'movie' },   // Ant-Man and the Wasp: Quantumania
  { tmdb_id: 507089, type: 'movie' },   // Five Nights at Freddy's
  { tmdb_id: 466420, type: 'movie' },   // Killers of the Flower Moon
  { tmdb_id: 670292, type: 'movie' },   // The Creator
  { tmdb_id: 609681, type: 'movie' },   // The Marvels
  { tmdb_id: 359410, type: 'movie' },   // Road House
  { tmdb_id: 974635, type: 'movie' },   // The Beekeeper
  { tmdb_id: 786892, type: 'movie' },   // Furiosa: A Mad Max Saga
  { tmdb_id: 576845, type: 'movie' },   // The Equalizer 3
  { tmdb_id: 930564, type: 'movie' },   // Saltburn
  { tmdb_id: 1075794, type: 'movie' },  // Leo
  { tmdb_id: 315162, type: 'movie' },   // Puss in Boots: The Last Wish
  { tmdb_id: 980489, type: 'movie' },   // Gran Turismo
  { tmdb_id: 1022789, type: 'movie' },  // Inside Out 2
  { tmdb_id: 1096197, type: 'movie' },  // No Hard Feelings
  { tmdb_id: 502356, type: 'movie' },   // The Super Mario Bros. Movie
  { tmdb_id: 562124, type: 'movie' },   // Expend4bles
  { tmdb_id: 897087, type: 'movie' },   // Freelance
  { tmdb_id: 678512, type: 'movie' },   // Sound of Freedom
  { tmdb_id: 995133, type: 'movie' },   // Cabrini
  { tmdb_id: 1202549, type: 'movie' },  // The Well
  { tmdb_id: 459003, type: 'movie' },   // Rebel Moon Part One
  { tmdb_id: 1087388, type: 'movie' },  // Rebel Moon Part Two
  { tmdb_id: 414906, type: 'movie' },   // The Batman
  { tmdb_id: 438631, type: 'movie' },   // Dune (2021)
  { tmdb_id: 335983, type: 'movie' },   // Venom: Let There Be Carnage
  { tmdb_id: 634649, type: 'movie' },   // Spider-Man: No Way Home
  { tmdb_id: 524434, type: 'movie' },   // Eternals
  { tmdb_id: 566525, type: 'movie' },   // Shang-Chi
  { tmdb_id: 399566, type: 'movie' },   // Godzilla vs. Kong
  { tmdb_id: 823219, type: 'movie' },   // Atlas
  { tmdb_id: 1001311, type: 'movie' },  // Society of the Snow
  // Top TV Shows
  { tmdb_id: 94997, type: 'tv' },       // House of the Dragon
  { tmdb_id: 84773, type: 'tv' },       // The Lord of the Rings: The Rings of Power
  { tmdb_id: 60735, type: 'tv' },       // The Flash
  { tmdb_id: 1402, type: 'tv' },        // The Walking Dead
  { tmdb_id: 66732, type: 'tv' },       // Stranger Things
  { tmdb_id: 44217, type: 'tv' },       // Vikings
  { tmdb_id: 1396, type: 'tv' },        // Breaking Bad
  { tmdb_id: 1418, type: 'tv' },        // The Big Bang Theory
  { tmdb_id: 82856, type: 'tv' },       // The Mandalorian
  { tmdb_id: 95396, type: 'tv' },       // Squid Game
];
