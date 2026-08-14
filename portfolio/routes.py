"""Website and JSON API routes."""

from __future__ import annotations

from flask import Blueprint, current_app, jsonify, render_template, request

from .contact import (
    ContactConfigurationError,
    clean_text,
    is_rate_limited,
    send_contact_email,
    validate_contact,
)


site = Blueprint("site", __name__)


@site.get("/")
def index():
    return render_template("index.html")


@site.get("/api/health")
def health():
    api_key = str(current_app.config.get("RESEND_API_KEY", "")).strip()
    configured = bool(api_key and not api_key.startswith("re_replace_"))
    return jsonify({"ok": True, "resendConfigured": configured})


@site.post("/api/contact")
def contact():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"ok": False, "message": "Please submit the contact form again."}), 400

    if clean_text(payload.get("_honey"), 200):
        return jsonify({"ok": True})

    message, field_errors = validate_contact(payload)
    if field_errors:
        return jsonify(
            {
                "ok": False,
                "message": "Please check the highlighted fields.",
                "fields": field_errors,
            }
        ), 422

    if is_rate_limited(request.remote_addr or "unknown"):
        return jsonify(
            {
                "ok": False,
                "message": "Too many messages were sent. Please try again in a few minutes.",
            }
        ), 429

    try:
        email_id = send_contact_email(message, current_app.config)
    except ContactConfigurationError:
        current_app.logger.error("RESEND_API_KEY is not configured.")
        return jsonify(
            {"ok": False, "message": "The contact service is not configured yet."}
        ), 503
    except Exception:
        current_app.logger.exception("Resend could not deliver the contact form email.")
        return jsonify(
            {"ok": False, "message": "The message could not be sent right now."}
        ), 502

    return jsonify({"ok": True, "id": email_id})
