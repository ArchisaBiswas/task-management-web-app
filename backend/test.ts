// test.ts
import "dotenv/config";
import { sendEmail } from "./ses-email";

(async () => {
  try {
    await sendEmail(
      "biswasswati20@gmail.com",
      "Task Manager Notification: Test Email from AWS SES 🚀",
      `Hello Swati,

This is a test email sent from your Task Management System backend using Amazon SES.

✅ Backend is working correctly
✅ Email delivery pipeline is functional
✅ Ready for task assignment notifications

If you received this, your email integration is successfully set up.

Best regards,  
Task Management System`
    );

    console.log("Email sent!");
  } catch (err) {
    console.error("Error:", err);
  }
})();