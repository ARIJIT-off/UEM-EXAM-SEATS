# Implementation Plan: EXAM SEATS Overhaul

## 1. Project Refactoring
The current monolithic `index.html` has been refactored into a modern, multi-file structure:
-   **index.html**: A clean skeleton containing only the structural components and asset links.
-   **index.css**: A premium design system utilizing Navy/Gold themes, glassmorphism, and responsive layouts.
-   **app.js**: The core engine orchestrating navigation, AI seat allocation, and identity verification.

## 2. Advanced Feature: AI Identity Verification
A new identity verification system has been integrated into the student portal:
-   Uses **TensorFlow.js** with the **MobileNet** model.
-   Implements real-time analysis of the student's face/ID before displaying seating arrangements.
-   Features a futuristic scanning UI with micro-animations.

## 3. UI/UX Excellence
-   **Typography**: Using `Outfit` and `Poppins` from Google Fonts.
-   **Interactivity**: Glassmorphic cards, hover effects on dashboards, and smooth transitions.
-   **Accessibility**: Ensuring clear visibility and responsive design for mobile devices through Flexbox/Grid.

## 4. Logical Flow
-   **Faculty**: Handle routine and student CSV separately for modular updates.
-   **AI Allocator**: Uses an interleaving algorithm to alternate streams (CSE, ECE, IT, etc.) within rooms to prevent proximity between peers of the same stream.
-   **Student**: Enter enrollment ID, pass verification, and view a professional "Seat Card" with a unique QR code.

The project is now fully modular and ready for deployment.
