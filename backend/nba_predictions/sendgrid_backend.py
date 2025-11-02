"""
SendGrid Web API Email Backend for Django
Uses SendGrid's HTTP API instead of SMTP to avoid port blocking issues
"""
from django.core.mail.backends.base import BaseEmailBackend
from django.conf import settings
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
import logging

logger = logging.getLogger(__name__)


class SendGridBackend(BaseEmailBackend):
    """
    A Django email backend that uses SendGrid's Web API.

    This backend sends emails via HTTPS (port 443) instead of SMTP,
    making it more reliable on cloud providers like DigitalOcean that
    block outbound SMTP ports.
    """

    def __init__(self, fail_silently=False, **kwargs):
        super().__init__(fail_silently=fail_silently, **kwargs)
        self.api_key = settings.SENDGRID_API_KEY
        self.client = SendGridAPIClient(self.api_key) if self.api_key else None

    def send_messages(self, email_messages):
        """
        Send one or more EmailMessage objects and return the number of email
        messages sent.
        """
        if not self.client:
            if not self.fail_silently:
                raise ValueError("SENDGRID_API_KEY is not configured")
            return 0

        num_sent = 0
        for message in email_messages:
            try:
                sent = self._send(message)
                if sent:
                    num_sent += 1
            except Exception as e:
                logger.error(f"Failed to send email via SendGrid API: {e}")
                if not self.fail_silently:
                    raise
        return num_sent

    def _send(self, message):
        """Send a single email message via SendGrid API."""
        try:
            # Build SendGrid Mail object
            from_email = Email(message.from_email)
            subject = message.subject

            # SendGrid requires at least one recipient
            if not message.to:
                logger.warning("Email has no recipients, skipping")
                return False

            # Create mail object
            mail = Mail(
                from_email=from_email,
                to_emails=[To(email) for email in message.to],
                subject=subject
            )

            # Add email content
            if message.content_subtype == 'html':
                mail.add_content(Content("text/html", message.body))
            else:
                mail.add_content(Content("text/plain", message.body))

            # Add CC recipients
            if message.cc:
                for email in message.cc:
                    mail.add_cc(email)

            # Add BCC recipients
            if message.bcc:
                for email in message.bcc:
                    mail.add_bcc(email)

            # Add reply-to
            if message.reply_to:
                mail.reply_to = Email(message.reply_to[0])

            # Send via SendGrid API
            response = self.client.send(mail)

            if response.status_code in (200, 201, 202):
                logger.info(f"Email sent successfully via SendGrid API to {message.to}")
                return True
            else:
                logger.error(f"SendGrid API returned status {response.status_code}: {response.body}")
                return False

        except Exception as e:
            logger.error(f"Error sending email via SendGrid API: {e}")
            if not self.fail_silently:
                raise
            return False
