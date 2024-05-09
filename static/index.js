import { getWeekday, getWeekOfYear, dateToKey, relevantDates, addWeekToSerialized, dropWeekFromSerialized, formatDateForTable } from "./date.js"

function insertNames(row, names) {
  for (const name of names)
    row.insertCell().outerHTML = `<th>${name}</th>`
}

function initializeHeader(header, names) {
  header.insertCell().innerHTML = "WT";
  header.insertCell().innerHTML = "Datum";
  insertNames(header, names);
  header.insertCell().innerHTML = "KW";
  header.insertCell().innerHTML = '<button class="cell-button" id="drop-week-button">KW&nbsp;<span id="kw-drop"></span>&nbsp;löschen</button>';
}

function initializeFooter(footer, names) {
  footer.insertCell().classList.add("nothing");
  footer.insertCell().classList.add("nothing");
  insertNames(footer, names);
  footer.insertCell().classList.add("nothing");
  footer.insertCell().innerHTML = '<button class="cell-button" id="add-week-button">KW&nbsp;<span id="kw-add"></span>&nbsp;hinzufügen</button>';
}

function initializeRow(row, today, entry) {
  const weekday = getWeekday(today);
  row.insertCell().innerHTML = weekday;
  row.insertCell().innerHTML = formatDateForTable(today);
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

function cycleTemplateStates(cell) {
  if (isAbsent(cell))
    setJustEating(cell);
  else
    setAbsent(cell);
}

function onClickDispatcher(cell) {
  return event => {
    if (event.shiftKey)
      cycleStates(cell)
    else
      flipSelection(cell)
  }
}

function onClickDispatcherTemplate(cell) {
  return event => {
    if (event.shiftKey)
      cycleTemplateStates(cell)
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

function getSelectableTemplateCells() {
  return document.querySelectorAll("#template td.selectable")
}

function getSelectedTemplateCells() {
  return document.querySelectorAll("#template td.selected")
}

function deserializeNames(names) {
  let worksheet = document.getElementById("worksheet");
  let template = document.getElementById("template");
  
  // add first two columns to the worksheet
  for (let s of ["weekdays", "dates"]) {
    let col = document.createElement("col");
    col.classList.add(s);
    worksheet.appendChild(col);
  }

  // and the weekdays column to the template
  template.appendChild(document.createElement("col"));

  // name columns
  for (let table of [worksheet, template])
  {
    for (let index in names) {
      let col = document.createElement("col");
      col.classList.add(`named${index % 9}`);  // 9 because there are 9 different column colors. If you change it, adjust CSS as well. 
      table.appendChild(col);
    }
  }

  // last worksheet column
  let col = document.createElement("col");
  col.classList.add("weeks");
  worksheet.appendChild(col);

  initializeHeader(worksheet.querySelector("thead tr"), names);
  initializeFooter(worksheet.querySelector("tfoot tr"), names);
  insertNames(template.querySelector("thead tr"), names);
}

function countNames() {
  return document.querySelectorAll("#worksheet thead th").length;
}

function deserializeWorksheet(entries) {
  let keys = Object.keys(entries);
  if (keys.length == 0) {
    alert("Es gibt keine Einträge!");
    return;
  }

  let entryLength = countNames(); // may be inelegant, but there is no other way if all the entries are undefined

  let body = document.querySelector("#worksheet tbody");
  let rowIndex = 0
  for (let date of relevantDates(keys)) {
    const key = dateToKey(date);
    let entry = entries[key] ?? Array(entryLength);
    let row = body.insertRow();
    row.setAttribute("data-date", key);
    row.setAttribute("data-row-index", rowIndex);
    initializeRow(row, date, entry);
    rowIndex++;
  }

  for (let cell of getSelectableCells())
    cell.onclick = onClickDispatcher(cell);
}

function deserializeTemplate(entries) {
  let rows = document.querySelectorAll("#template tbody tr");
  for (let rowIndex = 0; rowIndex < 5; rowIndex++) {
    let entry = entries[rowIndex];
    let row = rows[rowIndex];
    row.setAttribute("data-template-row-index", rowIndex);
    let colIndex = 0;
    for (let state of entry) {
      let cell = row.insertCell();
      cell.classList.add("selectable");
      cell.setAttribute("data-template-col-index", colIndex);
      if (state == "absent")
        setAbsent(cell);
      else
        setJustEating(cell);
      colIndex++;
    }
  }
  for (let cell of getSelectableTemplateCells())
    cell.onclick = onClickDispatcherTemplate(cell);
}

function serializeTemplate() {
  let template = [];
  let body = document.querySelector("#template tbody");
  for (let row of body.children) {
    let rowData = [];
    for (let cell of row.querySelectorAll(".selectable")) {
      if (isAbsent(cell))
        rowData.push("absent");
      else
        rowData.push("justEats");
    }
    template.push(rowData);
  }
  return template;
}

function serializeNames() {
  return Array.from(document.querySelectorAll("#worksheet thead th")).map(cell => cell.innerHTML);
}

function serializeWorksheet() {
  let worksheet = {};

  let body = document.querySelector("#worksheet tbody");
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

    worksheet[date] = stateScorePairs;
  }

  // in a partially-filled row, an empty cell contains "", which is parsed to NaN and then stringified to "null"
  return worksheet;
}

async function loadWorksheetAndTemplateFromServer() {
  // lack of error handling is intentional
  let response = await fetch("data");
  let data = await response.json();

  deserializeNames(data.names);
  deserializeWorksheet(data.worksheet);
  deserializeTemplate(data.template);
}

async function sendWorksheetAndTemplateToServer() {
  if (!confirm("Wirklich speichern?")) // TODO: bei Konflikten warnen! Statusleiste auch!
    return;

  try
  {
    let response = await fetch("data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: serializeNames(), worksheet: serializeWorksheet(), template: serializeTemplate() })
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
  let weeks = Array.from(document.querySelectorAll("#worksheet td.week")).map(cell => +cell.innerHTML);
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
  let entries = serializeWorksheet();
  const template = serializeTemplate();
  addWeekToSerialized(entries, template);
  document.querySelector("#worksheet tbody").replaceChildren();
  deserializeWorksheet(entries);
  refreshWeekButtons();
}

function dropWeek() {
  let entries = serializeWorksheet();
  dropWeekFromSerialized(entries);
  document.querySelector("#worksheet tbody").replaceChildren();
  deserializeWorksheet(entries);
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
  loadWorksheetAndTemplateFromServer().then(refreshWeekButtons);

  document.getElementById("save-button").onclick = sendWorksheetAndTemplateToServer;

  document.getElementById("cooks-button").onclick = () => getSelectedCells().forEach(setCooking);
  document.getElementById("just-eats-button").onclick = () => getSelectedCells().forEach(setJustEating);
  document.getElementById("absent-button").onclick = () => getSelectedCells().forEach(setAbsent);

  document.getElementById("template-just-eats-button").onclick = () => getSelectedTemplateCells().forEach(setJustEating);
  document.getElementById("template-absent-button").onclick = () => getSelectedTemplateCells().forEach(setAbsent);

  let fakeWindowNames = ["rules", "help", "template-editor"];
  let zIndex = 2;
  for (let name of fakeWindowNames) {
    let window = document.getElementById(name);
    window.style["z-index"] = zIndex;
    zIndex++;
    window.onclick = () => raiseFakeWindow(name, fakeWindowNames);
    document.getElementById(`show-${name}-button`).onclick = () => { window.style.display = "block"; window.onclick(); };
    document.getElementById(`hide-${name}-button`).onclick = () => window.style.display = "none";
  }

  document.onkeydown = e => moveCursor(e.key);

  refreshStatusBar();
  setInterval(refreshStatusBar, 5000);
}
