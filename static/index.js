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
  rowStatusesTopCell.innerHTML = '<button class="cell-button" id="drop-week-button">KW&nbsp;<span id="kw-drop"></span>&nbsp;löschen</button>'
}

function initializeRow(row, today, entry) {
  const weekday = getWeekday(today);
  let weekDayCell = row.insertCell();
  weekDayCell.innerHTML = weekday;
  const dateFormattedForTable = today.toLocaleDateString("de", {"day" : "numeric", "month" : "short"});
  row.insertCell().innerHTML = dateFormattedForTable.replace(" ", "&nbsp;");
  let sum = 0;
  let colIndex = 0;
  for (const pair of entry) {
    let cell = row.insertCell();
    cell.classList.add("selectable");
    cell.setAttribute("data-col-index", colIndex);
    cell.innerHTML = `<input type="text" inputmode="numeric"></input>`;
    let input = cell.lastChild;
    if (pair == undefined) {
      sum = NaN;
      setAbsent(cell);
    } else {
      sum += parseInt(pair.score);
      input.value = pair.score;
      if (pair.state == "absent")
        setAbsent(cell);
      else if (pair.state == "cooks")
        setCooking(cell);
      else
        setJustEating(cell);
    }
    colIndex++;
  }
  const week = getWeekOfYear(today);
  if (weekday == "Mo") {
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
        sum += parseInt(input.value);
      }
      displayRowStatus(rowStatusCell, sum);
    };
  }
}

function displayRowStatus(cell, sum) {
  if (isNaN(sum))
    cell.innerHTML = "nicht ausgefüllt"
  else if (sum == 0)
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
  let rowStatusesTopCell = footer.insertCell();
  rowStatusesTopCell.innerHTML = '<button class="cell-button" id="add-week-button">KW&nbsp;<span id="kw-add"></span>&nbsp;hinzufügen</button>'
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

  let dates = Object.keys(data.entries).map(keyToDate);
  dates.sort((a, b) => a - b);
  if (dates.length == 0) {
    alert("Es gibt keine Einträge!");
  } else {
    let body = table.createTBody();

    let startDate = new Date(dates[0]);
    let endDate = new Date(dates[dates.length - 1]);
    adjustStartDate(startDate);
    adjustEndDate(endDate);

    let rowIndex = 0
    for (let date = startDate; date <= endDate; incrementDate(date)) {
      if (isWeekend(date))
        continue;

      const key = dateToKey(date);
      let entry = data.entries[key] ?? Array(names.length);
      let row = body.insertRow();
      row.setAttribute("data-date", key);
      row.setAttribute("data-row-index", rowIndex);
      initializeRow(row, date, entry);
      rowIndex++;
    }
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
  if (body == undefined)
    return result;

  for (let row of body.children) {
    let date = row.getAttribute("data-date");
    let stateScorePairs = []

    for (let cell of row.querySelectorAll(".selectable")) {
      let state;
      if (isAbsent(cell))
        state = "absent"
      else if (isCooking(cell))
        state = "cooks";
      else
        state = "justEats";
      let score = cell.lastChild.value;
      stateScorePairs.push({state: state, score: score});
    }

    result.entries[date] = stateScorePairs;
  }

  // in a partially-filled row, an empty cell contains "", which is parsed to NaN and then stringified to "null"
  return result;
}

async function loadDataFromServerIntoTable() {
  // lack of error handling is intentional
  let response = await fetch("data");
  deserializeTable(await response.json());
}

async function sendDataFromTableToServer() {
  if (!confirm("Wirklich speichern?")) // TODO: bei Konflikten warnen! Statusleiste auch!
    return;

  try
  {
    let response = await fetch("data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(serializeTable())
    });

    if (response.ok) {
      alert("Gespeichert");
      loadDate = new Date();
      refreshStatusBar();
    } else {
      alert("Fehler beim Speichern! Vermutung: Server-Bug")
    }
  } catch (error) {
    console.error(error);
    alert("Fehler beim Speichern! Vermutung: kein Internet")
  }
}

