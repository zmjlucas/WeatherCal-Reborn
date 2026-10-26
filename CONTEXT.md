# WeatherCal

WeatherCal presents a widget's selected weather, agenda and appearance. These terms describe the QWeather state shared by widgets.

## Language

**QWeather host**:
The dedicated QWeather hostname through which a widget obtains weather. Several widgets may use the same host.
_Avoid_: widget account

**QWeather credentials**:
The host and key used to authorize weather retrieval. Widgets using the same host share its key.

**QWeather host state**:
The credentials and request availability associated with a QWeather host on one device. This state is shared by widgets using that host.
_Avoid_: widget-specific quota, account-wide quota manager

**QWeather cooldown**:
A period during which requests for a host are paused after a failure or limit response. Previously obtained weather can remain available during that period.
