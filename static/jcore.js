let HOST;
function updateHeader() {
  let bedTime = 23; // 11pm
  let dayStart = 5; // 5am
  const elements = document.querySelectorAll(".percent-completed-items > div");
  if (elements.length >= 3) {
    let now = new Date();
    let options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    let longDate = now.toLocaleDateString('en-US', options);
    let endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, dayStart);
    let endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    let endOfYear = new Date(now.getFullYear() + 1, 0, 1);
    let startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), dayStart);

    let totalDayMinutes = (bedTime - dayStart) * 60;
    let currentDayMinutes = (now.getHours() * 60 + now.getMinutes()) - (dayStart * 60);
    currentDayMinutes = currentDayMinutes < 0 ? 0 : currentDayMinutes; // Account for before day start
    let percentDayDone = (currentDayMinutes / totalDayMinutes) * 100;

    let daysInMonth = (endOfMonth - new Date(now.getFullYear(), now.getMonth(), 1)) / (1000 * 60 * 60 * 24);
    let percentMonthDone = ((now.getDate() - 1 + now.getHours() / 24) / daysInMonth) * 100;

    let daysInYear = (endOfYear - new Date(now.getFullYear(), 0, 1)) / (1000 * 60 * 60 * 24);
    let percentYearDone = ((now - new Date(now.getFullYear(), 0, 1)) / (daysInYear * 24 * 60 * 60 * 1000)) * 100;

    elements[0].textContent = percentDayDone.toFixed(2) + "% day done";
    elements[1].textContent = percentMonthDone.toFixed(2) + "% of month done";
    elements[2].textContent = percentYearDone.toFixed(2) + "% of year done";
    document.querySelector(".header h1").textContent = longDate;
  }
}
//         Reward.getTodaysReward().then(rewardImageUrl => {

class Reward {
  constructor(rewardImageUrl) {
    this.className = "module-reward"
    this.goal = this.getGoal();
    this.html = `
    ${this.getButton()}
    ${this.getHeader()}
    <img class='reward-image' src='${rewardImageUrl}?time=${new Date().getTime()}'>
  `;
  }

  getGoal() {
    // Filter the habits for those with a daily quota duration and count them
    let dailyHabitsCount = app.HabitTracker.habits.filter(habit => habit.quota.duration === 'daily').length;
    return dailyHabitsCount;
  }

  getButton() {
    return `<div class='unlock-button ${!this.canUnlock() ? "hidden" : ""}' onclick='app.Reward.unlock()'>Unlock</div>`;
  }

  getHeader() {
    return `<div class='reward-header'><p class='reward-message'>Locked</p> 
    <span class='reward-progress'>${this.getProgressBar()}</span></div>`;
  }

  getProgressBar() {
    // let totalHabits = app.HabitTracker.habits.length;
    let totalHabits = this.goal;
    let totalDone = app.Quota.getDone().length;
    let template = "<div class='reward-progress-{iORc}'></div>";
    let result = "";
    for (let i = 0; i < totalHabits; i++) {
      result += template.replace("{iORc}", i < totalDone ? "complete" : "incomplete");
    }
    return result;
  }

  static async getTodaysReward() {
    let url = `http://${HOST}/reward`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('No image available');
      }
      return response.url;
    } catch (error) {
      console.error('Error fetching the reward image:', error);
      // return 'path/to/default/image.jpg';
    }
  }

  // Check if the reward can be unclocked
  canUnlock() {
    return app.Quota.getDone().length >= this.goal;
  }

  unlock() {
    document.querySelector('.unlock-button').classList.add('hidden');
    document.querySelector('.reward-message').textContent = 'Unlocked';
    document.querySelector('.module-reward').classList.remove('locked');
  }

  update() {
    let newHtml = `${this.getButton()}${this.getHeader()}`;
    let oldElements = document.querySelectorAll(".reward-header, .unlock-button");

    // Remove the old elements
    oldElements.forEach(element => {
      element.parentNode.removeChild(element);
    });

    // Prepend the newHtml to the .module-reward container
    let moduleReward = document.querySelector(".module-reward");
    moduleReward.insertAdjacentHTML('afterbegin', newHtml);
  }

  toggle() {
    let x = document.querySelector("." + this.className);

    console.log("." + this.className)
    if (x.style.display === "none") {
      x.style.display = "block";
    } else {
      x.style.display = "none";
    }
  }

  render() {
    const modules = document.querySelector('.modules');
    const thisModule = document.createElement('div');
    thisModule.className = this.className + " locked module";
    thisModule.innerHTML = this.html;
    modules.appendChild(thisModule);
  }
}

