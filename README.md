# Chirag Patil — Portfolio

A responsive portfolio built with semantic HTML, modern CSS, native JavaScript, and a small Flask contact API powered by Resend.

## Run locally

Create the virtual environment and install the backend dependencies:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Add your Resend API key to `.env`, then start the website and contact API together:

```powershell
python app.py
```

Open `http://127.0.0.1:8000`. The contact form must be served by `app.py`; a static-only server cannot run the email endpoint.

For production, verify a domain in Resend and change `RESEND_FROM_EMAIL` to an address on that exact verified domain. The `onboarding@resend.dev` sender is intended for testing and can only send to the email associated with your Resend account.

## Project structure

```text
portfolio-Chirag/
├── app.py                         # Development entry point
├── portfolio/
│   ├── __init__.py                # Flask application factory and configuration
│   ├── routes.py                  # Website and contact API routes
│   ├── contact.py                 # Validation, rate limiting, and Resend delivery
│   ├── templates/
│   │   └── index.html
│   └── static/
│       ├── css/styles.css
│       ├── js/script.js
│       ├── images/
│       └── documents/
├── tests/test_app.py
├── requirements.txt
├── .env                           # Local secrets; ignored by Git
└── .env.example                   # Safe environment-variable template
```

Run the regression tests with:

```powershell
.\.venv\Scripts\python.exe -B -m unittest discover -v
```

## Highlights

- Canvas-based ambient particle field with adaptive density
- Cursor-responsive particle physics and ambient motion
- Magnetic call-to-action buttons, project spotlight, and restrained card tilt
- Responsive layouts and touch-specific fallbacks
- Full reduced-motion support
- Server-validated contact form powered by Resend

## Contact API

`POST /api/contact` accepts JSON with `name`, `email`, `subject`, `message`, and the hidden `_honey` anti-spam field. The API key remains server-side, user-provided content is escaped before email rendering, and repeated submissions are rate-limited.
