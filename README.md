
# StayNest

A full-stack property rental platform, inspired by Airbnb. Hosts list properties with photos and map locations, and guests book stays with date selection and OTP verification.

## Features

- **Listings:** create, edit, and delete properties. Only the owner can edit or delete their listing.
- **Image uploads:** photos are stored on Cloudinary.
- **Map view:** each listing shows its location on a Mapbox map.
- **Reviews:** guests can leave reviews on listings.
- **Booking:** choose check-in and check-out dates. Overlapping dates for the same property are blocked.
- **OTP verification:** a 6-digit SMS code (Twilio) is required before booking, valid for 5 minutes, and tied to the listing, mobile number, and email.
- **Cash on delivery:** bookings are confirmed with cash on delivery, with an invoice SMS.
- **Cancellation:** guests can cancel a booking.
- **Authentication:** signup and login with Passport.js local strategy. Sessions are stored in MongoDB.

## Tech Stack

- **Backend:** Node.js, Express 5, Mongoose, Passport.js, express-session with connect-mongo, method-override, Joi
- **Frontend:** EJS with ejs-mate layouts, Bootstrap
- **Services:** MongoDB Atlas, Cloudinary (with Multer), Mapbox SDK, Twilio

## Project Structure

```
.
├── app.js              # App entry point
├── Cloudconfig.js      # Cloudinary and Multer setup
├── middleware.js       # Auth, owner, and review-author checks
├── controllers/        # listing, booking, review, user
├── routes/             # listing, booking, review, user
├── models/             # listing, booking, review, user
├── init/               # Seed data (data.js) and seed script (index.js)
├── utils/              # OTP, wrapAsync, ExpressError
├── views/              # EJS templates
└── public/             # CSS and client JS
```

## Getting Started

### Prerequisites
- Node.js
- A MongoDB Atlas database
- Cloudinary, Mapbox, and Twilio accounts

### Installation

```bash
npm install
```

Create a `.env` file in the project root:

```env
PORT=3050
ATLAS_DBURL=your_mongodb_connection_string
SECRET=your_session_secret

CLOUD_NAME=your_cloudinary_cloud_name
CLOUD_API_KEY=your_cloudinary_api_key
CLOUD_API_SECRET=your_cloudinary_api_secret

MAP_TOKEN=your_mapbox_token

TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

### Run

```bash
node app.js
```

Open http://localhost:3050

### Seed sample listings (optional)

```bash
node init/index.js
```

## Notes

- Keep `.env` out of version control. It is listed in `.gitignore`.
- Phone numbers are formatted as Indian numbers (+91) when they have 10 digits.