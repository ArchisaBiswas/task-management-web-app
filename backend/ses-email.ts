import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

// Create SES client
const ses = new SESClient({
  region: process.env.AWS_REGION || "eu-west-2",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY!,
    secretAccessKey: process.env.AWS_SECRET_KEY!,
  },
});

// Send email function
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