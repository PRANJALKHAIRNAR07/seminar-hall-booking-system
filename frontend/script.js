/**
 * Seminar Hall Booking System - Core Engine & Security Interceptor
 */

const API = window.location.origin.includes("localhost") || window.location.origin.includes("127.0.0.1") 
  ? window.location.origin 
  : "http://localhost:5000";

/**
 * Helper to build secure authorization headers for backend requests.
 */
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { "Authorization": "Bearer " + token } : {})
  };
}

/* ==========================================================================
   AUTHENTICATION LOGIC (JWT & BCRYPT SUPPORT)
   ========================================================================== */

function signup() {
  const name = document.getElementById("name")?.value.trim();
  const email = document.getElementById("emailSignup")?.value.trim();
  const phone = document.getElementById("phone")?.value.trim();
  const password = document.getElementById("passwordSignup")?.value;
  const role = document.getElementById("roleSignup")?.value || "user";

  if (!email || !password || !name) {
    showAlert("Please fill in all required fields.", "danger");
    return;
  }

  if (!email.endsWith("@mmcoe.edu.in")) {
    showAlert("Please use your official college email (@mmcoe.edu.in).", "warning");
    return;
  }

  fetch(API + "/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, phone, password, role })
  })
  .then(res => res.text())
  .then(data => {
    showAlert(data, data.includes("Successfully") ? "success" : "info");
    if (data.includes("Successfully")) {
      setTimeout(() => {
        if (typeof hideSignup === "function") hideSignup();
      }, 1500);
    }
  })
  .catch(err => {
    console.error("Signup error:", err);
    showAlert("Signup request failed. Please try again.", "danger");
  });
}

function login() {
  const email = document.getElementById("email")?.value.trim();
  const password = document.getElementById("password")?.value;
  const role = document.getElementById("role")?.value || "user";

  if (!email || !password) {
    showAlert("Please enter your email and password.", "danger");
    return;
  }

  fetch(API + "/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, role })
  })
  .then(res => res.json())
  .then(data => {
    if (data.success && data.token) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.data));
      localStorage.setItem("role", role);
      showAlert("Login successful! Redirecting...", "success");
      setTimeout(() => {
        window.location.href = (role === "admin") ? "admin.html" : "calendar.html";
      }, 800);
    } else {
      showAlert(data.message || "Invalid email, password or role selection.", "danger");
    }
  })
  .catch(err => {
    console.error("Login error:", err);
    showAlert("Login service unavailable. Ensure backend server is running.", "danger");
  });
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
  window.location.href = "index.html";
}

/* ==========================================================================
   PHASE 2: BOOKING SUBMISSION & AVAILABILITY FETCH
   ========================================================================== */

function book() {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  if (!user || !token) {
    showAlert("You must be logged in to book a seminar hall.", "warning");
    setTimeout(() => { window.location.href = "login.html"; }, 1500);
    return;
  }

  const dateVal = document.getElementById("date")?.value;
  const startVal = document.getElementById("start")?.value;
  const endVal = document.getElementById("end")?.value;
  const eventVal = document.getElementById("event")?.value.trim();
  const detailsVal = document.getElementById("details")?.value.trim();
  const deptVal = document.getElementById("dept")?.value.trim();

  if (!dateVal || !startVal || !endVal || !eventVal || !deptVal) {
    showAlert("Please fill in all mandatory booking fields (Date, Times, Event, Dept).", "warning");
    return;
  }

  if (startVal >= endVal) {
    showAlert("End time must be later than start time.", "danger");
    return;
  }

  fetch(API + "/book", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      date: dateVal,
      start: startVal,
      end: endVal,
      event: eventVal,
      details: detailsVal,
      dept: deptVal,
      user_id: user.user_id || user.id || 1,
      hall_id: 1
    })
  })
  .then(res => res.text())
  .then(data => {
    if (data.includes("submitted")) {
      showAlert("Booking request submitted successfully!", "success");
      setTimeout(() => { window.location.href = "dashboard.html"; }, 1500);
    } else {
      showAlert(data, "warning");
      fetchHallAvailability(dateVal); // Refresh availability display
    }
  })
  .catch(err => {
    console.error("Booking error:", err);
    showAlert("Booking submission failed. Please try again.", "danger");
  });
}

function initBookingForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const selectedDate = urlParams.get("date");
  const dateInput = document.getElementById("date");

  if (selectedDate && dateInput) {
    dateInput.value = selectedDate;
    checkHolidayNotice(selectedDate);
    fetchHallAvailability(selectedDate);
  }

  dateInput?.addEventListener("change", function() {
    checkHolidayNotice(this.value);
    fetchHallAvailability(this.value);
  });
}

function fetchHallAvailability(dateStr) {
  if (!dateStr) return;
  const box = document.getElementById("availabilityBox");
  const content = document.getElementById("availSlotsContent");
  const label = document.getElementById("availDateLabel");

  if (!box || !content) return;
  box.style.display = "block";
  if (label) label.innerText = dateStr;

  fetch(API + `/availability?date=${dateStr}&hall_id=1`)
    .then(res => res.json())
    .then(data => {
      if (data.success && data.occupiedSlots) {
        if (data.occupiedSlots.length === 0) {
          content.innerHTML = `<span class="text-success"><i class="fa-solid fa-circle-check me-1"></i> Hall is completely available on ${dateStr} from 08:00 to 20:00!</span>`;
        } else {
          let listHtml = `<div class="d-flex flex-wrap gap-2 mt-1">`;
          data.occupiedSlots.forEach(s => {
            const badgeClass = s.status === "Approved" ? "badge-approved" : "badge-pending";
            listHtml += `
              <span class="badge-ws ${badgeClass}" style="font-size: 0.8rem;">
                <i class="fa-regular fa-clock me-1"></i> ${s.start} - ${s.end} (${s.event} - ${s.status})
              </span>
            `;
          });
          listHtml += `</div>`;
          content.innerHTML = listHtml;
        }
      }
    })
    .catch(err => {
      console.error("Availability fetch error:", err);
      content.innerHTML = `<span class="text-muted">Could not check slot availability.</span>`;
    });
}

