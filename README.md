# ICRB General Assembly Portal

Official governance and administrative portal for the International Committee of Roblox Businesses.

## Stack

- GitHub repository + GitHub Pages for hosting
- Firebase Authentication for sign-in
- Cloud Firestore for data storage
- Plain HTML, CSS, and JavaScript modules

## Authentication Model

The user-facing login flow is based on:

- Member ID
- Committee ID
- Password

Firebase Authentication will run behind the scenes using hidden generated emails in this format:

- `memberId@icrb.local`

The user will never need to enter or see an email address during normal portal usage.

## Core Collections

The portal is built around these Firestore collections:

- `members`
- `signupRequests`
- `policies`
- `votingSessions`
- `votes`
- `employeeInfractions`
- `settings`

## Frontend Plan

The project will be split into a structured multi-file vanilla JavaScript application.

Planned directories:

- `assets/`
- `styles/`
- `js/`
- `js/firebase/`
- `js/auth/`
- `js/layout/`
- `js/pages/`
- `js/utils/`

## First Development Goals

1. Move Firebase setup into dedicated module files
2. Build a reusable layout shell
3. Add login and signup verification flow
4. Load member session and role-based navigation
5. Build policies, voting, infractions, and settings systems

## Current Status

The repository has been initialized with a starter `index.html` shell and Firebase bootstrapping.
