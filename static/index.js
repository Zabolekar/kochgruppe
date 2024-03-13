function getWeekday(date) {
  return date.toLocaleDateString("de", {"weekday": "short"})
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
function getWeekOfYear(date) {
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

function initializeHeader(header, names) {
  header.insertCell().innerHTML = "WT"
  header.insertCell().innerHTML = "Datum"
  for (const name of names) {
    const cell = header.insertCell();
    cell.outerHTML = `<th>${name}</th>`
  }
  header.insertCell().innerHTML = "KW"
  let rowStatusesTopCell = header.insertCell();
  rowStatusesTopCell.classList.add("nothing");
  rowStatusesTopCell.classList.add("row-error");
}

function initializeRow(row, today, entry) {
  const weekday = getWeekday(today);
  let weekDayCell = row.insertCell();
  weekDayCell.innerHTML = weekday;
  const dateFormattedForTable = today.toLocaleDateString("de", {"day" : "numeric", "month" : "short"});
  row.insertCell().innerHTML = dateFormattedForTable.replace(" ", "&nbsp;");
  let sum = 0;
  for (const pair of entry) {
    let cell = row.insertCell();
    cell.classList.add("selectable");
    cell.innerHTML = `<input type="text" inputmode="numeric"></input>`;
    let input = cell.lastChild;
    if (pair == undefined) {
      setAbsent(cell);
    }
    else {
      sum += pair.score;
      input.value = pair.score;
      if (pair.state == "absent")
        setAbsent(cell);
      else if (pair.state == "cooks")
        setCooking(cell);
      else
        setJustEating(cell);
    }
    
  }
  const week = getWeekOfYear(today);
  if (weekday == "Mo") { // TODO: handle year beginning
    let weekCell = row.insertCell();
    weekCell.setAttribute("rowSpan", 5);
    weekCell.classList.add("week");
    weekCell.innerHTML = week
  }
  if (week % 2)
    for (let cell of row.querySelectorAll(":not(.selectable)")) {
      cell.classList.add("odd-week");
  }

  let rowStatusCell = row.insertCell()
  rowStatusCell.classList.add("row-error")
  displayRowStatus(rowStatusCell, sum);

  for (let input of row.querySelectorAll(".selectable input")) {
    input.oninput = () => {
      let sum = 0;
      for (let input of row.querySelectorAll(".selectable input")) {
        if (input.value != "")
          sum += parseInt(input.value);
      }
      displayRowStatus(rowStatusCell, sum);
    };
  }
}

function displayRowStatus(cell, sum) {
  if (sum == 0)
    cell.innerHTML = "OK";
  else
    cell.innerHTML = `<mark>Ein Bug! Summe muss 0 sein, ist aber ${sum}.</mark>`;
}

function initializeFooter(footer, names) {
  footer.insertCell().classList.add("nothing");
  footer.insertCell().classList.add("nothing");
  for (const name of names) {
    let cell = footer.insertCell();
    cell.outerHTML = `<th>${name}</th>`
  }
  footer.insertCell().classList.add("nothing");
}

function flipSelection(cell) {
  if (cell.classList.contains("selected"))
    cell.classList.remove("selected")   
  else
    cell.classList.add("selected")
}

function isCooking(cell) {
  return cell.classList.contains("cooks");
}

function isAbsent(cell) {
  return cell.classList.contains("absent");
}

function setJustEating(cell) {
  cell.classList.remove("cooks");
  cell.classList.remove("absent");
}

function setCooking(cell) {
  cell.classList.add("cooks");
  cell.classList.remove("absent");
}

function setAbsent(cell) {
  cell.classList.remove("cooks");
  cell.classList.add("absent");
}

function cycleStates(cell) {
  if (isCooking(cell))
    setAbsent(cell);
  else if (isAbsent(cell))
    setJustEating(cell);
  else
    setCooking(cell);
}

function onClickDispatcher(cell) {
  return event => {
    if (event.shiftKey)
      cycleStates(cell)
    else
      flipSelection(cell)
  }
}

function getSelectableCells() {
  return document.querySelectorAll("#worksheet td.selectable")
}

function getSelectedCells() {
  return document.querySelectorAll("#worksheet td.selected")
}

function isWeekend(date) {
  return ["Sa", "So"].includes(getWeekday(date))
}

function keyToDate(key) { // key is e.g. "20.04.2024", date is JS Date object
  let match = key.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return new Date(match[3], match[2] - 1, match[1]);
}

function dateToKey(date) {
  return date.toLocaleDateString("de", {"day": "2-digit", "month": "2-digit", "year": "numeric"});
}

function adjustStartDate(date) {
  // rewind until previous Monday
  while (getWeekday(date) != "Mo")
    decrementDate(date);
}

function adjustEndDate(date) {
    // add ten days (why ten? because why not)
    for (let i = 0; i < 10; i++)
      incrementDate(date);
    // rewind until next Friday
    while (getWeekday(date) != "Fr")
      incrementDate(date);
}

function deserializeTable(data) {
  let table = document.getElementById("worksheet");

  // add first two columns
  for (let s of ["weekdays", "dates"]) {
    let col = document.createElement("col");
    col.classList.add(s);
    table.appendChild(col);
  }

  // name columns
  const names = data.names;
  for (let index in names) {
    let col = document.createElement("col");
    col.classList.add(`named${index % 9}`);  // 9 because there are 9 different column colors. If you change it, adjust CSS as well. 
    table.appendChild(col);
  }

  // last column
  let col = document.createElement("col");
  col.classList.add("weeks");
  table.appendChild(col);

  initializeHeader(table.createTHead().insertRow(), names);

  let body = table.createTBody();

  let dates = Object.keys(data.entries).map(keyToDate);
  dates.sort((a, b) => a - b);
  if (dates.length == 0)
  {
    alert("No entries found!");
    return;
  }
  let startDate = new Date(dates[0]);
  let endDate = new Date(dates[dates.length - 1]);
  adjustStartDate(startDate);
  adjustEndDate(endDate);

  for (let date = startDate; date <= endDate; incrementDate(date)) {
    if (isWeekend(date))
      continue;

    const key = dateToKey(date);
    let entry = data.entries[key] ?? new Array(names.length);
    let row = body.insertRow();
    row.setAttribute("date", key);
    initializeRow(row, date, entry);
  }

  initializeFooter(table.createTFoot().insertRow(), names);

  for (let cell of getSelectableCells()) {
    cell.onclick = onClickDispatcher(cell);
  }
}

function serializeTable()
{
  let result = { names: [], entries: {} };
  let table = document.getElementById("worksheet");
  let header = table.getElementsByTagName("thead")[0];
  for (let cell of header.getElementsByTagName("th"))
    result.names.push(cell.innerHTML);
  let body = table.getElementsByTagName("tbody")[0];
  for (let row of body.children) {
    let date = row.getAttribute("date");
    let rowHasData = false;
    let stateScorePairs = []

    for (let cell of row.querySelectorAll(".selectable")) {
      let state;
      if (isAbsent(cell)) {
        state = "absent";
        if (cell.lastChild.value != "")
          rowHasData = true;
      }
      else if (isCooking(cell)) {
        state = "cooks";
        rowHasData = true;
      }
      else {
        state = "justEats";
        rowHasData = true;
      }
      let score = parseInt(cell.lastChild.value);
      stateScorePairs.push({state: state, score: score});
    }

    if (rowHasData)
      result.entries[date] = stateScorePairs;
  }

  // in a partially-filled row, an empty cell contains "", which is parsed to NaN and then stringified to "null"
  return JSON.stringify(result);
}

function loadFromServer(address, onSuccess)
{
  let request = new XMLHttpRequest();
  request.open("GET", address, true);
  request.onload = function() {
    if (this.status == 200)
      onSuccess(this.response);
    else
      console.log(`address ${address} returns ${this.status}`);
  };
  request.onerror = () => console.log("connection error");
  request.send();
}

function loadDataFromServerIntoTable() {
  loadFromServer("data", (response) => deserializeTable(JSON.parse(response)));
}

function sendDataFromTableToServer() {
  if (!confirm("Wirklich speichern?")) // TODO: bei Konflikten warnen! Statusleiste auch!
    return;

  let request = new XMLHttpRequest();
  request.open("POST", "data", true);
  request.setRequestHeader("Content-Type", "application/json");
  request.onreadystatechange = function () {
    if (request.readyState == 4 /* DONE */)
      if (request.status == 200)
      {
        alert("Gespeichert");
        loadDate = new Date();
        refreshStatusBar();
      }
      else
      {
        alert("Fehler beim Speichern!")
      }
  };
  request.send(serializeTable());
}

let alreadyWarned = false;
function refreshStatusBar()
{
  loadFromServer("status", (response) => {
    let statusBar = document.querySelector("#status-bar");
    let lastEdited = JSON.parse(response);
    if (lastEdited == null)
    {
      statusBar.innerHTML = "Wir wissen nicht, wer die Tabelle zuletzt editiert hat.";
    }
    else
    {
      let ip = lastEdited.ip;
      let date = new Date(lastEdited.date); // local German time in ISO format with time zone suffix
      let day = date.toLocaleDateString("de", {"day" : "numeric", "month" : "short"});
      let time = date.toLocaleTimeString("de");
      statusBar.innerHTML = `${ip} hat die Tabelle am ${day} um ${time} editiert.`;
      if (!alreadyWarned && date > loadDate)
      {
        alert("Jemand anders hat die Tabelle eben überschrieben!");
        alreadyWarned = true;
      }
    }
  });
}

let loadDate = new Date();

window.onload = () => {
  loadDataFromServerIntoTable();

  document.getElementById("save-button").onclick = () => sendDataFromTableToServer();

  let rules = document.getElementById("rules");
  let help = document.getElementById("help");
  let raiseRulesAboveHelp = () => { rules.style["z-index"] = 3; help.style["z-index"] = 2 };
  let raiseHelpAboveRules = () => { rules.style["z-index"] = 2; help.style["z-index"] = 3 };
  document.getElementById("show-rules-button").onclick = () => { rules.style.display = "block"; raiseRulesAboveHelp() };
  document.getElementById("hide-rules-button").onclick = () => rules.style.display = "none";
  document.getElementById("show-help-button").onclick = () => { help.style.display = "block"; raiseHelpAboveRules() };
  document.getElementById("hide-help-button").onclick = () => help.style.display = "none";
  rules.onclick = raiseRulesAboveHelp;
  help.onclick = raiseHelpAboveRules;

  document.getElementById("cooks-button").onclick = () => getSelectedCells().forEach(setCooking);
  document.getElementById("just-eats-button").onclick = () => getSelectedCells().forEach(setJustEating);
  document.getElementById("absent-button").onclick = () => getSelectedCells().forEach(setAbsent);

  refreshStatusBar();
  setInterval(refreshStatusBar, 5000);
}
