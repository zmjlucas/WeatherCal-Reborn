// Licensed under MIT. See LICENSE.

module.exports = async function(getFromCalendar) {
  return {
      covid: {
        name: "COVID data",
        country: {
          val: "USA",
          name: "Country for COVID information",
        },
        apiUrl: {
          val: "",
          name: "Statistics API endpoint",
          description: "Optional full endpoint returning country statistics. The default disease.sh source contains historical totals, not live case surveillance.",
        },
        url: {
          val: "https://covid19.who.int",
          name: "URL to open when the COVID data is tapped",
        },
      },
  };
};
