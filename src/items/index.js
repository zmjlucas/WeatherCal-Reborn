// Item methods are mixed into the public Weather Cal context for custom layouts.
module.exports = Object.assign({},
  require('./calendar'),
  require('./weather'),
  require('./forecast'),
  require('./sun'),
  require('./basic'),
  require('./feeds')
);
