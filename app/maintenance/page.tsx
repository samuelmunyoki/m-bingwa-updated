import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Clock } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Clock className="h-6 w-6 text-amber-500" />
            <CardTitle className="text-2xl font-bold">
              Temporarily Limited
            </CardTitle>
          </div>
          <CardDescription>
            We&apos;re temporarily limiting access to M-Bingwa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            We&apos;re working on resolving a few issues right now. Access will be
            restored shortly — please check back soon. Thank you for your patience.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
