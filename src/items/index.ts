// Item methods are mixed into the public Weather Cal context for custom layouts.
import calendar from './calendar';
import weather from './weather';
import forecast from './forecast';
import sun from './sun';
import basic from './basic';
import rain from './rain';
export default { ...calendar, ...weather, ...forecast, ...sun, ...basic, ...rain };