class Habit {
  constructor(name, start, history, exclusions, quota, id = 0) {
    this.name = name;
    this.id = id;
    this.start = start;
    this.history = history;
    this.exclusions = exclusions;
    this.quota = quota;
  }


  metQuota() {
    let done = false;
    const today = new Date();
    const history = this.history;
    const quotaAmount = this.quota.amount;

    function isDateEqual(date1, date2) {
      return date1.getDate() === date2.getDate() &&
        date1.getMonth() === date2.getMonth() &&
        date1.getFullYear() === date2.getFullYear();
    }

    // Based on the duration of the quota we find if they completed their quota.
    // | NYI | Daily will be different because we will have them click the box x amount of times until it completes
    switch (this.quota.duration) {
      case "daily":
        done = history.some(entry => isDateEqual(new Date(entry.date), today) && entry.done);
        break;

      default:
        done = this.getDone() >= quotaAmount;
        break;
    }

    return done;
  }

  // Returns days remaining before quota is met
  getTimeLeft() {
    const today = new Date();
    const periodEnd = this.getEndOfPeriod(this.quota.duration.toLowerCase(), this.getStartOfPeriod(this.quota.duration.toLowerCase(), today));
    const timeDiff = periodEnd - today;
    return Math.ceil(timeDiff / (1000 * 3600 * 24)); // Convert milliseconds to days
  }

  getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(d.setDate(diff));
  }


  // Helper function to get the start of the period
  getStartOfPeriod(period, date) {
    const d = new Date(date);
    switch (period) {
      case 'weekly':
      case 'bi-weekly':
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
        d.setDate(diff);
        return d;
      case 'monthly':
        return new Date(d.getFullYear(), d.getMonth(), 1);
      case 'quarterly':
        const quarter = Math.floor(d.getMonth() / 3);
        return new Date(d.getFullYear(), quarter * 3, 1);
      case 'semi-annually':
        const half = Math.floor(d.getMonth() / 6);
        return new Date(d.getFullYear(), half * 6, 1);
      case 'yearly':
        return new Date(d.getFullYear(), 0, 1);
      default:
        return d;
    }
  }

  // Helper function to get the end of the period
  getEndOfPeriod(period, start) {
    const d = new Date(start);
    switch (period) {
      case 'weekly':
        d.setDate(d.getDate() + 6);
        break;
      case 'bi-weekly':
        d.setDate(d.getDate() + 13);
        break;
      case 'monthly':
        d.setMonth(d.getMonth() + 1);
        d.setDate(0); // Last day of the current month
        break;
      case 'quarterly':
        d.setMonth(d.getMonth() + 3);
        d.setDate(0); // Last day of the current quarter
        break;
      case 'semi-annually':
        d.setMonth(d.getMonth() + 6);
        d.setDate(0); // Last day of the current semester
        break;
      case 'yearly':
        d.setFullYear(d.getFullYear() + 1);
        d.setDate(0); // Last day of the year
        break;
    }
    return d;
  }

  // Returns the number of days a habit has been marked complete within their quota duration
  getDone() {
    const today = new Date();
    let count = 0;
    const periodStart = this.getStartOfPeriod(this.quota.duration.toLowerCase(), today);
    const periodEnd = this.getEndOfPeriod(this.quota.duration.toLowerCase(), periodStart);

    // Helper function to compare dates
    const isSameDay = (d1, d2) => {
      return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
    };

    count = this.history.filter(entry => {
      const entryDate = new Date(entry.date);
      if (this.quota.duration === "daily") {
        return isSameDay(entryDate, periodStart) && entry.done;
      }
      return entryDate >= periodStart && entryDate <= periodEnd && entry.done;
    }).length;

    return count;
  }
  getStreak() {
    // check if there any days missing in their entries from the day that this habit was started
  }

  // Turn obj to Habit obj
  static serialize(habits) {
    if (Array.isArray(habits)) {
      // If it's an array, handle each object in the list
      return habits.map(h => new Habit(h.name, h.start, h.history, h.exclusions, h.quota, h.id));
    }
    else {
      // If it's a single object, convert and return it
      return new Habit(habits.name, habits.start, habits.history, habits.exclusions, habits.quota, habits.id);
    }
  }
}

class Module {
  constructor() {
    this.html = '';
  }

  render() {
    const modules = document.querySelector('.modules');
    modules.appendChild(this.html);
  }

  createModule(className, content) {
    const moduleElement = document.createElement('div');
    moduleElement.className = `${className} module`;
    moduleElement.innerHTML = content;
    this.html = moduleElement;
    console.log(this.html)
  }
}

