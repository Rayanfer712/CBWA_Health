# HC_QuoteSystem

HC_QuoteSystem is a browser-based health cover quote application. It allows users to create and manage health cover quotes through a simple web interface. The application calculates the quote based on the selected cover options and applicant information.

## Features

* Create health cover quotes
* View saved quotes
* Edit existing quotes
* Delete quotes
* Single, Couple, and Family cover options
* Hospital cover selection
* Extras cover selection
* Monthly and yearly payment options
* Annual discount calculation
* Applicant age and hospital cover history
* Lifetime Health Cover (LHC) loading calculation
* Quote preview and premium breakdown
* SQLite database for storing quotes
* Frontend connected to the existing REST API

## Requirements

Before running the project, make sure you have:

* **Node.js 22 LTS** recommended
* **npm** included with Node.js
* Internet access for loading the React libraries used by the frontend

## Install

1. Open a terminal in the project folder.

2. Check your Node.js and npm versions:

```bash
node --version
npm --version
```

3. Install the project dependencies:

```bash
npm install
```

This will install the required packages and create the `node_modules` folder.

## Run the Application

Start the application with:

```bash
npm start
```

The application should then be available at:

```text
http://localhost:3000
```

Open the address in a web browser to use the application.

### Development Mode

To run the application in development mode:

```bash
npm run dev
```

This allows the server to restart automatically when source files are changed.

### Using Another Port

If port 3000 is already being used, another port can be selected.

For example:

```bash
PORT=3001 npm start
```

Then open:

```text
http://localhost:3001
```

## Using the Application

1. Open the application in your browser.
2. Select the option to create a new quote.
3. Enter the required customer information.
4. Select the appropriate cover type.
5. Enter the applicant information.
6. Select the hospital and extras cover.
7. Select the payment frequency and applicable discount.
8. Review the calculated quote.
9. Save the quote.
10. Use the quote list to view, edit, or delete saved quotes.

## SQLite Database

The application uses SQLite to store saved quote information.

The database is created automatically when the application is started.

The database location is:

```text
data/quotes.sqlite
```

If a different database location is required, it can be configured using the `DATABASE_PATH` environment variable.

Example:

```bash
DATABASE_PATH=/path/to/quotes.sqlite npm start
```

## API

The frontend communicates with the existing backend through REST API endpoints.

The main quote operations include:

| Method   | Endpoint                  | Purpose                   |
| -------- | ------------------------- | ------------------------- |
| `GET`    | `/api/quotes`             | Get saved quotes          |
| `GET`    | `/api/quotes/:id`         | Get a specific quote      |
| `POST`   | `/api/quotes`             | Create a new quote        |
| `PUT`    | `/api/quotes/:id`         | Update a quote            |
| `DELETE` | `/api/quotes/:id`         | Delete a quote            |
| `GET`    | `/api/calculator/preview` | Calculate a quote preview |

The frontend uses these existing endpoints to communicate with the backend.

## Testing

Run the automated tests using:

```bash
npm test
```

JavaScript syntax checks can be run using:

```bash
npm run check
```

## Project Structure

```text

The `public/` folder contains the browser frontend, including the React application, HTML, and CSS.

The `src/` folder contains the application's server-side logic and existing backend functionality.

The `tests/` folder contains the automated tests.

The `data/` folder contains the SQLite database used to store saved quotes.


## AI Use Statement

ChatGPT was used as an assistance tool during the development of this project.

It was used for:

1. Frontend UI/UX design ideas and improvements.
2. CSS styling suggestions for elements such as containers, cards, buttons, and forms.
3. Debugging and checking JavaScript and React code.
4. Understanding and reviewing React, Express, and API-related code.
5. Brainstorming validation and testing cases.
6. Improving README wording and project documentation.

The suggestions were reviewed and tested before implementation. The final frontend design and implementation decisions were made by me.



## Notes
* Quote calculations depend on the selected cover and applicant information.
* Saved quotes are stored in the SQLite database.
* The application must be running through the Node.js server for the frontend to communicate with the backend API.
