# BillSplit App

A full-stack application for managing group expenses and splitting bills, designed to make sharing costs with friends and roommates easy and transparent.

## 🚀 Features

*   **User Authentication**: Secure Login and Registration using JWT.
*   **Group Management**: Create groups, add members, and manage group expenses.
*   **Expense Tracking**: Add expenses with flexible split options.
*   **Friend System**: Add friends to easily include them in groups or expenses.
*   **Real-time Chat**: Private messaging feature to discuss expenses or just chat, powered by WebSockets.
*   **Balance Calculation**: View who owes whom and settle up debts.
*   **Activity Feed**: Track recent activities and expense updates.

## 🛠️ Tech Stack

### Backend
*   **Language**: Java 21
*   **Framework**: Spring Boot 3.2.1
*   **Database**: MySQL
*   **Security**: Spring Security, JWT
*   **Real-time**: WebSocket (STOMP, SockJS)
*   **Persistence**: Spring Data JPA, Hibernate
*   **Tools**: Maven, Lombok

### Frontend
*   **Library**: React 19
*   **Build Tool**: Vite
*   **Styling**: Tailwind CSS 4
*   **State/API**: Context API, Axios
*   **Real-time**: SockJS, STOMP client

## 📋 Prerequisites

Ensure you have the following installed:
*   **Java JDK 21**
*   **Node.js** (v18+ recommended)
*   **MySQL Server**

## ⚙️ Setup & Installation

### 1. Database Setup
Create a MySQL database named `billsplitdb`.
```sql
CREATE DATABASE billsplitdb;
```

### 2. Backend Setup
Navigate to the `backend` directory and configure the database connection.

1.  Open `backend/src/main/resources/application.properties`.
2.  Update the `spring.datasource.username` and `spring.datasource.password` with your MySQL credentials.

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/billsplitdb
spring.datasource.username=root
spring.datasource.password=your_password
```

3.  Run the backend server:
    ```bash
    cd backend
    ./mvnw spring-boot:run
    ```
    The server will start on `http://localhost:8080`.

### 3. Frontend Setup
Navigate to the `frontend` directory.

1.  Install dependencies:
    ```bash
    cd frontend
    npm install
    ```

2.  Run the development server:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:5173` (or the port shown in the terminal).

## 📂 Project Structure

```
billsplitapp/
├── backend/            # Spring Boot Backend
│   ├── src/main/java   # Source code (Controllers, Services, Models)
│   └── pom.xml         # Maven dependencies
├── frontend/           # React Frontend
│   ├── src/            # Components, Pages, and Services
│   ├── package.json    # IAM dependencies
│   └── vite.config.js  # Vite configuration
└── README.md           # Project Documentation
```

## 🔌 API Endpoints

The backend exposes several RESTful endpoints managed by the following controllers:
*   `AuthController`: Login, Register, Token refreshing.
*   `GroupController`: Group creation, retrieval, and management.
*   `ExpenseController`: Adding and managing expenses.
*   `FriendController`: Managing friend requests and lists.
*   `ChatController`: Handling real-time chat messages.
