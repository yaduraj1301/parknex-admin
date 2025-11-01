import { auth, db } from '../../public/js/firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', function () {
    const togglePassword = document.querySelector('#togglePassword');
    const password = document.querySelector('#password');
    const loginForm = document.querySelector('.login-form form');

    togglePassword.addEventListener('click', function () {
        const type = password.getAttribute('type') === 'password' ? 'text' : 'password';
        password.setAttribute('type', type);

        this.classList.toggle('fa-eye-slash');
        this.classList.toggle('fa-eye');
    });

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            if (email === 'admin@experionglobal.com') {
                window.location.href = 'dashboard.html';
            } else {
                const employeesRef = collection(db, "employees");
                const q = query(employeesRef, where("user_id", "==", user.uid));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    throw new Error("User not registered as an employee");
                }
                window.location.href = '../chatbot/chatbot.html';
            }

        } catch (error) {
            alert('Invalid email or password. Please try again.');
            console.error('Login error:', error);
        }
    });
});
