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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";

export function AddTokenModal() {
  const createTokenBundle = useMutation(api.tokens.createTokenBundle);
  const [open, setOpen] = React.useState(false);
  const [status, setStatus] = React.useState("available");
  const [tokenbundleName, settokenbundleName] = React.useState<string>("");
  const [numberOfTokens, setnumberOfTokens] = React.useState("");
  const capitalizeFirstLetter = (str: string) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    console.log(status, tokenbundleName, numberOfTokens);

    const response = await createTokenBundle({
      tokenBundleName: capitalizeFirstLetter(tokenbundleName),
      numberOfTokens: parseInt(numberOfTokens, 10),
      status,
    });
    if (response.status == "success") {
      toast.success(response.message);
    } else {
      toast.error(response.message);
    }
    setOpen(false);
    setnumberOfTokens("");
    setStatus("available");
    settokenbundleName("");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add Token Bundle</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-md">
        <DialogHeader>
          <DialogTitle>Add token Bundle</DialogTitle>
          <DialogDescription>
            Enter the details for the new token bundle. Click save when you're
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
                  value={tokenbundleName}
                  onChange={(e) => settokenbundleName(e.target.value)}
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
                  onChange={
                    (e) => setnumberOfTokens(e.target.value)
                    // setnumberOfTokens(parseInt(e.target.value, 10) || 0)
                  }
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
                Save Token Bundle
              </Button>
            </CardFooter>
          </Card>
        </form>
      </DialogContent>
    </Dialog>
  );
}
