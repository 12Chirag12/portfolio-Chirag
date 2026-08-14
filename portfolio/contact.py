"""Validation, abuse protection, and Resend delivery for contact messages."""

from __future__ import annotations

import html
import re
import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass
from email.utils import parseaddr
from typing import Any, Mapping

import resend


EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
RATE_LIMIT_WINDOW_SECONDS = 10 * 60
RATE_LIMIT_MAX_REQUESTS = 5
request_times: dict[str, deque[float]] = defaultdict(deque)
request_times_lock = threading.Lock()


class ContactConfigurationError(RuntimeError):
    """Raised when required email delivery settings are unavailable."""


@dataclass(frozen=True)
class ContactMessage:
    name: str
    email: str
    subject: str
    message: str


def clean_text(value: Any, maximum: int) -> str:
    if not isinstance(value, str):
        return ""
    return value.replace("\x00", "").strip()[:maximum]


def validate_contact(payload: Mapping[str, Any]) -> tuple[ContactMessage, dict[str, str]]:
    message = ContactMessage(
        name=clean_text(payload.get("name"), 80),
        email=clean_text(payload.get("email"), 254),
        subject=clean_text(payload.get("subject"), 120).replace("\r", " ").replace("\n", " "),
        message=clean_text(payload.get("message"), 5000),
    )

    errors: dict[str, str] = {}
    if len(message.name) < 2:
        errors["name"] = "Please enter your name."
    if not EMAIL_PATTERN.fullmatch(message.email):
        errors["email"] = "Please enter a valid email."
    if len(message.subject) < 3:
        errors["subject"] = "Please add a subject."
    if len(message.message) < 10:
        errors["message"] = "Please add a little more detail."
    return message, errors


def is_rate_limited(client_ip: str) -> bool:
    now = time.monotonic()
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS

    with request_times_lock:
        timestamps = request_times[client_ip]
        while timestamps and timestamps[0] < cutoff:
            timestamps.popleft()
        if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
            return True
        timestamps.append(now)
        return False


def reset_rate_limits() -> None:
    """Clear in-memory limits between isolated application tests."""
    with request_times_lock:
        request_times.clear()


def render_email_html(message: ContactMessage) -> str:
    safe_name = html.escape(message.name)
    safe_email = html.escape(message.email)
    safe_subject = html.escape(message.subject)
    safe_message = html.escape(message.message).replace("\n", "<br>")
    return f"""
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#101828;max-width:640px;margin:auto">
      <p style="color:#667085;margin-bottom:6px">New message from your portfolio</p>
      <h1 style="font-size:24px;margin:0 0 24px">{safe_subject}</h1>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
        <tr><td style="padding:10px 0;color:#667085;width:90px">Name</td><td>{safe_name}</td></tr>
        <tr><td style="padding:10px 0;color:#667085">Email</td><td><a href="mailto:{safe_email}">{safe_email}</a></td></tr>
      </table>
      <div style="padding:20px;border:1px solid #e4e7ec;border-radius:12px;background:#f9fafb">{safe_message}</div>
    </div>
    """.strip()


def send_contact_email(message: ContactMessage, config: Mapping[str, Any]) -> str | None:
    api_key = str(config.get("RESEND_API_KEY", "")).strip()
    if not api_key or api_key.startswith("re_replace_"):
        raise ContactConfigurationError("RESEND_API_KEY is not configured.")

    sender = str(config.get("RESEND_FROM_EMAIL", "")).strip()
    recipient = str(config.get("CONTACT_TO_EMAIL", "")).strip()
    sender_address = parseaddr(sender)[1]
    if not sender_address or not EMAIL_PATTERN.fullmatch(sender_address):
        raise ContactConfigurationError("RESEND_FROM_EMAIL is not configured correctly.")
    if not recipient or not EMAIL_PATTERN.fullmatch(recipient):
        raise ContactConfigurationError("CONTACT_TO_EMAIL is not configured correctly.")

    resend.api_key = api_key
    params: resend.Emails.SendParams = {
        "from": sender,
        "to": [recipient],
        "reply_to": message.email,
        "subject": f"Portfolio contact: {message.subject}",
        "html": render_email_html(message),
        "text": (
            f"New portfolio message\n\nName: {message.name}\nEmail: {message.email}"
            f"\nSubject: {message.subject}\n\n{message.message}"
        ),
    }
    sent = resend.Emails.send(params)
    return sent.get("id") if isinstance(sent, dict) else getattr(sent, "id", None)
