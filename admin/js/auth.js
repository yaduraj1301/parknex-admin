import { auth } from '../../public/js/firebase-config.js';
import { signOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";


const allLogoutButtons = document.querySelectorAll('.logout-button');
allLogoutButtons.forEach(button => {
    button.addEventListener('click', async function(e) {
        e.preventDefault();
        
        const confirmLogout = confirm('Are you sure you want to logout?');
        
        if (confirmLogout) {
            try {
                await signOut(auth);
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = 'login.html';
                
            } catch (error) {
                console.error('Logout error:', error);
                alert('Error logging out. Please try again.');
            }
        }
    });
});