import { db } from "./firebase-config.js";
import {
  collection,
  addDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

const blocks = ["A", "B", "C"];
const buildingsByLocation = [
  "Gayathri, Trivandrum",
  "Thejaswini, Trivandrum",
  "Athulya, Kochi",
];
const statuses = ["Free", "Unbooked", "Reserved", "Named"];
const notesOptions = ["Has a pillar in it", "Is in a corner", "EV slot"];

function randChoice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedParkingSlots() {
  const colRef = collection(db, "ParkingSlots");

  for (const building of buildingsByLocation) {
    // If Athulya → 2 floors, else 1 floor only
    const floors = building.includes("Athulya")
      ? ["Level 0", "Level 1"]
      : ["Level 0"];

    for (const floor of floors) {
      for (const block of blocks) {
        for (let slotNum = 1; slotNum <= 3; slotNum++) {
          const slotName = `${block}${slotNum}`;

          const is_special = Math.random() > 0.7;

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
    }
  }
}

// Run seeding
seedParkingSlots();
