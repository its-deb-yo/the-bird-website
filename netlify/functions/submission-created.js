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
        // For testing before domain DNS is configured, use: "The Bird <onboarding@resend.dev>"
        from: "The Bird <reservations@thebirdrestaurant.com>",,
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
