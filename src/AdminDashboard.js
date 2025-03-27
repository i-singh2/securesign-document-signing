import React, { useState, useEffect } from "react";
import { auth, db } from "./firebase";
import { getDocs, collection } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const AdminDashboard = () => {
    const [documents, setDocuments] = useState([]); // Stores all signed documents
    const [verificationResults, setVerificationResults] = useState({}); // Stores verification results
    const navigate = useNavigate();

    // Fetches all signed documents from Firestore
    useEffect(() => {
        const fetchDocuments = async () => {
            const userDocs = await getDocs(collection(db, "users"));
            let signedDocs = [];

            //Loop through all user documents in Firestore
            userDocs.forEach(doc => {
                const data = doc.data();
                if (data.documents) {
                    data.documents.forEach(docEntry => {
                        if (docEntry.signed) {
                            signedDocs.push({
                                uid: doc.id,
                                name: docEntry.name,
                                url: docEntry.url,
                                signature: docEntry.signature,
                                storedHash: docEntry.hash, 
                                signerPublicKey: data.publicKey,
                                signerName: `${data.firstName} ${data.lastName}`,
                                timestamp: docEntry.timestamp
                                    ? new Date(docEntry.timestamp).toLocaleString() //Convert timestamp to readable format
                                    : "Unknown",
                            });
                        }
                    });
                }
            });

            setDocuments(signedDocs);
        };

        fetchDocuments();
    }, []);

    // Verifies a signed document
    const verifyDocument = async (docIndex) => {
        const docData = documents[docIndex];

        try {
            // Fetch Document from URL
            const response = await fetch(docData.url);
            if (!response.ok) throw new Error("Failed to fetch document");

            const fileData = await response.arrayBuffer();
            const hashBuffer = await window.crypto.subtle.digest("SHA-256", fileData);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const computedHashHex = hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");

            // Compare Stored Hash with Computed Hash
            if (computedHashHex !== docData.storedHash) {
                setVerificationResults((prev) => ({
                    ...prev,
                    [docIndex]: "❌ Tampered (Hash Mismatch)"
                }));
                return;
            }

            // Import Signer's Public Key 
            const publicKeyBinary = Uint8Array.from(atob(docData.signerPublicKey), c => c.charCodeAt(0));
            const importedPublicKey = await window.crypto.subtle.importKey(
                "spki",
                publicKeyBinary.buffer,
                { name: "RSA-PSS", hash: "SHA-256" },
                false,
                ["verify"]
            );

            // Verify the signature against the computed hash
            const signatureBinary = Uint8Array.from(atob(docData.signature), c => c.charCodeAt(0));
            const isValid = await window.crypto.subtle.verify(
                { name: "RSA-PSS", saltLength: 32 },
                importedPublicKey,
                signatureBinary,
                hashBuffer
            );

            // Update verification status
            setVerificationResults((prev) => ({
                ...prev,
                [docIndex]: isValid ? "✅ Authentic" : "❌ Forged (Signature Mismatch)"
            }));

        } catch (error) {
            console.error("Error verifying document:", error);
            setVerificationResults((prev) => ({
                ...prev,
                [docIndex]: "❌ Verification Failed"
            }));
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

    return (
        <div className="admin-dashboard">
            <h2 className="admin-dashboard-title">Admin Signature Verification Dashboard</h2>
            <ul>
                {documents.map((doc, index) => (
                    <li key={index}>
                        <p>
                            <strong>{doc.name}</strong> (Signed by {doc.signerName} on {doc.timestamp})
                        </p>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" download>
                            📥 Download Signed Document
                        </a> 
                        <button onClick={() => verifyDocument(index)}>Verify</button>
                        {verificationResults[index] && <span> {verificationResults[index]}</span>}
                    </li>
                ))}
            </ul>
            
            {/* Logout Button */}
            <button onClick={handleLogout} style={{ marginTop: "20px" }}>Logout</button>
        </div>
    );
};

export default AdminDashboard;
