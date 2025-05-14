import React from "react";
import { cn } from "@/lib/utils";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";
import { Button } from "./button";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutModal: React.FC<LogoutModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <Card className="sm:max-w-[425px] w-[425px]">
        <CardHeader>
          <CardTitle className="">Confirm Logout</CardTitle>
          <CardDescription>
            {" "}
            Are you sure you want to log out? You'll need to sign in again to
            access your account.
          </CardDescription>
        </CardHeader>

        <CardFooter className="gap-4 flex flex-row justify-end w-full">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Logout
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default LogoutModal;
