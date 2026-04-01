# UEM SEATS - Premium Examination Seating System

![Status](https://img.shields.io/badge/Status-Complete-success)
![License](https://img.shields.io/badge/License-MIT-blue)
![UI](https://img.shields.io/badge/UI-Glassmorphism-purple)

**UEM SEATS** is a state-of-the-art, AI-enhanced examination seating management system designed specifically for University of Engineering & Management (UEM). It combines professional aesthetics with advanced logical algorithms to ensure a seamless and secure examination experience for both faculty and students.

---

### Developed By
**ARIJIT PAL**  
*CSE (DATA SCIENCE) ROLL - 02*  
*ENROLLMENT: 12024002037046*

---

## Key Features

### Faculty Dashboard
- **Modular Data Management**: Upload and manage Exam Routines and Student Databases via CSV.
- **AI-Based Seat Allocator**: Implements a sophisticated interleaving algorithm that alternates students from different streams (CSE, ECE, IT, etc.) within rooms to maximize integrity.
- **Room Management**: Dynamic allocation based on building and room capacity.

### Student Portal
- **Identity Verification**: Integrated **TensorFlow.js** utilizing the **MobileNet** model for real-time identity/ID scanning with futuristic scanning animations.
- **Digital Seat Card**: Generates a premium "Exam Ticket" containing seating details and a unique **QR Code** for entry verification.
- **Seamless Navigation**: Clear, step-by-step workflow from login to seat discovery.

### Premium UI/UX
- **Modern Aesthetics**: Sleek Navy and Gold theme with glassmorphism components.
- **Responsive Design**: Fully optimized for desktops, tablets, and mobile devices.
- **Micro-animations**: Smooth transitions, hover effects, and interactive scanning interfaces.

---

## Technology Stack

- **Core**: HTML5, Vanilla CSS3, JavaScript (ES6+)
- **AI/ML**: TensorFlow.js (MobileNet model for image classification)
- **Typography**: Google Fonts (Outfit, Poppins)
- **Utilities**: QR Code API, CSV Parsing logic
- **Storage**: Browser LocalStorage for persistence

---

## Project Structure

```text
UEM SEATS/
├── index.html           # Main application structure
├── index.css            # Premium design system & tokens
├── app.js               # Core engine & AI logic
├── routine.csv          # Sample data for exam schedules
├── students.csv         # Sample student database
└── README.md            # Project documentation
```

---

## Getting Started

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/uem-seats.git
   ```
2. **Open the Application**:
   Simply open `index.html` in any modern web browser.
3. **Faculty Login**:
   Use `admin` / `admin123` to access the management dashboard.
4. **Student Access**:
   Students can login using their Enrollment ID after faculty has allocated seats.

---

### License
This project is licensed under the MIT License.

---
*Built with passion for UEM Students and Faculty.*
