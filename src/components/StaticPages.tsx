"use client";

import { useState } from "react";

/** Privacy policy — plain text, matching the Google Play draft. */
export function PrivacyPage() {
  return (
    <article className="card static-page">
      <h2>Privacy Policy</h2>
      <p className="muted">Effective date: 11/10/2026 · Last updated: 11/10/2026</p>
      <p>
        Get in is operated by Nichole MacDonald. This policy explains what
        information we collect, how we use it, and the choices you have.
      </p>
      <h3>Information we collect</h3>
      <ul>
        <li>
          <strong>Account information:</strong> your name, email address, and
          phone number when you create an account.
        </li>
        <li>
          <strong>Provider information:</strong> business name, contact name,
          phone, salon address, and the services you offer.
        </li>
        <li>
          <strong>Bookings:</strong> the openings you post or claim, including
          dates, times, and prices.
        </li>
        <li>
          <strong>Location:</strong> the address you enter to search, or your
          current location if you choose to share it, so we can show openings
          near you.
        </li>
      </ul>
      <h3>How we use it</h3>
      <p>
        We use your information to run Get in: to show openings near you, to
        let providers post openings and see who claimed them, to let clients
        claim openings, and to contact you about your bookings. We do not sell
        your personal information.
      </p>
      <h3>Sharing</h3>
      <p>
        When you claim an opening, the provider sees your name and phone
        number so they can confirm your appointment. When you post an opening,
        clients see your business name, services, and salon address. We share
        information with service providers who help run the site, such as our
        hosting and database providers, only as needed to run Get in.
      </p>
      <h3>Your choices</h3>
      <p>
        You can update your profile at any time after signing in. You can ask
        us to delete your account — see our{" "}
        <a href="#delete-account">Delete Your Account</a> page. Deleting your
        account does not cancel any Google Play subscription; subscriptions
        must be cancelled separately in Google Play.
      </p>
      <h3>Contact</h3>
      <p>
        Privacy questions: nikkimacdonald.beauty@gmail.com
        <br />
        Support: nmacdonald426@gmail.com
        <br />
        Mailing address: 414 Sixty Six Road, Hannibal, NY 13074
      </p>
      <p className="muted small">
        This is a working draft, not legal advice. It will be checked by a
        privacy professional before the public launch.
      </p>
    </article>
  );
}

/** Account deletion — matches the existing deletion page. */
export function DeleteAccountPage() {
  const [email, setEmail] = useState("");
  const [accountType, setAccountType] = useState("client");
  const [name, setName] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!confirmed) {
      setMessage("Please tick the box to confirm you understand this cannot be undone.");
      return;
    }
    const subject = encodeURIComponent("Get in — Delete my account");
    const body = encodeURIComponent(
      `Please delete my Get in account.\n\nName: ${name}\nAccount email: ${email}\nAccount type: ${accountType}\n\nI understand this cannot be undone.`
    );
    window.location.href = `mailto:nikkimacdonald.beauty@gmail.com?subject=${subject}&body=${body}`;
    setMessage(
      "Your email app should now be open with the deletion request ready to send. If it did not open, send an email to nikkimacdonald.beauty@gmail.com with your account email, name, and account type."
    );
  }

  return (
    <article className="card static-page" id="delete-account">
      <h2>Delete Your Account</h2>
      <p>
        We are sorry to see you go. You can ask us to delete your Get in
        account here, or from inside the app under Profile → Settings →
        Delete Account.
      </p>
      <h3>What gets deleted</h3>
      <ul>
        <li>Your profile — name, phone number, and contact details</li>
        <li>Your provider profile and salon address, if you are a provider</li>
        <li>Openings you posted and claims you made</li>
        <li>Your saved addresses and location history</li>
      </ul>
      <h3>What may be kept</h3>
      <p>
        We may keep some information for tax, legal, or safety reasons, or in
        backups that delete on their normal schedule.
      </p>
      <h3>Important</h3>
      <p>
        <strong>
          Deleting your Get in account does not cancel a Google Play
          subscription.
        </strong>{" "}
        If you pay for Get in through Google Play, cancel that subscription
        separately in Google Play, or you may keep being charged.
      </p>
      <h3>How long it takes</h3>
      <p>
        We will acknowledge your request within 3 business days and complete
        it within 30 days.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="delete-email">Account email</label>
          <input
            id="delete-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="The email you signed up with"
          />
        </div>
        <div className="field">
          <label htmlFor="delete-name">Your name</label>
          <input
            id="delete-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="delete-type">Account type</label>
          <select
            id="delete-type"
            value={accountType}
            onChange={(e) => setAccountType(e.target.value)}
          >
            <option value="client">Client</option>
            <option value="provider">Provider</option>
          </select>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />{" "}
          I understand deleting my account cannot be undone.
        </label>
        {message && <p className="success">{message}</p>}
        <button type="submit" className="btn-danger">
          Request account deletion
        </button>
      </form>
    </article>
  );
}
