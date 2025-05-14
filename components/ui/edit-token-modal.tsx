"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

interface Token {
  token_id: string;
  numberOfTokens: number;
  status: "available" | "disabled";
  tokenBundleName: string;
}

interface EditTokenModalProps {
  token: Token | null;
  onClose: () => void;
}

export function EditTokenModal({ token, onClose }: EditTokenModalProps) {
  const updateTokenBundle = useMutation(api.tokens.updateTokenBundle);
  const [status, setStatus] = React.useState(token?.status || "" );
  const [tokenBundleName, setTokenBundleName] = React.useState(
    token?.tokenBundleName || ""
  );
  const [numberOfTokens, setNumberOfTokens] = React.useState(
    token?.numberOfTokens.toString() || ""
  );

  React.useEffect(() => {
    if (token) {
      setStatus(token.status);
      setTokenBundleName(token.tokenBundleName);
      setNumberOfTokens(token.numberOfTokens.toString());
    }
  }, [token]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token) return;

    const response = await updateTokenBundle({
      token_id: token.token_id,
      tokenBundleName,
      numberOfTokens: parseInt(numberOfTokens, 10),
      status,
    });

    if (response.status === "success") {
      toast.success(response.message);
    } else {
      toast.error(response.message);
    }

    onClose();
  };

  return (
    <Dialog open={!!token} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px] rounded-md">
        <DialogHeader>
          <DialogTitle>Edit Token Bundle</DialogTitle>
          <DialogDescription>
            Update the details for the token bundle. Click save when you're
            done.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Card>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tokenBundleName">Bundle Name</Label>
                <Input
                  id="tokenBundleName"
                  placeholder="Premium Package"
                  type="text"
                  required
                  value={tokenBundleName}
                  onChange={(e) => setTokenBundleName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="numberOfTokens">Tokens</Label>
                <Input
                  id="numberOfTokens"
                  placeholder="500"
                  type="number"
                  step="10"
                  value={numberOfTokens}
                  onChange={(e) => setNumberOfTokens(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select required value={status} onValueChange={setStatus}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="disabled">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" className="w-full">
                Save Changes
              </Button>
            </CardFooter>
          </Card>
        </form>
      </DialogContent>
    </Dialog>
  );
}
