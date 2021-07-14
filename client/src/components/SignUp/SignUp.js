import React, { useState } from "react";
import { Link } from "react-router-dom";
import { IconContext } from "react-icons";
import { BsPerson } from "react-icons/bs";
import { AiOutlineLock } from "react-icons/ai";
import { IoMailOutline } from "react-icons/io";

export function SignUp() {
    function handleSignUp() {

    }

    const [email, setEmail] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPW, setConfirmPW] = useState("");

    return (
        <div id="centered-login-block">
            <div className="login-form-container">
                <h2>Sign Up</h2>
                <hr />
                <br />
                <form onSubmit={handleSignUp}>
                    <div className="login-input-container">
                        <IconContext.Provider value={{ className: "text-field-icon" }}><IoMailOutline /></IconContext.Provider>
                        <input
                            type="text"
                            placeholder="Email Address"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                        />
                    </div>
                    <br />
                    <div className="login-input-container">
                        <IconContext.Provider value={{ className: "text-field-icon" }}><BsPerson /></IconContext.Provider>
                        <input
                            type="text"
                            placeholder="Choose a Username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />
                    </div>
                    <br />
                    <div className="login-input-container">
                        <IconContext.Provider value={{ className: "text-field-icon" }}><AiOutlineLock /></IconContext.Provider>
                        <input
                            type="password"
                            placeholder="Choose a Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <br />
                    <div className="login-input-container">
                        <IconContext.Provider value={{ className: "text-field-icon" }}><AiOutlineLock /></IconContext.Provider>
                        <input
                            type="password"
                            placeholder="Confirm Password"
                            value={confirmPW}
                            onChange={e => setConfirmPW(e.target.value)}
                        />
                    </div>
                    <br />

                    <input type="submit" id="login-button" value="Log In" />
                </form>
            </div>

            <h3 id="below">
                Already have an account? <Link to="/login">Log In</Link>
            </h3>
        </div>
    );
}