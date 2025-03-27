import React, { useState } from "react";
import { auth, db, createUserWithEmailAndPassword, setDoc, doc } from "./firebase";
import { useNavigate } from "react-router-dom";

const Register = () => {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            // Create user in Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Store user details in Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                firstName: firstName,
                lastName: lastName,
                email: user.email,
                createdAt: new Date(),
                publicKey: null,  // This will be added when they generate keys
                documents: [],     // This will store signed documents later
                isAdmin: false,
            });

            console.log("User registered & data stored in Firestore:", user);
            navigate("/dashboard");
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div className="auth-container">
            <h2>Register</h2>
            {error && <p className="error-text">{error}</p>}
            <form onSubmit={handleRegister} className="auth-form">
                <input type="text" placeholder="First Name" onChange={(e) => setFirstName(e.target.value)} required />
                <input type="text" placeholder="Last Name" onChange={(e) => setLastName(e.target.value)} required />
                <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} required />
                <input type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)} required />
                <button type="submit">Sign Up</button>
            </form>
            <p className="redirect-text">Already have an account? <a href="/login">Login here</a></p>
        </div>
    );
};

export default Register;
