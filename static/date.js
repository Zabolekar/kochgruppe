export function getWeekday(date) {
  return date.toLocaleDateString("de", {"weekday": "short"})
}

function isWeekend(date) {
  return ["Sa", "So"].includes(getWeekday(date))
}

function incrementDate(date) {
  date.setDate(date.getDate() + 1)
}

function decrementDate(date) {
  date.setDate(date.getDate() - 1)
}

/*
   The first week of the year is the week that contains the first Thursday of
   the year, see ISO 8601.
   See also public domain code at https://weeknumber.com/how-to/javascript
*/
export function getWeekOfYear(date) {
  function shiftToThursday (date) {
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  }
  let thisWeek = new Date(date.getTime());
  shiftToThursday(thisWeek);
  let firstWeek = new Date(thisWeek.getFullYear(), 0, 4); // January 4 is always in first week
  shiftToThursday(firstWeek);
  const differenceDays = (thisWeek.getTime() - firstWeek.getTime()) / 86400000;
  return 1 + Math.round(differenceDays / 7);
}

function keyToDate(key) { // key is e.g. "20.04.2024", date is JS Date object
  let match = key.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return new Date(match[3], match[2] - 1, match[1]);
}

export function dateToKey(date) {
  return date.toLocaleDateString("de", {"day": "2-digit", "month": "2-digit", "year": "numeric"});
}

function rewindToLastMonday(date) {
  while (getWeekday(date) != "Mo")
    decrementDate(date);
}

function rewindToNextFriday(date) {
    while (getWeekday(date) != "Fr")
      incrementDate(date);
}

export function dropWeekFromSerialized(entries) {
  let dates = Object.keys(entries).map(keyToDate);
  dates.sort((a, b) => a - b);
  let date = new Date(dates[0]);
  
  for (let i = 0; i < 5; i++) {
    const key = dateToKey(date);
    delete entries[key];
    incrementDate(date);
  }
}

export function addWeekToSerialized(entries, template) {
  let dates = Object.keys(entries).map(keyToDate);
  dates.sort((a, b) => a - b);
  let date;
  if (dates.length == 0) {
    date = new Date(); // today
    if (isWeekend(date)) {
      do { // rewind to next Monday
        incrementDate(date);
      } while (isWeekend(date))
    } else {
      rewindToLastMonday(date);
    }
  } else {
    date = new Date(dates[dates.length - 1]); // Friday
    incrementDate(date) // Saturday
    incrementDate(date) // Sunday
    incrementDate(date) // Monday
  }
  
  for (let row of template) {
    const key = dateToKey(date);
    entries[key] = row.map(state => ({ state : state, score : ""}));
    incrementDate(date);
  }
}

function startAndEndDate(keys) {
  let dates = keys.map(keyToDate);
  dates.sort((a, b) => a - b);
  let startDate = new Date(dates[0]);
  let endDate = new Date(dates[dates.length - 1]);
  rewindToLastMonday(startDate);
  rewindToNextFriday(endDate);
  return [startDate, endDate]
}

export function* relevantDates(keys) {
  let [startDate, endDate] = startAndEndDate(keys);
  for (let date = startDate; date <= endDate; incrementDate(date)) {
    if (isWeekend(date))
      continue;
    yield date;
  }
}

export function formatDateForTable(date) {
  return date.toLocaleDateString("de", {"day" : "numeric", "month" : "short"}).replace(" ", "&nbsp;")
}