class Quota extends Module {
  constructor(habits) {
    super();
    this.className = "module-quota";
    this.html = this.createTableHtml(habits);
    this.createModule(this.className, this.html);
  }

  createTableHtml(habits) {
    let tableHtml = `<strong style="text-align: center; font-size: 20px; margin-bottom: 10px;">Quota</strong><table>`;
    habits.forEach(habit => {
      tableHtml += this.createTableRow(habit);
    });
    tableHtml += '</table>';
    return tableHtml;
  }

  createTableRow(habit) {
    const happyOrSad = habit.metQuota() ? "happy" : "sad";
    const done = habit.getDone();

    const total = habit.quota.amount;
    // <tr title='${habit.name}' style='background: linear-gradient(to right, ${backgroundColor} 70%, transparent 70%);'>
    return `
      <tr class='habit-row ${happyOrSad}' id='quota-${habit.id}' title='${habit.name}'>
        <td>${done}/${total}</td>
        <td>${habit.quota.duration}</td>
        <td>${(timeLeft => timeLeft === 0 ? 'today' : `${timeLeft} days left`)(habit.getTimeLeft())}</td>
        </tr>
    `;
  }

  // Returns id's of that have been completed
  getDone() {
    return document.querySelectorAll(".module-quota tr.happy");
  }

  // Here we are given the id of the habit that was altered.
  // Now we will edit the text
  update(id) {
    let habit = app.HabitTracker.habits.find(h => h.id == id);
    let selector = "quota-" + id;
    let row = document.getElementById(selector);
    let newRowHtml = this.createTableRow(habit).trim();

    let tempContainer = document.createElement('tbody');
    tempContainer.innerHTML = newRowHtml;

    // The first child should now be a <tr> element
    let newRow = tempContainer.firstElementChild;

    // Insert the new row after the current row and remove the old row
    row.parentNode.replaceChild(newRow, row);

    // After we have updated this we now update other things
    app.Reward.update();
  }
}

function getQuotaAmount(duration) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const quotaTable = {
    "daily": 1,
    "weekly": 7,
    "bi-weekly": 14,
    "monthly": new Date(currentYear, now.getMonth() + 1, 0).getDate(),
    "quarterly": (() => {
      let totalDays = 0;
      for (let i = 0; i < 4; i++) {
        totalDays += new Date(currentYear, now.getMonth() + i + 1, 0).getDate();
      }
      return totalDays;
    })(),
    "semi-annually": (() => {
      let totalDays = 0;
      for (let i = 0; i < 6; i++) {
        totalDays += new Date(currentYear, now.getMonth() + i + 1, 0).getDate();
      }
      return totalDays;
    })(),
    "yearly": (() => {
      return (new Date(currentYear, 12, 0)).getDate() - (new Date(currentYear, 0, 0)).getDate();
    })()
  };

  return quotaTable[duration];
}

class HabitTracker extends Module {
  constructor(habits) {
    super();
    this.className = "module-habits";
    this.habits = habits;
    this.html = this.buildTable(habits);
    this.createModule(this.className, this.html);
  }

  getHabit(id) {
    return this.habits.find(habit => habit.id === id);
  }

  buildTable(habits) {
    const [dayNames, currentDay, weekNumber] = this.getWeekData();
    let tableHtml = `<table><tr><th>Week ${weekNumber} / 52</th>${this.generateDayHeaders(dayNames, currentDay)}</tr>`;

    // First sort habits by smallest duration first
    habits = habits.sort((a, b) => HabitTracker.durationToNum(a.quota.duration) - HabitTracker.durationToNum(b.quota.duration));
    /*
      <option value="weekly">Weekly</option>
      <option value="daily">Daily</option>
      <option value="bi-weekly">Bi-weekly</option>
      <option value="monthly">Monthly</option>
      <option value="quarterly">Quarterly (4mo)</option>
      <option value="semi-annually">Semi-Annually (6mo)</option>
      <option value="yearly">Yearly (12mo)</option>

    */

    // Build rows
    habits.forEach(habit => {
      // if (habit.quota.duration === "yearly") return;
      tableHtml += this.generateHabitRow(habit);
    });
    tableHtml += `</table><div class='habit-tracker-footer'><a onclick="HabitTracker.openDialog()">New</a><a onclick='app.HabitTracker.save()'>Save</a></div>`;
    return tableHtml;
  }

