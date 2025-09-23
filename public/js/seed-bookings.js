import { db } from "../js/firebase-config.js";
import {
  collection,
  getDocs,
  doc,
  Timestamp,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// --- Configuration ---
const NUMBER_OF_BOOKINGS_TO_CREATE = 25;
const DAYS_IN_THE_PAST = 7; // Bookings will be spread across the last 7 days.

// --- Logging helper ---
function log(message, type = "") {
  console.log(type ? `[${type.toUpperCase()}] ${message}` : message);
}

// --- Random choice helper ---
function randChoice(arr) {
  if (!arr || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Main Seeder Function ---
async function populateBookings() {
  log("Starting booking population script...");

  try {
    // --- Step 1: Fetch all necessary data from Firestore ---
    log("Fetching required data from Firestore...");

    const slotsSnapshot = await getDocs(collection(db, "ParkingSlots"));
    const allSlots = slotsSnapshot.docs.map((doc) => ({ id: doc.id }));
    if (allSlots.length === 0) {
      throw new Error("No parking slots found. Cannot create bookings.");
    }
    log(`✅ Found ${allSlots.length} parking slots.`);

    const employeesSnapshot = await getDocs(collection(db, "employees"));
    const allEmployeesAndVehicles = [];

    for (const empDoc of employeesSnapshot.docs) {
      const vehiclesSnapshot = await getDocs(
        collection(db, "employees", empDoc.id, "vehicles")
      );
      vehiclesSnapshot.forEach((vehicleDoc) => {
        allEmployeesAndVehicles.push({
          employeeId: empDoc.id,
          vehicleId: vehicleDoc.id,
        });
      });
    }

    if (allEmployeesAndVehicles.length === 0) {
      throw new Error(
        "No employees with vehicles found. Cannot create bookings."
      );
    }
    log(`✅ Found ${allEmployeesAndVehicles.length} vehicles.`);

    // --- Step 2: Generate booking documents in a batch ---
    log(`Generating ${NUMBER_OF_BOOKINGS_TO_CREATE} booking documents...`);
    const batch = writeBatch(db);
    const bookingsCol = collection(db, "bookings");

    for (let i = 0; i < NUMBER_OF_BOOKINGS_TO_CREATE; i++) {
      const randomSlot = randChoice(allSlots);
      const randomUserVehicle = randChoice(allEmployeesAndVehicles);
      const randomStatus = randChoice(["Completed", "Cancelled", "Completed"]);

      const randomPastDay = new Date();
      randomPastDay.setDate(
        new Date().getDate() - Math.floor(Math.random() * DAYS_IN_THE_PAST)
      );

      const bookingHour = 8 + Math.floor(Math.random() * 9);
      const bookingMinute = Math.floor(Math.random() * 60);
      const booking_time = new Date(
        randomPastDay.setHours(bookingHour, bookingMinute, 0, 0)
      );

      const durationHours = 1 + Math.floor(Math.random() * 8);
      const expiry_time = new Date(
        booking_time.getTime() + durationHours * 60 * 60 * 1000
      );

      const newBooking = {
        booking_time: Timestamp.fromDate(booking_time),
        expiry_time: Timestamp.fromDate(expiry_time),
        status: randomStatus,
        slot_id: doc(db, "ParkingSlots", randomSlot.id),
        vehicle_id: `employees/${randomUserVehicle.employeeId}/vehicles/${randomUserVehicle.vehicleId}`,
      };

      const newBookingRef = doc(bookingsCol);
      batch.set(newBookingRef, newBooking);
    }

    // --- Step 3: Commit the batch to Firestore ---
    log("Committing batch to Firestore...");
    await batch.commit();
    log(
      `✅ Success! Created ${NUMBER_OF_BOOKINGS_TO_CREATE} new booking documents.`,
      "success"
    );
  } catch (err) {
    log(`❌ Error: ${err.message}`, "error");
    console.error(err);
  }
}

// Run immediately
populateBookings();
