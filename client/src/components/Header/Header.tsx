import React from "react";
import { Link, NavLink } from "react-router-dom";

import keyboardIcon from "@assets/keyboard.png";
import "./Header.scss";

export const Header = () => (
    <header>
        <div id="header-inner">
            <Link to="/" id="title">
                <img src={keyboardIcon} alt="Keyboard Icon" id="keyboard-icon" />
                <h1>KBD<span id="header-visualizer">VISUALIZER</span></h1>
            </Link>
            <nav>
                <div>
                    <NavLink to="/" end className={({ isActive }) => isActive ? "active-page-link" : ""}>
                        Build
                    </NavLink>
                    <NavLink to="/group-buys" className={({ isActive }) => isActive ? "active-page-link" : ""}>
                        Group Buys
                    </NavLink>
                    {/* <NavLink to="/login" activeClassName="active-page-link">
                        Login
                    </NavLink> */}
                </div>
            </nav>
        </div>
    </header>
);
