exports.handler = async (event) => {
  try {
    const { payload } = JSON.parse(event.body);
    const data = payload.data || {};
    const formName = (payload.form_name || "").toLowerCase();

    const customerEmail = data.email;
    if (!customerEmail) {
      console.warn("No email provided in submission payload.");
      return { statusCode: 200, body: "Skipped: No email provided." };
    }

    const firstName = data['first-name'] || data.fname || "";
    const lastName = data['last-name'] || data.lname || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Valued Guest";
    const phone = data.phone || "Not provided";
    const eventDate = data['event-date'] || data.edate || "Not specified";
    const guests = data['party-size'] || data.guests || "Not specified";
    const timeSlot = data['time-slot'] || "";
    const typeOfEvent = data.type || "Not specified";
    const additionalInfo = data['additional-info'] || data.info || "None";

    // Detect large parties (5 or more guests)
    const cancellationNote = data['cancellation-policy-note'] || data.cancellationPolicyNote || "";
    const isLargeParty = parseInt(guests, 10) >= 5 || Boolean(cancellationNote);

    let subject = "";
    let contentHtml = "";

    if (formName.includes("catering")) {
      subject = "Catering Request Received — The Bird";
      contentHtml = `
        <p>We have received your catering request for the following:</p>
        <ul style="line-height: 1.8;">
          <li><strong>Name:</strong> ${fullName}</li>
          <li><strong>Email:</strong> ${customerEmail}</li>
          <li><strong>Phone:</strong> ${phone}</li>
          <li><strong>Event Date:</strong> ${eventDate}</li>
          <li><strong>Number of Guests:</strong> ${guests}</li>
          <li><strong>Type of Event:</strong> ${typeOfEvent}</li>
          <li><strong>Additional Notes:</strong> ${additionalInfo}</li>
        </ul>
      `;
    } else {
      // Thanksgiving Reservations
      subject = "Thanksgiving Reservation Request — The Bird";
      const timeSlotRow = timeSlot ? `<li><strong>Time Slot:</strong> ${timeSlot}</li>` : "";
      
      const policyHtml = isLargeParty ? `
        <div style="margin-top: 20px; padding: 14px 16px; background-color: #F8F5EE; border-left: 4px solid #B99A4F; border-radius: 4px;">
          <strong style="color: #6E2A38; font-size: 15px;">Large Party Policy (5+ Guests):</strong>
          <p style="margin: 6px 0 0; font-size: 13px; line-height: 1.5; color: #4B453C;">
            For parties of 5 or more, a credit card is required at the time of reservation confirmation. A <strong>$15 per person cancellation fee</strong> will be charged if the reservation is canceled less than 48 hours in advance or in the event of a no-show. Our team will contact you by phone for payment details.
          </p>
        </div>
      ` : "";

      contentHtml = `
        <p>We have received your Thanksgiving reservation request for the following:</p>
        <ul style="line-height: 1.8;">
          <li><strong>Name:</strong> ${fullName}</li>
          <li><strong>Email:</strong> ${customerEmail}</li>
          <li><strong>Phone:</strong> ${phone}</li>
          <li><strong>Date:</strong> ${eventDate}</li>
          ${timeSlotRow}
          <li><strong>Number of Guests:</strong> ${guests}</li>
          <li><strong>Additional Notes:</strong> ${additionalInfo}</li>
        </ul>
        ${policyHtml}
      `;
    }

    const fullHtml = `
      <div style="font-family: Arial, sans-serif; color: #111; max-width: 600px; line-height: 1.6;">
        ${contentHtml}
        <br />
        <p style="margin: 0;"><strong>The Bird Restaurant</strong></p>
        <p style="margin: 0; color: #555;">Santa Rosa, California</p>
      </div>
    `;

    // Resend REST API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "The Bird <reservations@thebirdrestaurant.com>",
        reply_to: "thebirdllc@gmail.com",
        to: [customerEmail],
        subject: subject,
        html: fullHtml,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Resend error:", err);
      return { statusCode: response.status, body: err };
    }

    return { statusCode: 200, body: "Confirmation email sent." };
  } catch (err) {
    console.error("Handler error:", err);
    return { statusCode: 500, body: err.message };
  }
};
