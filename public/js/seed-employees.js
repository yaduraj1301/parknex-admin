import { db } from "./firebase-config.js";
import {
  collection,
  doc,
  setDoc,
  addDoc,
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// New employees data
const employees = [
  {
    emp_id: "E2001",
    full_name: "Arjun Menon",
    department: "IT",
    job_title: "Frontend Developer",
    email: "arjun.menon@company.com",
    contact_number: "+91-9123456780",
    building: "Thejaswini",
    authorization_level: "Employee",
    user_id: "", // can be filled with auth UID later
    vehicles: [
      {
        registration_no: "KL01AA1111",
        vehicle_type: "Car",
        color: "White",
        model: "Maruti Baleno",
        is_default: true,
      },
      {
        registration_no: "KL01BB2222",
        vehicle_type: "Bike",
        color: "Red",
        model: "Honda CB350",
        is_default: false,
      },
    ],
  },
  {
    emp_id: "E2002",
    full_name: "Meera Nair",
    department: "Finance",
    job_title: "Accountant",
    email: "meera.nair@company.com",
    contact_number: "+91-9876543210",
    building: "Gayathri",
    authorization_level: "Employee",
    user_id: "",
    vehicles: [
      {
        registration_no: "KL07CC3333",
        vehicle_type: "Car",
        color: "Blue",
        model: "Hyundai Creta",
        is_default: true,
      },
    ],
  },
  {
    emp_id: "E2003",
    full_name: "Vikram Krishnan",
    department: "Admin",
    job_title: "Facilities Manager",
    email: "vikram.krishnan@company.com",
    contact_number: "+91-9000000000",
    building: "Gayathri",
    authorization_level: "Employee",
    user_id: "",
    vehicles: [
      {
        registration_no: "KL08DD4444",
        vehicle_type: "Car",
        color: "Black",
        model: "Toyota Innova",
        is_default: true,
      },
      {
        registration_no: "KL08EE5555",
        vehicle_type: "Bike",
        color: "Grey",
        model: "Yamaha MT-15",
        is_default: false,
      },
    ],
  },
];

async function seedEmployees() {
  const empCol = collection(db, "employees");

  for (const emp of employees) {
    try {
      // Use emp_id as document ID
      const empRef = doc(empCol, emp.emp_id);
      const { vehicles, ...empData } = emp;
      await setDoc(empRef, empData);

      console.log(`✅ Added employee: ${emp.full_name} (${emp.emp_id})`);

      // Add vehicles subcollection
      const vehiclesCol = collection(empRef, "vehicles");
      for (const vehicle of vehicles) {
        await addDoc(vehiclesCol, vehicle);
        console.log(
          `   🚗 Added vehicle: ${vehicle.registration_no} (default: ${vehicle.is_default})`
        );
      }
    } catch (err) {
      console.error("❌ Error adding employee:", err);
    }
  }
}

// Run seeding
seedEmployees();
