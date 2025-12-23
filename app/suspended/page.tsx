import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { AlertCircle, ArrowLeft, Mail } from "lucide-react";
import Link from "next/link";

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <CardTitle className="text-2xl font-bold">
              Account Suspended
            </CardTitle>
          </div>
          <CardDescription>
            Your M-Bingwa service account has been temporarily suspended.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            We regret to inform you that your account has been suspended due to
            a violation of our terms of service. This suspension affects your
            ability to use our automated M-Bingwa services.
          </p>
          <p className="text-sm text-gray-600">
            If you believe this is an error or would like to appeal this
            decision, please contact our support team for assistance.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button className="w-full" asChild>
            <Link href="/contact-support">
              <Mail className="mr-2 h-4 w-4" /> Contact Support
            </Link>
          </Button>
          <Button variant="outline" className="w-full" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Return to Home
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
