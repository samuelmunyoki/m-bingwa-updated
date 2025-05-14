"use client";

import * as React from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type AddStoreModalProps = {
  userId: string;
  onStoreCreated: () => void;
};

export function AddStoreModal({ userId, onStoreCreated }: AddStoreModalProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const createStore = useMutation(api.features.stores.createStore);

  const [formData, setFormData] = React.useState({
    storeName: "",
    status: "available" as "available" | "disabled" | "maintenance",
    statusDescription: "",
    paymentAccount: "",
    paymentMethod: "TILL" as "TILL" | "PAYBILL",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "storeName") {
      // Only allow lowercase letters
      const sanitizedValue = value.replace(/[^a-z]/g, "").toLowerCase();
      setFormData({ ...formData, [name]: sanitizedValue });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSelectChange = (
    name: "status" | "paymentMethod",
    value: string
  ) => {
    if (name === "status") {
      setFormData({
        ...formData,
        [name]: value as "available" | "disabled" | "maintenance",
      });
    } else if (name === "paymentMethod") {
      setFormData({
        ...formData,
        [name]: value as "TILL" | "PAYBILL",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createStore({
        userId,
        storeName: formData.storeName,
        status: formData.status,
        statusDescription: formData.statusDescription,
        paymentAccount: formData.paymentAccount,
        paymentMethod: formData.paymentMethod,
      });
      if (res.status === "success") {
        toast.success(res.message);
      }
      if (res.status === "error") {
        toast.error(res.message);
      }

      setIsOpen(false);
      onStoreCreated();
    } catch (error) {
      toast.error("An error occurred while creating the store");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>Add Store</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-md">
        <DialogHeader>
          <DialogTitle>Add New Store</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="storeName">Store Name</Label>
            <Input
              id="storeName"
              name="storeName"
              value={formData.storeName}
              onChange={handleInputChange}
              placeholder="Store Name (lowercase letters only)"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              name="status"
              value={formData.status}
              onValueChange={(
                value: "available" | "disabled" | "maintenance"
              ) => handleSelectChange("status", value)}
            >
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {(formData.status === "disabled" ||
            formData.status === "maintenance") && (
            <div className="space-y-2">
              <Label htmlFor="statusDescription">Status Description</Label>
              <Input
                id="statusDescription"
                name="statusDescription"
                value={formData.statusDescription}
                onChange={handleInputChange}
                placeholder="Explain why the store is disabled or under maintenance"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="paymentAccount">Payment Account</Label>
            <Input
              id="paymentAccount"
              name="paymentAccount"
              value={formData.paymentAccount}
              onChange={handleInputChange}
              placeholder="Payment Account"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select
              name="paymentMethod"
              value={formData.paymentMethod}
              onValueChange={(value: "TILL" | "PAYBILL") =>
                handleSelectChange("paymentMethod", value)
              }
            >
              <SelectTrigger id="paymentMethod">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TILL">TILL</SelectItem>
                <SelectItem value="PAYBILL">PAYBILL</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-neutral-500 text-sm">
            Warning: Incorrect payment details will lead to money loss.
          </p>
          <Button type="submit" className="w-full">
            Create Store
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