  getWeekData() {
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const currentDate = new Date();
    const currentDay = currentDate.getDay();
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
    const weekNumber = Math.ceil(((currentDate - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
    return [dayNames, currentDay, weekNumber];
  }

  generateDayHeaders(dayNames, currentDay) {
    return dayNames.map((day, i) => `<th class="${i === currentDay ? 'current-day' : ''}">${day}</th>`).join('');
  }

  generateHabitRow(habit) {
    let rowHtml = `<tr>
        <td onclick='app.HabitTracker.openPreview(${habit.id})'>${habit.name}</td>
        ${this.generateWeekDays(habit)}
      </tr>`;
    return rowHtml;
  }

  getStartOfWeek(date) {
    const d = new Date(date)
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  }

  generateWeekDays(habit) {
    const today = new Date();
    const startOfWeek = this.getStartOfWeek(today);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6); // The end of the week is 6 days after the start
    return Array.from({ length: 7 }, (_, j) => {
      const weekDay = new Date(startOfWeek);
      weekDay.setDate(weekDay.getDate() + j); // No need to subtract 1 anymore

      let className = 'habit-day' + (weekDay.toDateString() === today.toDateString() ? ' habit-day-today' : '');

      if (habit.history.some(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.toDateString() === weekDay.toDateString() && entry.done;
      })) {
        className += ' checked';
      }

      return `<td class="${className}" onclick="HabitTracker.handleCheck(this, ${weekDay.toDateString() === today.toDateString()}, ${habit.id})"></td>`;
    }).join('');
  }

  openPreview(id) {
    let habit = this.getHabit(id);
    let dialog = document.createElement('dialog');
    dialog.classList.add('preview-dialog');
    dialog.innerHTML = `
    <p>Start: ${habit.start}</p>
    <p>End of Quota: ${habit.getStartOfWeek(habit.start)}</p>
    `;

    document.body.appendChild(dialog);
    dialog.showModal();
  }

  // Will be saving entries from today
  async save() {
    let url = `http://${HOST}/saveHabitChecks`;
    let data = {
      habits: this.habits.map(habit => {
        // Create a simplified version of the habit for saving
        return {
          id: habit.id,
          name: habit.name,
          start: habit.start,
          history: habit.history,
          exclusions: habit.exclusions,
          quota: habit.quota
        };
      })
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error('Error saving habits');
      }

      const result = await response.json();
      console.log('Habits saved successfully:', result);
      location.reload();

      // Additional code can be placed here to handle the response, such as updating the UI

    } catch (error) {
      console.error("Couldn't save habits", error);
    }
  }


  static openDialog() {
    let dialog = document.querySelector(".new-habit-dialog");
    let startDateInput = dialog.querySelector("[name='start-date']");

    // Set the start date to tomorrow
    let tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    let dateString = tomorrow.toISOString().split('T')[0]; // format as YYYY-MM-DD
    startDateInput.value = dateString;

    // Show the dialog
    dialog.showModal();
  }

  static closeDialog() {
    let dialog = document.querySelector(".new-habit-dialog");

    // Close the dialog
    dialog.close();
  }

  static handleNewHabit() {
    const name = document.getElementById('habit-name').value;
    const start = document.getElementById('start-date').value;
    const checkboxes = document.querySelectorAll('input[name="day"]:checked');
    const exclusions = Array.from(checkboxes).map(cb => cb.value);
    const quota = {
      duration: document.getElementById('quota-duration').value,
      amount: parseInt(document.getElementById('quota-amount').value, 10)
    };

    // Validation
    if (!name.trim()) {
      alert('Please enter a habit name.');
      return;
    }
    if (!start) {
      alert('Please enter a start date.');
      return;
    }
    if (isNaN(quota.amount) || quota.amount < 1) {
      alert('Please enter a valid quota amount.');
      return;
    }

    let habit = new Habit(name, start, [], exclusions, quota);

    HabitTracker.saveNewHabit(habit); //.then update the table and quota
    HabitTracker.closeDialog();
    // TODO: app.HabitTracker.update(); - will need to fix.
  }

  static durationToNum(duration) {
    const order = {
      'daily': 1,
      'weekly': 2,
      'bi-weekly': 3,
      'monthly': 4,
      'quarterly': 5,
      'semi-annually': 6,
      'yearly': 7
    };
    return order[duration] || 0;
  }

  update() {
    this.html = this.buildTable(app.HabitTracker.habits);
    this.render();
  }