let alreadyWarned = false;
async function refreshStatusBar()
{
  let statusBar = document.getElementById("status-bar");

  let response;
  try
  {
    response = await fetch("status");
    if (!response.ok)
      return;
  } catch (_) {
    statusBar.innerHTML = "<b>Keine Internetverbindung!<b>";
    return;
  }

  let lastEdited = await response.json();
  if (lastEdited == null) {
    statusBar.innerHTML = "Wir wissen nicht, wer die Tabelle zuletzt editiert hat.";
  } else {
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
}

function moveCursor(key) {
  let active = document.activeElement;
  if (!active.matches("td.selectable input"))
    return;

  let cell = active.parentElement;
  let row = cell.parentElement;
  let tbody = row.parentElement;

  let colIndex = +cell.getAttribute("data-col-index");
  let rowIndex = +row.getAttribute("data-row-index");

  switch (key)
  {
    case "ArrowDown":
      let down = tbody.querySelector(`[data-row-index="${rowIndex + 1}"]`);
      if (down != null) {
        down.querySelector(`[data-col-index="${colIndex}"]`).lastChild.focus();
      }
      break;
    case "ArrowUp":
      let up = tbody.querySelector(`[data-row-index="${rowIndex - 1}"]`);
      if (up != null) {
        up.querySelector(`[data-col-index="${colIndex}"]`).lastChild.focus();
      }
      break;
    case "ArrowLeft":
      let left = row.querySelector(`[data-col-index="${colIndex - 1}"]`);
      if (left != null) {
        left.lastChild.focus();
      }
      break;
    case "ArrowRight":
      let right = row.querySelector(`[data-col-index="${colIndex + 1}"]`);
      if (right != null) {
        right.lastChild.focus();
      }
      break;
  }
}

function refreshWeekButtons() {
  let weeks = Array.from(document.querySelectorAll("#worksheet td.week")).map((cell) => +cell.innerHTML);
  if (weeks.length == 0) {
    document.getElementById("kw-add").innerHTML = "";
    document.getElementById("kw-drop").innerHTML = "";
  } else {
    document.getElementById("kw-add").innerHTML = Math.max(...weeks) + 1;
    document.getElementById("kw-drop").innerHTML = Math.min(...weeks);
  }
  document.getElementById("add-week-button").onclick = addWeek;
  document.getElementById("drop-week-button").onclick = dropWeek;
}

function addWeek() {
  let data = serializeTable();

  let dates = Object.keys(data.entries).map(keyToDate);
  dates.sort((a, b) => a - b);
  if (dates.length == 0) { // TODO: sicherstellen, dass über UI erreichbar
    let date = new Date();
    const key = dateToKey(date);
    data.entries[key] = undefined;
  } else {
    let date = new Date(dates[dates.length - 1]); // Friday
    incrementDate(date) // Saturday
    incrementDate(date) // Sunday
    incrementDate(date) // Monday
    const key = dateToKey(date);
    data.entries[key] = undefined;
  }

  document.getElementById("worksheet").replaceChildren();
  deserializeTable(data);
  refreshWeekButtons();
}

function dropWeek() {
  let data = serializeTable();

  let dates = Object.keys(data.entries).map(keyToDate);
  dates.sort((a, b) => a - b);
  let date = new Date(dates[0]);

  for (let i = 0; i < 5; i++) {
    const key = dateToKey(date);
    delete data.entries[key];
    incrementDate(date);
  }

  document.getElementById("worksheet").replaceChildren();
  deserializeTable(data);
  refreshWeekButtons();
}

function raiseFakeWindow(selectedName, allFakeWindows) {
  let maxIndex = Object.keys(allFakeWindows).length + 1;
  let currentIndex = document.getElementById(selectedName).style["z-index"];
  if (currentIndex == maxIndex)
    return; // nothing to do, already above all other windows
  for (let name of allFakeWindows) {
    let style = document.getElementById(name).style;
    if (style["z-index"] == currentIndex)
      style["z-index"] = maxIndex; // raise to the top
    else if (style["z-index"] > currentIndex)
      style["z-index"]--;
    // and if it's smaller, leave unchanged
  }
}

let loadDate = new Date();

window.onload = () => {
  loadDataFromServerIntoTable().then(refreshWeekButtons);
  // TODO: fill template

  document.getElementById("save-button").onclick = sendDataFromTableToServer;

  document.getElementById("cooks-button").onclick = () => getSelectedCells().forEach(setCooking);
  document.getElementById("just-eats-button").onclick = () => getSelectedCells().forEach(setJustEating);
  document.getElementById("absent-button").onclick = () => getSelectedCells().forEach(setAbsent);

  let fakeWindowNames = ["rules", "help", "template"];
  let zIndex = 2;
  for (let name of fakeWindowNames) {
    let window = document.getElementById(name);
    window.style["z-index"] = zIndex;
    zIndex++;
    window.onclick = () => raiseFakeWindow(name, fakeWindowNames);
    document.getElementById(`show-${name}-button`).onclick = () => { window.style.display = "block"; window.onclick(); };
    document.getElementById(`hide-${name}-button`).onclick = () => window.style.display = "none";
  }

  document.onkeydown = (e) => moveCursor(e.key);

  refreshStatusBar();
  setInterval(refreshStatusBar, 5000);
}
