"""Application factory for the portfolio website."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, jsonify


PROJECT_ROOT = Path(__file__).resolve().parent.parent


def create_app(test_config: dict | None = None) -> Flask:
    load_dotenv(PROJECT_ROOT / ".env")

    app = Flask(__name__)
    app.config.from_mapping(
        MAX_CONTENT_LENGTH=32 * 1024,
        RESEND_API_KEY=os.getenv("RESEND_API_KEY", "").strip(),
        RESEND_FROM_EMAIL=os.getenv(
            "RESEND_FROM_EMAIL", "Chirag Portfolio <onboarding@resend.dev>"
        ).strip(),
        CONTACT_TO_EMAIL=os.getenv(
            "CONTACT_TO_EMAIL", "223chirag2012@sjcem.edu.in"
        ).strip(),
    )

    if test_config:
        app.config.update(test_config)

    from .routes import site

    app.register_blueprint(site)

    @app.errorhandler(413)
    def payload_too_large(_error):
        return jsonify({"ok": False, "message": "The message is too large."}), 413

    return app
