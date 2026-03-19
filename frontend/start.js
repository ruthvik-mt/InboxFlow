/**
 * Silent Start Wrapper for InboxFlow Frontend
 * Suppresses persistent deprecation warnings from internal dependencies (CRA/Webpack)
 */
process.env.NODE_NO_WARNINGS = '1';
process.noDeprecation = true;

// Trigger the original react-scripts start script
require('./node_modules/react-scripts/scripts/start.js');
