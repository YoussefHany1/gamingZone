import Link from "@/components/Link";
import { Button } from "@/components/ui/Button";

export default function PrivacyPolicyPage() {
  return (
    <div
      className="w-full flex flex-col text-gray-200 min-h-[calc(100vh-140px)]"
      dir="ltr"
    >
      <main className="grow max-w-4xl mx-auto w-full px-4 py-12 flex flex-col gap-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold">Privacy Policy</h1>
          <p className="text-gray-400 text-sm md:text-base italic">
            Last Updated: 20 June 2026
          </p>
        </div>

        <div className="glass-panel border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl relative overflow-hidden text-sm md:text-base leading-relaxed space-y-6">
          <p>
            At <strong className="text-white">Gaming Zone</strong>, we respect
            your privacy and are committed to protecting your personal data.
            This Privacy Policy explains how we collect, use, and protect your
            information when you use our application.
          </p>

          <h3 className="text-xl font-bold text-white mt-8 mb-4">
            1. Information We Collect
          </h3>
          <p>
            Based on the app's functionality, we collect the following types of
            information:
          </p>

          <h4 className="text-lg font-semibold text-white mt-6 mb-3">
            A. Information You Provide to Us Directly:
          </h4>
          <ul className="list-disc pl-6 space-y-2 text-gray-300">
            <li>
              <strong className="text-gray-200">Account Information:</strong>{" "}
              When you create an account, we collect your{" "}
              <strong className="text-gray-200">Email Address</strong>,{" "}
              <strong className="text-gray-200">Username</strong>, and{" "}
              <strong className="text-gray-200">Password</strong> (stored
              securely and encrypted) for the purpose of establishing your
              identity within the app.
            </li>
            <li>
              <strong className="text-gray-200">User Preferences:</strong> We
              may collect information regarding the games you prefer or follow
              within the app.
            </li>
          </ul>

          <h4 className="text-lg font-semibold text-white mt-6 mb-3">
            B. Information Collected Automatically:
          </h4>
          <ul className="list-disc pl-6 space-y-2 text-gray-300">
            <li>
              <strong className="text-gray-200">Device Information:</strong> We
              may collect information about your mobile device type and
              operating system to ensure app compatibility.
            </li>
            <li>
              <strong className="text-gray-200">Log and Crash Data:</strong> We
              collect crash reports and performance data (e.g., via Firebase
              Crashlytics) to diagnose and fix issues, ensuring app stability.
            </li>
            <li>
              <strong className="text-gray-200">
                Push Notification Token:
              </strong>{" "}
              We use services (such as Expo Push Notifications) to generate a
              unique token for your device so we can send you alerts about
              gaming news and free game offers.
            </li>
          </ul>

          <h3 className="text-xl font-bold text-white mt-8 mb-4">
            2. How We Use Your Information
          </h3>
          <ul className="list-disc pl-6 space-y-2 text-gray-300">
            <li>
              <strong className="text-gray-200">Account Management:</strong> To
              log you in, verify your identity, and save your personal data
              using <strong className="text-gray-200">Appwrite</strong>{" "}
              services.
            </li>
            <li>
              <strong className="text-gray-200">Improving Experience:</strong>{" "}
              To display gaming news and Free Games offers that are relevant to
              you.
            </li>
            <li>
              <strong className="text-gray-200">Notifications:</strong> To send
              important alerts about the latest games and news (you can opt-out
              via your device settings).
            </li>
          </ul>

          <h3 className="text-xl font-bold text-white mt-8 mb-4">
            3. Third-Party Services
          </h3>
          <p>
            The App may use services provided by third parties that help us
            operate the application. These parties may collect and use your
            information according to their own privacy policies:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-300">
            <li>
              <strong className="text-gray-200">Appwrite:</strong> We use
              Appwrite as a Backend-as-a-Service to store user data and manage
              login processes securely.
            </li>
            <li>
              <strong className="text-gray-200">Expo:</strong> We use the Expo
              framework, which may collect some technical data for the purpose
              of sending notifications and updating the app.
            </li>
            <li>
              <strong className="text-gray-200">Firebase Crashlytics:</strong>{" "}
              We use Firebase to collect crash reports and monitor app
              performance to improve user experience.
            </li>
            <li>
              <strong className="text-gray-200">
                External News Sources (RSS Feeds):
              </strong>{" "}
              The app fetches news from external sources. The app does not share
              your personal data with these sources, but it loads public content
              from them.
            </li>
          </ul>

          <h3 className="text-xl font-bold text-white mt-8 mb-4">
            4. Data Security
          </h3>
          <p>
            We take the security of your data seriously. Passwords and sensitive
            data are stored using secure encryption protocols via Appwrite
            services. However, please remember that no method of transmission
            over the internet, or method of electronic storage, is 100% secure.
          </p>

          <h3 className="text-xl font-bold text-white mt-8 mb-4">
            5. Data Deletion
          </h3>
          <p>
            You have the right to request the deletion of your account and all
            associated data at any time. You can do this through the app
            settings (if available) or by contacting us via email.
          </p>

          <h3 className="text-xl font-bold text-white mt-8 mb-4">
            6. Children's Privacy
          </h3>
          <p>
            Our app is intended for gaming enthusiasts and does not specifically
            target children under the age of 13.
          </p>

          <h3 className="text-xl font-bold text-white mt-8 mb-4">
            7. Changes to This Privacy Policy
          </h3>
          <p>
            We may update our Privacy Policy from time to time. We will notify
            you of any changes by posting the new Privacy Policy on this page.
          </p>

          <h3 className="text-xl font-bold text-white mt-8 mb-4">
            8. Contact Us
          </h3>
          <p>
            If you have any questions or suggestions about our Privacy Policy,
            do not hesitate to contact us at:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-gray-300 flex items-center justify-between">
            <li>
              <strong className="text-gray-200">Email:</strong>{" "}
              <a
                href="mailto:gaming.zone2100@gmail.com"
                className="text-light-blue hover:underline"
              >
                gaming.zone2100@gmail.com
              </a>
            </li>
            <Link href="/contact">
              <Button variant="secondary">Go to Contact Us</Button>
            </Link>
          </ul>
        </div>
      </main>
    </div>
  );
}
