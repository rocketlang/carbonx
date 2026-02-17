import { builder } from './builder.js';

// Import all type definitions (registers queries/mutations as side effects)
import './types/vessel.js';
import './types/voyage.js';
import './types/cii.js';
import './types/ets.js';
import './types/fueleu.js';
import './types/eexi.js';
import './types/carbon-credit.js';
import './types/fleet-carbon.js';

export const schema = builder.toSchema();
