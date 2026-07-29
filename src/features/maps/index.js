/* ============================================================
   features/maps/index.js
   Map registry. Import MAPS from here rather than reaching into
   individual map files, so adding a new map only requires an
   entry here + a new file — nothing else in the codebase changes.
   ============================================================ */

import { greenMap } from './green.js';
import { cityMap } from './city.js';
import { moonMap } from './moon.js';
import { windMap } from './wind.js';
import { spaceMap } from './space.js';

export const MAPS = {
  green: greenMap,
  city: cityMap,
  moon: moonMap,
  wind: windMap,
  space: spaceMap
};
