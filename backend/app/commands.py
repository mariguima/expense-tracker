"""Operational checks that never expose mail credentials or send test messages."""
import smtplib
import ssl

import click

from app.utils.password_reset import mail_connection, missing_email_settings


def register_commands(app):
    @app.cli.command("check-email")
    def check_email():
        """Verify configured SMTP TLS/authentication without sending any email."""
        missing = missing_email_settings(app.config)
        if missing:
            raise click.ClickException("Set these values in backend/.env: " + ", ".join(missing))
        try:
            with mail_connection(app.config) as smtp:
                code, _ = smtp.noop()
                if code != 250:
                    raise click.ClickException("The email server is not ready. Try again later.")
        except smtplib.SMTPAuthenticationError:
            raise click.ClickException("Gmail rejected the credentials. Check your full Gmail address and Google app password.") from None
        except ssl.SSLError:
            raise click.ClickException("The email server's TLS certificate could not be verified.") from None
        except (OSError, smtplib.SMTPException):
            raise click.ClickException("Could not connect to the email server. Check the host, port and network access.") from None
        click.echo("Email connection and authentication verified. No email was sent.")
