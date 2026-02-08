
import { withDb } from '../lib/storage.js';

withDb((db) => {
  console.log(`Before: ${db.properties.length} properties, ${db.complexes.length} complexes, ${db.feed_sources.length} feeds`);
  
  db.properties = [];
  db.complexes = [];
  db.feed_sources = []; // Also clear feeds as requested "entire base"
  
  console.log(`After: ${db.properties.length} properties, ${db.complexes.length} complexes, ${db.feed_sources.length} feeds`);
});
