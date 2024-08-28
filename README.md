# ECM - Enterprise Content Management System

## Overview

This repository contains a proof of concept (PoC) for an Enterprise Content Management (ECM) system developed as part of a summer internship project at BFI Group. The project demonstrates the technical feasibility and key features of an ECM, including document management, content search and indexing, and user and permission management.

## Key Features

- **Document Management**: Upload, manage, and organize documents with a hierarchical directory structure.
- **Content Search and Indexing**: Efficiently search for and index content within the system.
- **User and Permission Management**: Manage user roles, permissions, and security settings.
- **Drag-and-Drop Functionality**: Enhance user experience with intuitive drag-and-drop features.
- **Admin Dashboard**: Manage pending users, approve or decline registrations, assign roles, and ban or unban users.

## Technologies Used

- **Backend**: Spring Boot with JWT-based authentication, PostgreSQL for the database.
- **Frontend**: Angular (with PrimeNG components), TypeScript.
- **Tools**: Visual Paradigm for UML diagrams, IntelliJ for backend development, WebStorm for frontend development.
- **Runtime**: Node.js v20

## Application Properties

The `application.properties` file is crucial for configuring the Spring Boot application. Below are key configurations that have been set up for this project:

- **Project Name**: The application name is set using the `spring.application.name` property.
  
- **API Documentation**:
  - The `springdoc.api.docs.path` and `springdoc.swagger-ui.path` properties configure the OpenAPI documentation and Swagger UI paths.
  
- **Server Configuration**:
  - The application runs on the port specified by `server.port`, defaulting to `8090` if not set via environment variables.

- **Database Configuration**:
  - `spring.datasource.url`: Connection URL to the PostgreSQL database.
  - `spring.datasource.username` and `spring.datasource.password`: Credentials for the database, with placeholders for environment variable usage.
  - `spring.jpa.hibernate.ddl-auto=update`: Ensures that the database schema is automatically updated.
  - Additional settings optimize lazy loading and prevent Liquibase from initializing.

- **JWT Security**:
  - `jwt.secret`: Secret key used for signing JWT tokens.
  - `jwt.expiration`: Token expiration time in milliseconds (e.g., `86400000` for 24 hours).

- **File Storage**:
  - `file.upload-dir`: Configures the relative path for storing uploaded files.
  - `path.base`: Specifies the absolute path for the download directory.

- **Mail Configuration**:
  - SMTP settings for sending emails, including host, port, username, and password.
  - `mailing.activation-url` and `mailing.log-in-url`: URLs for account activation and login redirection, typically pointing to the frontend routes.

Example configuration:
```properties
spring.application.name=ECMProject
springdoc.api.docs.path=/v3/api-docs
springdoc.swagger-ui.path=/swagger-ui.html
server.port=${SERVER_PORT:8090}

# Database Configuration
spring.datasource.username=${DATASOURCE_USERNAME:your_db_user}
spring.datasource.password=${DATASOURCE_PASSWORD:your_db_password}
spring.datasource.url=${DATASOURCE_URL:jdbc:postgresql://localhost:5432/ECMProject?createDatabaseIfNotExist=true}
spring.datasource.driverClassName=org.postgresql.Driver
spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect
spring.jpa.hibernate.ddl-auto=update

# JWT Configuration
jwt.secret=your_jwt_secret_key
jwt.expiration=86400000

# File Storage
file.upload-dir=uploads
path.base=/absolute/path/to/upload-directory

# Mail Configuration
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your_email@gmail.com
spring.mail.password=your_email_password
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true
mailing.activation-url=http://yourfrontend.com/activate-account
mailing.log-in-url=http://yourfrontend.com/sign-in
```

## Setup Instructions

To run the project locally, follow these steps:

### Clone the Repository:

```bash
git clone https://github.com/DaL1ght1/ECM.git
cd ECM
```
### Backend Setup:

1. Ensure you have Java and PostgreSQL installed.
2. Set up your PostgreSQL database and update the `application.properties` file with your database credentials.
3. Run the Spring Boot application from your IDE or via the command line:

   ```bash
   ./mvnw spring-boot:run
   ```
### Frontend Setup:

1. Ensure you have Node.js v20 and Angular CLI installed.
2. Navigate to the `frontend` directory and install dependencies:
 ```bash
   cd frontend
   npm install
  ```
3. Start the Angular development server:
```bash
   ng serve
```
### Access the Application:

- Open your browser and navigate to `http://localhost:4200` to access the frontend.
- Use the admin dashboard to manage users and documents.

## Contributions

Contributions are welcome! Feel free to submit issues, feature requests, or pull requests to improve this ECM system.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

For any questions or further information, please contact [Email](rooli@gmail.com).



