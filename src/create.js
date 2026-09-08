// All public methods retain their original `this` context for custom widget code.
const groups = [
  require('./widget'), require('./layout/engine'),
  require('./core/formatting'), require('./core/drawing'), require('./core/gradient'),
  require('./core/prompts'), require('./core/storage'),
  require('./preferences/defaults'), require('./preferences/store'), require('./preferences/editor'),
  require('./data/cache'), require('./data/agenda'), require('./data/location'),
  require('./data/weather'), require('./data/feeds'),
  require('./items/index'),
  require('./setup/menu'), require('./setup/onboarding'),
  require('./setup/backgrounds'), require('./setup/distribution')
];

function createWeatherCal() {
  const context = Object.assign({}, ...groups);
  context.enum = JSON.parse(JSON.stringify(context.enum));
  return context;
}
module.exports = { createWeatherCal };
