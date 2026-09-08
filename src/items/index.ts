// Item methods are mixed into the public Weather Cal context for custom layouts.
import calendar from './calendar';
import weather from './weather';
import forecast from './forecast';
import sun from './sun';
import basic from './basic';
import feeds from './feeds';
export default { ...calendar, ...weather, ...forecast, ...sun, ...basic, ...feeds };
