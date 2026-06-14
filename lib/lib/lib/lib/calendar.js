// lib/calendar.js
// Books the confirmed meeting straight into your Google Calendar.
// If Google credentials aren't set, this safely no-ops (booking still gets logged).

const { google } = require("googleapis");

const DAY_MAP = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

function isCalendarConfigured() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

function getOAuthClient() {
  const oAuth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "urn:ietf:wg:oauth:2.0:oob"
  );
  oAuth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oAuth2Client;
}

/**
 * Parses a slot string like "Tuesday 2:00 PM" into the next matching Date.
 */
function parseSlotToDate(slotString) {
  const match = slotString.match(/(\w+)\s+(\d{1,2}):?(\d{2})?\s*(AM|PM)?/i);
  if (!match) return null;

  const [, dayName, hourStr, minStr, ampm] = match;
  const targetDay = DAY_MAP[dayName.toLowerCase()];
  if (targetDay === undefined) return null;

  let hour = parseInt(hourStr, 10);
  const minute = minStr ? parseInt(minStr, 10) : 0;
  if (ampm && ampm.toUpperCase() === "PM" && hour < 12) hour += 12;
  if (ampm && ampm.toUpperCase() === "AM" && hour === 12) hour = 0;

  const now = new Date();
  const result = new Date(now);
  const dayDiff = (targetDay - now.getDay() + 7) % 7;
  result.setDate(now.getDate() + (dayDiff === 0 ? 7 : dayDiff)); // always next occurrence
  result.setHours(hour, minute, 0, 0);

  return result;
}

/**
 * Books a 20-minute meeting. Returns { success, eventLink, error }
 */
async function bookMeeting({ slotString, contact, agentConfig, attendeeEmail }) {
  if (!isCalendarConfigured()) {
    console.log("[calendar] Not configured - skipping real booking. Slot:", slotString);
    return { success: false, skipped: true };
  }

  try {
    const startTime = parseSlotToDate(slotString);
    if (!startTime) {
      return { success: false, error: `Could not parse slot: ${slotString}` };
    }
    const endTime = new Date(startTime.getTime() + 20 * 60 * 1000);

    const auth = getOAuthClient();
    const calendar = google.calendar({ version: "v3", auth });

    const event = {
      summary: `Cloud Circuit Discovery Call - ${contact?.business || contact?.name || "New Lead"}`,
      description: `Booked automatically by the Cloud Circuit AI voice agent.\n\nProspect: ${contact?.name || "Unknown"}\nBusiness: ${contact?.business || "Unknown"}\nPhone: ${contact?.phone || "Unknown"}\nClosing rep: ${agentConfig?.yourName || "TBD"}`,
      start: { dateTime: startTime.toISOString() },
      end: { dateTime: endTime.toISOString() },
      attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
      reminders: { useDefault: true },
    };

    const result = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID || "primary",
      resource: event,
      sendUpdates: attendeeEmail ? "all" : "none",
    });

    return { success: true, eventLink: result.data.htmlLink, start: startTime };
  } catch (err) {
    console.error("[calendar] booking error:", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { bookMeeting, isCalendarConfigured, parseSlotToDate };
