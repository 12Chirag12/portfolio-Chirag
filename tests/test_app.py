"""Regression tests for public files and the contact API."""

import unittest
from unittest.mock import patch

from portfolio import create_app
from portfolio.contact import reset_rate_limits


class PortfolioAppTests(unittest.TestCase):
    def setUp(self):
        reset_rate_limits()
        self.app = create_app(
            {
                "TESTING": True,
                "RESEND_API_KEY": "re_test_key",
                "RESEND_FROM_EMAIL": "Portfolio <onboarding@resend.dev>",
                "CONTACT_TO_EMAIL": "owner@example.com",
            }
        )
        self.client = self.app.test_client()

    def test_public_site_and_static_assets(self):
        for path in ("/", "/static/css/styles.css", "/static/js/script.js"):
            response = self.client.get(path)
            self.addCleanup(response.close)
            self.assertEqual(response.status_code, 200)

    def test_private_project_files_are_not_public(self):
        self.assertEqual(self.client.get("/.env").status_code, 404)
        self.assertEqual(self.client.get("/app.py").status_code, 404)

    def test_invalid_contact_submission(self):
        response = self.client.post("/api/contact", json={})
        self.assertEqual(response.status_code, 422)
        self.assertIn("email", response.get_json()["fields"])

    def test_missing_delivery_configuration(self):
        app = create_app({"TESTING": True, "RESEND_API_KEY": ""})
        client = app.test_client()
        response = client.post(
            "/api/contact",
            json={
                "name": "Test Visitor",
                "email": "visitor@example.com",
                "subject": "Project inquiry",
                "message": "A detailed portfolio project message.",
            },
        )
        self.addCleanup(response.close)
        self.assertEqual(response.status_code, 503)

    @patch("portfolio.contact.resend.Emails.send", return_value={"id": "email_test_123"})
    def test_contact_submission_escapes_content_and_sets_reply_to(self, resend_send):
        response = self.client.post(
            "/api/contact",
            json={
                "name": "<script>x</script>",
                "email": "visitor@example.com",
                "subject": "Project inquiry",
                "message": "A detailed portfolio project message.",
            },
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["id"], "email_test_123")
        params = resend_send.call_args.args[0]
        self.assertEqual(params["reply_to"], "visitor@example.com")
        self.assertIn("&lt;script&gt;", params["html"])

    @patch("portfolio.contact.resend.Emails.send", return_value={"id": "email_short_message"})
    def test_short_non_empty_message_is_accepted(self, _resend_send):
        response = self.client.post(
            "/api/contact",
            json={
                "name": "Chirag Abhijit Patil",
                "email": "chirag2611patil@gmail.com",
                "subject": "nin",
                "message": "aq",
            },
        )
        self.addCleanup(response.close)
        self.assertEqual(response.status_code, 200)


if __name__ == "__main__":
    unittest.main()
