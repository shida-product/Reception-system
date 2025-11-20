// Google Apps Script backend for pharmacy reception and notification system
// Constants
// Provided spreadsheet ID for the reception log.
const SPREADSHEET_ID = '1rEIoeOY9osXrqKe_jCaOt717eDMYIPO1Ep5Nsfc87G4';
const SHEET_NAME = '受付ログ';

/**
 * Returns a handle to the reception log sheet.
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getReceptionSheet() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  return spreadsheet.getSheetByName(SHEET_NAME);
}

/**
 * Serves the entry point HTML template.
 * @returns {GoogleAppsScript.HTML.HtmlOutput}
 */
function doGet() {
  return HtmlService.createTemplateFromFile('index').evaluate();
}

/**
 * Creates a new reception ticket for today.
 * @param {string} email - Customer email address.
 * @returns {Object} Ticket information.
 */
function createTicket(email) {
  const sheet = getReceptionSheet();
  const now = new Date();
  const lastRow = sheet.getLastRow();
  let todayMax = 0;

  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    values.forEach(function (row) {
      const dateValue = row[0];
      const ticketNumber = row[1];
      if (dateValue instanceof Date && isSameDay(dateValue, now)) {
        const numeric = parseInt(ticketNumber, 10);
        if (!isNaN(numeric) && numeric > todayMax) {
          todayMax = numeric;
        }
      }
    });
  }

  const newNumber = Utilities.formatString('%03d', todayMax + 1);
  const newRow = [now, newNumber, email, '受付中', '', ''];
  sheet.appendRow(newRow);

  const ticketInfo = {
    number: newNumber,
    createdAt: now,
    email: email,
    status: '受付中',
  };

  Logger.log('Created ticket: %s for %s at %s', newNumber, email, now);
  return ticketInfo;
}

/**
 * Retrieves all active tickets (status "受付中").
 * @returns {Object[]} Array of ticket info objects.
 */
function getActiveTickets() {
  const sheet = getReceptionSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  const activeTickets = values
    .filter(function (row) {
      return row[3] === '受付中';
    })
    .map(function (row) {
      return {
        number: row[1],
        createdAt: row[0],
        email: row[2],
        status: row[3],
      };
    });

  Logger.log('Active tickets count: %s', activeTickets.length);
  return activeTickets;
}

/**
 * Marks a ticket as complete and notifies the customer via email.
 * @param {string} ticketNumber - Ticket number to complete.
 * @returns {boolean} True if updated successfully.
 */
function completeTicket(ticketNumber) {
  const sheet = getReceptionSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return false;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
  for (let i = 0; i < values.length; i += 1) {
    const row = values[i];
    if (String(row[1]) === String(ticketNumber)) {
      const rowIndex = i + 2; // Adjust for header row.
      const email = row[2];
      const completedAt = new Date();
      sheet.getRange(rowIndex, 4).setValue('準備完了');
      sheet.getRange(rowIndex, 5).setValue(completedAt);

      const subject = 'お薬のご準備ができました（○○薬局）';
      const body = '受付番号 ' + ticketNumber + ' のお薬の準備ができました。カウンターまでお越しください。';
      MailApp.sendEmail(email, subject, body);

      Logger.log('Completed ticket: %s for %s at %s', ticketNumber, email, completedAt);
      return true;
    }
  }

  Logger.log('Ticket not found: %s', ticketNumber);
  return false;
}

/**
 * Checks whether two Date objects fall on the same calendar day.
 * @param {Date} dateA
 * @param {Date} dateB
 * @returns {boolean}
 */
function isSameDay(dateA, dateB) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}
