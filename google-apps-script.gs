/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * Scout Meeting Report App — Google Apps Script Backend
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * FILE: Code.gs
 *
 * HOW TO USE:
 *   1. Go to https://script.google.com → New Project
 *   2. Delete the default code and paste this entire file
 *   3. Run setupSpreadsheet() once to create/configure the sheet
 *   4. Deploy as Web App: Deploy > New deployment > Web app
 *      - Execute as: Me
 *      - Who has access: Anyone
 *   5. Copy the Web App URL into your .env file as VITE_GOOGLE_SCRIPT_URL
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const SHEET_NAME = "سجل الاجتماعات"

const HEADERS = [
  "تاريخ ووقت الإرسال",
  "رقم الإرسال",
  "تاريخ الاجتماع",
  "القطاع",
  "المكان",
  "وقت البداية",
  "وقت النهاية",
  "عدد الحاضرين",
  "عدد الغائبين",
  "التوقيع",
  "رقم النشاط",
  "إجمالي الأنشطة",
  "محتوى النشاط",
  "المجال",
  "المدة / التوقيت",
  "الأدوات المستخدمة",
  "مسؤول التنفيذ",
  "ملاحظات",
]

// ─── Setup (run once) ─────────────────────────────────────────────────────────

function setupSpreadsheet() {
  let ss
  try {
    ss = SpreadsheetApp.getActiveSpreadsheet()
    Logger.log("Using existing bound spreadsheet: " + ss.getUrl())
  } catch (e) {
    ss = SpreadsheetApp.create("سجل اجتماعات الفرقة الكشفية")
    Logger.log("Created new spreadsheet: " + ss.getUrl())
  }

  let sheet = ss.getSheetByName(SHEET_NAME)
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME, 0)
    Logger.log("Created sheet: " + SHEET_NAME)
  } else {
    Logger.log("Found existing sheet: " + SHEET_NAME)
  }

  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length)
  headerRange.setValues([HEADERS])
  headerRange.setBackground("#244d3b")
  headerRange.setFontColor("#e9d5a8")
  headerRange.setFontWeight("bold")
  headerRange.setFontSize(11)
  headerRange.setHorizontalAlignment("center")
  headerRange.setVerticalAlignment("middle")

  sheet.setFrozenRows(1)
  sheet.setRowHeight(1, 36)
  sheet.setRightToLeft(true)

  PropertiesService.getScriptProperties().setProperty(
    "SPREADSHEET_ID",
    ss.getId(),
  )

  Logger.log("═══════════════════════════════════════════════════")
  Logger.log("Setup complete! Spreadsheet URL: " + ss.getUrl())
  Logger.log(
    "Deploy as a Web App (Execute as: Me, Access: Anyone) and put the URL in .env",
  )
}

// ─── HTTP Handling ────────────────────────────────────────────────────────────

function doPost(event) {
  try {
    if (!event || !event.postData || !event.postData.contents) {
      throw new Error("No data received.")
    }

    const payload = JSON.parse(event.postData.contents)
    validatePayload(payload)

    const spreadsheetId =
      PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID")
    if (!spreadsheetId) {
      throw new Error(
        "SPREADSHEET_ID is not configured. Please run setupSpreadsheet() first.",
      )
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId)
    let sheet = spreadsheet.getSheetByName(SHEET_NAME)
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_NAME)
      sheet.appendRow(HEADERS)
      sheet.setFrozenRows(1)
    }

    const submittedAt = new Date()
    // Create a unique submission ID for idempotency (simple UUID-like string)
    const submissionId =
      "SUB-" + Utilities.getUuid().split("-")[0].toUpperCase()
    const totalActivities = payload.activities.length

    const rows = payload.activities.map((activity, index) => [
      submittedAt,
      submissionId,
      payload.meetingDate,
      String(payload.sector || "").trim(),
      String(payload.location || "").trim(),
      payload.startTime,
      payload.endTime,
      Number(payload.attendees),
      Number(payload.absentees),
      String(payload.signature || "").trim(),
      index + 1,
      totalActivities,
      String(activity.meetingContent || "").trim(),
      String(activity.field || "").trim(),
      String(activity.duration || "").trim(),
      String(activity.toolsUsed || "").trim(),
      String(activity.personResponsible || "").trim(),
      String(activity.notes || "").trim(),
    ])

    const lock = LockService.getScriptLock()
    lock.waitLock(10000)
    try {
      const lastRow = sheet.getLastRow()
      sheet
        .getRange(lastRow + 1, 1, rows.length, HEADERS.length)
        .setValues(rows)

      // Styling
      const dataRange = sheet.getRange(
        lastRow + 1,
        1,
        rows.length,
        HEADERS.length,
      )
      dataRange.setHorizontalAlignment("right")
      dataRange.setFontSize(10)
      dataRange.setVerticalAlignment("middle")
    } finally {
      lock.releaseLock()
    }

    return ContentService.createTextOutput(
      JSON.stringify({ success: true, submissionId: submissionId }),
    ).setMimeType(ContentService.MimeType.JSON)
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Invalid request.",
      }),
    ).setMimeType(ContentService.MimeType.JSON)
  }
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid payload.")
  }

  const requiredFields = [
    "meetingDate",
    "location",
    "sector",
    "startTime",
    "endTime",
  ]
  requiredFields.forEach((field) => {
    if (typeof payload[field] !== "string" || !payload[field].trim()) {
      throw new Error("Missing required field: " + field)
    }
  })

  if (
    !Number.isFinite(Number(payload.attendees)) ||
    Number(payload.attendees) < 0 ||
    !Number.isFinite(Number(payload.absentees)) ||
    Number(payload.absentees) < 0
  ) {
    throw new Error("Attendance values must be non-negative numbers.")
  }

  if (!Array.isArray(payload.activities) || payload.activities.length === 0) {
    throw new Error("At least one activity is required.")
  }
}

function doGet(e) {
  return ContentService.createTextOutput(
    JSON.stringify({ status: "ok", message: "Google Apps Script is running" }),
  ).setMimeType(ContentService.MimeType.JSON)
}
