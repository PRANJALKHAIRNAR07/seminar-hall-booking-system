/**
 * Seminar Hall Booking System - Dynamic Holiday Management Engine
 */

let DYNAMIC_HOLIDAYS = [];

const DEFAULT_HOLIDAYS_CONFIG = [
  { holiday_date: "2026-01-26", holiday_name: "Republic Day", category: "National" },
  { holiday_date: "2026-02-19", holiday_name: "Chhatrapati Shivaji Maharaj Jayanti", category: "State (Maharashtra)" },
  { holiday_date: "2026-03-04", holiday_name: "Holi / Dhulivandan", category: "State (Maharashtra)" },
  { holiday_date: "2026-03-20", holiday_name: "Gudhi Padwa", category: "State (Maharashtra)" },
  { holiday_date: "2026-03-31", holiday_name: "Id-ul-Fitr (Ramzan Id)", category: "National" },
  { holiday_date: "2026-04-14", holiday_name: "Dr. Babasaheb Ambedkar Jayanti", category: "National" },
  { holiday_date: "2026-05-01", holiday_name: "Maharashtra Day", category: "State (Maharashtra)" },
  { holiday_date: "2026-08-15", holiday_name: "Independence Day", category: "National" },
  { holiday_date: "2026-09-14", holiday_name: "Ganesh Chaturthi", category: "State (Maharashtra)" },
  { holiday_date: "2026-10-02", holiday_name: "Mahatma Gandhi Jayanti", category: "National" },
  { holiday_date: "2026-10-20", holiday_name: "Dussehra (Vijaya Dashami)", category: "National" },
  { holiday_date: "2026-11-08", holiday_name: "Diwali (Laxmi Pujan)", category: "National" },
  { holiday_date: "2026-12-25", holiday_name: "Christmas", category: "National" },
  { holiday_date: "2026-09-25", holiday_name: "College Foundation Day", category: "College" }
];

async function loadHolidaysFromAPI() {
  try {
    const res = await fetch((window.API || "") + "/holidays");
    const data = await res.json();
    if (data && Array.isArray(data) && data.length > 0) {
      DYNAMIC_HOLIDAYS = data;
      return DYNAMIC_HOLIDAYS;
    }
  } catch (err) {
    console.warn("Could not load dynamic holidays from API, using fallback defaults:", err);
  }
  DYNAMIC_HOLIDAYS = DEFAULT_HOLIDAYS_CONFIG;
  return DYNAMIC_HOLIDAYS;
}

function getHolidayByDate(dateStr) {
  if (!dateStr) return null;
  const formatted = dateStr.split("T")[0];
  const list = DYNAMIC_HOLIDAYS.length > 0 ? DYNAMIC_HOLIDAYS : DEFAULT_HOLIDAYS_CONFIG;
  return list.find(h => (h.holiday_date ? h.holiday_date.split("T")[0] : h.date) === formatted) || null;
}

function getHolidayCalendarEvents() {
  const list = DYNAMIC_HOLIDAYS.length > 0 ? DYNAMIC_HOLIDAYS : DEFAULT_HOLIDAYS_CONFIG;
  return list.map(h => {
    const dStr = h.holiday_date ? h.holiday_date.split("T")[0] : h.date;
    const name = h.holiday_name || h.name;
    const cat = h.category || "College";
    return {
      id: "holiday-" + (h.holiday_id || dStr),
      title: "🎉 " + name + " (" + cat + ")",
      start: dStr,
      allDay: true,
      display: "block",
      color: "#D94848",
      textColor: "#FFFFFF",
      className: "fc-holiday-event",
      extendedProps: {
        isHoliday: true,
        category: cat,
        holidayName: name
      }
    };
  });
}

// Auto load on initialization
loadHolidaysFromAPI();
