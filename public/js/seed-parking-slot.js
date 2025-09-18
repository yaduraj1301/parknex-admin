import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Possible values
const blocks = ["A", "B", "C"];
const buildingsByLocation = [
  "Gayathri, Trivandrum",
  "Thejaswini, Trivandrum",
  "Athulya, Kochi",
];
const statuses = ["Free", "Booked", "Unbooked", "Reserved", "Named"];
const notesOptions = ["Has a pillar in it", "Is in a corner", "EV slot"];

// Generate a random integer in range
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pick a random item from an array
function randChoice(arr) {
  return arr[randInt(0, arr.length - 1)];
}

async function seedParkingSlots(count = 20) {
  const colRef = collection(db, "ParkingSlots");

  for (let i = 0; i < count; i++) {
    const block = randChoice(blocks);
    const slotNum = randInt(1, 50); // 1–50 slots per block
    const slotName = `${block}${slotNum}`;

    
    // Step 2: choose building from that location
    const building = randChoice(buildingsByLocation);

    // Step 3: restrict floor to Level 0 or Level 1
    const floor = `Level ${randInt(0, 1)}`;

    // Step 4: special flag
    const is_special = Math.random() > 0.7; // 30% chance special

    // Step 5: build slot data
    const slotData = {
      slot_name: slotName,
      building: building,
      block: block,
      floor: floor,
      status: randChoice(statuses),
      is_special: is_special,
    };

    if (is_special) {
      slotData.notes = randChoice(notesOptions);
    }

    try {
      await addDoc(colRef, slotData);
      console.log(
        `✅ Added slot: ${slotName} (${building}, ${floor})${
          is_special ? " [Special: " + slotData.notes + "]" : ""
        }`
      );
    } catch (err) {
      console.error("❌ Error adding slot:", err);
    }
  }
}

// Run seeding
seedParkingSlots(30); // change number of slots as needed
