// Licensed under MIT. See LICENSE.

import type { WeatherCalContext } from '../../types/context';
import type { EditingCategory, GetCalendars, NewsSettings } from '../../types/settings';

export default async function(this: WeatherCalContext, getFromCalendar: GetCalendars): Promise<{ news: EditingCategory<NewsSettings> }> {
  return {
      news: {
        name: "News",
        url: {
          val: "http://rss.cnn.com/rss/cnn_topstories.rss",
          name: "RSS feed link",
          description: "The RSS feed link for the news to display."
        },
        numberOfItems: {
          val: "1",
          name: "Maximum number of news items shown",
        },
        limitLineHeight: {
          val: false,
          name: "Limit the height of each news item",
          description: "Set this to true to limit each headline to a single line.",
          type: "bool",
        },
        showDate: {
          val: "none",
          name: "Display the publish date for each news item",
          description: "Use relative (5 minutes ago), date, time, date and time, a custom format, or none.",
          type: "enum",
          options: ["relative","date","time","datetime","custom","none"],
        },
        dateFormat: {
          val: "H:mm",
          name: "Date and/or time format for news items",
          description: 'The format to use if the publish date setting is "formatted".',
        },
      },
  };
};