  static handleCheck(element, isToday, id) {
    if (!isToday) { return }
    // Toggle the 'checked' class first
    element.classList.toggle('checked');

    // Check if the element is now checked or unchecked after toggling
    let isChecked = element.classList.contains('checked');

    // Find the habit with the given id
    let habit = app.HabitTracker.habits.find(h => h.id === id);
    if (!habit) {
      console.error('Habit not found');
      return;
    }

    // Get today's date in the same format as your habit history dates
    let today = new Date().toLocaleDateString('en-US');

    // Find today's entry in the habit history
    let todayEntry = habit.history.find(entry => entry.date === today);

    if (todayEntry) {
      // If today's entry exists, update its 'done' status
      todayEntry.done = isChecked;
    } else {
      // If today's entry doesn't exist, create it and set its 'done' status
      habit.history.push({
        date: today,
        done: isChecked
      });
    }

    // Assuming app.Quota.update() takes care of persisting the changes
    app.Quota.update(id);
  }


  static async getData() {
    let url = `http://${HOST}/getHabits`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Not ok response');
      }
      return response.json();
    } catch (error) {
      console.log("Couldn't get habit data", error)
    }
  }

  static async saveNewHabit(habit) {
    try {
      const response = await fetch(`http://${HOST}/newHabit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ habit }),
      });

      if (!response.ok) {
        throw new Error('Error saving habit');
      }

      const result = await response.json();
      location.reload();
    }
    catch (error) {
      console.error("Couldn't save habit", error);
    }
  }

}

class X {
  constructor(concepts) {
    this.concepts = concepts
  }
  getConcepts() {

  }
}

class Cookie {
  static get(name) {
    let cookieArr = document.cookie.split('; ');
    for (let i = 0; i < cookieArr.length; i++) {
      let cookiePair = cookieArr[i].split('=');
      if (name === cookiePair[0]) {
        return decodeURIComponent(cookiePair[1]);
      }
    }
    return null;
  }

  static set(name, value, days = 7) {
    const d = new Date();
    d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
    let expires = "expires=" + d.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + ";" + expires + ";path=/";
  }
}

function setHost() {
  let isAndroid = /Android|Linux/.test(window.navigator.platform);
  let isWindows = /Win32|Win64|Windows|WinCE/.test(window.navigator.platform);

  if (isAndroid) {
    HOST = "192.168.0.165:5621";
  }
  else if (isWindows && Cookie.get("debug")) {
    HOST = "127.0.0.1:5621";  
  }
  else {
    HOST = "192.168.0.165:5621";
  }

  // Cookie.set("host", HOST);
  return HOST;
}



class day2day {
  constructor() {
    this.modules = []
    this.loadout = {
      HabitTracker: true, // grid of habits and their entries plus notes
      Quota: true, // monitors if your habits are on track
      Reward: true, // the goods you get after you do your habits!!!
      Mood: true, // questions with range inputs
      X: true,
      Tasks: true, // the shit 
      Summary: true, // a summary of shit you should probably do
      History: true, // a wider view of your entries
      Stats: true, // some insights from your habits, mood, etc
      Travel: true, // a travel checklist, and maybe map
      Mantra: true, // to keep that ideal self present
      Quotes: true, // random inspirational quotes
      Word: true, // Word of the day
      Baseline: true, // Keep yourself grounded
      Highlights: true, // Upload a pic that captures the highlight of a month
    }
    setHost();
  }

  toggleDebug() {
    if (Cookie.get("debug")) {Cookie.set("debug", true);}
    else {Cookie.set("debug", false);}
    // if (HOST == "127.0.0.1:5621") {
    //   HOST = "192.168.0.1:5621";
    // }
    // else {
    //   HOST = "127.0.0.1:5621";
    // }
    // Cookie.set("host", HOST);
  }


  async start() {
    // Habit Tracker & Quota
    HabitTracker.getData().then(habits => {
      if (habits) {
        habits = Habit.serialize(habits);
        let ht = new HabitTracker(habits);
        let q = new Quota(habits);
        ht.render();
        q.render();
        app.modules.push(ht);
        app.modules.push(q);
        this.HabitTracker = ht;
        this.Quota = q;
      }
      else { console.log("Do something to indicate habits weren't loaded"); }
    }).then(() => {
      // Reward
      Reward.getTodaysReward().then(rewardUrl => {
        if (rewardUrl) {
          let reward = new Reward(rewardUrl);
          app.modules.push(reward);
          reward.render();
          this.Reward = reward;
        }
        else {
          // We really don't care if this doesn't show up for any unknown reason
        }
      });

    }).then(() => {
      // X.
    });
  }
  render() {
    this.modules.forEach(module => {
      module.render();
    });
    document.querySelector(".modules").classList.remove("hidden");
  }
}



// Init the app
let app = new day2day();
app.start().then(() => {
  app.render();
});




updateHeader();
setInterval(updateHeader, 10000);