function checkHolidayNotice(dateStr) {
  const noticeBox = document.getElementById("holidayNotice");
  if (!noticeBox) return;

  if (typeof getHolidayByDate === "function") {
    const holiday = getHolidayByDate(dateStr);
    if (holiday) {
      noticeBox.style.display = "block";
      noticeBox.innerHTML = `🎉 <strong>Note:</strong> ${dateStr} is <strong>${holiday.name}</strong> (${holiday.category}). Bookings are permitted if authorized.`;
    } else {
      noticeBox.style.display = "none";
    }
  }
}

/* ==========================================================================
   FULLCALENDAR ENGINE INTEGRATION
   ========================================================================== */

function renderFullCalendar(calendarEl, isAdmin = false) {
  if (!calendarEl || typeof FullCalendar === "undefined") return;

  const holidayEvents = (typeof getHolidayCalendarEvents === "function") ? getHolidayCalendarEvents() : [];
  const endpoint = isAdmin ? API + "/requests" : API + "/bookings";
  const headers = isAdmin ? getAuthHeaders() : { "Content-Type": "application/json" };

  fetch(endpoint, { headers: headers })
    .then(res => res.json())
    .then(data => {
      let bookingEvents = (data || []).map(b => {
        let dateStr = b.booking_date ? b.booking_date.split("T")[0] : "";
        let isApproved = (b.status === "Approved");
        let isPending = (b.status === "Pending");
        
        let color = isApproved ? "#159B75" : (isPending ? "#E18B12" : "#D94848");

        return {
          id: "booking-" + b.booking_id,
          title: (b.event_name || "Seminar") + " (" + (b.dept || "Dept") + ")",
          start: dateStr + "T" + b.start_time,
          end: dateStr + "T" + b.end_time,
          color: color,
          textColor: "#FFFFFF",
          extendedProps: {
            isBooking: true,
            status: b.status || "Approved",
            user: b.user_name || "User",
            phone: b.user_phone || "N/A",
            time: `${b.start_time} - ${b.end_time}`
          }
        };
      });

      const allEvents = [...bookingEvents, ...holidayEvents];

      let tooltip = null;

      const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: "dayGridMonth",
        headerToolbar: {
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay"
        },
        events: allEvents,
        selectable: true,
        dateClick: function(info) {
          if (!isAdmin) {
            window.location.href = `booking.html?date=${info.dateStr}`;
          }
        },
        eventMouseEnter: function(info) {
          let event = info.event;
          let props = event.extendedProps;
          
          tooltip = document.createElement("div");
          tooltip.className = "ws-tooltip";
          tooltip.style.position = "absolute";
          tooltip.style.background = "#173D78";
          tooltip.style.color = "#ffffff";
          tooltip.style.padding = "8px 12px";
          tooltip.style.borderRadius = "8px";
          tooltip.style.fontSize = "12px";
          tooltip.style.boxShadow = "0 6px 18px rgba(0,0,0,0.2)";
          tooltip.style.zIndex = "9999";
          
          if (props.isHoliday) {
            tooltip.innerHTML = `<strong>🎉 ${props.holidayName}</strong><br><small>${props.category}</small>`;
          } else {
            tooltip.innerHTML = `<strong>${event.title}</strong><br>Time: ${props.time || ''}<br>Status: ${props.status || 'Approved'}`;
          }

          document.body.appendChild(tooltip);
          tooltip.style.left = (info.jsEvent.pageX + 12) + "px";
          tooltip.style.top = (info.jsEvent.pageY + 12) + "px";
        },
        eventMouseLeave: function() {
          if (tooltip) tooltip.remove();
        }
      });

      calendar.render();
    })
    .catch(err => {
      console.error("Failed to load calendar events:", err);
      showAlert("Could not load calendar events. Backend may be offline.", "warning");
    });
}

/* ==========================================================================
   UI UTILITIES & ALERT BANNER
   ========================================================================== */

function showAlert(message, type = "info") {
  let alertBox = document.getElementById("appAlert");
  if (!alertBox) {
    alertBox = document.createElement("div");
    alertBox.id = "appAlert";
    alertBox.style.position = "fixed";
    alertBox.style.top = "20px";
    alertBox.style.right = "20px";
    alertBox.style.zIndex = "9999";
    document.body.appendChild(alertBox);
  }

  const bgClass = type === "success" ? "badge-approved" : (type === "danger" ? "badge-rejected" : "badge-pending");

  alertBox.innerHTML = `
    <div class="ws-card ${bgClass}" style="padding: 12px 20px; font-weight: 600; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">
      ${message}
    </div>
  `;

  setTimeout(() => { alertBox.innerHTML = ""; }, 3500);
}

document.addEventListener("DOMContentLoaded", function() {
  const calendarEl = document.getElementById("calendar");
  if (calendarEl) {
    const isAdmin = window.location.pathname.includes("admin");
    renderFullCalendar(calendarEl, isAdmin);
  }

  if (document.getElementById("date")) {
    initBookingForm();
  }
});