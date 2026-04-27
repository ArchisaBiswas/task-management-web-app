import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Create SES client
const ses = new SESClient({
  region: process.env.AWS_REGION || "eu-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_KEY!,
  },
});

// Sends a plain-text email to a single recipient via AWS SES.
export const sendEmail = async (
  to: string,
  subject: string,
  message: string
) => {
  try {
    const command = new SendEmailCommand({
      Source: process.env.SES_FROM_EMAIL!, // must be verified in SES
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: {
          Data: subject,
        },
        Body: {
          Text: {
            Data: message,
          },
        },
      },
    });

    const response = await ses.send(command);

    console.log("Email sent successfully:", response);

    return response;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

// Sends an HTML-formatted task assignment notification to all listed recipients using AWS SES via API.
export const sendTaskAssignmentEmail = async (
  toEmails: string[],
  subject: string,
  html: string
) => {
  const command = new SendEmailCommand({
    Source: process.env.SES_FROM_EMAIL!,
    Destination: {
      ToAddresses: toEmails,
    },
    Message: {
      Subject: { Data: subject },
      Body: { Html: { Data: html } },
    },
  });

  const response = await ses.send(command);
  console.log("Task assignment email sent:", response);
  return response;
};