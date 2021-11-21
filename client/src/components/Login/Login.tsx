import React, { useState } from "react";
import { Link } from "react-router-dom";
import { IconContext } from "react-icons";
import { BsPerson } from "react-icons/bs";
import { AiOutlineLock } from "react-icons/ai";

import "./Login.scss";

export function Login() {
    function handleLogIn() {
        return null; // TODO
    }

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    return (
        <div id="centered-login-block">
            <div className="login-form-container">
                <h2>Log In</h2>
                <hr />
                <br />
                <form onSubmit={handleLogIn}>
                    <div className="login-input-container">
                        <IconContext.Provider value={{ className: "text-field-icon" }}><BsPerson /></IconContext.Provider>
                        <input
                            type="text"
                            placeholder="Username or Email Address"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                        />
                    </div>
                    <br />
                    <div className="login-input-container">
                        <IconContext.Provider value={{ className: "text-field-icon" }}><AiOutlineLock /></IconContext.Provider>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                        />
                    </div>
                    <br />

                    <input type="submit" id="login-button" value="Log In" />
                </form>
            </div>

            <h3 id="below">
                New User? <Link to="/signup">Sign Up</Link>
            </h3>
        </div>
    );
}
