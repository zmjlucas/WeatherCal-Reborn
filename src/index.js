const { createWeatherCal } = require('./create');

// Scriptable's importModule API exposes the familiar singleton and an optional factory.
module.exports = createWeatherCal();
module.exports.createWeatherCal = createWeatherCal;
