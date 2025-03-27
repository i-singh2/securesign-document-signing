import { useEffect, useState, useRef } from "react";
import { auth, db } from "./firebase";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import "./App.css";


const Dashboard = () => {
    const [firstName, setFirstName] = useState("");
    const [privateKey, setPrivateKey] = useState(null); // Store private key temporarily after registration
    const [documents, setDocuments] = useState([]); // Store user's uploaded documents
    const navigate = useNavigate();
    const keyGenerated = useRef(false); // Prevent duplicate key generation

    //Fetch user data when component mounts
    useEffect(() => {
        const fetchUserData = async () => {
            const user = auth.currentUser;
            if (!user) {
                navigate("/login");
                return;
            }

            const userRef = doc(db, "users", user.uid);
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                if (userDoc.data().isAdmin) {
                    navigate("/admin-dashboard"); // Redirect to Admin Dashboard if user is an admin
                }
                setFirstName(userDoc.data().firstName || "User");
                setDocuments(userDoc.data().documents || []); // Fetch user's documents

                // Generate Key Pair ONLY if user has no key AND it's not already being generated
                if (!userDoc.data().publicKey && !keyGenerated.current) {
                    keyGenerated.current = true; // Prevents duplicate execution
                    generateKeys(user.uid);
                }
            }
        };

        fetchUserData();
    }, [navigate]);

    //Generates and stores the user's key pair
    const generateKeys = async (userId) => {
        try {
            const userRef = doc(db, "users", userId);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists() && userSnap.data().publicKey) {
                console.log("Public key already exists, skipping key generation.");
                return;
            }

            // Generate Key Pair
            const keyPair = await window.crypto.subtle.generateKey(
                {
                    name: "RSA-OAEP",
                    modulusLength: 2048,
                    publicExponent: new Uint8Array([1, 0, 1]),
                    hash: "SHA-256",
                },
                true,
                ["encrypt", "decrypt"]
            );

            // Export Keys
            const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
            const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

            // Convert to Base64
            const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));
            const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKey)));

            // Store Public Key in Firestore (Creates document if it doesn't exist)
            await setDoc(userRef, { publicKey: publicKeyBase64 }, { merge: true });

            // Store private key temporarily in state for the user to download
            setPrivateKey(privateKeyBase64);

            console.log("Key Pair Generated & Stored.");
        } catch (error) {
            console.error("Error generating keys:", error);
        }
    };

    const handleLogout = async () => {
        try {
            await auth.signOut();
            navigate("/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    //Handles private key download after generation
    const handleDownloadKey = () => {
        if (!privateKey) return;

        const privateKeyBlob = new Blob([privateKey], { type: "text/plain" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(privateKeyBlob);
        link.download = "private_key.pem";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Hide the key after download (so user can't re-download after logging out)
        setPrivateKey(null);
    };

    return (
        <div className="dashboard-container">
            <h2>Welcome, {firstName}!</h2>

            {/* Private Key Display and Download */}
            {privateKey && (
                <div className="key-download">
                    <p><strong>🔑 Your Private Key:</strong></p>
                    <textarea readOnly value={privateKey} rows="4" cols="50"></textarea>
                    <br />
                    <button onClick={handleDownloadKey}>Download Private Key</button>
                    <p style={{ color: "red" }}>⚠️ Save this key securely. You won't see it again!</p>
                </div>
            )}

            {/* User's Uploaded Documents */}
            {documents.length > 0 && (
                <div>
                    <h3>Your Signed Documents:</h3>
                    <ul>
                        {documents.map((doc, index) => (
                            <li key={index}>
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" download>
                                    {doc.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <button onClick={() => navigate("/sign-document")}>Upload & Sign a Document</button>
            <button onClick={handleLogout}>Logout</button>
        </div>
    );
};

export default Dashboard;
