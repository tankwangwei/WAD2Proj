// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAb7M3MiQ3tGYMT1PCFRam-Z0S6rXqwVcQ",
    authDomain: "wad2-32757.firebaseapp.com",
    projectId: "wad2-32757",
    storageBucket: "wad2-32757.appspot.com",
    messagingSenderId: "191549341083",
    appId: "1:191549341083:web:ad67ea6030d29c8700353e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Vue.js Application Instance
const appVue = Vue.createApp({
    data() {
        return {
            email: '',
            password: '',
            errorMessage: ''
        };
    },
    methods: {
        validateEmail(email) {
            const re = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
            return re.test(String(email).toLowerCase());
        },
        validatePassword(password) {
            return password.length >= 6;
        },
        handleLogin() {
            this.errorMessage = "";

            if (!this.validateEmail(this.email)) {
                this.errorMessage = "Invalid email format.";
                return;
            }

            if (!this.validatePassword(this.password)) {
                this.errorMessage = "Password must be at least 6 characters.";
                return;
            }

            signInWithEmailAndPassword(auth, this.email, this.password)
                .then((userCredential) => {
                    const user = userCredential.user;
                    localStorage.setItem("userUID", user.uid);
                    window.location.href = "home.html";
                })
                .catch((error) => {
                    const errorCode = error.code;
                    this.errorMessage = errorCode === 'auth/invalid-credential'
                        ? "Invalid username or password. Please try again."
                        : error.message;
                });
        },
        handleGoogleLogin() {
            signInWithPopup(auth, provider)
                .then((result) => {
                    const user = result.user;
                    localStorage.setItem("userUID", user.uid);
                    window.location.href = "home.html";
                })
                .catch((error) => {
                    this.errorMessage = error.message;
                });
        }
    },
    mounted() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                localStorage.setItem("userId", user.uid);
            }
        });
    }
});

// Mount the Vue instance
appVue.mount('#app');
