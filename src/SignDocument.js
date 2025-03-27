import React, { useState } from "react";
import { auth, storage, db } from "./firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const SignDocument = () => {
    const [file, setFile] = useState(null); // Stores selected file
    const [privateKey, setPrivateKey] = useState(""); 
    const [uploading, setUploading] = useState(false); // Tracks upload status
    const navigate = useNavigate();

    // Handles file selection
    const handleFileChange = (event) => {
        setFile(event.target.files[0]);
    };

    // Handles private key input
    const handlePrivateKeyChange = (event) => {
        setPrivateKey(event.target.value);
    };

    // Handles file upload, signing, and storage
    const handleUploadAndSign = async () => {
        if (!file) {
            alert("Please select a file first!");
            return;
        }
        if (!privateKey) {
            alert("Please enter your private key to sign the document.");
            return;
        }

        setUploading(true);
        const user = auth.currentUser;
        const fileName = file.name; 
        const timestamp = new Date();

        try {
            //Compute Hash BEFORE Uploading
            const fileData = await file.arrayBuffer();
            const hashBuffer = await window.crypto.subtle.digest("SHA-256", fileData);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");

            //Import Private Key and Sign Hash
            const privateKeyBinary = Uint8Array.from(atob(privateKey), c => c.charCodeAt(0));
            const importedPrivateKey = await window.crypto.subtle.importKey(
                "pkcs8",
                privateKeyBinary.buffer,
                { name: "RSA-PSS", hash: "SHA-256" },
                false,
                ["sign"]
            );

            //Create Signature
            const signature = await window.crypto.subtle.sign(
                { name: "RSA-PSS", saltLength: 32 },
                importedPrivateKey,
                hashBuffer
            );

            const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

            // Upload the File
            const storageRef = ref(storage, `documents/${user.uid}/${fileName}`);
            const uploadTask = uploadBytesResumable(storageRef, file);

            uploadTask.on(
                "state_changed",
                () => {},
                (error) => {
                    console.error("Upload failed:", error);
                    setUploading(false);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

                    // Retrieve Existing Documents
                    const userRef = doc(db, "users", user.uid);
                    const userDoc = await getDoc(userRef);
                    let existingDocuments = userDoc.exists() && userDoc.data().documents
                        ? userDoc.data().documents
                        : [];

                    // Add New Signed Document with Timestamp
                    existingDocuments.push({
                        name: fileName,
                        url: downloadURL,
                        signed: true,
                        signature: signatureBase64,
                        hash: hashHex,
                        timestamp: timestamp.toISOString(), // Store timestamp as string
                    });

                    await updateDoc(userRef, {
                        documents: existingDocuments,
                    });

                    alert("✅ Document uploaded and signed successfully!");
                    setUploading(false);
                    navigate("/dashboard");
                }
            );

        } catch (error) {
            console.error("Error signing document:", error);
            alert("Error signing document.");
            setUploading(false);
        }
    };

    return (
        <div className="upload-container">
            <h2>Upload and Sign Document</h2>
            <div className="input-group">
        <input type="file" onChange={handleFileChange} />
    </div>
            <input
                type="text"
                className="text-input"
                placeholder="Enter Private Key"
                value={privateKey}
                onChange={handlePrivateKeyChange}
            />
            <button onClick={handleUploadAndSign} disabled={uploading}>
                {uploading ? "Uploading & Signing..." : "Upload & Sign Document"}
            </button>
        </div>
    );
};

export default SignDocument;
