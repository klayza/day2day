let HOST = "127.0.0.1:5621" // WINDOWS server (debug)
// let HOST = "192.168.0.165:5621" // LINUX server (production)

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

    elements[0].textContent = percentDayDone.toFixed(2) + "%day done";
    elements[1].textContent = percentMonthDone.toFixed(2) + "% of month done";
    elements[2].textContent = percentYearDone.toFixed(2) + "% of year done";
    document.querySelector(".header h1").textContent = longDate;
  }
}
//         Reward.getTodaysReward().then(rewardImageUrl => {

class Reward {
  constructor(rewardImageUrl) {
    this.className = "module-reward"
    this.html = `
    <div class='reward-header'><p class='reward-message'>Locked</p> 
    <span class='reward-progress'>${this.getProgessBar()}</span></div>
    <img class='reward-image' src='${rewardImageUrl}?time=${new Date().getTime()}'>
  `;
  }

  getProgessBar() {
    let totalHabits = 10;
    let totalDone = 3;
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

  render() {
    const modules = document.querySelector('.modules');
    const thisModule = document.createElement('div');
    thisModule.className = this.className += " locked module";
    thisModule.innerHTML = this.html;
    modules.appendChild(thisModule);
  }
}

class Habit {
  constructor(name, start, history, exclusions, quota) {
    this.name = name;
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

    function getWeekRange(startDate) {
      let start = new Date(startDate);
      let end = new Date(start);
      end.setDate(end.getDate() + 6); // End date of the week
      return { start, end };
    }

    switch (this.quota.duration) {
      case "daily":
        done = history.some(entry => isDateEqual(new Date(entry.date), today) && entry.done);
        break;

      case "weekly":
        let startOfWeek = new Date(this.start);
        while (startOfWeek <= today) {
          const { start, end } = getWeekRange(startOfWeek);
          if (today >= start && today <= end) {
            // Count the 'done' entries within this week
            const doneCount = history.filter(entry => {
              const entryDate = new Date(entry.date);
              return entryDate >= start && entryDate <= end && entry.done;
            }).length;

            done = doneCount >= quotaAmount;
            break;
          }
          // Move to the next week
          startOfWeek.setDate(startOfWeek.getDate() + 7);
        }
        break;

      // Add additional cases for other durations if needed
    }

    return done;
  }

  getDone() {
    return 3;
  }

  getStreak() {
    // check if there any days missing in their entries from the day that this habit was started
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
    this.html = this.generateTableHtml(habits);
    this.createModule(this.className, this.html);
  }

  generateTableHtml(habits) {
    let tableHtml = `<strong style="text-align: center; font-size: 20px;">Quota</strong><table>`;
    habits.forEach(habitData => {
      const habit = new Habit(habitData.name, habitData.start, habitData.history, habitData.exclusions, habitData.quota);
      if (habit.quota.duration === "yearly") {
        return;
      }
      tableHtml += this.createTableRow(habit);
    });
    tableHtml += '</table>';
    return tableHtml;
  }

  createTableRow(habit) {
    const backgroundColor = habit.metQuota() ? "lightgreen" : "rgb(255, 100, 100)";
    const done = habit.getDone();
    const total = habit.quota.amount;
    // <tr title='${habit.name}' style='background: linear-gradient(to right, ${backgroundColor} 70%, transparent 70%);'>

    return `
      <tr class='habit-row' title='${habit.name}'>
        <td style='color: ${backgroundColor};'>${done}/${total}</td>
        <td>${habit.quota.duration}</td>
      </tr>
    `;
  }

  update() {

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
    this.html = this.buildTable(habits);
    this.createModule(this.className, this.html);
  }

  buildTable(habits) {
    const [dayNames, currentDay, weekNumber] = this.getWeekData();
    let tableHtml = `<table><tr><th>Week ${weekNumber} / 52</th>${this.generateDayHeaders(dayNames, currentDay)}</tr>`;
    habits.forEach(habit => {
      if (habit.quota.duration === "yearly") return;
      tableHtml += this.generateHabitRow(habit, currentDay);
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

  generateHabitRow(habit, currentDay) {
    let rowHtml = `<tr><td>${habit.name}</td>${this.generateWeekDays(habit, currentDay)}</tr>`;
    return rowHtml;
  }

  generateWeekDays(habit, currentDay) {
    return Array.from({ length: 7 }, (_, j) => {
      let className = 'habit-day' + (j === currentDay ? ' habit-day-today' : '');
      let historyIndex = habit.history.length - j - 1;
      if (historyIndex >= 0 && habit.history[historyIndex]?.done) {
        className += ' checked';
      }
      return `<td class="${className}" onclick="HabitTracker.toggleCheck(this, ${j === currentDay})"></td>`;
    }).join('');
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

    // Additional functionality to add the habit to a table and update the quota 
  }

  static toggleCheck(element, isToday) {
    if (isToday) {
      element.classList.toggle('checked');
      app.Quota.update();
    }
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
    console.log(habit)
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
      return result;
    } catch (error) {
      console.error("Couldn't save habit", error);
    }
  }

}


class day2day {
  constructor() {
    this.modules = []
  }
  async start() {
    // Habit Tracker & Quota
    HabitTracker.getData().then(habits => {
      if (habits) {
        console.log(habits)
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
